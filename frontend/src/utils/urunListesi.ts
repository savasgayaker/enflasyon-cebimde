/**
 * Urun listesi kurulumu - saf modul.
 *
 * Sozlesme: React yok, yan etki yok, simdiki zaman ve rastgelelik
 * yok. Ekranlar karar mantigi icermez; cagirir ve basar.
 *
 * M8-5b: govde M8-5b'nin ikinci yarisinda doldurulur.
 */
import type { UrunGrubu } from './urunGruplama';

export interface ListeKaydi {
  productId: string | null;
  unitPrice: number;
  date: string;
}

export interface ListeUrunu {
  id: string;
  name: string;
  categoryId: string;
  createdAt?: string | null;
}

export interface ListeSatiri {
  /** Temsilcinin kimligi; detaya bu id ile gidilir. */
  id: string;
  /** Temsilcinin ham adi. */
  name: string;
  categoryId: string;
  lastPrice: number;
  firstPrice: number;
  priceChange: number;
  recordCount: number;
}

const ISKELE = 'M8-5b ikinci yari bekleniyor: govde yazilmadi';

export function listeSatirlariniKur(
  _gruplar: UrunGrubu[],
  _urunler: ListeUrunu[],
  _kayitlar: ListeKaydi[],
): ListeSatiri[] {
  throw new Error(ISKELE);
}
