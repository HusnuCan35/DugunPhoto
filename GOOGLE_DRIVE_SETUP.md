# 🔧 Google Drive API Kurulum Rehberi

## 1. Google Cloud Console Kurulumu

### Adım 1: Proje Oluşturma
1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni proje oluşturun: "dugun-photo-backup"

### Adım 2: Google Drive API Aktifleştirme
1. "APIs & Services" → "Library"
2. "Google Drive API" arayın ve aktifleştirin

### Adım 3: Service Account Oluşturma
1. "APIs & Services" → "Credentials"
2. "CREATE CREDENTIALS" → "Service account"
3. İsim: "dugun-photo-service"
4. JSON key dosyasını indirin

## 2. Google Drive Klasör Kurulumu

### Adım 4: Backup Klasörü Oluşturma
1. [Google Drive](https://drive.google.com/)'a gidin
2. "DugunPhoto-Backups" klasörü oluşturun
3. Klasörü service account ile paylaşın (Editor yetkisi)
4. Folder ID'sini URL'den kopyalayın

## 3. Environment Variables

### .env.local Dosyası:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Drive API Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=dugun-photo-service@your-project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n"
GOOGLE_DRIVE_FOLDER_ID=1A2B3C4D5E6F7G8H9I0J

# Admin Panel Password
ADMIN_PASSWORD=your_admin_password
```

## 4. Private Key Formatı

### JSON'dan .env.local'e Dönüştürme:

**JSON dosyasında:**
```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQI...\nYOUR_KEY_HERE...\n-----END PRIVATE KEY-----\n"
}
```

**DİKKAT:** `\n` karakterlerini `\\n` olarak değiştirin:

**✅ Doğru format (.env.local):**
```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQI...\\nYOUR_KEY_HERE...\\n-----END PRIVATE KEY-----\\n"
```

**❌ Yanlış format:**
```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\nYOUR_KEY_HERE...\n-----END PRIVATE KEY-----\n"
```

## 5. Test Etme

Kurulum tamamlandığında:

```bash
npm run dev
```

Admin panelinde "Google Drive'a Yedekle" butonu çalışır durumda olmalıdır.

## 6. Hata Giderme

### "Google Drive credentials eksik" Hatası:
- .env.local dosyasının doğru konumda olduğunu kontrol edin
- GOOGLE_SERVICE_ACCOUNT_EMAIL ve GOOGLE_PRIVATE_KEY değerlerinin doğru olduğunu kontrol edin
- Private key'deki \n karakterlerinin \\n olarak değiştirildiğini kontrol edin

### "Access denied" Hatası:
- Google Drive klasörünün service account ile paylaşıldığını kontrol edin
- Service account'a "Editor" yetkisi verildiğini kontrol edin
- GOOGLE_DRIVE_FOLDER_ID'nin doğru olduğunu kontrol edin

### "API not enabled" Hatası:
- Google Cloud Console'da Google Drive API'sının aktifleştirildiğini kontrol edin 