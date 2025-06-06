import { google } from 'googleapis';
import { Readable } from 'stream';

console.log('[GoogleDrive] Modül yüklendi');

// Google Drive authentication
export const getGoogleAuth = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  console.log('[GoogleDrive] getGoogleAuth çağrıldı');
  if (!clientEmail || !privateKey) {
    console.error('[GoogleDrive] Google Drive credentials eksik!');
    throw new Error('Google Drive credentials eksik. Lütfen .env.local dosyasında GOOGLE_SERVICE_ACCOUNT_EMAIL ve GOOGLE_PRIVATE_KEY değerlerini ayarlayın.');
  }

  console.log('[GoogleDrive] GoogleAuth oluşturuluyor...');
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
};

// Get Google Drive instance
export const getDriveInstance = async () => {
  console.log('[GoogleDrive] getDriveInstance çağrıldı');
  const auth = getGoogleAuth();
  return google.drive({ version: 'v3', auth });
};

// Create a folder in Google Drive if it doesn't exist
export const createFolderIfNotExists = async (folderName: string, parentFolderId?: string) => {
  // Eğer GOOGLE_DRIVE_FOLDER_ID .env'de tanımlıysa, doğrudan onu kullan
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    console.log('[GoogleDrive] GOOGLE_DRIVE_FOLDER_ID .env\'de tanımlı. Bu ID kullanılıyor:', process.env.GOOGLE_DRIVE_FOLDER_ID);
    return process.env.GOOGLE_DRIVE_FOLDER_ID;
  }
  console.log(`[GoogleDrive] createFolderIfNotExists: '${folderName}', parent: ${parentFolderId}`);
  const drive = await getDriveInstance();
  
  // Check if folder already exists
  const q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and parents in '${parentFolderId || 'root'}' and trashed=false`;
  console.log('[GoogleDrive] Klasör arama sorgusu:', q);
  const existingFolders = await drive.files.list({
    q,
    fields: 'files(id, name, parents)',
  });

  if (existingFolders.data.files && existingFolders.data.files.length > 0) {
    // Sadece parent'ı root olanı bul
    const rootFolder = existingFolders.data.files.find(f => Array.isArray(f.parents) && f.parents.includes('root'));
    if (rootFolder) {
      console.log(`[GoogleDrive] '${folderName}' klasörü root altında bulundu. ID: ${rootFolder.id}, Parents: ${rootFolder.parents}`);
      return rootFolder.id;
    } else {
      console.log(`[GoogleDrive] '${folderName}' klasörü bulundu ama root altında değil. İlk bulunanı döndürüyorum. ID: ${existingFolders.data.files[0].id}, Parents: ${existingFolders.data.files[0].parents}`);
      return existingFolders.data.files[0].id!;
    }
  }

  // Create new folder
  console.log(`[GoogleDrive] '${folderName}' klasörü oluşturuluyor...`);
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  console.log(`[GoogleDrive] '${folderName}' klasörü oluşturuldu!`);
  return folder.data.id!;
};

// Upload file to Google Drive
export const uploadFileToGoogleDrive = async (
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  folderId: string
) => {
  console.log(`[GoogleDrive] uploadFileToGoogleDrive: '${fileName}', folder: ${folderId}`);
  const drive = await getDriveInstance();
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  // Buffer'ı Readable stream'e dönüştür
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null); // EOF

  const media = {
    mimeType,
    body: stream,
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink',
    });
    console.log(`[GoogleDrive] '${fileName}' dosyası yüklendi!`);
    console.log(`[GoogleDrive] Yüklenen dosya ID: ${response.data.id}, webViewLink: ${response.data.webViewLink}`);
    console.log('[GoogleDrive] Google API response:', response.data);
    return {
      id: response.data.id!,
      name: response.data.name!,
      webViewLink: response.data.webViewLink!,
    };
  } catch (error) {
    console.error(`[GoogleDrive] '${fileName}' yüklenirken hata oluştu:`, error);
    throw error;
  }
};

// Get storage usage in Google Drive
export const getGoogleDriveStorageUsage = async () => {
  console.log('[GoogleDrive] getGoogleDriveStorageUsage çağrıldı');
  const drive = await getDriveInstance();
  
  const about = await drive.about.get({
    fields: 'storageQuota'
  });

  const quota = about.data.storageQuota;
  if (!quota) {
    console.error('[GoogleDrive] Depolama bilgisi alınamadı!');
    throw new Error('Google Drive storage bilgileri alınamadı');
  }

  return {
    total: parseInt(quota.limit || '0'),
    used: parseInt(quota.usage || '0'),
    remaining: parseInt(quota.limit || '0') - parseInt(quota.usage || '0'),
  };
};

// List files in a specific folder (recursive)
export const listFilesInFolderRecursive = async (folderId: string): Promise<any[]> => {
  const drive = await getDriveInstance();
  let allFiles: any[] = [];

  // Önce bu klasördeki dosyaları al
  const response = await drive.files.list({
    q: `parents in '${folderId}' and trashed=false`,
    fields: 'files(id, name, size, createdTime, webViewLink, mimeType)',
    orderBy: 'createdTime desc',
  });

  const files = response.data.files || [];
  // Dosyaları ve klasörleri ayır
  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const normalFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
  allFiles.push(...normalFiles);

  // Alt klasörler için recursive çağrı
  for (const folder of folders) {
    const subFiles = await listFilesInFolderRecursive(folder.id);
    allFiles.push(...subFiles);
  }

  return allFiles;
};

// Delete file from Google Drive
export const deleteFileFromGoogleDrive = async (fileId: string) => {
  console.log(`[GoogleDrive] deleteFileFromGoogleDrive: '${fileId}'`);
  const drive = await getDriveInstance();
  
  await drive.files.delete({
    fileId,
  });
  console.log(`[GoogleDrive] '${fileId}' dosyası silindi!`);
};

// Batch upload multiple files
export const batchUploadToGoogleDrive = async (
  files: Array<{
    fileName: string;
    fileBuffer: Buffer;
    mimeType: string;
  }>,
  folderId: string,
  onProgress?: (current: number, total: number, fileName: string) => void
) => {
  console.log(`[GoogleDrive] batchUploadToGoogleDrive: ${files.length} dosya, folder: ${folderId}`);
  const results: Array<{
    id: string;
    name: string;
    webViewLink: string;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (onProgress) {
      onProgress(i + 1, files.length, file.fileName);
    }

    try {
      console.log(`[GoogleDrive] Toplu yükleme: ${i + 1}/${files.length} - ${file.fileName}`);
      const result = await uploadFileToGoogleDrive(
        file.fileName,
        file.fileBuffer,
        file.mimeType,
        folderId
      );
      results.push(result);
    } catch (error) {
      console.error(`[GoogleDrive] Google Drive'a yükleme hatası (${file.fileName}):`, error);
      throw error;
    }
  }

  console.log(`[GoogleDrive] Toplu yükleme tamamlandı! (${results.length} dosya)`);
  return results;
}; 