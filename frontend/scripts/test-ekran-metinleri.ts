#!/usr/bin/env node
/**
 * ekranMetinleri birim testi — M6-E ön kaydının E1a/E1b adımları.
 *
 * Kullanım: npx tsx scripts/test-ekran-metinleri.ts
 *
 * Senaryolar ve beklenen değerler docs/m6e-on-kayit-2026-08-06.md §8'den
 * BİREBİR alınmıştır (SAPMA-2 ile S28 çıkarıldı; liste S1–S27'dir).
 *
 * SAPMA-2 alet sözleşmesi: her kontrol try/catch içinde koşar; istisna atan
 * kontrol KIRMIZI sayılır ve mesajı basılır. Alet istisna yüzünden yarıda
 * kesilemez; her koşuda özet satırını üretir. Özet biçimi birebir:
 *   Toplam: N yeşil kontrol, M kırmızı kontrol
 */
import {
  donemselOranEtiketi,
  yillikEsdegerEtiketi,
  kapsamaYuzdesine,
  kapsamaSeviyesi,
  kapsamaMetni,
  dusukKapsamaUyarisi,
  oranGosterilsinMi,
} from '../src/utils/ekranMetinleri';
import { tr } from '../src/i18n/tr';
import { calculateInflation } from '../src/utils/inflation';
import type { PriceRecord, Product } from '../src/store/useAppStore';

let passed = 0;
let failed = 0;
let senaryoKirmizi = false;
const dagilim: { ad: string; sonuc: 'YESIL' | 'KIRMIZI' }[] = [];

// SAPMA-2: değer üretimi de karşılaştırma da try/catch içinde.
function kontrol(label: string, uret: () => unknown, expected: unknown) {
  try {
    const actual = uret();
    if (Object.is(actual, expected)) {
      passed++;
      console.log(`    ✓ ${label}: ${JSON.stringify(actual)}`);
    } else {
      failed++;
      senaryoKirmizi = true;
      console.log(
        `    ✗ ${label}: beklenen ${JSON.stringify(expected)}, alınan ${JSON.stringify(actual)}`,
      );
    }
  } catch (e) {
    failed++;
    senaryoKirmizi = true;
    console.log(`    ✗ ${label}: İSTİSNA — ${(e as Error).message}`);
  }
}

function senaryo(ad: string, fn: () => void) {
  senaryoKirmizi = false;
  console.log(`\n${ad}`);
  fn();
  dagilim.push({ ad: ad.split(' ')[0], sonuc: senaryoKirmizi ? 'KIRMIZI' : 'YESIL' });
}

// --- §8 senaryoları -------------------------------------------------------

