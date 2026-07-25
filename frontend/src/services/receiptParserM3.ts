import { BACKEND_URL } from '../constants/config';
import { suggestCategory } from '../constants/categories';
import type { ParsedReceipt, ParsedItem } from './receiptParser';

/**
 * Backend'in /api/parse-receipt yanıt şeması (bkz. backend/server.py).
 * ParsedReceipt'ten farkları: fiş seviyesinde needsReview var,
 * ürünlerde categoryId yok (kategori önerisi istemcide yapılır).
 */
interface M3Response {
  storeName: string;
  date: string;
  totalAmount: number;
  needsReview: boolean;
  items: {
    name: string;
    quantity: number;
    unitPrice: number | null;
    totalPrice: number | null;
    needsReview: boolean;
  }[];
}

/**
 * Fiş fotoğrafını backend'deki MiniMax M3 vision proxy'sine yükler ve
 * ParsedReceipt döner. Eski `extractTextFromImage` + `parseReceipt`
 * zincirinin yerini alır (karar kaydı: m3-test/results/RAPOR.md).
 *
 * Aritmetik çapraz-kontrol backend'de yapılır; fiş seviyesindeki
 * needsReview burada ürünlere yayılır çünkü ParsedReceipt/UI kalem
 * bazlı bayrak kullanır ve toplam tutmadığında hangi kalemin hatalı
 * olduğu bilinemez — kullanıcı hepsini gözden geçirmeli.
 *
 * @param imageUri Yerel fotoğraf URI'si (kamera veya galeri çıktısı).
 * @throws Ağ hatası, backend hatası veya geçersiz yanıt durumunda
 *   Türkçe mesajlı Error fırlatır; çağıran taraf Alert ile gösterir.
 */
export async function parseReceiptViaM3(imageUri: string): Promise<ParsedReceipt> {
  const form = new FormData();
  // React Native'in FormData'sı {uri, name, type} nesnesini dosya olarak yükler.
  form.append('image', {
    uri: imageUri,
    name: 'receipt.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/parse-receipt`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error(
      'Sunucuya ulaşılamadı. Telefonun ve bilgisayarın aynı Wi-Fi ağında olduğundan ve backend\'in çalıştığından emin olun.',
    );
  }

  if (!response.ok) {
    let detail = 'Fiş okunamadı, lütfen tekrar deneyin.';
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
      // gövde JSON değilse varsayılan mesaj kalır
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as M3Response;

  const spreadReview = data.needsReview === true;
  const items: ParsedItem[] = (data.items ?? []).map((it) => {
    const quantity =
      typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1;
    // unitPrice yoksa toplamdan türet (totalPrice / quantity) — toplamı
    // doğrudan birim fiyata yazmak çok adetli üründe inflation.ts'in birim
    // fiyat karşılaştırmasını bozar.
    let unitPrice = it.unitPrice ?? null;
    if (unitPrice === null && it.totalPrice !== null) {
      unitPrice = Math.round((it.totalPrice / quantity) * 100) / 100;
    }
    return {
      name: it.name,
      quantity,
      unitPrice,
      totalPrice: it.totalPrice,
      categoryId: suggestCategory(it.name).id,
      needsReview: spreadReview || it.needsReview === true,
    };
  });

  return {
    storeName: data.storeName ?? '',
    date: data.date ?? new Date().toISOString().split('T')[0],
    totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
    items,
  };
}
