import { NextRequest, NextResponse } from 'next/server';
import { 
  createFolderIfNotExists, 
  batchUploadToGoogleDrive, 
  listFilesInFolderRecursive 
} from '@/src/lib/googleDrive';
import { supabase } from '@/src/lib/supabaseClient';

// Google Drive'a tüm fotoğrafları yedekle (her zaman, limit kontrolü yok)
async function backupAllPhotosToGoogleDrive(fileNames?: string[]): Promise<{
  success: boolean;
  message: string;
  googleDriveUploaded?: number;
}> {
  try {
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
    let validFiles = files?.filter(file => file.name !== ".emptyFolderPlaceholder") || [];
    if (fileNames && fileNames.length > 0) {
      validFiles = validFiles.filter(f => fileNames.includes(f.name));
    }
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
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('photos')
          .download(file.name);
        if (downloadError) continue;
        const arrayBuffer = await fileData.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        filesToUpload.push({
          fileName: file.name,
          fileBuffer,
          mimeType: fileData.type || 'image/jpeg'
        });
      } catch {}
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
    return {
      success: false,
      message: 'Google Drive backup hatası: ' + (error as Error).message
    };
  }
}

// Google Drive backup stats
async function getGoogleDriveBackupStats() {
  try {
    // Ana backup klasörünü oluştur/al
    const backupFolderId = await createFolderIfNotExists('DugunPhoto-Backups');
    
    // Backup klasöründeki dosyaları (alt klasörlerle birlikte) listele
    const backupFiles = await listFilesInFolderRecursive(backupFolderId);
    
    // Sadece dosyaları say (klasörleri hariç tut)
    const onlyFiles = backupFiles.filter((f: any) => f.mimeType !== 'application/vnd.google-apps.folder');
    
    // En son backup tarihini bul
    let lastBackupDate: string | undefined;
    if (onlyFiles.length > 0) {
      const sortedFiles = onlyFiles.sort((a: any, b: any) => 
        new Date(b.createdTime || '').getTime() - new Date(a.createdTime || '').getTime()
      );
      lastBackupDate = sortedFiles[0].createdTime || undefined;
    }

    return {
      totalFiles: onlyFiles.length,
      lastBackupDate,
      isEnabled: true
    };
  } catch (error) {
    console.error('Google Drive stats hatası:', error);
    return {
      totalFiles: 0,
      isEnabled: false,
      errorMessage: (error as Error).message
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    let fileNames: string[] | undefined = undefined;
    try {
      const body = await request.json();
      if (Array.isArray(body.fileNames)) {
        fileNames = body.fileNames;
      }
    } catch {}
    const result = await backupAllPhotosToGoogleDrive(fileNames);
    return NextResponse.json({
      success: result.success,
      message: result.message,
      googleDriveUploaded: result.googleDriveUploaded
    });
  } catch (error) {
    console.error('Google Drive backup API hatası:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Google Drive backup hatası: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await getGoogleDriveBackupStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Google Drive stats API hatası:', error);
    return NextResponse.json(
      { 
        totalFiles: 0,
        isEnabled: false,
        errorMessage: 'Google Drive stats hatası: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
} 