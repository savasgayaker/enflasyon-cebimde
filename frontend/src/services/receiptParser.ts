import type { OCRRawResult, OCRLine } from './ocrService';

/**
 * Parser çıktısı. Alanlar mock OCR'ın `OCRResult` şemasıyla birebir uyumludur,
 * böylece scan akışı M5'te tek satırlık import değişikliğiyle gerçek pipeline'a
 * bağlanabilir.
 */
export interface ParsedReceipt {
  storeName: string;
  /** YYYY-MM-DD. Tarih bulunamazsa bugünün tarihi. */
  date: string;
  /** TL cinsinden toplam tutar. Bulunamazsa 0. */
  totalAmount: number;
  items: ParsedItem[];
}

export interface ParsedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  categoryId: string;
}

/**
 * ML Kit'ten gelen ham OCR sonucunu Türkçe market fişi olarak ayrıştırır.
 * Saf fonksiyon; aynı girdiye aynı çıktıyı verir, side-effect yok.
 *
 * Aşama 2 / M2 — storeName, date, total. Items M4'te eklenecek; şimdilik
 * boş dizi döner.
 */
export function parseReceipt(raw: OCRRawResult): ParsedReceipt {
  return {
    storeName: extractStoreName(raw),
    date: extractDate(raw),
    totalAmount: extractTotal(raw),
    items: [],
  };
}

// ---------------------------------------------------------------------------
// Mağaza adı
// ---------------------------------------------------------------------------

/**
 * Bilinen Türk market zincirleri. Fişin üst kısmında geçen ilk eşleşme
 * mağaza adı kabul edilir. Liste büyüdükçe öncelik daha uzun isimde
 * (örn. "Macro Center", "Migros"tan önce kontrol edilir).
 */
const KNOWN_STORES = [
  'Migros',
  'Macro Center',
  'CarrefourSA',
  'Carrefour',
  'A101',
  'BİM',
  'BIM',
  'ŞOK',
  'SOK',
  'File',
  'Bildirici',
  'Bizim Toptan',
  'Hakmar',
  'Onur',
  'Tarım Kredi',
] as const;

