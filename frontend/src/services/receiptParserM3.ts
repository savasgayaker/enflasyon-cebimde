import { BACKEND_URL } from '../constants/config';
import { mapM3Response, type M3Response } from './m3Mapper';
import type { ParsedReceipt } from './receiptParser';

/**
 * Fiş fotoğrafını backend'deki MiniMax M3 vision proxy'sine yükler ve
 * ParsedReceipt döner. Eski `extractTextFromImage` + `parseReceipt`
 * zincirinin yerini alır (karar kaydı: m3-test/results/RAPOR.md).
 *
 * Yanıt → ParsedReceipt eşlemesi `mapM3Response`'ta (saf, birim testli);
 * bu dosya yalnızca ağ katmanı.
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
  return mapM3Response(data);
}
