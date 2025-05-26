export interface LocalPhoto {
  id: string;
  name: string;
  blob: string; // base64 encoded image
  timestamp: number;
  userId: string;
  userName?: string;
}

const STORAGE_KEY = 'dugun_photos_fallback';

export const localStorageUtils = {
  // Fotoğraf kaydet
  savePhoto: (photo: LocalPhoto): void => {
    try {
      const existingPhotos = localStorageUtils.getPhotos();
      const updatedPhotos = [...existingPhotos, photo];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPhotos));
    } catch (error) {
      console.error('LocalStorage kaydetme hatası:', error);
    }
  },

  // Tüm fotoğrafları getir
  getPhotos: (): LocalPhoto[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('LocalStorage okuma hatası:', error);
      return [];
    }
  },

  // Kullanıcının fotoğraflarını getir
  getUserPhotos: (userId: string): LocalPhoto[] => {
    const allPhotos = localStorageUtils.getPhotos();
    return allPhotos.filter(photo => photo.userId === userId);
  },

  // Fotoğraf sil
  deletePhoto: (photoId: string): void => {
    try {
      const existingPhotos = localStorageUtils.getPhotos();
      const updatedPhotos = existingPhotos.filter(photo => photo.id !== photoId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPhotos));
    } catch (error) {
      console.error('LocalStorage silme hatası:', error);
    }
  },

  // File'ı base64'e çevir
  fileToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  },

  // Toplam kayıtlı veriyi temizle (geliştirme amaçlı)
  clearAll: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
}; 