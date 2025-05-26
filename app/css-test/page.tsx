export default function CSSTest() {
  return (
    <div className="p-8 bg-blue-100 min-h-screen">
      <h1 className="text-4xl font-bold text-red-600 mb-4">CSS Test</h1>
      <p className="text-green-700 text-lg">Bu metin yeşil renkte görünüyorsa Tailwind çalışıyor!</p>
      <button className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mt-4">
        Test Butonu
      </button>
      <div className="mt-4 p-4 bg-yellow-200 rounded-lg">
        <p className="text-gray-800">Bu alan sarı arka plan ile görünmeli</p>
      </div>
    </div>
  );
} 