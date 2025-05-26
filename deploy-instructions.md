# 🚀 Düğün Fotoğraf Uygulaması - Deploy Talimatları

## ✅ Hazırlık Tamamlandı!

Proje statik export için hazırlandı. `out/` klasöründe deployment-ready dosyalar mevcut.

## 🏆 Önerilen: Vercel Deploy

### 1. GitHub'a Push
```bash
git add .
git commit -m "Production ready for deployment"
git push origin main
```

### 2. Vercel'e Deploy
1. **https://vercel.com** → Sign up/Login
2. **"New Project"** → GitHub repo'yu seç
3. **Framework**: Next.js (otomatik algılar)
4. **Build Command**: `npm run build` (otomatik)
5. **Output Directory**: `out` (otomatik algılar)
6. **"Deploy"** butonuna bas
7. 🎉 **Canlı!** → `https://your-app.vercel.app`

### 3. Environment Variables (Vercel Dashboard)
```
NEXT_PUBLIC_SUPABASE_URL = https://sfqonnyzxfunhuzlrwml.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🌐 Alternatif Hosting Seçenekleri

### Netlify
1. **https://netlify.com** → Login
2. **"Sites"** → **"Add new site"** → **"Deploy manually"**
3. `out/` klasörünü drag & drop
4. 🎉 **Canlı!**

### GitHub Pages
1. GitHub repo → **Settings** → **Pages**
2. **Source**: Deploy from branch → `gh-pages`
3. `out/` içeriğini `gh-pages` branch'ine push et

### Supabase Hosting (Beta)
1. Supabase dashboard → **Storage** → **Hosting**
2. `out/` klasörünü upload et
3. ⚠️ **Not**: Beta aşamasında, sınırlı

## 🔧 Manuel Build

```bash
# Development
npm run dev

# Production build
npm run build

# Static export
npm run export

# Serve locally (test)
npx serve out
```

## 📱 Sonuç

✅ **Statik export başarılı**  
✅ **Tüm sayfalar çalışıyor**  
✅ **Supabase entegrasyonu aktif**  
✅ **Responsive tasarım**  
✅ **Admin panel dahil**  

### Erişim Bilgileri:
- **Ana Sayfa**: `/`
- **Admin Panel**: `/admin` (Şifre: `dugun2024`)
- **CSS Test**: `/css-test`

### Özellikler:
- 📸 **Fotoğraf yükleme/görüntüleme**
- 🔒 **Admin panel**
- 📱 **Responsive tasarım**
- ☁️ **Supabase storage**
- 💾 **LocalStorage fallback**
- 🎨 **Modern UI/UX**

**🎉 Proje deploy'a hazır!** 