import { recognizeText } from '@infinitered/react-native-mlkit-text-recognition';

/**
 * Bir metin parçasının görüntü üzerindeki sınırlayıcı dikdörtgeni.
 * Koordinatlar sol-üst orijinli ve görüntü pikseli cinsindedir
 * (Google ML Kit'in yerleşik konvansiyonu).
 */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Frame bilgisiyle birlikte tek bir OCR satırı. Satır = ML Kit'in
 * "TextLine" karşılığı (yatay olarak bitişik birkaç kelimenin grubu).
 */
export interface OCRLine {
  text: string;
  frame: Rect;
}

/**
 * OCR'ın çıkardığı ham metin sonucu. Bu yapı bilinçli olarak "parse edilmemiş"
 * tutulur — fiş alanlarına (mağaza, tarih, ürün vb.) ayrıştırma parser'ın işidir.
 *
 * Frame koordinatları, parser'ın ürün–fiyat eşleştirmesini yapabilmesi için
 * şarttır: Türkçe market fişlerinde ML Kit ürün isimlerini bir blokta,
 * fiyatları başka bir blokta verir; y-koordinatı eşleşmesi olmadan
 * "yan yana" varsayımı bozulur.
 */
export interface OCRRawResult {
  /** Tüm bloklarda tespit edilen metnin newline ile birleştirilmiş tam hali. */
  fullText: string;
  /** Okuma sırasına göre satırlara ayrılmış metin + her satırın bounding box'ı. */
  lines: OCRLine[];
  /** ML Kit'in tespit ettiği metin blokları (paragraf/bölüm benzeri gruplar). */
  blocks: {
    text: string;
    frame: Rect;
    lines: OCRLine[];
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
    frame: toRect(block.frame),
    lines: (block.lines ?? []).map((line) => ({
      text: line.text,
      frame: toRect(line.frame),
    })),
  }));

  const lines = blocks.flatMap((block) => block.lines);

  return {
    fullText: result.text ?? '',
    lines,
    blocks,
    confidence: 1,
  };
}

/**
 * ML Kit'in dönen frame'ini bizim Rect tipimize çevirir.
 * Şu an birebir kopya; ileride platform farklılıkları çıkarsa
 * normalizasyon noktası burası olacak.
 */
function toRect(frame: { left: number; top: number; right: number; bottom: number }): Rect {
  return {
    left: frame.left,
    top: frame.top,
    right: frame.right,
    bottom: frame.bottom,
  };
}
