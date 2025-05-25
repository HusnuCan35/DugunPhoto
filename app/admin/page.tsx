'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [downloadAll, setDownloadAll] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [filterUser, setFilterUser] = useState<string>('');

  useEffect(() => {
    fetchPhotos();
  }, []);

  async function fetchPhotos() {
    setIsLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.storage.from("photos").list("", {
        sortBy: { column: 'name', order: 'desc' }
      });
      
      if (error) {
        setError("Fotoğraflar yüklenemedi: " + error.message);
        setPhotos([]);
      } else {
        const filteredData = (data || []).filter(photo => photo.name !== ".emptyFolderPlaceholder");
        const processed = filteredData.map((photo: any) => ({
          ...photo,
          publicUrl: supabase.storage.from("photos").getPublicUrl(photo.name).data?.publicUrl || ""
        }));
        setPhotos(processed);
      }
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeletePhoto(photoName: string) {
    if (!confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) return;
    try {
      const { error } = await supabase.storage.from("photos").remove([photoName]);
      if (error) {
        setError("Fotoğraf silinirken bir sorun oluştu.");
      } else {
        setSuccessMessage("Fotoğraf başarıyla silindi");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchPhotos();
      }
    } catch (err) {
      setError("Silme sırasında bir hata oluştu.");
    }
  }

  async function handleDeleteSelectedPhotos() {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`Seçili ${selectedPhotos.size} fotoğrafı silmek istediğinize emin misiniz?`)) return;
    
    try {
      const photoNames = Array.from(selectedPhotos);
      const { error } = await supabase.storage.from("photos").remove(photoNames);
      
      if (error) {
        setError("Seçili fotoğraflar silinirken bir sorun oluştu.");
      } else {
        setSuccessMessage(`${selectedPhotos.size} fotoğraf başarıyla silindi`);
        setTimeout(() => setSuccessMessage(""), 3000);
        setSelectedPhotos(new Set());
        setSelectAll(false);
        fetchPhotos();
      }
    } catch (err) {
      setError("Silme sırasında bir hata oluştu.");
    }
  }

  async function handleDownloadSelectedPhotos() {
    if (selectedPhotos.size === 0) return;
    
    setDownloadAll(true);
    setSuccessMessage("");
    setError("");
    
    try {
      const selectedPhotoObjects = photos.filter(photo => selectedPhotos.has(photo.name));
      
      for (const photo of selectedPhotoObjects) {
        const url = photo.publicUrl || (supabase.storage.from("photos").getPublicUrl(photo.name).data?.publicUrl || '/fallback/photo-placeholder.jpg');
        const link = document.createElement("a");
        link.href = url;
        link.download = photo.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setSuccessMessage(`${selectedPhotos.size} fotoğraf indirildi!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("İndirme sırasında bir hata oluştu.");
    } finally {
      setDownloadAll(false);
    }
  }

  async function handleDownloadAll() {
    if (photos.length === 0) return;
    setDownloadAll(true);
    setSuccessMessage("");
    setError("");
    try {
      for (const photo of photos) {
        const url = photo.publicUrl || (supabase.storage.from("photos").getPublicUrl(photo.name).data?.publicUrl || '/fallback/photo-placeholder.jpg');
        const link = document.createElement("a");
        link.href = url;
        link.download = photo.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      setSuccessMessage("Tüm fotoğraflar indirildi!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("İndirme sırasında bir hata oluştu.");
    } finally {
      setDownloadAll(false);
    }
  }

  function handleLogout() {
    window.location.href = "/";
  }

  function handleSelectPhoto(photoName: string) {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoName)) {
      newSelected.delete(photoName);
    } else {
      newSelected.add(photoName);
    }
    setSelectedPhotos(newSelected);
    setSelectAll(newSelected.size === photos.length);
  }

  function handleSelectAll() {
    if (selectAll) {
      setSelectedPhotos(new Set());
      setSelectAll(false);
    } else {
      const allPhotoNames = new Set(photos.map(photo => photo.name));
      setSelectedPhotos(allPhotoNames);
      setSelectAll(true);
    }
  }

  const filteredPhotos = photos.filter(photo => {
    if (!filterUser) return true;
    const userName = photo.name?.split('_')[1]?.replace(/_/g, ' ').toLowerCase() || '';
    return userName.includes(filterUser.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-500">
      {/* Modern Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Yönetici Paneli
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Düğün Fotoğrafları Yönetimi</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Link 
                href="/" 
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              >
            Ana Sayfa
          </Link>
          <button 
            onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
          >
            Çıkış Yap
          </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Fotoğraf</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{photos.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Seçili</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedPhotos.size}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1a2.25 2.25 0 00-2.5-2.5H13c-.55 0-1 .45-1 1s.45 1 1 1h5.5c.55 0 1-.45 1-1s-.45-1-1-1z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Kullanıcılar</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Set(photos.map(p => p.name?.split('_')[1] || 'unknown')).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50 mb-8">
          {/* Top Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Search/Filter */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {selectedPhotos.size > 0 && (
                <>
                  <button
                    onClick={handleDownloadSelectedPhotos}
                    disabled={downloadAll}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Seçilileri İndir ({selectedPhotos.size})
                  </button>
                  <button
                    onClick={handleDeleteSelectedPhotos}
                    className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Seçilileri Sil ({selectedPhotos.size})
                  </button>
                </>
              )}
              <button
                onClick={handleDownloadAll}
                disabled={downloadAll || photos.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {downloadAll ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
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
                    Tümünü İndir
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Select All */}
          {photos.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-5 h-5 text-purple-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 focus:ring-2 transition-all duration-200"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tümünü Seç ({selectedPhotos.size}/{filteredPhotos.length})
                </span>
              </label>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredPhotos.length} fotoğraf gösteriliyor
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-200 text-sm">
            {successMessage}
          </div>
        )}

        {/* Photos Grid/List */}
          {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <svg className="animate-spin h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600 dark:text-gray-400">Fotoğraflar yükleniyor...</p>
            </div>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-20">
            <svg className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filterUser ? 'Arama sonucu bulunamadı' : 'Henüz fotoğraf yok'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filterUser ? 'Farklı bir arama terimi deneyin' : 'Fotoğraflar yüklendiğinde burada görünecek'}
            </p>
          </div>
          ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              : "space-y-3"
          }>
            {filteredPhotos.map((photo: any, index: number) => {
                const photoUrl = photo.publicUrl || (supabase.storage.from("photos").getPublicUrl(photo.name).data?.publicUrl || '/fallback/photo-placeholder.jpg');
                const parts = photo.name?.split('_') || [];
              const userName = parts.length > 1 ? parts[1].replace(/_/g, ' ') : 'Bilinmeyen';
              
              if (viewMode === 'list') {
                return (
                  <div key={photo.name || photo.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedPhotos.has(photo.name)}
                        onChange={() => handleSelectPhoto(photo.name)}
                        className="w-5 h-5 text-purple-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                      />
                    <img
                      src={photoUrl}
                      alt="Düğün Fotoğrafı"
                        className="w-16 h-16 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                      onClick={() => {
                        setSelectedPhoto(photoUrl);
                        setSelectedPhotoIndex(index);
                      }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {userName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {photo.name}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={(e) => {
                            setSelectedPhoto(photoUrl);
                            setSelectedPhotoIndex(index);
                          }} 
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
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
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={photo.name || photo.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
                  {/* Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedPhotos.has(photo.name)}
                      onChange={() => handleSelectPhoto(photo.name)}
                      className="w-5 h-5 text-purple-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 focus:ring-2 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <img
                    src={photoUrl}
                    alt="Düğün Fotoğrafı"
                    className="object-cover w-full h-full cursor-pointer group-hover:scale-105 transition-transform duration-500"
                    onClick={() => {
                      setSelectedPhoto(photoUrl);
                      setSelectedPhotoIndex(index);
                    }}
                    onError={(e) => {
                      console.error("Fotoğraf yüklenemedi:", photo.name);
                      e.currentTarget.src = '/fallback/photo-placeholder.jpg';
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 flex gap-3 transition-all duration-300 transform scale-90 group-hover:scale-100">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhoto(photoUrl);
                          setSelectedPhotoIndex(index);
                        }} 
                        className="bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white p-3 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 shadow-lg hover:scale-110"
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
                        className="bg-white/90 dark:bg-gray-800/90 text-red-600 dark:text-red-400 p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 shadow-lg hover:scale-110"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* User Name */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-white text-sm font-medium truncate">
                      {userName}
                    </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </main>

      {/* Modern Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedPhoto(null);
            setSelectedPhotoIndex(null);
          }}
        >
          <div className="relative max-w-7xl max-h-full">
            {/* User Info */}
            {selectedPhotoIndex !== null && filteredPhotos[selectedPhotoIndex] && (
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white text-sm py-2 px-4 rounded-full z-10">
                {(() => {
                  const photo = filteredPhotos[selectedPhotoIndex];
                  const parts = photo.name?.split('_') || [];
                  return parts.length > 1 ? parts[1].replace(/_/g, ' ') : 'Bilinmeyen Kullanıcı';
                })()}
              </div>
            )}

            <img 
              src={selectedPhoto} 
              alt="Büyük Fotoğraf" 
              className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
            />
            
            {/* Close Button */}
            <button 
              className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white rounded-full p-3 hover:bg-black/80 transition-colors duration-200 z-10"
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
            
            {/* Navigation Arrows */}
            {filteredPhotos.length > 1 && (
              <>
            <button 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/70 backdrop-blur-sm text-white rounded-full p-3 hover:bg-black/80 transition-colors duration-200"
              onClick={(e) => {
                e.stopPropagation();
                    if (selectedPhotoIndex !== null) {
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
            
            <button 
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/70 backdrop-blur-sm text-white rounded-full p-3 hover:bg-black/80 transition-colors duration-200"
              onClick={(e) => {
                e.stopPropagation();
                    if (selectedPhotoIndex !== null) {
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
              </>
            )}
            
            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white text-sm py-2 px-4 rounded-full">
              {selectedPhotoIndex !== null ? `${selectedPhotoIndex + 1} / ${filteredPhotos.length}` : '1 / 1'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 