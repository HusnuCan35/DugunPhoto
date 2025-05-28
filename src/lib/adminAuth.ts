import bcrypt from 'bcryptjs';
import { supabase } from './supabaseClient';

const ADMIN_SETTINGS_KEY = 'admin_password';
const DEFAULT_PASSWORD = 'HusnuIrem290625';

// Şifreyi hash'le
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Şifreyi doğrula
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Supabase'den admin şifresini al
export async function getAdminPasswordHash(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', ADMIN_SETTINGS_KEY)
      .single();
    
    if (error || !data) {
      console.log('Admin şifresi bulunamadı, varsayılan şifre kullanılacak');
      return null;
    }
    
    return data.value;
  } catch (err) {
    console.warn('Admin şifresi alınamadı:', err);
    return null;
  }
}

// Admin şifresini Supabase'e kaydet
export async function setAdminPassword(password: string): Promise<boolean> {
  try {
    const hashedPassword = await hashPassword(password);
    
    const { error } = await supabase
      .from('admin_settings')
      .upsert({ 
        key: ADMIN_SETTINGS_KEY, 
        value: hashedPassword,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Admin şifresi kaydedilemedi:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Admin şifresi kaydetme hatası:', err);
    return false;
  }
}

// Admin şifresini doğrula
export async function validateAdminPassword(inputPassword: string): Promise<boolean> {
  try {
    // Önce Supabase'den hash'lenmiş şifreyi al
    let hashedPassword = await getAdminPasswordHash();
    
    // Eğer Supabase'de şifre yoksa, varsayılan şifreyi hash'le ve kaydet
    if (!hashedPassword) {
      console.log('Varsayılan admin şifresi ayarlanıyor...');
      const success = await setAdminPassword(DEFAULT_PASSWORD);
      if (!success) {
        // Fallback: Varsayılan şifreyle doğrudan karşılaştır
        return inputPassword === DEFAULT_PASSWORD;
      }
      hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    }
    
    // Şifreyi doğrula
    return await verifyPassword(inputPassword, hashedPassword);
  } catch (err) {
    console.error('Şifre doğrulama hatası:', err);
    // Fallback: Varsayılan şifreyle karşılaştır
    return inputPassword === DEFAULT_PASSWORD;
  }
}

// Admin şifresini güncelle
export async function updateAdminPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    // Mevcut şifreyi doğrula
    const isCurrentValid = await validateAdminPassword(currentPassword);
    if (!isCurrentValid) {
      return { success: false, message: 'Mevcut şifre yanlış' };
    }
    
    // Yeni şifreyi kaydet
    const success = await setAdminPassword(newPassword);
    if (!success) {
      return { success: false, message: 'Yeni şifre kaydedilemedi' };
    }
    
    return { success: true, message: 'Şifre başarıyla güncellendi' };
  } catch (err) {
    console.error('Şifre güncelleme hatası:', err);
    return { success: false, message: 'Şifre güncelleme sırasında hata oluştu' };
  }
} 