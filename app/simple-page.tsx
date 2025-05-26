"use client";
import { useEffect, useState } from "react";
import ThemeToggle from "../components/ThemeToggle";

export default function SimplePage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempUserName, setTempUserName] = useState("");

  useEffect(() => {
    const storedUserName = localStorage.getItem("dugunPhotoUserName");
    if (storedUserName) {
      setUserName(storedUserName);
    } else {
      setShowNameModal(true);
    }
  }, []);

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tempUserName.trim()) {
      localStorage.setItem("dugunPhotoUserName", tempUserName.trim());
      setUserName(tempUserName.trim());
      setShowNameModal(false);
    }
  }

  function handleUpload() {
    if (!file || !userName) return;
    
    // Basit upload simülasyonu
    const newPhoto = {
      id: Date.now().toString(),
      name: file.name,
      url: URL.createObjectURL(file),
      user: userName
    };
    
    setPhotos(prev => [...prev, newPhoto]);
    setFile(null);
    alert("Fotoğraf başarıyla yüklendi!");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Düğün Fotoğrafları
          </h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a href="/admin" className="text-blue-600 hover:text-blue-700">
              Admin
            </a>
          </div>
        </div>
      </header>

      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Adınızı Girin
            </h2>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={tempUserName}
                onChange={(e) => setTempUserName(e.target.value)}
                placeholder="Adınız ve Soyadınız"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <button
                type="submit"
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome */}
        {userName && (
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200">
              Hoş geldiniz, <strong>{userName}</strong>!
            </p>
          </div>
        )}

        {/* Upload Section */}
        <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Fotoğraf Yükle
          </h2>
          
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            {file && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Seçili: {file.name}
              </div>
            )}
            
            <button
              onClick={handleUpload}
              disabled={!file || !userName}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Yükle
            </button>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Fotoğraflar ({photos.length})
          </h2>
          
          {photos.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Henüz fotoğraf yok. İlk fotoğrafınızı yükleyin!
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 rounded-b-lg">
                    {photo.user}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 