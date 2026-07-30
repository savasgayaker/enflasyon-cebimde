import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../constants/config'

/**
 * Supabase istemcisi — tek örnek.
 *
 * publishable anahtarının uygulama paketinin içinde olması tasarımın
 * parçasıdır; onu güvenli kılan şey gizliliği değil, veritabanındaki erişim
 * kurallarıdır. sb_secret_ / service_role anahtarı buraya ASLA girmez.
 *
 * Not (bilinçli taviz): oturum jetonu AsyncStorage'da tutuluyor — Supabase'in
 * React Native belgelerindeki yol bu. expo-secure-store daha doğru yer olurdu
 * ama tek değer sınırı (2 KB) Supabase oturumu için dar. Jeton telefonun
 * uygulama kumbarasında duruyor; canlıya çıkmadan önce yeniden bakılacak.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/**
 * Anonim oturumu garanti eder (K2). Uygulama ilk açıldığında çağrılır.
 * Kullanıcı numarası burada doğar ve Google/Apple bağlandığında DEĞİŞMEZ.
 */
export async function anonimOturumuGarantile() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user.id
  const { data: yeni, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return yeni.user!.id
}

/**
 * UYARI — anonim kullanıcıda signOut() ÇAĞRILMAZ.
 *
 * Anonim hesabın parolası yoktur; oturum kapatıldığında o hesaba bir daha
 * girilemez ve kullanıcının bütün fişleri erişilemez hale gelir. "Çıkış yap"
 * düğmesi yalnızca Google/Apple ile bağlanmış hesaplarda gösterilecek.
 */
export async function cikisYap() {
  const { data } = await supabase.auth.getUser()
  const anonim = data.user?.is_anonymous === true
  if (anonim) throw new Error('Anonim hesapta çıkış yapılamaz — veriler erişilemez hale gelir.')
  return supabase.auth.signOut()
}
