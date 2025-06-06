"use client";
import { useState, useEffect } from "react";
import BucketCreator from "../components/BucketCreator";
import { supabase } from "../src/lib/supabaseClient";
import { localStorageUtils } from "../src/lib/localStorageUtils";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

// HEIC dosya kontrolü
function isHeicFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith('.heic') || lowerName.endsWith('.heif');
}

// HEIC placeholder URL'i
function getHeicPlaceholder(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='100' y='90' text-anchor='middle' font-family='Arial' font-size='14' fill='%23374151'%3EHEIC Dosyası%3C/text%3E%3Ctext x='100' y='110' text-anchor='middle' font-family='Arial' font-size='12' fill='%236b7280'%3EÖnizleme mevcut değil%3C/text%3E%3Ctext x='100' y='130' text-anchor='middle' font-family='Arial' font-size='10' fill='%236b7280'%3ETıklayarak büyütebilirsiniz%3C/text%3E%3C/svg%3E";
}

// Dosya adını güvenli hale getir
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
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default function HomePage() {
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<any[]>([]);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [existingUsers, setExistingUsers] = useState<Set<string>>(new Set());
  
  // Progress bar state'leri
  const [uploadProgress, setUploadProgress] = useState({
    isUploading: false,
    totalFiles: 0,
    uploadedFiles: 0,
    currentFileName: '',
    percentage: 0
  });

  // LocalStorage'dan yükle
  useEffect(() => {
    const storedName = localStorage.getItem("dugunPhotoUserName");
    const storedPhotos = localStorage.getItem("dugunPhotoUserPhotos");
    
    if (storedName) {
      setName(storedName);
    }
    
    if (storedPhotos) {
      try {
        const parsedPhotos = JSON.parse(storedPhotos);
        setPhotos(parsedPhotos);
      } catch (err) {
        console.warn("Stored photos parse hatası:", err);
      }
    }

    fetchExistingUsers();
  }, []);

  // Notification temizle
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Object URL'leri temizle
  useEffect(() => {
    return () => {
      photos.forEach(photo => {
        if (photo.url && photo.url.startsWith('blob:')) {
          URL.revokeObjectURL(photo.url);
        }
      });
    };
  }, [photos]);

  // Klavye navigasyonu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto || selectedPhotoIndex === null) return;
    
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = (selectedPhotoIndex + 1) % photos.length;
        setSelectedPhotoIndex(nextIndex);
        setSelectedPhoto(photos[nextIndex]);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = (selectedPhotoIndex - 1 + photos.length) % photos.length;
        setSelectedPhotoIndex(prevIndex);
        setSelectedPhoto(photos[prevIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedPhoto(null);
        setSelectedPhotoIndex(null);
      }
    };

    if (selectedPhoto) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPhoto, selectedPhotoIndex, photos]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  // Progress bar ile dosya yükleme
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = Array.from(files).filter(file => {
      if (file.size > maxSize) {
        showNotification(`${file.name} dosyası 10MB'dan büyük, atlandı`, 'error');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      showNotification("Geçerli dosya bulunamadı", 'error');
      return;
    }

    // Progress bar başlat
    setUploadProgress({
      isUploading: true,
      totalFiles: validFiles.length,
      uploadedFiles: 0,
      currentFileName: '',
      percentage: 0
    });

    const localPhotos: any[] = [];

    // Local preview'ler oluştur
    for (const file of validFiles) {
      const localPhoto = {
        id: Date.now() + Math.random(),
        name: sanitizeFileName(file.name),
        url: URL.createObjectURL(file),
        user: name,
        uploadedAt: new Date().toLocaleString('tr-TR'),
        isLocal: true
      };
      localPhotos.push(localPhoto);
    }

    // State'e ekle
    const updatedPhotos = [...photos, ...localPhotos];
    setPhotos(updatedPhotos);
    localStorage.setItem("dugunPhotoUserPhotos", JSON.stringify(updatedPhotos));

    // Supabase'e yükle
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const localPhoto = localPhotos[i];
      
      // Progress güncelle
      setUploadProgress(prev => ({
        ...prev,
        currentFileName: file.name,
        uploadedFiles: i,
        percentage: Math.round((i / validFiles.length) * 100)
      }));
      
      try {
        const fileName = `${Date.now()}_${name.replace(/\s+/g, '_')}_${sanitizeFileName(file.name)}`;
        const { data, error } = await supabase.storage
          .from('photos')
          .upload(fileName, file);
        
        if (error) {
          console.warn(`Supabase upload hatası (${file.name}):`, error);
        } else {
          const { data: publicUrl } = supabase.storage
            .from('photos')
            .getPublicUrl(fileName);
          
          const cloudPhoto = {
            ...localPhoto,
            url: publicUrl.publicUrl,
            isLocal: false,
            supabaseFileName: fileName
          };
          
          setPhotos(prevPhotos => {
            const finalPhotos = prevPhotos.map(p => 
              p.id === localPhoto.id ? cloudPhoto : p
            );
            localStorage.setItem("dugunPhotoUserPhotos", JSON.stringify(finalPhotos));
            return finalPhotos;
          });
        }
      } catch (err) {
        console.warn(`Upload denemesi başarısız (${file.name}):`, err);
      }
    }

    // Final progress
    setUploadProgress(prev => ({
      ...prev,
      uploadedFiles: validFiles.length,
      percentage: 100,
      currentFileName: 'Tamamlandı!'
    }));

    // Success notification
    if (validFiles.length === 1) {
      showNotification("Fotoğraf yüklendi! 📸", 'success');
    } else {
      showNotification(`${validFiles.length} fotoğraf yüklendi! 📸`, 'success');
    }

    // Otomatik yedekleme kontrolü (arka planda)
    try {
      const response = await fetch('/api/cleanup/smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numberOfFiles: 20 })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log("Otomatik yedekleme ve temizlik tamamlandı:", result.message);
          showNotification("📂 Otomatik yedekleme tamamlandı!", 'success');
        }
      }
    } catch (error) {
      console.warn("Otomatik yedekleme kontrolü hatası:", error);
      // Kullanıcıya hata mesajı gösterme, sessizce geç
    }

    // Progress bar'ı gizle
    setTimeout(() => {
      setUploadProgress(prev => ({
        ...prev,
        isUploading: false
      }));
    }, 2000);
    
    e.target.value = '';
  };

  const handleNameSubmit = async (newName: string) => {
    const trimmedName = newName.trim();
    
    if (!trimmedName) {
      showNotification("Lütfen geçerli bir isim girin", 'error');
      return;
    }

    setIsCheckingUsername(true);
    
    try {
      await fetchExistingUsers();
      
      if (!checkUsernameUniqueness(trimmedName)) {
        const suggestion = suggestAlternativeUsername(trimmedName);
        showNotification(
          `"${trimmedName}" adında bir kullanıcı zaten var. Alternatif: "${suggestion}"`, 
          'error'
        );
        setIsCheckingUsername(false);
        return;
      }

      setName(trimmedName);
      localStorage.setItem("dugunPhotoUserName", trimmedName);
      showNotification(`Hoş geldiniz, ${trimmedName}! 👋`, 'success');
      
      setExistingUsers(prev => new Set([...prev, trimmedName.toLowerCase()]));
      
    } catch (err) {
      console.error("Kullanıcı adı kontrolü hatası:", err);
      showNotification("Giriş sırasında bir hata oluştu, tekrar deneyin", 'error');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleDeletePhoto = async (photoToDelete: any) => {
    try {
      if (photoToDelete.user !== name) {
        showNotification("Sadece kendi fotoğraflarınızı silebilirsiniz", 'error');
        return;
      }
      
      const updatedPhotos = photos.filter(p => p.id !== photoToDelete.id);
      setPhotos(updatedPhotos);
      localStorage.setItem("dugunPhotoUserPhotos", JSON.stringify(updatedPhotos));
      
      if (photoToDelete.url && photoToDelete.url.startsWith('blob:')) {
        URL.revokeObjectURL(photoToDelete.url);
      }
      
      if (photoToDelete.supabaseFileName) {
        const { error } = await supabase.storage
          .from('photos')
          .remove([photoToDelete.supabaseFileName]);
      
        if (error) {
          console.warn("Supabase'den silme hatası:", error);
        }
      }
      
      showNotification("Fotoğraf silindi", 'success');
      setSelectedPhoto(null);
      
    } catch (err) {
      console.error("Silme hatası:", err);
      showNotification("Silme işlemi başarısız", 'error');
    }
  };

  function getUserFromFileName(fileName: string): string {
    const parts = fileName?.split('_') || [];
    if (parts.length >= 2) {
      return parts[1].replace(/_/g, ' ');
    }
    return '';
  }

  const fetchExistingUsers = async () => {
    try {
      const { data, error } = await supabase.storage.from("photos").list("", {
        sortBy: { column: 'name', order: 'desc' }
      });
      
      if (error) {
        console.warn("Kullanıcı listesi alınamadı:", error);
        return;
      }

      if (data) {
        const users = new Set<string>();
        data.forEach(photo => {
          if (photo.name !== ".emptyFolderPlaceholder") {
            const userName = getUserFromFileName(photo.name);
            if (userName) {
              users.add(userName.toLowerCase());
            }
          }
        });
        setExistingUsers(users);
      }
    } catch (err) {
      console.warn("Kullanıcı listesi alınamadı:", err);
    }
  };

  const checkUsernameUniqueness = (username: string): boolean => {
    return !existingUsers.has(username.toLowerCase().trim());
  };

  const suggestAlternativeUsername = (username: string): string => {
    let counter = 1;
    let suggestion = `${username} ${counter}`;
    
    while (existingUsers.has(suggestion.toLowerCase())) {
      counter++;
      suggestion = `${username} ${counter}`;
    }
    
    return suggestion;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg transform transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress.isUploading && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Fotoğraflar Yükleniyor... ({uploadProgress.uploadedFiles}/{uploadProgress.totalFiles})
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-xs">
                    {uploadProgress.currentFileName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-blue-600">
                  %{uploadProgress.percentage}
                </span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress.percentage}%` }}
              ></div>
            </div>
            
            {/* Success Animation */}
            {uploadProgress.percentage === 100 && (
              <div className="flex items-center justify-center mt-2">
                <div className="flex items-center gap-2 text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">Tamamlandı!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress bar aktifken üstten boşluk */}
        <div className={uploadProgress.isUploading ? "pt-20" : ""}>
          
          {/* Header */}
          <header className="text-center mb-12 relative">
            <div className="absolute top-0 right-0">
              <a 
                href="/admin"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-violet-600 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Admin Panel
              </a>
            </div>

            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Düğün Fotoğrafları
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              En güzel anılarınızı paylaşın ve sevdiklerinizle birlikte görün
            </p>
          </header>

          {/* Name Input Section */}
          {!name && (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8 max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Hoş Geldiniz!</h2>
                <p className="text-gray-600 mb-3">Fotoğraflarınızın altında görünecek isminizi girin</p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-blue-700 text-sm text-left">
                      Her isim benzersiz olmalıdır. Aynı isimde başka bir kullanıcı varsa size alternatif önerilecektir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Adınız ve Soyadınız"
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
                  disabled={isCheckingUsername}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim() && !isCheckingUsername) {
                      handleNameSubmit(e.currentTarget.value.trim());
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input') as HTMLInputElement;
                    if (input?.value.trim() && !isCheckingUsername) {
                      handleNameSubmit(input.value.trim());
                    } else if (!input?.value.trim()) {
                      showNotification("Lütfen isminizi girin", 'error');
                    }
                  }}
                  disabled={isCheckingUsername}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isCheckingUsername ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Kontrol Ediliyor...
                    </div>
                  ) : (
                    'Devam Et'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          {name && (
            <div className="space-y-8">
              {/* Welcome Message */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold">{name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Hoş geldiniz, {name}!</h3>
                      <p className="text-emerald-100">Fotoğraflarınızı yüklemeye başlayabilirsiniz</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem("dugunPhotoUserName");
                      localStorage.removeItem("dugunPhotoUserPhotos");
                      setName("");
                      setPhotos([]);
                      setExistingUsers(new Set());
                      showNotification("Çıkış yapıldı", 'success');
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all text-sm font-medium"
                  >
                    Çıkış Yap
                  </button>
                </div>
              </div>

              {/* Upload Section */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Fotoğraf Yükle</h2>
                  <p className="text-gray-600">Düğün fotoğraflarınızı seçin ve yükleyin</p>
                </div>
                
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="fileInput"
                  />
                  <label 
                    htmlFor="fileInput" 
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-3xl hover:border-violet-400 hover:bg-violet-50 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-violet-100 group-hover:bg-violet-200 rounded-2xl flex items-center justify-center transition-colors">
                        <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                          Fotoğraf Seçin
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          PNG, JPG, WEBP - Çoklu seçim desteklenir - Maksimum 10MB/dosya
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Photos Grid */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Fotoğraflar
                  </h2>
                  <div className="bg-violet-100 text-violet-800 px-4 py-2 rounded-full text-sm font-semibold">
                    {photos.length} fotoğraf
                  </div>
                </div>
                
                {photos.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz fotoğraf yok</h3>
                    <p className="text-gray-600">İlk fotoğrafınızı yükleyerek başlayın!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {photos.map((photo, index) => (
                      <div key={photo.id} className="group relative">
                        <div 
                          className="aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                          onClick={() => {
                            setSelectedPhoto(photo);
                            setSelectedPhotoIndex(index);
                          }}
                        >
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              if (isHeicFile(photo.name)) {
                                e.currentTarget.src = getHeicPlaceholder();
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-sm">{photo.user}</p>
                                <p className="text-xs text-gray-300">{photo.uploadedAt}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {isHeicFile(photo.name) && (
                                  <div className="bg-orange-500/80 text-orange-100 px-2 py-1 rounded text-xs font-medium">
                                    HEIC
                                  </div>
                                )}
                                {photo.isLocal ? (
                                  <div className="bg-yellow-500/80 text-yellow-100 px-2 py-1 rounded text-xs font-medium">
                                    Yerel
                                  </div>
                                ) : (
                                  <div className="bg-green-500/80 text-green-100 px-2 py-1 rounded text-xs font-medium">
                                    Bulut
                                  </div>
                                )}
                                {photo.user === name && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePhoto(photo);
                                    }}
                                    className="bg-red-500/80 hover:bg-red-600 text-white p-1 rounded text-xs transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button 
              onClick={() => {
                setSelectedPhoto(null);
                setSelectedPhotoIndex(null);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {photos.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPhotoIndex !== null) {
                      const prevIndex = (selectedPhotoIndex - 1 + photos.length) % photos.length;
                      setSelectedPhotoIndex(prevIndex);
                      setSelectedPhoto(photos[prevIndex]);
                    }
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-3 hover:bg-black/70 transition-all shadow-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPhotoIndex !== null) {
                      const nextIndex = (selectedPhotoIndex + 1) % photos.length;
                      setSelectedPhotoIndex(nextIndex);
                      setSelectedPhoto(photos[nextIndex]);
                    }
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-3 hover:bg-black/70 transition-all shadow-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-xl z-10">
              <p className="font-semibold">{selectedPhoto.user}</p>
              <p className="text-sm text-gray-300">{selectedPhoto.uploadedAt}</p>
            </div>
            
            {selectedPhoto.user === name && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => handleDeletePhoto(selectedPhoto)}
                  className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Sil</span>
                </button>
              </div>
            )}
            
            {isHeicFile(selectedPhoto.name) && (
              <div className="absolute top-16 left-4 bg-orange-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl shadow-lg z-20">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">HEIC dosyası - Tıklayınca büyük görünür</span>
                </div>
              </div>
            )}
            
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.name}
              className="w-full h-full object-contain rounded-2xl"
              onError={(e) => {
                if (isHeicFile(selectedPhoto.name)) {
                  e.currentTarget.src = getHeicPlaceholder();
                }
              }}
            />
            
            {photos.length > 1 && selectedPhotoIndex !== null && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-sm py-2 px-4 rounded-full">
                {selectedPhotoIndex + 1} / {photos.length}
              </div>
            )}

            {photos.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs py-1 px-3 rounded-full">
                ← → tuşlarını kullanabilirsiniz
              </div>
            )}

            <div className="absolute bottom-4 left-4 flex space-x-2">
              {isHeicFile(selectedPhoto.name) && (
                <div className="bg-orange-500/80 text-orange-100 px-3 py-1 rounded-full text-sm font-medium">
                  📋 HEIC
                </div>
              )}
              {selectedPhoto.isLocal ? (
                <div className="bg-yellow-500/80 text-yellow-100 px-3 py-1 rounded-full text-sm font-medium">
                  📱 Yerel
                </div>
              ) : (
                <div className="bg-green-500/80 text-green-100 px-3 py-1 rounded-full text-sm font-medium">
                  ☁️ Bulut
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BucketCreator />
    </div>
  );
} 