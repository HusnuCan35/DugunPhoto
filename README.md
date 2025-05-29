# 💒 Düğün Fotoğraf Uygulaması

Modern, responsive ve kullanıcı dostu düğün fotoğraf paylaşım platformu.

## ✨ Özellikler

- 📸 **Fotoğraf Yükleme**: Çoklu fotoğraf yükleme desteği
- 📊 **Progress Bar**: Çoklu fotoğraf yüklenirken gerçek zamanlı ilerleme takibi
- 🖼️ **Galeri Görünümü**: Modern grid layout ile fotoğraf galerisi
- 👨‍💼 **Admin Panel**: Fotoğraf yönetimi ve moderasyon
- 🌙 **Karanlık/Açık Tema**: Otomatik tema değiştirme
- 📱 **Responsive Tasarım**: Tüm cihazlarda mükemmel görünüm
- ☁️ **Supabase Entegrasyonu**: Güvenli bulut depolama
- 🔒 **Güvenli Admin Erişimi**: Bcrypt ile şifrelenmiş admin paneli
- 📊 **Speed Insights**: Vercel Speed Insights ile performans izleme
- 📈 **Analytics**: Vercel Analytics ile kullanıcı analizi
- 🔄 **Çoklu Seçim**: Tek seferde birden fazla fotoğraf yükleme
- 👥 **Benzersiz Kullanıcı Adları**: Her kullanıcı adı benzersiz olmalıdır
- 🔍 **Kullanıcı Filtreleme**: Admin panelinde kullanıcıya göre filtreleme
- 💾 **Depolama Yönetimi**: Otomatik alan izleme ve temizlik sistemi
- 🗑️ **Akıllı Temizlik**: Depolama %90 dolduğunda eski fotoğrafları otomatik sil

## 🚀 Canlı Demo

