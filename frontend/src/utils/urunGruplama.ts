/**
 * Urun gruplama - saf modul.
 *
 * Ayni tekil urune ait Product kayitlarini gruplar.
 *
 * Sozlesme: React yok, yan etki yok, tarih ve rastgelelik yok.
 *
 * Sonuc SAKLANMAZ, okuma aninda hesaplanir (M8/S2). K4 kural 2:
 * hesaplanmis sayi saklanmaz, olgu saklanir. Gruplama bir hesap
 * sonucudur ve kural surumu degisince kendiliginden guncellenir.
 */
import { normalizeUrunAdi, NORMALIZE_SURUMU } from './urunAdiNormalize';

export interface GruplanabilirUrun {
  id: string;
  name: string;
  createdAt?: string | number | null;
}

export interface UrunGrubu {
  /** Grubun temsilcisi: en eski uyenin kimligi. */
  temsilciId: string;
  /** Temsilcinin ham adi. Ham ad asla uzerine yazilmaz (K4 kural 1). */
  temsilciAd: string;
  /** Gruba giren tum Product kimlikleri, temsilci dahil. */
  uyeIdler: string[];
  /** Karsilastirma anahtari. */
  anahtar: string;
}

export interface GruplamaSonucu {
  gruplar: UrunGrubu[];
  /** Hangi kural surumuyle hesaplandi. Saklanmaz, her hesapta yeniden yazilir. */
  kuralSurumu: number;
}

function zaman(u: GruplanabilirUrun): number {
  const d = u.createdAt;
  if (d === null || d === undefined) return Number.MAX_SAFE_INTEGER;
  const n = typeof d === 'number' ? d : Date.parse(d);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

/**
 * Urunleri tekil urun gruplarina ayirir.
 *
 * Temsilci en eski uyedir; esitlikte girdi sirasi korunur. Secim
 * deterministiktir - ad secimi keyfi olmamalidir.
 */
export function urunleriGrupla(urunler: GruplanabilirUrun[]): GruplamaSonucu {
  const kova = new Map<string, GruplanabilirUrun[]>();
  for (const u of urunler) {
    const k = normalizeUrunAdi(u.name);
    const mevcut = kova.get(k);
    if (mevcut) mevcut.push(u);
    else kova.set(k, [u]);
  }
  const gruplar: UrunGrubu[] = [];
  for (const [anahtar, uyeler] of kova) {
    let temsilci = uyeler[0];
    for (const u of uyeler) {
      if (zaman(u) < zaman(temsilci)) temsilci = u;
    }
    gruplar.push({
      temsilciId: temsilci.id,
      temsilciAd: temsilci.name,
      uyeIdler: uyeler.map((u) => u.id),
      anahtar,
    });
  }
  return { gruplar, kuralSurumu: NORMALIZE_SURUMU };
}

/**
 * Product kimliginden grup temsilcisine harita.
 *
 * Motor ve ekranlar bunu kullanir: bir PriceRecord'un productId'si
 * bu haritadan gecirilince ayni tekil urunun kayitlari bir araya
 * gelir.
 */
export function temsilciHaritasi(sonuc: GruplamaSonucu): Map<string, string> {
  const h = new Map<string, string>();
  for (const g of sonuc.gruplar) {
    for (const id of g.uyeIdler) h.set(id, g.temsilciId);
  }
  return h;
}
