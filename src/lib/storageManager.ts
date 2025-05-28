import { supabase } from './supabaseClient';

const STORAGE_LIMIT_GB = 4.5; // GB cinsinden limit
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024; // Byte'a çevir

export interface StorageStats {
  totalSize: number;
  totalFiles: number;
  isNearLimit: boolean;
  needsCleanup: boolean;
  percentUsed: number;
}

export interface BackupResult {
  success: boolean;
  message: string;
  backupCount?: number;
  freedSpace?: number;
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
    
    return {
      totalSize,
      totalFiles,
      isNearLimit: percentUsed > 85, // %85'ten fazla
      needsCleanup: percentUsed > 90, // %90'dan fazla
      percentUsed: Math.round(percentUsed)
    };
  } catch (error) {
    console.error('Storage stats hatası:', error);
    return {
      totalSize: 0,
      totalFiles: 0,
      isNearLimit: false,
      needsCleanup: false,
      percentUsed: 0
    };
  }
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

// Otomatik temizlik kontrolü
export async function checkAndPerformAutoCleanup(): Promise<BackupResult | null> {
  try {
    const stats = await getStorageStats();
    
    if (stats.needsCleanup) {
      console.log('Otomatik temizlik başlatılıyor... Kullanım:', stats.percentUsed + '%');
      
      // %90'dan fazla dolu ise 20 dosya sil
      const filesToDelete = stats.percentUsed > 95 ? 30 : 20;
      return await performSimpleCleanup(filesToDelete);
    }
    
    return null; // Temizlik gerekmiyor
  } catch (error) {
    console.error('Otomatik temizlik kontrolü hatası:', error);
    return null;
  }
}

// Formatlanmış boyut gösterimi
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 