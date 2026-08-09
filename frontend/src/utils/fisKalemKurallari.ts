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

export function kalemGecerliMi(kalem: KalemGirdisi): boolean {
  // M7-D1: bugunku davranis birebir korunur. Indirim istisnasi
  // D3'te gelecek; buradaki hal V4 ve V5 muhafizlarina baglidir.
  return kalem.name.trim() !== '' && kalem.unitPrice > 0;
}

export function seritSeviyesi(kalem: KalemGirdisi): SeritSeviyesi {
  // M7-D1: bugunku davranis birebir korunur. Negatif tutar iki
  // dali da atlar ve yok doner; S4 muhafizina baglidir ve D4'te
  // degisecektir.
  if (!kalem.needsReview) return 'yok';
  if (kalem.totalPrice === 0) return 'eksik';
  if (kalem.totalPrice > 0) return 'incele';
  return 'yok';
}

export function kayitKarari(kalem: KalemGirdisi): KayitKarari {
  // M7-D1: bugunku davranis birebir korunur. Urun her kalem icin
  // kosulsuz olusturulur; indirim istisnasi D3'te gelecek ve K2
  // muhafizi orada degisecektir.
  return {
    urunOlusturulsunMu: true,
    kayit: {
      quantity: kalem.quantity,
      unitPrice: kalem.unitPrice,
      totalPrice: kalem.totalPrice,
    },
  };
}
