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

export function listeSatirlariniKur(
  gruplar: UrunGrubu[],
  urunler: ListeUrunu[],
  kayitlar: ListeKaydi[],
): ListeSatiri[] {
  // Kimlikten urune hizli erisim.
  const urunHaritasi = new Map<string, ListeUrunu>();
  for (const u of urunler) urunHaritasi.set(u.id, u);

  return gruplar.map((grup) => {
    const uyeler = new Set(grup.uyeIdler);
    // null productId'li kayitlar (indirimler) hicbir uyeye ait
    // olmadigi icin dogal olarak disarida kalir; ayri muhafiz
    // gerekmez (M7-D3a ile tutarli).
    const kendi = kayitlar
      .filter((r) => r.productId !== null && uyeler.has(r.productId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // M8-5b karakterizasyonu: asagidaki iki dusme bugunku
    // davranistir ve birebir korunur. Kayitsiz urun sifir fiyatla
    // gorunur; bu olculmemis bir alandir ve L8 onu sabitler.
    const lastPrice = kendi[0]?.unitPrice || 0;
    const firstPrice = kendi[kendi.length - 1]?.unitPrice || lastPrice;
    const priceChange =
      firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    const temsilci = urunHaritasi.get(grup.temsilciId);
    return {
      id: grup.temsilciId,
      name: grup.temsilciAd,
      categoryId: temsilci?.categoryId ?? '',
      lastPrice,
      firstPrice,
      priceChange,
      recordCount: kendi.length,
    };
  });
}

/** Bir urun kimliginin ait oldugu grubun cozumu. */
export interface GrupCozumu {
  /** Grubun temsilci kimligi; null ise kimlik hicbir gruba ait degil. */
  temsilciId: string | null;
  /** Temsilcinin ham adi. */
  ad: string;
  /** Gruba giren tum kimlikler. */
  uyeIdler: string[];
}

/**
 * Gelen kimligin ait oldugu grubu cozer.
 *
 * Kimlik temsilci de olabilir uye de: urun listesi temsilci
 * kimligi gonderir, fis detayi kaydin kendi uye kimligini
 * gonderir. Ikisi de ayni grubu bulur (S9 karar 1).
 */
export function grupCoz(gruplar: UrunGrubu[], id: string): GrupCozumu {
  for (const g of gruplar) {
    if (g.uyeIdler.includes(id)) {
      return { temsilciId: g.temsilciId, ad: g.temsilciAd, uyeIdler: g.uyeIdler };
    }
  }
  return { temsilciId: null, ad: '', uyeIdler: [] };
}
