import { suggestCategory } from '../constants/categories';
import type { ParsedReceipt, ParsedItem } from './receiptParser';

/**
 * Backend'in /api/parse-receipt yanıt şeması (bkz. backend/server.py).
 * ParsedReceipt'ten farkları: fiş seviyesinde needsReview var,
 * ürünlerde categoryId yok (kategori önerisi istemcide yapılır).
 */
export interface M3Response {
  storeName: string;
  date: string;
  totalAmount: number;
  needsReview: boolean;
  items: {
    name: string;
    quantity: number;
    unitPrice: number | null;
    totalPrice: number | null;
    unit?: string | null;
    vatRate?: number | null;
    needsReview: boolean;
  }[];
}

/**
 * M3 backend yanıtını ParsedReceipt'e eşler. Saf fonksiyon — ağ yok,
 * expo bağımlılığı yok; `scripts/test-m3-mapper.ts` ile birim test edilir.
 *
 * Kurallar:
 * - unitPrice yoksa ve quantity GEÇERLİ (> 0, sonlu sayı) ise
 *   totalPrice/quantity'den türetilir (2 haneye yuvarlı). quantity 0,
 *   eksik veya bozuksa türetme YAPILMAZ (sıfıra/çöpe bölme koruması) —
 *   unitPrice null kalır.
 * - totalPrice null olan kalem her durumda needsReview'dur.
 * - Fiş seviyesindeki needsReview kalemlere yayılır (toplam tutmadığında
 *   hangi kalemin hatalı olduğu bilinemez, kullanıcı hepsini gözden geçirmeli).
 *
 * @throws Ürün listesi boşsa Türkçe yönlendirme mesajıyla Error (en olası
 *   sebep fişin kadrajda çok küçük/uzak kalması).
 */
export function mapM3Response(data: M3Response): ParsedReceipt {
  const spreadReview = data.needsReview === true;
  const items: ParsedItem[] = (data.items ?? []).map((it) => {
    const rawQuantity = it.quantity;
    const hasValidQuantity =
      typeof rawQuantity === 'number' &&
      Number.isFinite(rawQuantity) &&
      rawQuantity > 0;
    const quantity = hasValidQuantity ? rawQuantity : 1;

    const totalPrice =
      typeof it.totalPrice === 'number' && Number.isFinite(it.totalPrice)
        ? it.totalPrice
        : null;

    // unitPrice yoksa toplamdan türet — ama yalnızca bölen güvenilirse.
    // Toplamı doğrudan birim fiyata yazmak çok adetli üründe inflation.ts'in
    // birim fiyat karşılaştırmasını bozar; bozuk quantity ile bölmek de öyle.
    let unitPrice =
      typeof it.unitPrice === 'number' && Number.isFinite(it.unitPrice)
        ? it.unitPrice
        : null;
    if (unitPrice === null && totalPrice !== null && hasValidQuantity) {
      unitPrice = Math.round((totalPrice / rawQuantity) * 100) / 100;
    }

    return {
      name: it.name,
      quantity,
      unitPrice,
      totalPrice,
      unit: it.unit,
      vatRate: it.vatRate,
      categoryId: suggestCategory(it.name).id,
      needsReview: spreadReview || it.needsReview === true || totalPrice === null,
    };
  });

  // Model geçerli JSON döndürüp hiç ürün bulamadıysa en olası sebep fişin
  // kadrajda çok küçük/uzak kalması — kullanıcıyı tekrar çekime yönlendir.
  if (items.length === 0) {
    throw new Error(
      'Fişte ürün okunamadı. Fişe daha yakından, çerçeveyi dolduracak şekilde tekrar çekmeyi deneyin.',
    );
  }

  return {
    storeName: data.storeName ?? '',
    date: data.date ?? new Date().toISOString().split('T')[0],
    totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
    items,
  };
}
