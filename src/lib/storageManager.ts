import { supabase } from './supabaseClient';

const STORAGE_LIMIT_GB = 1; // GB cinsinden limit
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024; // Byte'a çevir

export interface StorageStats {
  totalSize: number;
  totalFiles: number;
  isNearLimit: boolean;
  needsCleanup: boolean;
  percentUsed: number;
  googleDriveBackups?: number;
  storageLimitBytes: number; // Depolama limiti byte cinsinden
  storageLimitGB: number; // Depolama limiti GB cinsinden
}

export interface BackupResult {
  success: boolean;
  message: string;
  backupCount?: number;
  freedSpace?: number;
  googleDriveUploaded?: number;
}

export interface GoogleDriveStats {
  totalFiles: number;
  lastBackupDate?: string;
  isEnabled: boolean;
  errorMessage?: string;
}

// Supabase storage boyutunu hesapla
export async function getStorageStats(): Promise<StorageStats> {
  try {
    const { data: files, error } = await supabase.storage
      .from('photos')
      .list('', { sortBy: { column: 'created_at', order: 'asc' } });

    if (error) throw error;

    let totalSize = 0;
    let totalFiles = 0;

    for (const file of files || []) {
      if (file.name !== ".emptyFolderPlaceholder") {
        // Dosya boyutunu al (metadata'dan)
        const { data: fileInfo } = await supabase.storage
          .from('photos')
          .getPublicUrl(file.name);
        
        if (fileInfo) {
          // Gerçek dosya boyutunu almak için head request (yaklaşık)
          try {
            const response = await fetch(fileInfo.publicUrl, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              totalSize += parseInt(contentLength);
            }
          } catch {
            // Fallback: Ortalama fotoğraf boyutu (2MB)
            totalSize += 2 * 1024 * 1024;
          }
        }
        totalFiles++;
      }
    }

    const percentUsed = (totalSize / STORAGE_LIMIT_BYTES) * 100;
    
    // Google Drive backup sayısını al
    let googleDriveBackups = 0;
    try {
      const backupStats = await getGoogleDriveBackupStats();
      googleDriveBackups = backupStats.totalFiles;
    } catch (error) {
      console.log('Google Drive backup bilgisi alınamadı:', error);
    }
    
    return {
      totalSize,
      totalFiles,
      isNearLimit: percentUsed > 85, // %85'ten fazla
      needsCleanup: percentUsed > 90, // %90'dan fazla
      percentUsed: Math.round(percentUsed),
      googleDriveBackups,
      storageLimitBytes: STORAGE_LIMIT_BYTES,
      storageLimitGB: STORAGE_LIMIT_GB,
    };
  } catch (error) {
    console.error('Storage stats hatası:', error);
    return {
      totalSize: 0,
      totalFiles: 0,
      isNearLimit: false,
      needsCleanup: false,
      percentUsed: 0,
      storageLimitBytes: STORAGE_LIMIT_BYTES,
      storageLimitGB: STORAGE_LIMIT_GB,
    };
  }
}

// Google Drive backup stats (API route'lar için placeholder)
export async function getGoogleDriveBackupStats(): Promise<GoogleDriveStats> {
  return {
    totalFiles: 0,
    isEnabled: false,
    errorMessage: 'Google Drive sadece API routes üzerinden kullanılabilir'
  };
}

// En eski fotoğrafları sil (basit temizlik)
export async function performSimpleCleanup(numberOfFiles: number = 10): Promise<BackupResult> {
  try {
    // En eski fotoğrafları al
    const { data: oldestFiles, error } = await supabase.storage
      .from('photos')
      .list('', { 
        sortBy: { column: 'created_at', order: 'asc' },
        limit: numberOfFiles 
      });

    if (error) throw error;

    if (!oldestFiles || oldestFiles.length === 0) {
      return {
        success: false,
        message: 'Silinecek dosya bulunamadı'
      };
    }

    const filesToDelete = oldestFiles
      .filter(file => file.name !== ".emptyFolderPlaceholder")
      .map(file => file.name);

    if (filesToDelete.length === 0) {
      return {
        success: false,
        message: 'Silinecek fotoğraf bulunamadı'
      };
    }

    // Dosyaları sil
    const { error: deleteError } = await supabase.storage
      .from('photos')
      .remove(filesToDelete);

    if (deleteError) {
      return {
        success: false,
        message: 'Dosyalar silinemedi: ' + deleteError.message
      };
    }

    return {
      success: true,
      message: `${filesToDelete.length} eski fotoğraf başarıyla silindi`,
      backupCount: filesToDelete.length
    };

  } catch (error) {
    console.error('Temizlik hatası:', error);
    return {
      success: false,
      message: 'Temizlik sırasında hata oluştu: ' + (error as Error).message
    };
  }
}

