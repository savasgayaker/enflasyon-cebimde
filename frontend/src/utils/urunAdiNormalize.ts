/**
 * Urun adi normalizasyonu - saf modul.
 *
 * Sozlesme: React yok, yan etki yok, tarih ve rastgelelik yok.
 *
 * KAPSAM (M8, katman 1): yalniz harf katlama ve bosluk
 * sadelestirmesi. Noktalama KORUNUR, rakam ve birimler
 * dokunulmaz.
 *
 * Kapsam disi (katman 2): kisaltmalar, OCR harf hatalari,
 * kelime farklari. K4 kural 3 - yanlis birlestirmek,
 * birlestirmemekten kotudur.
 */

/** Esleme kurallarinin surumu. Tablo degisirse artirilir. */
export const NORMALIZE_SURUMU = 1;

/**
 * Turkce harf katlama tablosu.
 *
 * toLowerCase kullanilmaz: yerel davranisi platforma gore degisir
 * ve noktali buyuk I icin i arti birlesen nokta uretir
 * (M8-2'de olculdu: U+0130 -> U+0069 U+0307).
 */
const HARF: Record<string, string> = {
  'Ş': 'S', 'ş': 's',   // S-cedilla
  'Ğ': 'G', 'ğ': 'g',   // yumusak G
  'İ': 'I', 'ı': 'i',   // noktali I, noktasiz i
  'Ç': 'C', 'ç': 'c',   // C-cedilla
  'Ö': 'O', 'ö': 'o',   // O-umlaut
  'Ü': 'U', 'ü': 'u',   // U-umlaut
};

/**
 * Urun adini karsilastirma icin normalize eder.
 *
 * Ham ad ASLA uzerine yazilmaz (K4 kural 1); bu fonksiyonun
 * ciktisi yalnizca karsilastirma anahtaridir.
 */
export function normalizeUrunAdi(ad: string): string {
  let s = '';
  for (const ch of ad) {
    s += HARF[ch] ?? ch;
  }
  // ASCII kucuk harfe indir. Tablo Turkce harfleri zaten ASCII'ye
  // katladigi icin burada yerel sorunu kalmaz.
  s = s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  // Bosluk sadelestirmesi: coklu bosluk teke, bas ve son kirpilir.
  // Noktalama korunur - tire silinseydi COCA-COLA ile COCA COLA
  // birleserdi ve bu katman 2'nin riskidir.
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Iki urun adi ayni tekil urune mi ait. */
export function ayniUrunMu(a: string, b: string): boolean {
  return normalizeUrunAdi(a) === normalizeUrunAdi(b);
}
