/**
 * Sunucuya yazma - saf modul.
 *
 * Sozlesme: React yok, Supabase'i DOGRUDAN cagirmaz, simdiki
 * zaman disaridan verilir. Yazici arayuzu enjekte edilir ve
 * boylece alet gercek aga cikmadan modulu olcer.
 *
 * A4-3b: govde ikinci yarida doldurulur.
 */

/** Sunucuya yazma arayuzu; gercekte Supabase istemcisi saglar. */
export interface Yazici {
  /** Tabloya satirlari yazar; ayni anahtar varsa uzerine yazar. */
  upsert(tablo: string, satirlar: Record<string, unknown>[]): Promise<void>;
  /** Tablodan alan degerine esit satirlari siler. */
  sil(tablo: string, kullanici: string, alan: string, deger: string): Promise<void>;
}

export interface YazilacakFis {
  id: string;
  storeName: string;
  date: string;
  totalAmount?: number | null;
  imageUri?: string | null;
  createdAt?: string;
}

export interface YazilacakUrun {
  id: string;
  name: string;
  categoryId?: string | null;
  barcode?: string | null;
  createdAt?: string;
}

export interface YazilacakKayit {
  id: string;
  productId: string | null;
  receiptId: string;
  productName?: string;
  unitPrice?: number | null;
  quantity?: number;
  totalPrice?: number;
  date: string;
  unit?: string | null;
  vatRate?: number | null;
  satirTipi?: string;
  hamEtiket?: string | null;
  createdAt?: string;
}

export interface YazmaSonucu {
  gonderildi: boolean;
  /** Basarida verilen zaman damgasi, aksi halde tanimsiz. */
  gonderimZamani?: string;
  /** Basarisizlik nedeni; kayit icin, kullaniciya gosterilmez. */
  hata?: string;
}

const ISKELE = 'A4-3b ikinci yari bekleniyor: govde yazilmadi';

export async function fisiGonder(
  _yazici: Yazici,
  _kullanici: string | null,
  _fis: YazilacakFis,
  _urunler: YazilacakUrun[],
  _kayitlar: YazilacakKayit[],
  _simdi: string,
): Promise<YazmaSonucu> {
  throw new Error(ISKELE);
}

/**
 * Fisi ve kayitlarini siler. URUNLERE DOKUNMAZ (S4): katalog
 * fisler arasi paylasilir ve silmek baska fislerin kayitlarini
 * bozardi.
 */
export async function fisiSil(
  _yazici: Yazici,
  _kullanici: string | null,
  _fisId: string,
): Promise<YazmaSonucu> {
  throw new Error(ISKELE);
}
