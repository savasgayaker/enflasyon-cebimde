import type { OCRRawResult, OCRLine } from './ocrService';
import { suggestCategory } from '../constants/categories';

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
  /** Ham OCR satırı; sadece baş/son boşluk trim'lendi. Düzeltme YAPILMAZ. */
  name: string;
  /** Adım 2'de hep 1; Adım 3'te miktar parser'ı gelecek. */
  quantity: number;
  /**
   * Birim fiyat (Adım 2'de totalPrice'a eşit). Sağ kolonda fiyat eşleşmesi
   * bulunamadıysa null; kullanıcı arayüzünde manuel girişe yönlendirilmeli.
   */
  unitPrice: number | null;
  /**
   * Satır toplamı. null ise: ne y-hizalı sağ kolonda fiyat bulundu, ne de
   * aritmetik çapraz-kontrol kurtarabildi.
   */
  totalPrice: number | null;
  /** `suggestCategory(name).id` — mevcut substring kuralları kullanılır. */
  categoryId: string;
  /** Fiyat null ya da aritmetikle kurtarıldıysa true; ekranda işaretlenmeli. */
  needsReview: boolean;
}

/**
 * ML Kit'ten gelen ham OCR sonucunu Türkçe market fişi olarak ayrıştırır.
 * Saf fonksiyon; aynı girdiye aynı çıktıyı verir, side-effect yok.
 */
