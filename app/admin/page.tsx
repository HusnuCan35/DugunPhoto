"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../src/lib/supabaseClient";
import { localStorageUtils, LocalPhoto } from "../../src/lib/localStorageUtils";
import { validateAdminPassword } from "../../src/lib/adminAuth";
import { getStorageStats, performSimpleCleanup, formatBytes, StorageStats, BackupResult } from "../../src/lib/storageManager";
import Link from "next/link";
import ThemeToggle from "../../components/ThemeToggle";

// Supabase FileObject tipi için genişletme ekleyelim
type PhotoObject = {
  name: string;
  id: string;
  publicUrl: string;
  [key: string]: any;
};

const ADMIN_PASSWORD = "dugun2024"; // Güvenlik için .env'ye taşınmalı

// HEIC dosya kontrolü - dosya uzantısını kontrol et
function isHeicFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith('.heic') || lowerName.endsWith('.heif');
}

// HEIC placeholder URL'i
function getHeicPlaceholder(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='100' y='90' text-anchor='middle' font-family='Arial' font-size='14' fill='%23374151'%3EHEIC Dosyası%3C/text%3E%3Ctext x='100' y='110' text-anchor='middle' font-family='Arial' font-size='12' fill='%236b7280'%3EÖnizleme mevcut değil%3C/text%3E%3Ctext x='100' y='130' text-anchor='middle' font-family='Arial' font-size='10' fill='%236b7280'%3EDoğru fotoğraf indirilecektir%3C/text%3E%3C/svg%3E";
}

// Dosya adını güvenli hale getiren fonksiyon
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[ğ]/g, 'g')
    .replace(/[Ğ]/g, 'G')
    .replace(/[ü]/g, 'u')
    .replace(/[Ü]/g, 'U')
    .replace(/[ş]/g, 's')
    .replace(/[Ş]/g, 'S')
    .replace(/[ı]/g, 'i')
    .replace(/[İ]/g, 'I')
    .replace(/[ö]/g, 'o')
    .replace(/[Ö]/g, 'O')
    .replace(/[ç]/g, 'c')
    .replace(/[Ç]/g, 'C')
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // Özel karakterleri _ ile değiştir
}

