/**
 * Ekran metinleri ve eşik mantığı — M6-E (docs/m6e-on-kayit-2026-08-06.md §6).
 *
 * Modül saftır: React yok, yan etki yok, tarih/rastgelelik yok. Metin dizeleri
 * tr.ts'te yaşar; bu modül yalnızca seçim ve yerine koyma yapar. Ekranlar karar
 * mantığı içermez — çağırır ve basar.
 *
 * E1a durumu: imzalar tam, gövdeler bilerek BOŞ (throw). Gövdeler E1b'de gelir;
 * alet bu haliyle tam kırmızı koşmalıdır (yeşil = 0).
 */

export type KapsamaSeviyesi = 'yok' | 'dusuk' | 'yeterli';

/** §6.1 — pencere uzunluğundan dönemsel oran etiketi. */
export function donemselOranEtiketi(windowMonths: number): string {
  throw new Error('uygulanmadi: donemselOranEtiketi');
}

/** §6.2 — sabit yıllık eşdeğer etiketi. */
export function yillikEsdegerEtiketi(): string {
  throw new Error('uygulanmadi: yillikEsdegerEtiketi');
}

/**
 * §6.3 — motorun coverageRate değerini 0-100 aralığına çevirir. Kapsama
 * birimini bilen TEK yer; E0 ölçümü birimin zaten 0-100 olduğunu kaydetti
 * (kimlik gövdesi E1b'de).
 */
export function kapsamaYuzdesine(coverageRate: number): number {
  throw new Error('uygulanmadi: kapsamaYuzdesine');
}

/** §6.4 — eşik 50, sınır dahil (tam 50 yeterli). */
export function kapsamaSeviyesi(kapsamaYuzde: number): KapsamaSeviyesi {
  throw new Error('uygulanmadi: kapsamaSeviyesi');
}

/** §6.5 — kapsama metni; {yuzde} yerine Math.round(kapsamaYuzde). */
export function kapsamaMetni(kapsamaYuzde: number): string {
  throw new Error('uygulanmadi: kapsamaMetni');
}

/** §6.6 — seviye 'dusuk' ise uyarı metni, aksi halde null ('yok' dahil). */
export function dusukKapsamaUyarisi(kapsamaYuzde: number): string | null {
  throw new Error('uygulanmadi: dusukKapsamaUyarisi');
}

/** §6.7 — kapsama sıfırken oran hiç gösterilmez. */
export function oranGosterilsinMi(kapsamaYuzde: number): boolean {
  throw new Error('uygulanmadi: oranGosterilsinMi');
}
