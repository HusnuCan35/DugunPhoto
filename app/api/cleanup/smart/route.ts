import { NextRequest, NextResponse } from 'next/server';
import { 
  createFolderIfNotExists, 
  batchUploadToGoogleDrive, 
  listFilesInFolder 
} from '@/src/lib/googleDrive';
import { supabase } from '@/src/lib/supabaseClient';
import { performSimpleCleanup, getStorageStats } from '@/src/lib/storageManager';

// TEST: Environment değişkenini logla
console.log('[TEST] GOOGLE_DRIVE_FOLDER_ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);

// Google Drive'a tüm fotoğrafları yedekle
async function backupAllPhotosToGoogleDrive(): Promise<{
  success: boolean;
  message: string;
  googleDriveUploaded?: number;
}> {
  try {
    // Storage boyutunu kontrol et
    const stats = await getStorageStats();
    const LIMIT_BYTES = 900 * 1024 * 1024; // 900 MB
    if (stats.totalSize < LIMIT_BYTES) {
      return {
        success: false,
        message: 'Depolama alanı 900 MB altında, otomatik yedekleme yapılmadı.'
      };
    }
    
    // Ana backup klasörünü oluştur veya .env'den al
    const backupFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || await createFolderIfNotExists('DugunPhoto-Backups');
    
    // Bugünün tarihi ile alt klasör oluştur
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dailyBackupFolderId = await createFolderIfNotExists(
      `Backup-${today}`, 
      backupFolderId
    );

    // Supabase'den tüm fotoğrafları al
    const { data: files, error } = await supabase.storage
      .from('photos')
      .list('', { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) throw error;

    const validFiles = files?.filter(file => file.name !== ".emptyFolderPlaceholder") || [];
    
    if (validFiles.length === 0) {
      return {
        success: false,
        message: 'Yedeklenecek fotoğraf bulunamadı'
      };
    }

    // Dosyaları hazırla
    const filesToUpload: Array<{
      fileName: string;
      fileBuffer: Buffer;
      mimeType: string;
    }> = [];

    for (const file of validFiles) {
      try {
        // Dosyayı Supabase'den indir
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('photos')
          .download(file.name);

        if (downloadError) {
          console.error(`Dosya indirilemedi (${file.name}):`, downloadError);
          continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        filesToUpload.push({
          fileName: file.name,
          fileBuffer,
          mimeType: fileData.type || 'image/jpeg'
        });
      } catch (error) {
        console.error(`Dosya hazırlanamadı (${file.name}):`, error);
      }
    }

    if (filesToUpload.length === 0) {
      return {
        success: false,
        message: 'Yedeklenecek dosya hazırlanamadı'
      };
    }

    // Google Drive'a toplu yükleme
    const uploadResults = await batchUploadToGoogleDrive(
      filesToUpload,
      dailyBackupFolderId
    );

    return {
      success: true,
      message: `${uploadResults.length} fotoğraf başarıyla Google Drive'a yedeklendi`,
      googleDriveUploaded: uploadResults.length
    };

  } catch (error) {
    console.error('Google Drive backup hatası:', error);
    return {
      success: false,
      message: 'Google Drive backup hatası: ' + (error as Error).message
    };
  }
}

// Smart cleanup: Önce Google Drive'a yedekle, sonra sil
async function performSmartCleanup(numberOfFiles: number = 10) {
  try {
    // Önce tüm fotoğrafları Google Drive'a yedekle
    const backupResult = await backupAllPhotosToGoogleDrive();
    
    if (!backupResult.success) {
      return {
        success: false,
        message: 'Yedekleme başarısız olduğu için temizlik yapılamıyor: ' + backupResult.message
      };
    }

    // Yedekleme başarılı ise eski fotoğrafları sil
    const cleanupResult = await performSimpleCleanup(numberOfFiles);
    
    return {
      success: cleanupResult.success,
      message: `Yedekleme tamamlandı (${backupResult.googleDriveUploaded} dosya). ${cleanupResult.message}`,
      backupCount: cleanupResult.backupCount,
      googleDriveUploaded: backupResult.googleDriveUploaded,
      freedSpace: cleanupResult.freedSpace
    };

  } catch (error) {
    console.error('Smart cleanup hatası:', error);
    return {
      success: false,
      message: 'Smart cleanup hatası: ' + (error as Error).message
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const numberOfFiles = body.numberOfFiles || 20;
    
    const result = await performSmartCleanup(numberOfFiles);
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      backupCount: result.backupCount,
      googleDriveUploaded: result.googleDriveUploaded,
      freedSpace: result.freedSpace
    });
  } catch (error) {
    console.error('Smart cleanup API hatası:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Smart cleanup hatası: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
} 