/** OCR'da sık karşılaşılan harf karışıklıklarını normalize eder. */
function normalizeForMatch(text: string): string {
  return text
    .toUpperCase()
    .replace(/[İIÎ]/g, 'I')
    .replace(/[ŞS]/g, 'S')
    .replace(/[ĞG]/g, 'G')
    .replace(/[ÇC]/g, 'C')
    .replace(/[ÖO]/g, 'O')
    .replace(/[ÜU]/g, 'U')
    .replace(/[5]/g, 'S') // OCR'da Ş → 5 karışıklığı
    .replace(/[0]/g, 'O') // OCR'da O → 0 karışıklığı
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Şirket unvanı → marka eşleme. KNOWN_STORES taramasından önce çalışır;
 * e-arşiv fişlerinde marka adı yerine ticari unvan basıldığı için gereklidir
 * (ör. BİM e-arşiv kâğıdında "BIY BIRLESIK MAĞAZALAR A.Ş." geçer).
 */
const STORE_ALIASES: { pattern: string; store: string }[] = [
  { pattern: 'BIY BIRLESIK', store: 'BİM' },
  { pattern: 'FILE MARKET', store: 'File' },
  { pattern: 'CARREFOURSA', store: 'CarrefourSA' },
];

/** "E-Arsiv Fatura" / "E-Arşiv Fatura" / "E ARSIV" başlıkları fallback'te atılır. */
const E_ARSIV_RE = /E[\s\-]?AR[SŞ]IV/i;

export function extractStoreName(raw: OCRRawResult): string {
  // Üstteki satırlara öncelik ver (y-koordinatına göre küçükten büyüğe).
  // İlk 8 satır içinde tara — fiş başlığı genelde ilk 3-5 satırda olur.
  const topLines = [...raw.lines]
    .sort((a, b) => a.frame.top - b.frame.top)
    .slice(0, 8);

  // 1) Unvan → marka eşleme (KNOWN_STORES'tan önce, çünkü e-arşivde unvan basılır)
  for (const line of topLines) {
    const normalized = normalizeForMatch(line.text);
    for (const alias of STORE_ALIASES) {
      if (normalized.includes(normalizeForMatch(alias.pattern))) {
        return alias.store;
      }
    }
  }

  // 2) Bilinen marka eşleme
  for (const line of topLines) {
    const normalized = normalizeForMatch(line.text);
    for (const store of KNOWN_STORES) {
      if (normalized.includes(normalizeForMatch(store))) {
        return store;
      }
    }
  }

  // 3) Fallback: ilk dolu satır — ama "E-Arsiv Fatura" başlığı geçilir
  for (const line of topLines) {
    const text = line.text.trim();
    if (text.length === 0) continue;
    if (E_ARSIV_RE.test(text)) continue;
    return text;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Tarih
// ---------------------------------------------------------------------------

/** dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy (2 veya 4 haneli yıl) */
const DATE_DMY = /(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})/;
/** ISO YYYY-MM-DD */
const DATE_ISO = /(\d{4})-(\d{2})-(\d{2})/;

export function extractDate(raw: OCRRawResult): string {
  for (const line of raw.lines) {
    const iso = line.text.match(DATE_ISO);
    if (iso) {
      const [, y, m, d] = iso;
      if (isValidDate(+y, +m, +d)) return formatISO(+y, +m, +d);
    }
    const dmy = line.text.match(DATE_DMY);
    if (dmy) {
      const [, dStr, mStr, yStr] = dmy;
      const d = +dStr;
      const m = +mStr;
      let y = +yStr;
      if (y < 100) y = y + 2000; // 2 haneli yıl → 20xx varsay
      if (isValidDate(y, m, d)) return formatISO(y, m, d);
    }
  }
  // Fallback: bugün
  return new Date().toISOString().split('T')[0];
}

function isValidDate(y: number, m: number, d: number): boolean {
  if (y < 2000 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function formatISO(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Toplam tutar
// ---------------------------------------------------------------------------

/**
 * Türk para format: 1.234,56 veya 1234,56 veya 1234.56. Opsiyonel * öneki,
 * opsiyonel TL/₺ son eki. Yakalanan grupta sayı kısmı döner.
 */
const PRICE_RE = /\*?\s*(\d{1,3}(?:\.\d{3})*(?:[,.]\d{1,2})|\d+[,.]\d{1,2}|\d+)\s*(?:TL|₺)?/i;

/**
 * Anahtar kelimeler ÖNCELİK sırasında denenir. "ÖDENECEK" en başta, çünkü
 * e-arşivde toplam tutar burada açıkça basılır; "TOPLAM" daha öncesi de
 * geçtiği için ("TOPLAM KDV" gibi tuzaklar) öncelik düşürülür.
 */
const TOTAL_KEYWORDS = ['ÖDENECEK', 'GENEL TOPLAM', 'TOPLAM', 'TUTAR'] as const;

/** TOPLAM ve TUTAR keyword'leri KDV/KOV satırlarına yanlışlıkla yapışabilir. */
const KDV_SKIP_KEYWORDS = new Set<string>(['TOPLAM', 'TUTAR']);

/** "TOPLAM KDV" / "TOPLAM KOV" / "KDV TUTARI" gibi tuzakları tespit eder. */
const KDV_TRAP_RE = /K[DO]V/;

export function extractTotal(raw: OCRRawResult): number {
  if (raw.lines.length === 0) return 0;

  // Sağ kolon eşiği: tüm satırların en sağındaki noktaların %50'sini geçen
  // satırlar "değer kolonu" sayılır. Bu sayede "Banka Kredi Karti (1)" gibi
  // sol kolon satırlarındaki sahte sayılar (parantez içindeki 1) elenir.
  const allRight = Math.max(...raw.lines.map((l) => l.frame.right));
  const rightColumnThreshold = allRight * 0.5;

  // Dış döngü = keyword önceliği, iç döngü = satırlar. Eşleşen ilk
  // (keyword, satır) çiftinden bir fiyat çıkartabilirsek anında dönülür.
  for (const keyword of TOTAL_KEYWORDS) {
    const normalizedKeyword = normalizeForMatch(keyword);
    const skipKdv = KDV_SKIP_KEYWORDS.has(keyword);

    for (const line of raw.lines) {
      const normalized = normalizeForMatch(line.text);
      if (!normalized.includes(normalizedKeyword)) continue;

      // KDV tuzağı: "TOPLAM KDV", "TOPLAN KDV", "TOPKDV", "KDV TUTARI" vb.
      // ÖDENECEK ve GENEL TOPLAM için bu kontrol gerekmez.
      if (skipKdv && KDV_TRAP_RE.test(line.text.toUpperCase())) continue;

      const price = findPriceForLabel(line, raw.lines, rightColumnThreshold);
      if (price !== null) return price;
    }
  }

  return 0;
}

/**
 * Bir etiket satırı için fiyatı bulur:
 *  1. Önce aynı satırda fiyat var mı?
 *  2. Etiketten itibaren ~3 satır yüksekliği kadar AŞAĞIYI tarar; sağ
 *     kolon eşiğini geçen satırlardaki fiyatları toplar.
 *  3. Adaylar arasında "*" önekli olanlar (kanonik POS işareti) tercih
 *     edilir; aynı kategoride en üstteki (etikete en yakın) seçilir.
 *
 * Bu strateji "Odenecek KDV Dahil Tutar" satırının altındaki birden çok
 * fiyat senaryosunu güvenle ele alır — örn. File fişinde aynı bantta hem
 * OCR'ın "*"'ı 4'e dönüştürdüğü 4863.54 hem de payment satırındaki
 * doğru *863.54 bulunur; * tercihi doğru olanı seçer.
 */
function findPriceForLabel(
  label: OCRLine,
  all: OCRLine[],
  rightColumnThreshold: number,
): number | null {
  // 1) Aynı satırda
  const sameLine = parsePrice(label.text);
  if (sameLine !== null) return sameLine;

  // 2) Aşağıdaki + aynı-satır penceresinde adayları topla
  const labelHeight = label.frame.bottom - label.frame.top;
  const yMin = label.frame.top;
  const yMax = label.frame.bottom + labelHeight * 3;

  const candidates: { price: number; y: number; hasStar: boolean }[] = [];
  for (const other of all) {
    if (other === label) continue;
    if (other.frame.left < rightColumnThreshold) continue;
    const mid = (other.frame.top + other.frame.bottom) / 2;
    if (mid < yMin || mid > yMax) continue;
    const price = parsePrice(other.text);
    if (price === null) continue;
    candidates.push({
      price,
      y: mid,
      hasStar: other.text.includes('*'),
    });
  }

  if (candidates.length === 0) return null;

  // 3) "*" önekli adaylar tercih edilir
  const starred = candidates.filter((c) => c.hasStar);
  const pool = starred.length > 0 ? starred : candidates;
  pool.sort((a, b) => a.y - b.y);
  return pool[0].price;
}

/**
 * Türk para formatındaki ilk fiyatı sayıya çevirir. Bulamazsa null.
 * "*1.234,56 TL" → 1234.56
 * "79,50" → 79.5
 * "79.50" → 79.5  (bazı POS'lar nokta decimal kullanır)
 */
export function parsePrice(text: string): number | null {
  const match = text.match(PRICE_RE);
  if (!match) return null;
  let raw = match[1];

  // 1.234,56 (TR) → 1234.56
  if (raw.includes(',') && raw.includes('.')) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    // Sadece virgül: decimal ayraç
    raw = raw.replace(',', '.');
  }
  // Sadece nokta veya hiçbiri: olduğu gibi parseFloat alır

  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}
