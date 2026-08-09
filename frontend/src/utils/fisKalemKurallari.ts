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
  if (kalem.name.trim() === '') return false;
  // M7-D3a: indirim satirinin anlamli bir birim fiyati yoktur ve
  // tutari negatiftir; gecerlilik sarti tur bazinda ayrisir.
  // Indirim OLMAYAN negatif kalem hala gecersizdir (V4) - bu,
  // backend'deki negatif dalinin arayuz karsiligidir.
  if (kalem.satirTipi === 'indirim') return kalem.totalPrice < 0;
  return kalem.unitPrice > 0;
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
  // M7-D3a: indirim kaleminde urun OLUSTURULMAZ. Olusturulsaydi
  // kampanya etiketi adinda sahte bir urun dogar ve zamanla fiyat
  // serisini kirletirdi (on kayit cekirdek karari).
  return {
    urunOlusturulsunMu: kalem.satirTipi !== 'indirim',
    kayit: {
      quantity: kalem.quantity,
      unitPrice: kalem.unitPrice,
      totalPrice: kalem.totalPrice,
    },
  };
}