export function parseReceipt(raw: OCRRawResult): ParsedReceipt {
  const totalAmount = extractTotal(raw);
  return {
    storeName: extractStoreName(raw),
    date: extractDate(raw),
    totalAmount,
    items: extractItems(raw, totalAmount),
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
 * Türk para format: 1.234,56 veya 1234,56 veya 1234.56. Opsiyonel `*` / `x`
 * öneki (OCR bazen `*`'ı `x` olarak okuyor), decimal ayraçtan sonra opsiyonel
 * tek boşluk ("311, 00" gibi), opsiyonel TL/₺ son eki. Anchor `^...$` ile
 * tüm satırın fiyat olmasını şart koşar — bu sayede `%01`, `Banka ... (1)`,
 * `*lö,00` gibi yarı-fiyat / fiyat-olmayan satırlar null döner. Loose mod
 * geriye dönük olarak "fiyatın içindeki sayıyı kap" davranışı sağlıyordu;
 * Düzen A'da bu yanıltıcı eşleşmelere yol açtığı için strict moda geçildi.
 */
const PRICE_RE = /^\s*[\*xX]?\s*(\d{1,3}(?:\.\d{3})*(?:[,.]\s?\d{1,2})|\d+[,.]\s?\d{1,2}|\d+)\s*(?:TL|₺)?\s*$/i;

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

  const rightColumnThreshold = computeRightColumnThreshold(raw.lines);

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
    raw = raw.replace(',', '.');
  }
  // "311. 00" gibi ayraç sonrası boşlukları temizle
  raw = raw.replace(/\s+/g, '');

  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Ortak yardımcı: değer kolonu (fiyatların yaşadığı sağ şerit) eşiği
// ---------------------------------------------------------------------------

/**
 * Sağ kolon eşiği = en sağdaki satırın .right * 0.8. Eşik 0.5 ile başlamıştı
 * ama Migros'ta orta kolondaki "61" (KDV oranı, OCR'ın % işaretini düşürdüğü)
 * fiyat sanılıyordu; 0.8'e çıkarınca KDV rate kolonu (left ~1380-1460)
 * elenip yalnız gerçek fiyat kolonu (left ~1700+) kalıyor.
 */
function computeRightColumnThreshold(lines: OCRLine[]): number {
  if (lines.length === 0) return 0;
  const maxRight = Math.max(...lines.map((l) => l.frame.right));
  return maxRight * 0.8;
}

// ---------------------------------------------------------------------------
// Ürün — fiyat eşleştirme (Düzen A: iki gerçek kolon, y-hizalı)
// ---------------------------------------------------------------------------

/** Header bayrak kelimeleri — son y_bottom ürün zonunun ÜST sınırını verir. */
const HEADER_ANCHOR_KEYWORDS = [
  'TCKN', 'VKN', 'NIHAI', 'MUSTERI', 'MÜŞTERI', 'MÜŞTERİ',
  'VERGI', 'VERGİ',
  'TARIH', 'TARİH', 'SAAT', 'FIŞ NO', 'FİŞ NO', 'FATURA', 'BELGE',
  'ETTN', 'SIRA NO', 'MERSIS', 'VD:', 'VD ', 'TEL:', 'TEL ',
  'MERKEZ', 'TÜR ', 'TÜR:', 'BULVARI', 'MÜKELLEFLER',
];

/** Footer bayrak kelimeleri — ilk y_top ürün zonunun ALT sınırını verir. */
const FOOTER_ANCHOR_KEYWORDS = [
  'TOPKDV', 'TOPLAM', 'TOPLAN', 'TUTAR', 'ÖDENECEK', 'ODENECEK',
];

/**
 * Bir satır "kesinlikle ürün değil" kalıplarından birine uyuyorsa true döner.
 * Header/footer y-zonundan kaçanları da bu seviye temizler.
 */
const NON_PRODUCT_KEYWORDS = [
  'TOPKDV', 'TOPLAM', 'TOPLAN', 'NAKIT', 'PARA OST', 'ORTAK POS', 'KDV',
  'HALKBANK', 'YAPI KRED', 'GARANTI', 'BANKA', 'KREDI KART', 'ONAY',
  'REF.NO', 'REF .NO', 'MATRAH', 'ODENECEK', 'ÖDENECEK', 'ETTN',
  'FATURA', 'BELGE', 'SIRA', 'MERSIS', 'TEL:', 'TEL ',
  'MERKEZ', 'TÜR:', 'TÜR ', 'MÜŞTERI', 'MÜŞTERİ', 'MUSTERI',
  'TCKN', 'VKN',
  'NIHAI', 'TÜKETICI', 'TUKETICI',
  'TEŞEKKÜR', 'TESEKKUR', 'BANKACILIK',
  // 'ALIŞVERIS' / 'ALISVERIS' KASTEN listede DEĞİL: "ALIŞVERIS POŞETİ"
  // / "ÄLIŞVERIŞ POŞETİ" gerçek kalem (poşet ücreti). Footer'daki
  // "Alisveris tutari" zaten y-zonuyla eleniyor.
  'KART TIPI', 'KART NO', 'TERMINAL', 'IMZA', 'FATURAADRES', 'TESCILLI',
  'GECER', 'KORIJYUNUZ', 'KASIYER', 'MÜKELLEFLER',
  'BULVARI', 'CADDE', 'MAHALLESI', 'MAHALLES',
];

function isLikelyNotProduct(line: OCRLine): boolean {
  const text = line.text.trim();
  if (text.length === 0) return true;

  // Tek harf bile olsa Türkçe/Latin alfabesinden bir karakter içermelidir;
  // aksi halde saf sayı/işaret satırıdır ("18, 95", "%01", "120" gibi).
  if (!/[A-Za-zÇŞĞÜÖİçşğüöı]/.test(text)) return true;

  // "#" işareti içeren satırlar (File'daki "*GLUTENSIZ ÜRÜN#" gibi
  // teknik / etiket satırları) ürün değil.
  if (text.includes('#')) return true;

  // Barkod
  if (/^\d{8,}$/.test(text)) return true;

  // Saf yüzde satırı
  if (/^\s*%/.test(text)) return true;

  // Miktar / birim satırları
  // "3 ADx 1,00", "0.682 kg X 259.00", "0.682 ka X 259.00" (OCR 'kg'→'ka').
  // \b kullanmıyoruz çünkü D/g ile x arasında word boundary yok.
  if (/^\s*\d+([.,]\d+)?\s*(ad|adet|kg|ka)\s*x/i.test(text)) return true;
  // "2X" gibi saf "sayı + X" (sondan word boundary lazım)
  if (/^\s*\d+\s*X\b/i.test(text)) return true;
  // "1 X 259" (sayı X sayı) benzeri
  if (/\b\d+\s*X\s*\d/.test(text)) return true;
  // Birim adıyla başlayan yarım/orphan satırlar — BİM'de OCR "4" ile
  // "ad X 18.60" satırlarını ayrı parçalara böler; ikincisi unit-prefix ile
  // yakalanır. "ÄLIŞVERIŞ POŞETİ" gibi gerçek ürünler harfle başlar, geçer.
  if (/^\s*(ad|adet|kg|ka|lt|gr|ml)\b/i.test(text)) return true;

  // Blok keyword
  const upper = text.toUpperCase();
  for (const k of NON_PRODUCT_KEYWORDS) {
    if (upper.includes(k)) return true;
  }
  return false;
}

/**
 * Ürün satırlarını çıkartıp fiyatlarıyla eşler (Düzen A).
 *
 * 1) Header end y = HEADER_ANCHOR_KEYWORDS içeren satırların max y_bottom'u
 *    (eşleşme yoksa -∞ — fişin tamamı ürün zonu sayılır, header yine de
 *    NON_PRODUCT_KEYWORDS filtresine takılır).
 * 2) Footer start y = FOOTER_ANCHOR_KEYWORDS içeren satırların min y_top'u
 *    (eşleşme yoksa +∞).
 * 3) Ürün adayı: sol kolon (left < rightColumnThreshold), y zonu içinde,
 *    isLikelyNotProduct false. y'ye göre sıralanır.
 * 4) Her ürün için y-hizalı (tolerance = h * 0.7) sağ kolon satırında
 *    parsePrice null değilse → fiyat. İlk eşleşeni alır.
 * 5) Aritmetik çapraz-kontrol: tam olarak BİR kalemin totalPrice'ı null ise,
 *    eksik = totalAmount - diğerlerinin toplamı; makulse o kaleme atanır,
 *    needsReview = true.
 */
function extractItems(raw: OCRRawResult, totalAmount: number): ParsedItem[] {
  if (raw.lines.length === 0) return [];

  const rightColumnThreshold = computeRightColumnThreshold(raw.lines);

  // Önce footer'ı bul (FATURA/MERSIS gibi anchor'lar ÜRÜN ZONUNDA yok ama
  // FOOTER'DA tekrar geçebilir — örn. "FaturaAdres" veya "Mersis No: xxx".
  // Bu yüzden header taramasını yalnızca footer'ın üstünde yaparız.)
  let footerStartY = Infinity;
  for (const line of raw.lines) {
    const upper = line.text.toUpperCase();
    if (FOOTER_ANCHOR_KEYWORDS.some((k) => upper.includes(k))) {
      if (line.frame.top < footerStartY) footerStartY = line.frame.top;
    }
  }

  let headerEndY = -Infinity;
  for (const line of raw.lines) {
    if (line.frame.bottom >= footerStartY) continue;
    const upper = line.text.toUpperCase();
    if (HEADER_ANCHOR_KEYWORDS.some((k) => upper.includes(k))) {
      if (line.frame.bottom > headerEndY) headerEndY = line.frame.bottom;
    }
  }

  // Ürün adaylarını topla
  // Header/footer y-zon kontrolü TOP tabanlıdır: bir satırın BAŞI header
  // sonundan sonra ve footer başından önce ise ürün adayıdır. Bottom-tabanlı
  // olsa BİM'de WEYVELI (y=2427-2533) "TOPLAN KDV" footer'ına (y_top=2501)
  // kuyruğuyla taştığı için yanlışlıkla eleniyordu — oysa başı footer'dan
  // önce, gerçek bir ürün.
  const products: OCRLine[] = [];
  for (const line of raw.lines) {
    if (line.frame.left >= rightColumnThreshold) continue;
    if (line.frame.top < headerEndY) continue;
    if (line.frame.top >= footerStartY) continue;
    if (isLikelyNotProduct(line)) continue;
    products.push(line);
  }
  products.sort((a, b) => a.frame.top - b.frame.top);

  // Her ürüne fiyat eşle — iki aşamalı:
  //
  //   Düzen A — y_top dar bant (price.y_top, product.y_top'a ±20px yakın):
  //     fiyat ürün adının hemen sağında, satıra "yapışık". A101/Migros/
  //     Bildirici/File'da çalışır. Bulursa needsReview=false (güven yüksek).
  //
  //   Düzen B — bir ürünle bir sonraki ürün arasındaki şeritte ilk fiyat:
  //     fiyat ürün adının altında, arasına tartı/miktar satırları girer
  //     (BİM e-arşiv: PILICPAŘVAKBONFILE altında "0.682 ka X 259.00", sonra
  //     yan sütunda 176.64). Sadece Düzen A başarısız olursa devreye girer.
  //     Bulursa needsReview=true (güven düşük, kullanıcı doğrulamalı).
  //
  // Eşik sebebi: BİM'in tall lines'ı (h~106) için h*0.7 toleransı (~74 px)
  // çok genişti; mid-bazlı pencere bu satırların fiyatlarını yanlışlıkla
  // Düzen A'da yakalıyordu. Sabit ±20 eşiği A101/Migros/Bildirici/File'da
  // (gerçek diff'ler ≤+17) çalışırken BİM'i (diff'ler ≥+22) Düzen B'ye
  // düşürür.
  const Y_ALIGNED_MIN = -10;
  const Y_ALIGNED_MAX = 20;

  const items: ParsedItem[] = products.map((prod, i) => {
    const nextProd = i + 1 < products.length ? products[i + 1] : null;
    let price: number | null = null;
    let needsReview = false;

    // Düzen A: dar y_top eşiği
    for (const cand of raw.lines) {
      if (cand === prod) continue;
      if (cand.frame.left < rightColumnThreshold) continue;
      const yDiff = cand.frame.top - prod.frame.top;
      if (yDiff < Y_ALIGNED_MIN || yDiff > Y_ALIGNED_MAX) continue;
      const p = parsePrice(cand.text);
      if (p === null) continue;
      price = p;
      break;
    }

    // Düzen B: ürünler arası şerit (yalnızca A bulamadıysa)
    if (price === null) {
      const yMin = prod.frame.top;
      const yMax = nextProd ? nextProd.frame.top : footerStartY;
      for (const cand of raw.lines) {
        if (cand === prod) continue;
        if (cand.frame.left < rightColumnThreshold) continue;
        const cMid = (cand.frame.top + cand.frame.bottom) / 2;
        if (cMid < yMin || cMid >= yMax) continue;
        const p = parsePrice(cand.text);
        if (p === null) continue;
        price = p;
        needsReview = true;
        break;
      }
    }

    // Hiçbiri bulmadı → kullanıcı incelemesine işaretle
    if (price === null) needsReview = true;

    const cat = suggestCategory(prod.text);
    return {
      name: prod.text.trim(),
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      categoryId: cat.id,
      needsReview,
    };
  });

  // Aritmetik çapraz-kontrol: tek eksik kurtarma
  const nullItems = items.filter((it) => it.totalPrice === null);
  if (nullItems.length === 1 && totalAmount > 0) {
    const sumOthers = items.reduce(
      (s, it) => s + (it.totalPrice ?? 0),
      0,
    );
    const missing = totalAmount - sumOthers;
    if (missing > 0 && missing < totalAmount) {
      const item = nullItems[0];
      item.unitPrice = missing;
      item.totalPrice = missing;
      item.needsReview = true;
    }
  }

  return items;
}
