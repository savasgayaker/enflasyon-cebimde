#!/usr/bin/env node
/**
 * calculateInflation birim testi — M6-A2 ön kaydının 2. adımı.
 *
 * Kullanım: npm run test:inflation
 *
 * Dokuz senaryo ve beklenen değerler docs/m6a2-on-kayit-2026-08-05.md'den
 * BİREBİR alınmıştır; kabul kuralı gereği burada değiştirilemezler. Beklenenler
 * DÜZELTME SONRASI değerlerdir — ön kayıt gereği bu test düzeltmeden önce
 * S1 ve S9'da KIRMIZI, S8'de YEŞİL koşmalıdır (alet doğrulaması).
 *
 * M6-C güncellemesi (docs/m6c-on-kayit-2026-08-05.md): S8'in beklenen değeri
 * %5,0 → %10,0 (payda turu; değişiklik veri görülmeden ilan edildi) ve
 * S10/S11/S12 eklendi. M6-C alet doğrulaması: düzeltmeden önce S8+S11+S12
 * KIRMIZI, diğer dokuzu YEŞİL.
 */
import { calculateInflation } from '../src/utils/inflation';
import type { PriceRecord, Product } from '../src/store/useAppStore';

let passed = 0;
let failed = 0;
let senaryoKirmizi = false;
const dagilim: { ad: string; sonuc: 'YESIL' | 'KIRMIZI' }[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const ok = Object.is(actual, expected);
  if (ok) {
    passed++;
    console.log(`    ✓ ${label}: ${JSON.stringify(actual)}`);
  } else {
    failed++;
    senaryoKirmizi = true;
    console.log(
      `    ✗ ${label}: beklenen ${JSON.stringify(expected)}, alınan ${JSON.stringify(actual)}`,
    );
  }
}

function senaryo(ad: string, fn: () => void) {
  senaryoKirmizi = false;
  console.log(`\n${ad}`);
  fn();
  dagilim.push({ ad: ad.split(' ')[0], sonuc: senaryoKirmizi ? 'KIRMIZI' : 'YESIL' });
}

// Ön kayıttaki tüm yüzdeler bu yuvarlamayla tek ondalıklıdır.
const yuvarla1 = (x: number) => Math.round(x * 10) / 10;

// Dönemler: cari pencere Temmuz 2026; calculateInflation önceki pencereyi
// aynı uzunlukta geriye giderek kendisi kurar (Haziran 2026'yı kapsar).
const ARALIK = { start: new Date('2026-07-01T00:00:00Z'), end: new Date('2026-07-31T00:00:00Z') };
const ONCEKI = '2026-06-10';
const CARI_1 = '2026-07-05';
const CARI_2 = '2026-07-12';

let sayac = 0;
function kayit(productId: string, date: string, unitPrice: number, quantity = 1): PriceRecord {
  sayac += 1;
  return {
    id: `pr-${sayac}`,
    productId,
    receiptId: `fis-${sayac}`,
    quantity,
    unitPrice,
    totalPrice: unitPrice * quantity,
    date,
  };
}

function urun(id: string, categoryId: string): Product {
  return { id, name: id.toUpperCase(), categoryId, createdAt: '2026-01-01T00:00:00Z' };
}

senaryo('S1 — çoklu alım, sabit fiyat (regresyon kilidi)', () => {
  // A: önceki 1×20; cari 2×20 (q=1). Fiyat değişmedi → %0,0.
  const r = calculateInflation(
    [kayit('urun-a', ONCEKI, 20), kayit('urun-a', CARI_1, 20), kayit('urun-a', CARI_2, 20)],
    [urun('urun-a', 'gida')],
    ARALIK,
  );
  check('monthlyRate', r.monthlyRate, 0);
});

senaryo('S2 — gerçek artış (doğruluk)', () => {
  // A: önceki 1×20; cari 1×22 → (22−20)/20 = %10,0.
  const r = calculateInflation(
    [kayit('urun-a', ONCEKI, 20), kayit('urun-a', CARI_1, 22)],
    [urun('urun-a', 'gida')],
    ARALIK,
  );
  check('monthlyRate', r.monthlyRate, 10);
});

