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
  /** TUIK madde kodu; yedi hane, bos olabilir (A5-1). */
  tuikMaddeKodu?: string | null;
  /** TUIK sinif kodu; dort hane, agirligi tasir. */
  tuikSinifKodu?: string | null;
  /** Etiketi kim koydu: model, kural veya kullanici. */
  tuikKaynak?: string | null;
  /** Etiketin kural surumu. */
  tuikSurum?: number | null;
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
  satirTipi?: string | null;
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

/** Sayiya cevir; bos veya gecersizse null. */
function sayi(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/** Bos dizeyi null'a cevir; ham ad ve etiketler icin. */
function metin(x: unknown): string | null {
  if (x === null || x === undefined) return null;
  const t = String(x);
  return t.length > 0 ? t : null;
}

/**
 * Fisi, urunlerini ve fiyat kayitlarini sunucuya gonderir.
 *
 * Sira onemlidir: urunler once, sonra fis, en son fiyat
 * kayitlari - sonuncusu ikisine de basvurur.
 *
 * Herhangi bir adim basarisiz olursa **fis gonderilmis
 * sayilmaz.** Yarim gonderimi basarili saymak sessiz veri
 * kaybidir; yeniden gonderme upsert sayesinde guvenlidir.
 *
 * GORUNTU YOLU GONDERILMEZ (K1): sunucu goruntu gormez.
 */
export async function fisiGonder(
  yazici: Yazici,
  kullanici: string | null,
  fis: YazilacakFis,
  urunler: YazilacakUrun[],
  kayitlar: YazilacakKayit[],
  simdi: string,
): Promise<YazmaSonucu> {
  if (!kullanici) {
    return { gonderildi: false, hata: 'oturum yok' };
  }

  try {
    if (urunler.length > 0) {
      await yazici.upsert(
        'urunler',
        urunler.map((u) => ({
          kullanici,
          kimlik: u.id,
          ad: u.name,
          kategori: metin(u.categoryId),
          barkod: metin(u.barcode),
          tuik_madde_kodu: metin(u.tuikMaddeKodu),
          tuik_sinif_kodu: metin(u.tuikSinifKodu),
          tuik_kaynak: metin(u.tuikKaynak),
          tuik_surum: sayi(u.tuikSurum),
        })),
      );
    }

    await yazici.upsert('fisler', [
      {
        kullanici,
        kimlik: fis.id,
        magaza: fis.storeName,
        tarih: fis.date,
        toplam: sayi(fis.totalAmount) ?? 0,
      },
    ]);

    if (kayitlar.length > 0) {
      await yazici.upsert(
        'fiyat_kayitlari',
        kayitlar.map((k) => ({
          kullanici,
          kimlik: k.id,
          urun_kimligi: k.productId ?? null,
          fis_kimligi: k.receiptId,
          urun_adi: metin(k.productName),
          birim_fiyat: sayi(k.unitPrice),
          miktar: sayi(k.quantity),
          toplam_fiyat: sayi(k.totalPrice),
          tarih: k.date,
          birim: metin(k.unit),
          kdv_orani: sayi(k.vatRate),
          satir_tipi: k.satirTipi ?? 'urun',
          ham_etiket: metin(k.hamEtiket),
        })),
      );
    }

    return { gonderildi: true, gonderimZamani: simdi };
  } catch (e) {
    return { gonderildi: false, hata: String(e) };
  }
}

/**
 * Fisi ve kayitlarini siler. URUNLERE DOKUNMAZ (S4): katalog
 * fisler arasi paylasilir ve silmek baska fislerin kayitlarini
 * bozardi.
 *
 * Sira: once bagimli kayitlar, sonra fis.
 */
export async function fisiSil(
  yazici: Yazici,
  kullanici: string | null,
  fisId: string,
): Promise<YazmaSonucu> {
  if (!kullanici) {
    return { gonderildi: false, hata: 'oturum yok' };
  }
  try {
    await yazici.sil('fiyat_kayitlari', kullanici, 'fis_kimligi', fisId);
    await yazici.sil('fisler', kullanici, 'kimlik', fisId);
    return { gonderildi: true };
  } catch (e) {
    return { gonderildi: false, hata: String(e) };
  }
}
