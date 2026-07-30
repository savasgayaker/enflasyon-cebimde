// Gerçek Supabase projesine karşı erişim kurallarını sınar.
// Koşum:  node frontend/scripts/dogrula-supabase.mjs
// Dosyanın frontend/ ALTINDA olması zorunlu: Node, '@supabase/supabase-js'
// gibi paket adlarını dosyanın BULUNDUĞU klasörden yukarı doğru arar; paket
// frontend/node_modules içinde olduğu için depo kökündeki bir betik onu bulamaz.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trimStart().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL
const KEY = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!URL_ || !KEY) { console.error('frontend/.env eksik'); process.exit(1) }

const sonuc = []
const ok = (ad, kosul, detay = '') =>
  sonuc.push({ ad, gecti: kosul === true, detay: kosul === null ? '[NULL]' + detay : detay })

const yeniIstemci = () =>
  createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const A = yeniIstemci()
const B = yeniIstemci()

// --- anonim giris -----------------------------------------------------
const { data: aOturum, error: aHata } = await A.auth.signInAnonymously()
ok('A anonim giris yapabiliyor', !aHata, aHata?.message ?? '')
const { data: bOturum, error: bHata } = await B.auth.signInAnonymously()
ok('B anonim giris yapabiliyor', !bHata, bHata?.message ?? '')
if (aHata || bHata) { rapor(); process.exit(1) }

const aId = aOturum.user.id
const bId = bOturum.user.id
ok('iki anonim kullanici farkli id aliyor', aId !== bId)

// --- profil satiri tetikleyici ile olustu mu --------------------------
const { data: aProfil } = await A.from('users').select('id, auth_provider, consent_pool')
ok('A profil satiri kendiliginden olustu', aProfil?.length === 1, JSON.stringify(aProfil))
ok('A profil satiri anonymous olarak isaretli', aProfil?.[0]?.auth_provider === 'anonymous')
ok('A yalnizca kendi profilini goruyor', aProfil?.[0]?.id === aId)

// --- A kendi fisini yaziyor ------------------------------------------
const fisId = randomUUID()
const istemciFisNo = randomUUID()
const { error: fisHata } = await A.from('receipts').insert({
  id: fisId, user_id: aId, client_id: istemciFisNo,
  purchased_at: '2026-01-10T12:00:00Z', store_raw: 'MIGROS TICARET A.S.',
  needs_review: false, confirmed_at: new Date().toISOString(),
  parser_version: 'dogrulama'
})
ok('A kendi fisini yazabiliyor', !fisHata, fisHata?.message ?? '')

const { error: kalemHata } = await A.from('receipt_items').insert([
  { receipt_id: fisId, line_no: 1, raw_name: '  PINAR   SUT  1 L  ',
    quantity: 1, unit: 'adet', unit_price: 10, total_price: 10, vat_rate: 1 },
  { receipt_id: fisId, line_no: 2, raw_name: 'PİNAR SUT 1 L',
    quantity: 1, unit: 'adet', unit_price: 12, total_price: 12, vat_rate: 1 },
])
ok('A kendi kalemlerini yazabiliyor', !kalemHata, kalemHata?.message ?? '')

const { data: kalemler } = await A.from('receipt_items').select('line_no, raw_name, raw_name_norm')
ok('raw_name_norm uretiliyor',
   kalemler?.[0]?.raw_name_norm === 'pinar sut 1 l',
   kalemler?.[0]?.raw_name_norm ?? '')
ok('buyuk I ile İ ayni anahtara dusuyor',
   new Set(kalemler?.map(k => k.raw_name_norm)).size === 1,
   [...new Set(kalemler?.map(k => k.raw_name_norm))].join(' | '))
ok('raw_name dokunulmadan duruyor',
   kalemler?.find(k => k.line_no === 1)?.raw_name === '  PINAR   SUT  1 L  ')

// --- cift kayit engeli ------------------------------------------------
const { error: ciftHata } = await A.from('receipts').insert({
  user_id: aId, client_id: istemciFisNo,
  purchased_at: '2026-01-10T12:00:00Z', store_raw: 'MIGROS'
})
ok('ayni client_id ikinci kez kaydedilemiyor', ciftHata?.code === '23505', ciftHata?.code ?? 'hata yok')