senaryo('S3 — quantity=2 (miktar kilidi)', () => {
  // A: önceki 1×20 q=1; cari 1×20 q=2 → cari fiyat (20×2)/2 = 20 → %0,0.
  const r = calculateInflation(
    [kayit('urun-a', ONCEKI, 20, 1), kayit('urun-a', CARI_1, 20, 2)],
    [urun('urun-a', 'gida')],
    ARALIK,
  );
  check('monthlyRate', r.monthlyRate, 0);
});

senaryo('S4 — harcama ağırlığı', () => {
  // A: 10→11 (cari harcama 11) · B: 100→100 (cari harcama 100)
  // 11/111×0,10 = 0,0099099 → %1,0.
  const r = calculateInflation(
    [
      kayit('urun-a', ONCEKI, 10),
      kayit('urun-a', CARI_1, 11),
      kayit('urun-b', ONCEKI, 100),
      kayit('urun-b', CARI_1, 100),
    ],
    [urun('urun-a', 'gida'), urun('urun-b', 'temizlik')],
    ARALIK,
  );
  check('monthlyRate', r.monthlyRate, 1);
});

senaryo('S5 — önceki dönem boş (karakterizasyon)', () => {
  const r = calculateInflation([kayit('urun-a', CARI_1, 20)], [urun('urun-a', 'gida')], ARALIK);
  check('monthlyRate', r.monthlyRate, 0);
  check('yearlyRate', r.yearlyRate, 0);
  check('categoryRates boş', JSON.stringify(r.categoryRates), '{}');
  check('monthlyTrend boş', r.monthlyTrend.length, 0);
});

senaryo('S6 — tek kategori: kategori oranı = genel oran (karakterizasyon)', () => {
  // S4 verisi, iki ürün de aynı kategoride → kategori oranı = genel oran = %1,0.
  const r = calculateInflation(
    [
      kayit('urun-a', ONCEKI, 10),
      kayit('urun-a', CARI_1, 11),
      kayit('urun-b', ONCEKI, 100),
      kayit('urun-b', CARI_1, 100),
    ],
    [urun('urun-a', 'gida'), urun('urun-b', 'gida')],
    ARALIK,
  );
  check('kategori oranı (tek ondalık)', yuvarla1(r.categoryRates['gida']), 1);
  check('genel oranla aynı', yuvarla1(r.categoryRates['gida']), r.monthlyRate);
});

senaryo('S7 — yıllık oran doğrusal ×12 (karakterizasyon)', () => {
  // S2 verisi → 10,0 × 12 = %120,0 (M6-B'ye kadar doğrusal davranış korunur).
  const r = calculateInflation(
    [kayit('urun-a', ONCEKI, 20), kayit('urun-a', CARI_1, 22)],
    [urun('urun-a', 'gida')],
    ARALIK,
  );
  check('yearlyRate', r.yearlyRate, 120);
});

senaryo('S8 — payda: eşleşen örneklem (M6-C ile beklentisi değişti)', () => {
  // A: önceki 1×50, cari 1×55 · C: önceki YOK, cari 1×55.
  // M6-C T-C1: payda eşleşen örneklem M = 55 → ağırlık 55/55 = 1 → %10,0.
  // (M6-A2 döneminde tam-payda kilidiydi ve %5,0 beklerdi; değişiklik veri
  // görülmeden docs/m6c-on-kayit-2026-08-05.md'de gerekçesiyle ilan edildi.)
  const r = calculateInflation(
    [kayit('urun-a', ONCEKI, 50), kayit('urun-a', CARI_1, 55), kayit('urun-c', CARI_1, 55)],
    [urun('urun-a', 'gida'), urun('urun-c', 'gida')],
    ARALIK,
  );
  check('monthlyRate', r.monthlyRate, 10);
});