// Otomatik cleanup kontrolü (sadece silme)
export async function checkAndPerformAutoCleanup(): Promise<BackupResult | null> {
  try {
    const stats = await getStorageStats();
    
    if (stats.needsCleanup) {
      console.log('Otomatik cleanup başlatılıyor... Kullanım:', stats.percentUsed + '%');
      
      const result = await performSimpleCleanup(20);
      
      if (result.success) {
        console.log('Otomatik cleanup tamamlandı:', result.message);
      }
      
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Otomatik cleanup kontrolü hatası:', error);
    return null;
  }
}

// Otomatik yedekleme ve temizlik (900 MB üstü)
export async function checkAndPerformAutoBackupAndCleanup(): Promise<BackupResult | null> {
  try {
    const stats = await getStorageStats();
    const LIMIT_BYTES = 900 * 1024 * 1024; // 900 MB
    if (stats.totalSize >= LIMIT_BYTES) {
      console.log('Otomatik yedekleme+temizlik başlatılıyor... Kullanım:', stats.totalSize, 'byte');
      // En eski 20 dosyayı yedekle ve sil
      const { data: oldestFiles, error } = await supabase.storage
        .from('photos')
        .list('', { sortBy: { column: 'created_at', order: 'asc' }, limit: 20 });
      if (error) throw error;
      const filesToBackup = (oldestFiles || []).filter(f => f.name !== '.emptyFolderPlaceholder');
      if (filesToBackup.length === 0) {
        return { success: false, message: 'Yedeklenecek dosya bulunamadı' };
      }
      // Dosyaları indir
      const filesToUpload = [];
      for (const file of filesToBackup) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage.from('photos').download(file.name);
          if (downloadError) continue;
          const arrayBuffer = await fileData.arrayBuffer();
          const fileBuffer = Buffer.from(arrayBuffer);
          filesToUpload.push({ fileName: file.name, fileBuffer, mimeType: fileData.type || 'image/jpeg' });
        } catch {}
      }
      if (filesToUpload.length === 0) {
        return { success: false, message: 'Yedeklenecek dosya hazırlanamadı' };
      }
      // Google Drive'a yükle
      const { batchUploadToGoogleDrive, createFolderIfNotExists } = await import('./googleDrive');
      const backupFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || await createFolderIfNotExists('DugunPhoto-Backups');
      const today = new Date().toISOString().split('T')[0];
      const dailyBackupFolderId = await createFolderIfNotExists(`Backup-${today}`, backupFolderId);
      const uploadResults = await batchUploadToGoogleDrive(filesToUpload, dailyBackupFolderId);
      // Supabase'den sil
      const fileNames = filesToUpload.map(f => f.fileName);
      const { error: deleteError } = await supabase.storage.from('photos').remove(fileNames);
      if (deleteError) {
        return { success: false, message: 'Yedekleme başarılı ama silme hatası: ' + deleteError.message, googleDriveUploaded: uploadResults.length };
      }
      return { success: true, message: `${uploadResults.length} dosya yedeklendi ve silindi (otomatik)`, googleDriveUploaded: uploadResults.length };
    }
    return null;
  } catch (error) {
    console.error('Otomatik yedekleme+temizlik hatası:', error);
    return { success: false, message: 'Otomatik yedekleme+temizlik hatası: ' + (error as Error).message };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 