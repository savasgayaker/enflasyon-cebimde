/**
 * Ekran metinleri ve eşik mantığı — M6-E (docs/m6e-on-kayit-2026-08-06.md §6).
 *
 * Modül saftır: React yok, yan etki yok, tarih/rastgelelik yok. Metin dizeleri
 * tr.ts'te yaşar; bu modül yalnızca seçim ve yerine koyma yapar. Ekranlar karar
 * mantığı içermez — çağırır ve basar.
 */
import { tr } from '../i18n/tr';

export type KapsamaSeviyesi = 'yok' | 'dusuk' | 'yeterli';

/**
 * §6.1 — pencere uzunluğundan dönemsel oran etiketi. Dal sırası bağlayıcı:
 * kısa-pencere dalı yuvarlamadan ÖNCE gelir; yoksa 0,9 → "Son 1 ayda" olur ve
 * pencerenin bir aydan kısa olduğu bilgisi kaybolur.
 */
export function donemselOranEtiketi(windowMonths: number): string {
  if (windowMonths <= 0) return tr.inflation.windowUnknown;
  if (windowMonths < 1) return tr.inflation.windowShort;
  return tr.inflation.windowLabel.replace('{ay}', String(Math.round(windowMonths)));
}

/** §6.2 — sabit yıllık eşdeğer etiketi. */
export function yillikEsdegerEtiketi(): string {
  return tr.inflation.yearlyEquivalent;
}

/**
 * §6.3 — motorun coverageRate değerini 0-100 aralığına çevirir. Kapsama
 * birimini bilen TEK yer. E0 ölçümü (E1a commit'i): motor zaten 0-100 yüzde
 * üretiyor (harcama ağırlıklı) — gövde kimliktir. Motorun birimi değişirse
 * yalnız burası düzeltilir. Yuvarlama gösterim anındadır, burada değil.
 */
export function kapsamaYuzdesine(coverageRate: number): number {
  return coverageRate;
}

/** §6.4 — eşik 50, sınır dahil (tam 50 yeterli). */
export function kapsamaSeviyesi(kapsamaYuzde: number): KapsamaSeviyesi {
  if (kapsamaYuzde <= 0) return 'yok';
  if (kapsamaYuzde < 50) return 'dusuk';
  return 'yeterli';
}

/** §6.5 — kapsama metni; {yuzde} yerine Math.round(kapsamaYuzde). */
export function kapsamaMetni(kapsamaYuzde: number): string {
  return tr.inflation.coverage.replace('{yuzde}', String(Math.round(kapsamaYuzde)));
}

/** §6.6 — seviye 'dusuk' ise uyarı metni, aksi halde null ('yok' dahil). */
export function dusukKapsamaUyarisi(kapsamaYuzde: number): string | null {
  return kapsamaSeviyesi(kapsamaYuzde) === 'dusuk' ? tr.inflation.lowCoverage : null;
}

/** §6.7 — kapsama sıfırken oran hiç gösterilmez. */
export function oranGosterilsinMi(kapsamaYuzde: number): boolean {
  return kapsamaYuzde > 0;
}
