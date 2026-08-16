/**
 * Kapi E - satir duzeyi guvenlik izolasyon olcumu.
 *
 * Iki anonim kullanici olusturur, her biri kendi fisini yazar,
 * sonra birbirine dokunmayi dener.
 *
 * UC FARKLI DOGRU SINYAL:
 *   okuma inkari  -> bos sonuc (hata degil)
 *   silme inkari  -> sessiz; kanit fisin hala durmasi
 *   yazma inkari  -> gercek hata
 *
 * Herkese acik anahtarla kosar. Gizli anahtar guvenligi baypas
 * eder ve olcumu anlamsiz kilardi.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const satir of readFileSync(join(kok, '.env'), 'utf-8').split('\n')) {
  const t = satir.trim();
  if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const [k, ...v] = t.split('=');
  env[k] = v.join('=');
}
const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANAHTAR = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !ANAHTAR) {
  console.log('DUR: adres veya anahtar bulunamadi');
  process.exit(2);
}
// Muhafiz: gizli sinif anahtar bu olcumu anlamsiz kilar.
if (!ANAHTAR.startsWith('sb_publishable_')) {
  console.log('DUR: anahtar herkese acik sinifta degil');
  process.exit(2);
}

let yesil = 0;
let kirmizi = 0;
function kontrol(etiket, gecti, ayrinti) {
  if (gecti) {
    yesil++;
    console.log('  yesil   ' + etiket);
  } else {
    kirmizi++;
    console.log('  KIRMIZI ' + etiket);
    if (ayrinti) console.log('            ' + ayrinti);
  }
}

async function anonimIstemci(ad) {
  const c = createClient(URL, ANAHTAR, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw new Error(ad + ' oturum: ' + error.message);
  return { c, id: data.user.id };
}

async function calis() {
  console.log('=== Kapi E: izolasyon ===');
  const A = await anonimIstemci('A');
  const B = await anonimIstemci('B');
  console.log('  iki anonim kullanici olusturuldu');
  if (A.id === B.id) {
    console.log('DUR: ayni kullanici dondu, olcum anlamsiz');
    process.exit(2);
  }

  const fisA = 'testE-A-' + Date.now();
  const fisB = 'testE-B-' + Date.now();

  for (const [k, fid] of [[A, fisA], [B, fisB]]) {
    const { error } = await k.c.from('fisler').upsert([{
      kullanici: k.id, kimlik: fid, magaza: 'TEST', tarih: '2026-08-15',
      toplam: 1,
    }]);
    if (error) {
      console.log('DUR: kendi fisini yazamadi: ' + error.message);
      process.exit(2);
    }
  }
  console.log('  iki fis yazildi');
  console.log('');

  // POZITIF KONTROL
  {
    const { data } = await A.c.from('fisler').select('kimlik').eq('kimlik', fisA);
    kontrol('P1 A kendi fisini gorur', (data || []).length === 1,
      'donen satir: ' + (data || []).length);
  }
  {
    const { data } = await B.c.from('fisler').select('kimlik').eq('kimlik', fisB);
    kontrol('P2 B kendi fisini gorur', (data || []).length === 1,
      'donen satir: ' + (data || []).length);
  }

  // OKUMA INKARI - bos sonuc beklenir
  {
    const { data, error } = await A.c.from('fisler').select('kimlik').eq('kimlik', fisB);
    kontrol('E1 A, B fisini GOREMEZ', (data || []).length === 0,
      'donen satir: ' + (data || []).length + (error ? ' hata: ' + error.message : ''));
  }
  {
    const { data, error } = await B.c.from('fisler').select('kimlik').eq('kimlik', fisA);
    kontrol('E2 B, A fisini GOREMEZ', (data || []).length === 0,
      'donen satir: ' + (data || []).length + (error ? ' hata: ' + error.message : ''));
  }

  // YAZMA INKARI - gercek hata beklenir
  {
    const { error } = await A.c.from('fisler').upsert([{
      kullanici: B.id, kimlik: 'testE-sahte-' + Date.now(),
      magaza: 'SAHTE', tarih: '2026-08-15', toplam: 1,
    }]);
    kontrol('E3 A, B adina YAZAMAZ', !!error,
      error ? 'hata: ' + error.message : 'HATA YOK - yazma kontrolu calismiyor');
  }

  // SILME INKARI - sessiz; kanit fisin hala durmasi
  {
    await A.c.from('fisler').delete().eq('kullanici', B.id).eq('kimlik', fisB);
    const { data } = await B.c.from('fisler').select('kimlik').eq('kimlik', fisB);
    kontrol('E4 A, B fisini SILEMEZ', (data || []).length === 1,
      'B kendi fisini goruyor mu: ' + (data || []).length + ' satir');
  }

  await A.c.from('fisler').delete().eq('kullanici', A.id).eq('kimlik', fisA);
  await B.c.from('fisler').delete().eq('kullanici', B.id).eq('kimlik', fisB);
  console.log('');
  console.log('  test satirlari silindi; iki anonim hesap panelde kaldi');

  console.log('');
  console.log('Toplam: ' + yesil + ' yesil kontrol, ' + kirmizi + ' kirmizi kontrol');
  process.exit(kirmizi === 0 ? 0 : 1);
}

calis().catch((e) => {
  console.log('DUR: ' + String(e));
  process.exit(2);
});
