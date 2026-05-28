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

export function extractStoreName(raw: OCRRawResult): string {
  // Üstteki satırlara öncelik ver (y-koordinatına göre küçükten büyüğe).
  // İlk 8 satır içinde tara — fiş başlığı genelde ilk 3-5 satırda olur.
  const topLines = [...raw.lines]
    .sort((a, b) => a.frame.top - b.frame.top)
    .slice(0, 8);

  for (const line of topLines) {
    const normalized = normalizeForMatch(line.text);
    for (const store of KNOWN_STORES) {
      if (normalized.includes(normalizeForMatch(store))) {
        return store;
      }
    }
  }

  // Fallback: ilk dolu satır
  const firstNonEmpty = topLines.find((l) => l.text.trim().length > 0);
  return firstNonEmpty?.text.trim() ?? '';
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

const TOTAL_KEYWORDS = ['TOPLAM', 'TUTAR', 'GENEL TOPLAM', 'ÖDENECEK'];

export function extractTotal(raw: OCRRawResult): number {
  // Strateji: TOPLAM/TUTAR anahtar kelimesi içeren satırlardaki sayıyı al.
  // Aynı satırda yoksa, en yakın sağındaki (veya hemen altındaki) sayıya bak.
  const candidates: { line: OCRLine; idx: number }[] = raw.lines.map(
    (line, idx) => ({ line, idx }),
  );

  for (const { line, idx } of candidates) {
    const upper = line.text.toUpperCase();
    if (!TOTAL_KEYWORDS.some((kw) => upper.includes(kw))) continue;

    // Önce aynı satırda sayı var mı?
    const sameLine = parsePrice(line.text);
    if (sameLine !== null) return sameLine;

    // Aynı y-bandındaki başka satırlarda (sağdaki kolon)
    const sameRow = findSameRowPrice(line, raw.lines);
    if (sameRow !== null) return sameRow;

    // Bir sonraki satıra bak (TOPLAM\n123,45 paterni)
    const next = candidates[idx + 1];
    if (next) {
      const nextPrice = parsePrice(next.line.text);
      if (nextPrice !== null) return nextPrice;
    }
  }

  return 0;
}

function findSameRowPrice(target: OCRLine, all: OCRLine[]): number | null {
  const yMid = (target.frame.top + target.frame.bottom) / 2;
  const tolerance = (target.frame.bottom - target.frame.top) * 0.6;
  for (const line of all) {
    if (line === target) continue;
    const otherMid = (line.frame.top + line.frame.bottom) / 2;
    if (Math.abs(otherMid - yMid) <= tolerance) {
      const p = parsePrice(line.text);
      if (p !== null) return p;
    }
  }
  return null;
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