// --- gecersiz deger kisitlari ----------------------------------------
const { error: unitHata } = await A.from('receipt_items').insert({
  receipt_id: fisId, line_no: 90, raw_name: 'X', unit: 'kutu'
})
ok('gecersiz unit reddediliyor', unitHata?.code === '23514', unitHata?.code ?? 'hata yok')
const { error: kdvHata } = await A.from('receipt_items').insert({
  receipt_id: fisId, line_no: 91, raw_name: 'X', vat_rate: 5
})
ok('gecersiz vat_rate reddediliyor', kdvHata?.code === '23514', kdvHata?.code ?? 'hata yok')

// --- kaynak sutunlari (Adim 1 Ek 9) ----------------------------------
// unit ve vat_rate modelden geliyor ve dogrulugu OLCULDU (~%85 / ~%72-75).
// Bu yuzden degerin yaninda nereden geldigi de duruyor. Varsayilanin
// 'model' olmasi kritik: yazan taraf hicbir sey belirtmezse veri
// DOGRULANMAMIS sayilir, dogrulanmis sayilmaz.
const { data: kaynak } = await A.from('receipt_items')
  .select('line_no, unit_source, vat_rate_source').eq('line_no', 1)
ok('unit_source varsayilani model', kaynak?.[0]?.unit_source === 'model',
   kaynak?.[0]?.unit_source ?? 'okunamadi')
ok('vat_rate_source varsayilani model', kaynak?.[0]?.vat_rate_source === 'model',
   kaynak?.[0]?.vat_rate_source ?? 'okunamadi')

const { data: fisKaynak } = await A.from('receipts')
  .select('vat_block_ok, vat_block_raw').eq('id', fisId)
ok('vat_block_ok varsayilani BOS (saglama yapilmadi demek)',
   fisKaynak?.[0]?.vat_block_ok === null, String(fisKaynak?.[0]?.vat_block_ok))

const { error: kaynakHata } = await A.from('receipt_items').insert({
  receipt_id: fisId, line_no: 92, raw_name: 'X', unit_source: 'tahmin'
})
ok('gecersiz unit_source reddediliyor', kaynakHata?.code === '23514',
   kaynakHata?.code ?? 'hata yok')

// KDV dokum blogu birim hakkinda HICBIR SEY soylemez; bu yuzden unit
// icin 'kdv_blogu' kaynagi semada bilerek yok. Reddedilmesi gerekiyor.
const { error: birimBlokHata } = await A.from('receipt_items').insert({
  receipt_id: fisId, line_no: 93, raw_name: 'X', unit_source: 'kdv_blogu'
})
ok('unit_source = kdv_blogu REDDEDILIYOR', birimBlokHata?.code === '23514',
   birimBlokHata?.code ?? 'hata yok')

const { error: oranBlokHata } = await A.from('receipt_items').insert({
  receipt_id: fisId, line_no: 94, raw_name: 'X',
  vat_rate: 20, vat_rate_source: 'kdv_blogu'
})
ok('vat_rate_source = kdv_blogu kabul ediliyor', !oranBlokHata,
   oranBlokHata?.message ?? '')

const { error: blokYazHata } = await A.from('receipts').update({
  vat_block_raw: { oranlar: [{ oran: 20, matrah: 207.5, kdv: 41.5 }], genel_toplam: 249.0 },
  vat_block_ok: true
}).eq('id', fisId)
ok('vat_block_raw yazilabiliyor', !blokYazHata, blokYazHata?.message ?? '')
const { data: blokOku } = await A.from('receipts')
  .select('vat_block_raw, vat_block_ok').eq('id', fisId)
ok('vat_block_raw ayni geri geliyor',
   Number(blokOku?.[0]?.vat_block_raw?.genel_toplam) === 249,
   JSON.stringify(blokOku?.[0]?.vat_block_raw ?? null))
ok('vat_block_ok yazilabiliyor', blokOku?.[0]?.vat_block_ok === true,
   String(blokOku?.[0]?.vat_block_ok))

