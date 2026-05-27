import { recognizeText } from '@infinitered/react-native-mlkit-text-recognition';

/**
 * OCR'ın çıkardığı ham metin sonucu. Bu yapı bilinçli olarak "parse edilmemiş"
 * tutulur — fiş alanlarına (mağaza, tarih, ürün vb.) ayrıştırma Aşama 2'nin işidir.
 */
export interface OCRRawResult {
  /** Tüm bloklarda tespit edilen metnin newline ile birleştirilmiş tam hali. */
  fullText: string;
  /** Okuma sırasına göre satırlara ayrılmış metin. */
  lines: string[];
  /** ML Kit'in tespit ettiği metin blokları (paragraf/bölüm benzeri gruplar). */
  blocks: {
    text: string;
    lines: string[];
  }[];
  /**
   * 0–1 arası genel güven skoru. ML Kit'in mevcut React Native binding'i
   * eleman bazlı güven değeri döndürmediği için varsayılan olarak 1 kullanılır.
   */
  confidence: number;
}

/**
 * Verilen görüntüden OCR ile metin çıkarır. Tamamen cihaz üzerinde çalışır,
 * internet bağlantısı gerektirmez. Google ML Kit Text Recognition kullanır;
 * Latin alfabesi (Türkçe karakterler dahil: Ç, Ş, İ, Ğ, Ü, Ö) desteklenir.
 *
 * @param imageUri Görüntünün yerel URI'si (örn. `file:///...` veya
 *   `expo-image-picker` / `expo-camera`'nın döndürdüğü URI).
 * @returns Çıkarılan ham metin sonucu (bkz. {@link OCRRawResult}).
 * @throws Görüntü okunamadığında, dosya bulunamadığında veya ML Kit
 *   tarafında bir hata oluştuğunda fırlatır. Çağıran tarafta `try/catch`
 *   ile yakalanıp kullanıcıya Türkçe bir hata mesajı gösterilmesi beklenir.
 */
export async function extractTextFromImage(
  imageUri: string,
): Promise<OCRRawResult> {
  if (!imageUri || typeof imageUri !== 'string') {
    throw new Error('Geçersiz görüntü URI\'si');
  }

  const result = await recognizeText(imageUri);

  const blocks = (result.blocks ?? []).map((block) => ({
    text: block.text,
    lines: (block.lines ?? []).map((line) => line.text),
  }));

  const lines = blocks.flatMap((block) => block.lines);

  return {
    fullText: result.text ?? '',
    lines,
    blocks,
    confidence: 1,
  };
}