// Dosya adından kullanıcı adını çıkaran fonksiyon
function getUserFromFileName(fileName: string): string {
  const parts = fileName?.split('_') || [];
  if (parts.length >= 2) {
    // İkinci kısım kullanıcı adı (timestamp_username_filename formatında)
    return parts[1].replace(/_/g, ' ');
  }
  return 'Bilinmeyen';
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [photos, setPhotos] = useState<PhotoObject[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoObject[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadAll, setDownloadAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stats, setStats] = useState({
    totalPhotos: 0,
    selectedCount: 0,
    uniqueUsers: 0
  });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // LocalStorage'den giriş durumunu kontrol et
  useEffect(() => {
    const storedAuth = localStorage.getItem("dugunPhotoAdminAuth");
    if (storedAuth === "true") {
      setIsLoggedIn(true);
      fetchPhotos();
    }
  }, []);

  // Arama ve filtreleme
  useEffect(() => {
    let filtered = photos;
    
    // Kullanıcı filtresi
    if (selectedUser) {
      filtered = filtered.filter(photo => getUserFromFileName(photo.name) === selectedUser);
    }
    
    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(photo => {
        const userName = getUserFromFileName(photo.name);
        return userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               photo.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    setFilteredPhotos(filtered);
  }, [searchTerm, selectedUser, photos]);

  // İstatistikleri güncelle
  useEffect(() => {
    const uniqueUsers = new Set(photos.map(photo => getUserFromFileName(photo.name))).size;

    setStats({
      totalPhotos: photos.length,
      selectedCount: selectedPhotos.size,
      uniqueUsers
    });
  }, [photos, selectedPhotos]);

  // Klavye ile gezinme fonksiyonu
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedPhotoIndex && selectedPhotoIndex !== 0) return;
    
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      // Sonraki fotoğrafa geç
      const nextIndex = (selectedPhotoIndex + 1) % filteredPhotos.length;
      setSelectedPhotoIndex(nextIndex);
      const nextPhoto = filteredPhotos[nextIndex];
      setSelectedPhoto(nextPhoto.publicUrl || (supabase.storage.from("photos").getPublicUrl(nextPhoto.name).data?.publicUrl || '/fallback/photo-placeholder.jpg'));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      // Önceki fotoğrafa geç
      const prevIndex = (selectedPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
      setSelectedPhotoIndex(prevIndex);
      const prevPhoto = filteredPhotos[prevIndex];
      setSelectedPhoto(prevPhoto.publicUrl || (supabase.storage.from("photos").getPublicUrl(prevPhoto.name).data?.publicUrl || '/fallback/photo-placeholder.jpg'));
    } else if (e.key === "Escape") {
      // Modalı kapat
      setSelectedPhoto(null);
      setSelectedPhotoIndex(null);
    }
  }, [selectedPhotoIndex, filteredPhotos]);

  // Modal açıkken klavye olaylarını dinle
  useEffect(() => {
    if (selectedPhoto !== null) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPhoto, handleKeyDown]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const isValid = await validateAdminPassword(password);
      
      if (isValid) {
        setIsLoggedIn(true);
        localStorage.setItem("dugunPhotoAdminAuth", "true");
        fetchPhotos();
      } else {
        setError("Şifre yanlış");
      }
    } catch (err) {
      console.error("Giriş hatası:", err);
      setError("Giriş sırasında bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    localStorage.removeItem("dugunPhotoAdminAuth");
  }

  async function fetchPhotos() {
    setIsLoading(true);
    setError("");
    
    try {
      // Admin olarak tüm fotoğrafları listeleme (userId filtrelemesi olmadan)
      console.log("Admin - Fotoğraflar yükleniyor...");
      const { data, error } = await supabase.storage.from("photos").list("", {
        sortBy: { column: 'name', order: 'desc' }
      });
      
      if (error) {
        console.error("Admin - Fotoğraf listesi hatası:", error);
        console.error("Hata detayları:", JSON.stringify(error, null, 2));
        
        // Storage hatası varsa boş liste göster ama hata mesajı gösterme
        setPhotos([]);
        return;
      } else {
        console.log("Admin - Fotoğraflar başarıyla yüklendi:", data?.length || 0);
        
        // Fotoğrafları işle ve URL'leri hazırla
        const processedPhotos: PhotoObject[] = [];
        
        for (const photo of data || []) {
          // ".emptyFolderPlaceholder" dosyasını atla
          if (photo.name === ".emptyFolderPlaceholder") {
            continue;
          }
          
          // Fotoğraf URL'ini al
          const { data: urlData } = supabase.storage.from("photos").getPublicUrl(photo.name);
          const publicUrl = urlData?.publicUrl || '';
          
          // Nesneyi genişlet
          processedPhotos.push({
            ...photo,
            publicUrl
          });
        }
        
        console.log("İşlenmiş fotoğraflar:", processedPhotos.length);
        setPhotos(processedPhotos);
      }
    } catch (err) {
      console.error("Admin - Beklenmeyen hata:", err);
      setError("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }

    // Depolama istatistiklerini al
    try {
      const storage = await getStorageStats();
      setStorageStats(storage);
    } catch (err) {
      console.warn("Depolama istatistikleri alınamadı:", err);
    }
  }

  async function handleDownloadSelected() {
    const photosToDownload = selectedPhotos.size > 0 
      ? filteredPhotos.filter(photo => selectedPhotos.has(photo.name))
      : filteredPhotos;
    
    if (photosToDownload.length === 0) {
      setError("İndirilecek fotoğraf yok.");
      return;
    }
    
    setDownloadAll(true);
    setSuccessMessage("");
    setError("");
    
    try {
      for (const photo of photosToDownload) {
        if (photo.name === ".emptyFolderPlaceholder") continue;
        
        const url = photo.publicUrl;
        const link = document.createElement("a");
        link.href = url;
        link.download = photo.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setSuccessMessage(`${photosToDownload.length} fotoğraf indirildi!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("İndirme hatası:", err);
      setError("İndirme sırasında bir hata oluştu.");
    } finally {
      setDownloadAll(false);
    }
  }

  async function handleDeleteSelected() {
    const photosToDelete = selectedPhotos.size > 0 
      ? Array.from(selectedPhotos)
      : filteredPhotos.map(photo => photo.name);
    
    if (photosToDelete.length === 0) return;
    
    if (!confirm(`${photosToDelete.length} fotoğrafı silmek istediğinize emin misiniz?`)) return;
    
    try {
      const { error } = await supabase.storage.from("photos").remove(photosToDelete);
      
      if (error) {
        setError("Fotoğraflar silinemedi: " + error.message);
      } else {
        setSuccessMessage(`${photosToDelete.length} fotoğraf başarıyla silindi`);
        setTimeout(() => setSuccessMessage(""), 3000);
        setSelectedPhotos(new Set());
        fetchPhotos();
      }
    } catch (err) {
      console.error("Silme hatası:", err);
      setError("Silme sırasında bir hata oluştu.");
    }
  }

  async function handleDeletePhoto(photoName: string) {
    if (!confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) return;
    
    try {
      const { error } = await supabase.storage.from("photos").remove([photoName]);
      
      if (error) {
        setError("Fotoğraf silinemedi: " + error.message);
      } else {
        setSuccessMessage("Fotoğraf başarıyla silindi");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchPhotos();
      }
    } catch (err) {
      console.error("Silme hatası:", err);
      setError("Silme sırasında bir hata oluştu.");
    }
  }

  async function handleBackup() {
    if (!confirm("En eski fotoğrafları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    
    setIsBackingUp(true);
    setBackupResult(null);
    setError("");
    
    try {
      const result = await performSimpleCleanup(20); // 20 dosya sil
      setBackupResult(result);
      
      if (result.success) {
        setSuccessMessage(result.message);
        setTimeout(() => setSuccessMessage(""), 5000);
        // Fotoğraf listesini ve depolama istatistiklerini yenile
        fetchPhotos();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error("Temizlik hatası:", err);
      setError("Temizlik sırasında bir hata oluştu");
    } finally {
      setIsBackingUp(false);
    }
  }

  function handlePhotoClick(photoUrl: string, index: number) {
    setSelectedPhoto(photoUrl);
    setSelectedPhotoIndex(index);
  }

  function togglePhotoSelection(photoName: string) {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoName)) {
      newSelected.delete(photoName);
    } else {
      newSelected.add(photoName);
    }
    setSelectedPhotos(newSelected);
  }

  function selectAllPhotos() {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map(photo => photo.name)));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Dosya boyutu kontrolü
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validFiles = Array.from(files).filter(file => {
        if (file.size > maxSize) {
          setError(`${file.name} dosyası 10MB'dan büyük, atlandı`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        setError("Geçerli dosya bulunamadı");
        return;
      }

      let uploadedCount = 0;
      let failedCount = 0;

      // Her dosya için upload işlemi
      for (const file of validFiles) {
        try {
          const fileName = `${Date.now()}_admin_${sanitizeFileName(file.name)}`;
          const { data, error } = await supabase.storage
            .from('photos')
            .upload(fileName, file);
          
          if (error) {
            console.warn(`Upload hatası (${file.name}):`, error);
            failedCount++;
          } else {
            console.log(`Başarıyla yüklendi (${file.name}):`, data);
            uploadedCount++;
          }
        } catch (err) {
          console.warn(`Upload denemesi başarısız (${file.name}):`, err);
          failedCount++;
        }
      }

      // Sonuç mesajı
      if (uploadedCount > 0) {
        setSuccessMessage(`${uploadedCount} fotoğraf başarıyla yüklendi!`);
        // Fotoğraf listesini yenile
        await fetchPhotos();
      }
      
      if (failedCount > 0) {
        setError(`${failedCount} fotoğraf yüklenemedi`);
      }

    } catch (err) {
      console.error("Upload işlemi hatası:", err);
      setError("Fotoğraf yükleme sırasında bir hata oluştu");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  // Unique kullanıcıları al
  const getUniqueUsers = () => {
    const users = Array.from(new Set(photos.map(photo => getUserFromFileName(photo.name))))
      .filter(user => user !== 'Bilinmeyen')
      .sort();
    return users;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20 flex items-center justify-center p-4">
        <div className="absolute top-4 left-4">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ana Sayfaya Dön
        </Link>
        </div>
        
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Yönetici Girişi
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Admin paneline erişmek için şifrenizi girin
            </p>
          </div>

          <form onSubmit={handleLogin} className="card p-8 space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Şifre
              </label>
          <input
                id="password"
            type="password"
                placeholder="Şifrenizi girin"
            value={password}
            onChange={e => setPassword(e.target.value)}
                className="input w-full px-4 py-3"
                required
          />
            </div>
            
          <button 
            type="submit" 
              className="btn-primary w-full py-3 text-lg"
              disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Kontrol Ediliyor...
              </div>
            ) : (
              'Giriş Yap'
            )}
          </button>
            
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
              </div>
            )}
        </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Admin Panel
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Düğün Fotoğraf Yönetimi</p>
                </div>
              </div>
            </div>

            <nav className="flex items-center gap-4">
              <Link 
                href="/" 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
            Ana Sayfa
          </Link>
              <ThemeToggle />
          <button 
            onClick={handleLogout}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            Çıkış Yap
          </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Fotoğraf</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPhotos}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Seçili Fotoğraf</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.selectedCount}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Kullanıcı Sayısı</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.uniqueUsers}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Depolama İstatistikleri */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Depolama Kullanımı</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {storageStats ? `%${storageStats.percentUsed}` : '---'}
                </p>
                {storageStats && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatBytes(storageStats.totalSize)} / 4.5 GB
                  </p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                storageStats?.isNearLimit 
                  ? 'bg-red-100 dark:bg-red-900/20' 
                  : 'bg-orange-100 dark:bg-orange-900/20'
              }`}>
                <svg className={`w-6 h-6 ${
                  storageStats?.isNearLimit 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6v12h6V6H9zm2 2h2v8h-2V8z" />
                </svg>
              </div>
            </div>
            {storageStats && storageStats.isNearLimit && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      storageStats.needsCleanup 
                        ? 'bg-red-600' 
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(storageStats.percentUsed, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kontrol Paneli */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Arama */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Kullanıcı adı veya dosya adı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>

              {/* Kullanıcı Filtresi */}
              <div className="relative max-w-xs">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="input w-full appearance-none bg-white dark:bg-gray-800 pr-10"
                >
                  <option value="">Tüm Kullanıcılar</option>
                  {getUniqueUsers().map((user) => (
                    <option key={user} value={user}>
                      {user} ({photos.filter(p => getUserFromFileName(p.name) === user).length})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Görünüm Modu */}
              <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Eylem Butonları */}
            <div className="flex flex-wrap gap-3">
              {/* Fotoğraf Yükleme */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="adminFileInput"
                  disabled={isUploading}
                />
                <button 
                  type="button"
                  className={`btn-primary text-sm flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Yükleniyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Fotoğraf Yükle
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={selectAllPhotos}
                className="btn-secondary text-sm"
              >
                {selectedPhotos.size === filteredPhotos.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
              </button>

              {/* Alan Temizleme */}
              {storageStats && storageStats.isNearLimit && (
                <button
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBackingUp ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Temizleniyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eski Fotoğrafları Sil
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleDownloadSelected}
                disabled={downloadAll || filteredPhotos.length === 0}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadAll ? (
                  <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    İndiriliyor...
                  </>
                ) : (
                  <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {selectedPhotos.size > 0 ? `Seçilenleri İndir (${selectedPhotos.size})` : 'Tümünü İndir'}
                    </>
                  )}
              </button>

              {selectedPhotos.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 text-sm font-medium"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Seçilenleri Sil ({selectedPhotos.size})
                </button>
              )}
            </div>
          </div>

          {/* Mesajlar */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {successMessage && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-green-600 dark:text-green-400 text-sm">{successMessage}</p>
            </div>
          )}
        </div>

        {/* Fotoğraf Listesi */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Fotoğraflar ({filteredPhotos.length})
            </h2>
            {(searchTerm || selectedUser) && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm && selectedUser && `"${searchTerm}" araması ve "${selectedUser}" kullanıcısı için ${filteredPhotos.length} sonuç`}
                {searchTerm && !selectedUser && `"${searchTerm}" için ${filteredPhotos.length} sonuç`}
                {!searchTerm && selectedUser && `"${selectedUser}" kullanıcısı için ${filteredPhotos.length} sonuç`}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Fotoğraflar yükleniyor...</p>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz fotoğraf yok'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'Farklı bir arama terimi deneyin' : 'Kullanıcılar fotoğraf yüklediğinde burada görünecek'}
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" 
              : "space-y-3"
            }>
              {filteredPhotos.map((photo: PhotoObject, index: number) => {
                if (photo.name === ".emptyFolderPlaceholder") return null;
                
                const photoUrl = photo.publicUrl || 
                  (supabase.storage.from("photos").getPublicUrl(photo.name).data?.publicUrl || 
                  '/fallback/photo-placeholder.jpg');
                
                const userName = getUserFromFileName(photo.name);
                
                const isSelected = selectedPhotos.has(photo.name);
                
                if (viewMode === 'list') {
                  return (
                    <div key={photo.name || photo.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePhotoSelection(photo.name)}
                          className="absolute top-2 left-2 z-10 w-4 h-4 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500"
                        />
                        <img
                          src={photoUrl}
                          alt="Düğün Fotoğrafı"
                          className="w-16 h-16 object-cover rounded-lg cursor-pointer"
                          onClick={() => handlePhotoClick(photoUrl, index)}
                          onError={(e) => {
                            // HEIC dosyaları için fallback
                            if (isHeicFile(photo.name)) {
                              e.currentTarget.src = getHeicPlaceholder();
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {userName !== 'Bilinmeyen' ? userName : 'Bilinmeyen'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {photo.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handlePhotoClick(photoUrl, index)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeletePhoto(photo.name)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={photo.name || photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 hover:shadow-lg transition-all duration-300">
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePhotoSelection(photo.name)}
                        className="w-4 h-4 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 shadow-sm"
                      />
                    </div>
                    
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Düğün Fotoğrafı"
                        className="object-cover w-full h-full cursor-pointer group-hover:scale-105 transition-transform duration-300"
                        onClick={() => handlePhotoClick(photoUrl, index)}
                        onError={(e) => {
                          console.error("Fotoğraf yüklenemedi:", photo.name);
                          // HEIC dosyaları için özel fallback
                          if (isHeicFile(photo.name)) {
                            e.currentTarget.src = getHeicPlaceholder();
                          } else {
                          e.currentTarget.src = '/fallback/photo-placeholder.jpg';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Yüklenemedi</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePhotoClick(photoUrl, index);
                          }} 
                          className="bg-white/90 backdrop-blur-sm text-gray-800 p-2.5 rounded-full hover:bg-white transform hover:scale-110 transition-all shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(photo.name);
                          }} 
                          className="bg-white/90 backdrop-blur-sm text-red-600 p-2.5 rounded-full hover:bg-white transform hover:scale-110 transition-all shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-xs font-medium truncate">
                      {userName !== 'Bilinmeyen' ? userName : 'Bilinmeyen'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Büyük fotoğraf görüntüleme modalı */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedPhoto(null);
            setSelectedPhotoIndex(null);
          }}
        >
          <div className="relative max-w-6xl max-h-full">
            {/* HEIC uyarısı */}
            {selectedPhotoIndex !== null && isHeicFile(filteredPhotos[selectedPhotoIndex]?.name || '') && (
              <div className="absolute top-16 left-4 bg-orange-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl shadow-lg z-20">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">HEIC dosyası - İndirme düzgün çalışır</span>
                </div>
              </div>
            )}
            
            <img 
              src={selectedPhoto} 
              alt="Büyük Fotoğraf" 
              className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
              onError={(e) => {
                // HEIC dosyaları için fallback
                if (selectedPhotoIndex !== null && isHeicFile(filteredPhotos[selectedPhotoIndex]?.name || '')) {
                  e.currentTarget.src = getHeicPlaceholder();
                }
              }}
            />
            
            {/* Kullanıcı adı - sol üst */}
            {selectedPhotoIndex !== null && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium">
                    {(() => {
                      const currentPhoto = filteredPhotos[selectedPhotoIndex];
                      if (!currentPhoto) return 'Bilinmeyen';
                      return getUserFromFileName(currentPhoto.name);
                    })()}
                  </span>
                </div>
              </div>
            )}
            
            {/* Kapatma butonu */}
            <button 
              className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white rounded-full p-3 hover:bg-black/70 transition-all shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhoto(null);
                setSelectedPhotoIndex(null);
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Sol ok */}
            <button 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-3 hover:bg-black/70 transition-all shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedPhotoIndex !== null && filteredPhotos.length > 1) {
                  const prevIndex = (selectedPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
                  setSelectedPhotoIndex(prevIndex);
                  const prevPhoto = filteredPhotos[prevIndex];
                  const prevPhotoUrl = prevPhoto.publicUrl || 
                    (supabase.storage.from("photos").getPublicUrl(prevPhoto.name).data?.publicUrl || 
                    '/fallback/photo-placeholder.jpg');
                  setSelectedPhoto(prevPhotoUrl);
                }
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Sağ ok */}
            <button 
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-3 hover:bg-black/70 transition-all shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedPhotoIndex !== null && filteredPhotos.length > 1) {
                  const nextIndex = (selectedPhotoIndex + 1) % filteredPhotos.length;
                  setSelectedPhotoIndex(nextIndex);
                  const nextPhoto = filteredPhotos[nextIndex];
                  const nextPhotoUrl = nextPhoto.publicUrl || 
                    (supabase.storage.from("photos").getPublicUrl(nextPhoto.name).data?.publicUrl || 
                    '/fallback/photo-placeholder.jpg');
                  setSelectedPhoto(nextPhotoUrl);
                }
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Fotoğraf bilgisi */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-sm py-2 px-4 rounded-full">
              {selectedPhotoIndex !== null && `${selectedPhotoIndex + 1} / ${filteredPhotos.length}`}
            </div>
            
            {/* İpucu mesajı */}
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs py-1 px-3 rounded-full">
              ← → tuşlarını kullanabilirsiniz
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 