// --- ERISIM KURALLARI: B, A'nin verisine ulasabiliyor mu --------------
const { data: bFisler } = await B.from('receipts').select('id')
ok('B, A nin fislerini GOREMIYOR', bFisler?.length === 0, 'gorunen: ' + (bFisler?.length ?? '?'))

const { data: bKalemler } = await B.from('receipt_items').select('id')
ok('B, A nin kalemlerini GOREMIYOR', bKalemler?.length === 0, 'gorunen: ' + (bKalemler?.length ?? '?'))

const { data: bKullanicilar } = await B.from('users').select('id')
ok('B yalnizca kendi profilini goruyor', bKullanicilar?.length === 1, 'gorunen: ' + (bKullanicilar?.length ?? '?'))

const { error: sahteHata } = await B.from('receipts').insert({
  user_id: aId, client_id: randomUUID(),
  purchased_at: '2026-01-12T12:00:00Z', store_raw: 'SOK'
})
ok('B, A adina fis YAZAMIYOR', sahteHata?.code === '42501', sahteHata?.code ?? 'hata yok')

const { error: sahteKalemHata } = await B.from('receipt_items').insert({
  receipt_id: fisId, line_no: 99, raw_name: 'HILE'
})
ok('B, A nin fisine kalem EKLEYEMIYOR', sahteKalemHata?.code === '42501', sahteKalemHata?.code ?? 'hata yok')

const { count: silinen } = await B.from('receipts').delete({ count: 'exact' }).eq('id', fisId)
ok('B, A nin fisini SILEMIYOR', silinen === 0, 'silinen: ' + silinen)
const { data: hala } = await A.from('receipts').select('id').eq('id', fisId)
ok('A nin fisi hala yerinde', hala?.length === 1)

// --- havuz -----------------------------------------------------------
const { data: havuz, error: havuzHata } = await A.rpc('pool_prices', {
  p_period_start: '2026-01-01', p_period_end: '2026-02-01'
})
ok('kullanici havuz fonksiyonunu cagirabiliyor', !havuzHata, havuzHata?.message ?? '')
ok('esik altinda havuz HIC satir dondurmuyor', havuz?.length === 0, 'donen: ' + (havuz?.length ?? '?'))
// Havuzun donen sutunlarindan biri artik 'unit': ortanca (urun, donem,
// BIRIM) basina hesaplaniyor, boylece kilo fiyati ile adet fiyati asla
// ayni ortancada birlesmiyor. Burada esigin ALTINDA oldugumuz icin 0
// satir donuyor — yani bu ayrimin dogru calistigi BURADAN kanitlanamaz.
// O kanit sandbox testinde duruyor (5 kullanici, kg + adet + bos birim).
// Gercek veri esigi gectiginde bu satiri gozle de dogrulayacagiz.

const { data: kapsam } = await A.rpc('pool_coverage', {
  p_period_start: '2026-01-01', p_period_end: '2026-02-01'
})
ok('esik altinda pool_coverage HIC satir dondurmuyor', kapsam?.length === 0, 'donen: ' + (kapsam?.length ?? '?'))

// --- bakim fonksiyonlari kullaniciya kapali mi ------------------------
const { error: bakimHata } = await A.rpc('purge_deleted_accounts')
ok('kullanici kalici silme fonksiyonunu cagiramiyor', !!bakimHata, bakimHata?.message ?? 'CAGIRABILDI!')

// --- temizlik ---------------------------------------------------------
await A.from('receipts').delete().eq('id', fisId)
const { data: kalanKalem } = await A.from('receipt_items').select('id')
ok('fis silininde kalemler de gitti', kalanKalem?.length === 0, 'kalan: ' + (kalanKalem?.length ?? '?'))

rapor()

function rapor () {
  const kalan = sonuc.filter(s => !s.gecti)
  for (const s of sonuc) {
    console.log(`${s.gecti ? '  gecti' : '  KALDI'}  ${s.ad}${s.detay ? '  (' + s.detay + ')' : ''}`)
  }
  console.log(`\n${sonuc.length - kalan.length}/${sonuc.length} gecti`)
  if (kalan.length) { console.log('\nBASARISIZ'); process.exit(1) }
  console.log('HEPSI GECTI')
}