senaryo('S1 — donemselOranEtiketi(1.0)', () => {
  kontrol('etiket', () => donemselOranEtiketi(1.0), 'Son 1 ayda');
});
senaryo('S2 — donemselOranEtiketi(3.0)', () => {
  kontrol('etiket', () => donemselOranEtiketi(3.0), 'Son 3 ayda');
});
senaryo('S3 — donemselOranEtiketi(6.0)', () => {
  kontrol('etiket', () => donemselOranEtiketi(6.0), 'Son 6 ayda');
});
senaryo('S4 — donemselOranEtiketi(12.0)', () => {
  kontrol('etiket', () => donemselOranEtiketi(12.0), 'Son 12 ayda');
});
senaryo('S5 — donemselOranEtiketi(1.4) yuvarlama', () => {
  kontrol('etiket', () => donemselOranEtiketi(1.4), 'Son 1 ayda');
});
senaryo('S6 — donemselOranEtiketi(1.5) yuvarlama', () => {
  kontrol('etiket', () => donemselOranEtiketi(1.5), 'Son 2 ayda');
});
senaryo('S7 — donemselOranEtiketi(0.9) kısa pencere', () => {
  // §6.1 dal sırası kilidi: kısa-pencere dalı yuvarlamadan ÖNCE.
  kontrol('etiket', () => donemselOranEtiketi(0.9), 'Son 1 aydan kısa dönemde');
});
senaryo('S8 — donemselOranEtiketi(0.1) kısa pencere', () => {
  kontrol('etiket', () => donemselOranEtiketi(0.1), 'Son 1 aydan kısa dönemde');
});
senaryo('S9 — donemselOranEtiketi(0) belirsiz', () => {
  kontrol('etiket', () => donemselOranEtiketi(0), 'Dönem belirsiz');
});
senaryo('S10 — donemselOranEtiketi(-1) belirsiz', () => {
  kontrol('etiket', () => donemselOranEtiketi(-1), 'Dönem belirsiz');
});
senaryo('S11 — yillikEsdegerEtiketi()', () => {
  kontrol('etiket', () => yillikEsdegerEtiketi(), 'Yıllık eşdeğer (tahmin)');
});
senaryo('S12 — kapsamaSeviyesi(0)', () => {
  kontrol('seviye', () => kapsamaSeviyesi(0), 'yok');
});
senaryo('S13 — kapsamaSeviyesi(-5)', () => {
  kontrol('seviye', () => kapsamaSeviyesi(-5), 'yok');
});
senaryo('S14 — kapsamaSeviyesi(0.1)', () => {
  kontrol('seviye', () => kapsamaSeviyesi(0.1), 'dusuk');
});
senaryo('S15 — kapsamaSeviyesi(49.9)', () => {
  kontrol('seviye', () => kapsamaSeviyesi(49.9), 'dusuk');
});
senaryo('S16 — kapsamaSeviyesi(50) sınır dahil', () => {
  kontrol('seviye', () => kapsamaSeviyesi(50), 'yeterli');
});
senaryo('S17 — kapsamaSeviyesi(100)', () => {
  kontrol('seviye', () => kapsamaSeviyesi(100), 'yeterli');
});
senaryo('S18 — kapsamaMetni(62.4)', () => {
  kontrol('metin', () => kapsamaMetni(62.4), 'Kapsama %62');
});
senaryo('S19 — kapsamaMetni(0)', () => {
  kontrol('metin', () => kapsamaMetni(0), 'Kapsama %0');
});
senaryo('S20 — kapsamaMetni(99.6)', () => {
  kontrol('metin', () => kapsamaMetni(99.6), 'Kapsama %100');
});
senaryo('S21 — dusukKapsamaUyarisi(20) uyarı var', () => {
  kontrol('uyarı', () => dusukKapsamaUyarisi(20), tr.inflation.lowCoverage);
});
senaryo('S22 — dusukKapsamaUyarisi(80) null', () => {
  kontrol('uyarı', () => dusukKapsamaUyarisi(80), null);
});
senaryo('S23 — dusukKapsamaUyarisi(0) null', () => {
  kontrol('uyarı', () => dusukKapsamaUyarisi(0), null);
});
senaryo('S24 — oranGosterilsinMi(0)', () => {
  kontrol('göster', () => oranGosterilsinMi(0), false);
});
senaryo('S25 — oranGosterilsinMi(0.1)', () => {
  kontrol('göster', () => oranGosterilsinMi(0.1), true);
});
senaryo('S26 — oranGosterilsinMi(100)', () => {
  kontrol('göster', () => oranGosterilsinMi(100), true);
});

senaryo('S27 — ENTEGRASYON: motor → kapsamaYuzdesine', () => {
  // Beklenen değer E0'da elle hesaplandı (S14 tohumu → coverageRate 50.0 →
  // kimlik → 50) ve E1a'dan sonra değiştirilemez.
  let sayac = 0;
  const kayit = (productId: string, date: string, unitPrice: number): PriceRecord => {
    sayac += 1;
    return {
      id: `pr-${sayac}`,
      productId,
      receiptId: `fis-${sayac}`,
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
      date,
    };
  };
  const urun = (id: string, categoryId: string): Product => ({
    id,
    name: id.toUpperCase(),
    categoryId,
    createdAt: '2026-01-01T00:00:00Z',
  });
  kontrol(
    'kapsamaYuzdesine(motor.coverageRate)',
    () => {
      const r = calculateInflation(
        [
          kayit('urun-a', '2026-06-10', 100),
          kayit('urun-a', '2026-07-05', 110),
          kayit('urun-b', '2026-06-10', 100),
          kayit('urun-b', '2026-07-05', 100),
          kayit('urun-c', '2026-07-05', 210),
        ],
        [urun('urun-a', 'gida'), urun('urun-b', 'temizlik'), urun('urun-c', 'gida')],
        { start: new Date('2026-07-01T00:00:00Z'), end: new Date('2026-07-31T00:00:00Z') },
      );
      return kapsamaYuzdesine(r.coverageRate);
    },
    50,
  );
});

// --- özet -----------------------------------------------------------------

console.log('\n=== DAĞILIM ===');
for (const d of dagilim) console.log(`  ${d.ad}: ${d.sonuc}`);
console.log(`\nToplam: ${passed} yeşil kontrol, ${failed} kırmızı kontrol`);
process.exit(failed > 0 ? 1 : 0);