senaryo('S9 — payda + T1 kilidi', () => {
  // A: önceki 1×20, cari 2×20 (q=1) · C: önceki YOK, cari 1×40.
  // T1 sonrası A fiyatı 20 → r = 0 → %0,0. Mevcut kod %50,0 üretir.
  const r = calculateInflation(
    [
      kayit('urun-a', ONCEKI, 20),
      kayit('urun-a', CARI_1, 20),
      kayit('urun-a', CARI_2, 20),
      kayit('urun-c', CARI_1, 40),
    ],
    [urun('urun-a', 'gida'), urun('urun-c', 'gida')],
    ARALIK,
  );
  check('monthlyRate', r.monthlyRate, 0);
});

senaryo('S10 — eşleşen küme boş: sıfır payda koruması (T-C2 kilidi)', () => {
  // Önceki dönemde yalnız A (1×50), cari dönemde yalnız C (1×55). Erken dönüş
  // devreye girmez (iki dönemde de harcama var) ama eşleşen küme E boştur:
  // oran 0, kategoriler boş, NaN asla. Düzeltme ÖNCESİ de yeşil olmalı.
  const r = calculateInflation(
    [kayit('urun-a', ONCEKI, 50), kayit('urun-c', CARI_1, 55)],
    [urun('urun-a', 'gida'), urun('urun-c', 'gida')],
    ARALIK,
  );
  check('monthlyRate', r.monthlyRate, 0);
  check('NaN değil', Number.isNaN(r.monthlyRate), false);
  check('categoryRates boş', JSON.stringify(r.categoryRates), '{}');
});

senaryo('S11 — iç tutarlılık: genel oran = tek kategorinin oranı', () => {
  // S8 verisi. M6-C sonrası genel oran, gıda kategorisinin bugün zaten ürettiği
  // %10,0 değerine eşitlenir (envanter KANIT-1: mevcut kod 5 ≠ 10 üretiyor).
  const r = calculateInflation(
    [kayit('urun-a', ONCEKI, 50), kayit('urun-a', CARI_1, 55), kayit('urun-c', CARI_1, 55)],
    [urun('urun-a', 'gida'), urun('urun-c', 'gida')],
    ARALIK,
  );
  check('monthlyRate', r.monthlyRate, 10);
  check('gıda kategorisi (tek ondalık)', yuvarla1(r.categoryRates['gida']), 10);
  check('genel oranla aynı', yuvarla1(r.categoryRates['gida']), r.monthlyRate);
});

senaryo('S12 — payda + kategori değişmezliği (T-C3 kilidi)', () => {
  // A(gıda) 100→110 · B(temizlik) 100→100 · C(gıda) yeni, cari 210.
  // M = 110+100 = 210 → genel (110/210)×0,10 = %5,2 (eski payda 420 → %2,6).
  // Kategoriler her iki tanımda da AYNI: gıda %10,0, temizlik %0,0 — T-C3
  // cebirsel zorunluluk; kategori değeri kımıldarsa değişiklik sızmıştır.
  const r = calculateInflation(
    [
      kayit('urun-a', ONCEKI, 100),
      kayit('urun-a', CARI_1, 110),
      kayit('urun-b', ONCEKI, 100),
      kayit('urun-b', CARI_1, 100),
      kayit('urun-c', CARI_1, 210),
    ],
    [urun('urun-a', 'gida'), urun('urun-b', 'temizlik'), urun('urun-c', 'gida')],
    ARALIK,
  );
  check('monthlyRate', r.monthlyRate, 5.2);
  check('gıda (tek ondalık)', yuvarla1(r.categoryRates['gida']), 10);
  check('temizlik (tek ondalık)', yuvarla1(r.categoryRates['temizlik']), 0);
});

console.log('\n=== DAĞILIM ===');
for (const d of dagilim) console.log(`  ${d.ad}: ${d.sonuc}`);
console.log(`\nToplam: ${passed} yeşil kontrol, ${failed} kırmızı kontrol`);
process.exit(failed > 0 ? 1 : 0);