**Vercel**: [https://dugun-photo-app.vercel.app](https://dugun-photo-app.vercel.app)
**Supabase**: [https://sfqonnyzxfunhuzlrwml.supabase.co/functions/v1/public-site](https://sfqonnyzxfunhuzlrwml.supabase.co/functions/v1/public-site)

## 🛠️ Teknolojiler

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database + Storage)
- **Deployment**: Vercel, Supabase Edge Functions
- **Analytics**: Vercel Speed Insights & Analytics
- **Icons**: Heroicons

## 📦 Kurulum

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/HusnuCan35/DugunPhoto.git
cd DugunPhoto/dugun-photo-web
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Environment Variables
`.env.local` dosyası oluşturun:
```env
NEXT_PUBLIC_SUPABASE_URL=https://sfqonnyzxfunhuzlrwml.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Development Server
```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacak.

## 🌐 Vercel'e Deploy

### Otomatik Deploy (Önerilen)
1. GitHub'a push yapın
2. [Vercel Dashboard](https://vercel.com)'a gidin
3. "New Project" → GitHub repo seçin
4. **Root Directory**: Ana klasör (dugun-photo-web değil) seçin
5. Environment variables ekleyin
6. Deploy butonuna basın

**📊 Speed Insights**: Deploy sonrası Vercel Dashboard'dan Speed Insights ve Analytics otomatik olarak aktif olacak.

### Manuel Deploy
```bash
npm run build
npx vercel --prod
```

## 🔧 Supabase Kurulumu

### 1. Supabase Projesi Oluşturun
- [Supabase Dashboard](https://supabase.com/dashboard)'a gidin
- Yeni proje oluşturun
- API keys'i kopyalayın

### 2. Database Schema
```sql
-- Photos tablosu
CREATE TABLE photos (
  id BIGSERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) aktif edin
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Photos are publicly readable" ON photos
  FOR SELECT USING (true);

-- Public insert policy
CREATE POLICY "Anyone can upload photos" ON photos
  FOR INSERT WITH CHECK (true);

-- Admin delete policy
CREATE POLICY "Admin can delete photos" ON photos
  FOR DELETE USING (true);
```

### 3. Storage Bucket
```sql
-- Photos bucket oluşturun
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- Public access policy
CREATE POLICY "Photos bucket is publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

-- Upload policy
CREATE POLICY "Anyone can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos');

-- Delete policy
CREATE POLICY "Admin can delete photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'photos');
```

## 📱 Kullanım

### Misafirler İçin
1. Ana sayfada isminizi girin (her isim benzersiz olmalıdır)
2. Eğer aynı isimde kullanıcı varsa alternatif isim önerilir
3. "Devam Et" butonuna basın
4. **Çoklu Fotoğraf Seçimi**: Ctrl/Cmd tuşuna basarak birden fazla fotoğraf seçin
5. **Progress Bar**: Fotoğraflar yüklenirken sayfanın üstünde progress bar belirir
   - Kaç fotoğrafın yüklendiği gösterilir (örn: 3/5)
   - Hangi dosyanın yüklendiği görülür
   - Yüzdelik ilerleme (%0-%100) animasyonlu şekilde takip edilir
   - Tamamlandığında yeşil ✓ animasyonu ile 2 saniye sonra kaybolur
6. Fotoğraflarınızı yükleyin (tek seferde birden fazla dosya desteklenir)
7. Diğer misafirlerin fotoğraflarını görüntüleyin

### Admin İçin
1. Sağ üst köşedeki "Admin Panel" linkine tıklayın
2. Şifre: `HusnuIrem290625` (Supabase'de güvenli şekilde saklanır)
3. **Depolama İzleme**: Gerçek zamanlı depolama kullanımını görün (4.5GB limit)
4. **Kullanıcı Filtreleme**: Dropdown menüden belirli kullanıcının fotoğraflarını filtreleyin
5. **Fotoğraf Yükleme**: "Fotoğraf Yükle" butonu ile çoklu dosya yükleyebilirsiniz
6. **Akıllı Temizlik**: Depolama %85+ dolduğunda "Eski Fotoğrafları Sil" butonu görünür
7. Tüm fotoğrafları görüntüleyin ve yönetin
8. İstenmeyen fotoğrafları silin

## 🎨 Tema Özellikleri

- **Açık Tema**: Modern, temiz beyaz tasarım
- **Karanlık Tema**: Göz dostu koyu renk paleti
- **Otomatik Geçiş**: Sistem tercihine göre otomatik tema
- **Manuel Kontrol**: Sağ üst köşedeki tema değiştirici

## 📂 Proje Yapısı

```
dugun-photo-web/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin sayfası
│   ├── globals.css        # Global stiller
│   ├── layout.tsx         # Ana layout
│   └── page.tsx           # Ana sayfa
├── components/            # React bileşenleri
│   ├── ThemeToggle.tsx   # Tema değiştirici
│   └── ...
├── contexts/              # React contexts
│   └── ThemeContext.tsx  # Tema yönetimi
├── public/               # Statik dosyalar
├── src/                  # Kaynak dosyalar
│   └── lib/             # Utility fonksiyonlar
├── next.config.js        # Next.js yapılandırması
├── tailwind.config.js    # Tailwind yapılandırması
└── vercel.json          # Vercel yapılandırması
```

## 🔒 Güvenlik

- **RLS (Row Level Security)**: Supabase'de aktif
- **CORS**: Güvenli cross-origin istekleri
- **Admin Koruması**: Bcrypt ile hash'lenmiş şifre korumalı admin paneli
- **Supabase Şifre Yönetimi**: Admin şifresi Supabase'de güvenli şekilde saklanır
- **Input Validation**: Dosya türü ve boyut kontrolü
- **Fallback Güvenlik**: Supabase bağlantı hatalarında varsayılan şifre koruması

## 🚀 Performance

- **Next.js 15**: En son performans optimizasyonları
- **Image Optimization**: Otomatik resim optimizasyonu
- **Static Generation**: Hızlı sayfa yükleme
- **CDN**: Vercel Edge Network
- **Speed Insights**: Gerçek zamanlı performans metrikleri
- **Analytics**: Kullanıcı davranışları ve sayfa görüntülemeleri

## 📊 Speed Insights & Analytics

Bu proje Vercel Speed Insights ve Analytics ile donatılmıştır:

### Speed Insights
- **Core Web Vitals**: LCP, FID, CLS metrikleri
- **Gerçek Zamanlı İzleme**: Canlı kullanıcı deneyimi verileri
- **Performance Skorları**: Her sayfa için detaylı performans analizi
- **Otomatik Optimizasyon Önerileri**: Vercel Dashboard'da görüntülenir

### Analytics
- **Sayfa Görüntülemeleri**: Hangi sayfaların daha çok ziyaret edildiği
- **Kullanıcı Davranışları**: Trafik kaynakları ve cihaz bilgileri
- **Gerçek Zamanlı Veriler**: Anlık kullanıcı aktivitesi
- **GDPR Uyumlu**: Kullanıcı gizliliğini korur

### Vercel Dashboard'da Görüntüleme
1. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin
2. Projenizi seçin
3. **Analytics** sekmesini açın
4. **Speed Insights** için detaylı metrikleri inceleyin

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- **GitHub**: [@HusnuCan35](https://github.com/HusnuCan35)
- **Email**: husnucancoban@example.com

## 🙏 Teşekkürler

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Vercel](https://vercel.com/) - Deployment platform
