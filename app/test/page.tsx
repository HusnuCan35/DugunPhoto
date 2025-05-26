"use client";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Test Sayfası
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              CSS Test
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Bu metin düzgün görünüyorsa CSS çalışıyor.
            </p>
            <button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
              Test Button
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Theme Test
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Dark/Light theme çalışıyor mu?
            </p>
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Theme Test Area
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <a 
            href="/" 
            className="inline-flex items-center text-purple-600 hover:text-purple-700 transition-colors"
          >
            ← Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </div>
  );
} 