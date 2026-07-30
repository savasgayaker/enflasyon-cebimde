import Constants from 'expo-constants';

/**
 * Backend adresi — tek doğruluk noktası.
 *
 * Dev'de Metro'nun host adresinden türetilir: dev client bundle'ı hangi
 * makineden çekiyorsa backend de o makinededir (hostUri örn.
 * "192.168.1.20:8081" → backend "http://192.168.1.20:8000"). Böylece
 * DHCP IP değişimlerinde elle güncelleme gerekmez.
 *
 * Üretim/staging: EXPO_PUBLIC_BACKEND_URL ortam değişkeni her zaman
 * önceliklidir — gerçek sunucuya geçişte tek değişkenle yönlendirilir.
 */
const hostUri =
  Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
const devHost = hostUri?.split(':')[0];

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  (devHost ? `http://${devHost}:8000` : 'http://localhost:8000');

if (__DEV__) {
  // hostUri'nin SDK 54 dev client'ta dolu geldiğinin canlı teyidi —
  // Metro log'unda "BACKEND_URL → http://..." satırı görünmeli.
  console.log(`BACKEND_URL → ${BACKEND_URL} (hostUri: ${hostUri ?? 'YOK'})`);
}

/**
 * Supabase — veritabanı ve kimlik.
 *
 * Değerler frontend/.env dosyasından gelir (gitignore'lu). EXPO_PUBLIC_ ön eki
 * bu değişkenlerin uygulama paketine gömüldüğü anlamına gelir; publishable
 * anahtarı için bu doğru ve beklenen davranıştır. sb_secret_ / service_role
 * anahtarı BURAYA GİRMEZ.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (__DEV__ && (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY)) {
  console.warn('SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY bos — frontend/.env dosyasini kontrol et');
}
