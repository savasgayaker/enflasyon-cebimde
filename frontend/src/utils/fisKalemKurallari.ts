/**
 * Fis kalemi kurallari - saf modul.
 *
 * Sozlesme: React yok, yan etki yok, tarih ve rastgelelik yok.
 * Ekranlar karar mantigi icermez; bu modulu cagirir ve basar.
 *
 * Id uretimi, findOrCreateProduct ve store cagrilari bu modulun
 * disindadir (M7-D1 sinir karari 2).
 *
 * M7-D1: govdeler D1-2'de doldurulur.
 */

export type SeritSeviyesi = 'yok' | 'incele' | 'eksik';

export interface KalemGirdisi {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  needsReview?: boolean;
  unit?: string | null;
  vatRate?: number | null;
  satirTipi?: string | null;
}

export interface KayitKarari {
  urunOlusturulsunMu: boolean;
  kayit: {
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
}

const ISKELE = 'M7-D1-2 bekleniyor: govde henuz yazilmadi';

export function kalemGecerliMi(_kalem: KalemGirdisi): boolean {
  throw new Error(ISKELE);
}

export function seritSeviyesi(_kalem: KalemGirdisi): SeritSeviyesi {
  throw new Error(ISKELE);
}

export function kayitKarari(_kalem: KalemGirdisi): KayitKarari {
  throw new Error(ISKELE);
}
