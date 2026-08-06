import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { PriceRecord, Product, Receipt } from '../store/useAppStore';

export interface InflationData {
  monthlyRate: number;
  yearlyRate: number;
  // T-D1 (docs/m6d-on-kayit-2026-08-05.md): cari harcamanın hesaba katılan payı
  // (%). monthlyRate eşleşen örneklemden gelir; coverageRate o örneklemin tüm
  // sepeti ne kadar temsil ettiğini söyler. Her çıkış yolunda tanımlı sayıdır.
  coverageRate: number;
  // M6-B (docs/m6b-on-kayit-2026-08-06.md): pencere uzunluğu, ay cinsinden,
  // tek ondalık — YALNIZCA gösterim için; hesaba girmez. M6-E'nin dürüst
  // etiket yazabilmesi için ("son 3 ayda %X" diyebilmek için 3'ü bilmek gerekir).
  windowMonths: number;
  categoryRates: { [categoryId: string]: number };
  monthlyTrend: { month: string; rate: number }[];
}

export interface CategorySpending {
  categoryId: string;
  totalSpending: number;
  percentage: number;
}

/**
 * Calculate personal inflation rate
 * Formula: Σ(weight_i × price_change_i) where weight_i = spending_i / total_spending
 */
export function calculateInflation(
  priceRecords: PriceRecord[],
  products: Product[],
  dateRange: { start: Date; end: Date }
): InflationData {
  // Filter records in date range
  const currentRecords = priceRecords.filter((r) => {
    const date = new Date(r.date);
    return date >= dateRange.start && date <= dateRange.end;
  });

  // Get previous period records (same duration, but before start date)
  const duration = dateRange.end.getTime() - dateRange.start.getTime();
  // M6-B (docs/m6b-on-kayit-2026-08-06.md §6): pencere uzunluğu, 30 günlük ay
  // yaklaşımıyla (2 592 000 000 ms). Üs HAM değerden hesaplanır; dışarı verilen
  // windowMonths alanı tek ondalığa yuvarlanır ve YALNIZCA gösterim içindir.
  const windowMonths = duration / 2592000000;
  const previousStart = new Date(dateRange.start.getTime() - duration);
  const previousEnd = new Date(dateRange.start.getTime() - 1);
  
  const previousRecords = priceRecords.filter((r) => {
    const date = new Date(r.date);
    return date >= previousStart && date <= previousEnd;
  });

  // Calculate total spending for weights
  const totalCurrentSpending = currentRecords.reduce((sum, r) => sum + r.totalPrice, 0);
  const totalPreviousSpending = previousRecords.reduce((sum, r) => sum + r.totalPrice, 0);

  if (totalCurrentSpending === 0 || totalPreviousSpending === 0) {
    return {
      monthlyRate: 0,
      yearlyRate: 0,
      // T-D2: alan her çıkış yolunda tanımlı — ön kayıtta ilan edilen tek ekleme.
      coverageRate: 0,
      // M6-B: windowMonths pencereden türer, veriden değil — erken dönüşte de
      // dürüst değer (ilan edilen şekil tercihi: yerinde-hesap yerine sabit).
      windowMonths: Math.round(windowMonths * 10) / 10,
      categoryRates: {},
      monthlyTrend: [],
    };
  }

  // Calculate price changes per product
  // T1 (docs/m6a2-on-kayit-2026-08-05.md): dönem içi ürün fiyatı, kayıtların
  // miktar-ağırlıklı birim değeridir — Σ(unitPrice×quantity) / Σ(quantity);
  // Σ(quantity) ≤ 0 ise unitPrice'ların basit ortalaması. Toplama (eski
  // davranış) alışveriş sıklığını fiyat artışı gibi ölçüyordu.
  const accumulators: {
    [productId: string]: {
      curPxQ: number; curQ: number; curP: number; curN: number;
      prevPxQ: number; prevQ: number; prevP: number; prevN: number;
      spending: number;
    };
  } = {};

  currentRecords.forEach((r) => {
    if (!accumulators[r.productId]) {
      accumulators[r.productId] = {
        curPxQ: 0, curQ: 0, curP: 0, curN: 0,
        prevPxQ: 0, prevQ: 0, prevP: 0, prevN: 0,
        spending: 0,
      };
    }
    const acc = accumulators[r.productId];
    acc.curPxQ += r.unitPrice * r.quantity;
    acc.curQ += r.quantity;
    acc.curP += r.unitPrice;
    acc.curN += 1;
    acc.spending += r.totalPrice;
  });

  previousRecords.forEach((r) => {
    const acc = accumulators[r.productId];
    if (acc) {
      acc.prevPxQ += r.unitPrice * r.quantity;
      acc.prevQ += r.quantity;
      acc.prevP += r.unitPrice;
      acc.prevN += 1;
    }
  });

  // Kayıt yoksa 0 döner; aşağıdaki `previous > 0 && current > 0` süzgeci bu
  // ürünleri eskisi gibi dışarıda bırakır.
  const periodPrice = (pxq: number, q: number, p: number, n: number): number =>
    n === 0 ? 0 : q > 0 ? pxq / q : p / n;

  const productPriceChanges: { [productId: string]: { current: number; previous: number; spending: number } } = {};
  Object.entries(accumulators).forEach(([productId, acc]) => {
    productPriceChanges[productId] = {
      current: periodPrice(acc.curPxQ, acc.curQ, acc.curP, acc.curN),
      previous: periodPrice(acc.prevPxQ, acc.prevQ, acc.prevP, acc.prevN),
      spending: acc.spending,
    };
  });

  // Calculate weighted inflation
  // T-C1 (docs/m6c-on-kayit-2026-08-05.md): genel oranın ağırlık paydası, oranı
  // tanımlı (eşleşen) ürünlerin cari harcaması M'dir — tam sepet toplamı değil.
  // Önceki dönemde görülmeyen ürünler eski paydada "%0 enflasyon" gibi durup
  // oranı seyreltiyordu; kategori oranları zaten eşleşen örneklemle çalışıyordu.
  // T-C2: M ≤ 0 iken bölme hiç yapılmaz (ternary) — oran 0, kategoriler boş.
  const matchedSpending = Object.values(productPriceChanges).reduce(
    (sum, data) => (data.previous > 0 && data.current > 0 ? sum + data.spending : sum),
    0,
  );

  let weightedInflation = 0;
  const categoryInflations: { [categoryId: string]: { weighted: number; totalWeight: number } } = {};

  Object.entries(productPriceChanges).forEach(([productId, data]) => {
    if (data.previous > 0 && data.current > 0) {
      const priceChange = (data.current - data.previous) / data.previous;
      const weight = matchedSpending > 0 ? data.spending / matchedSpending : 0;
      weightedInflation += weight * priceChange;

      // Category-wise inflation
      const product = products.find((p) => p.id === productId);
      if (product) {
        if (!categoryInflations[product.categoryId]) {
          categoryInflations[product.categoryId] = { weighted: 0, totalWeight: 0 };
        }
        categoryInflations[product.categoryId].weighted += weight * priceChange;
        categoryInflations[product.categoryId].totalWeight += weight;
      }
    }
  });

  // Calculate category rates
  const categoryRates: { [categoryId: string]: number } = {};
  Object.entries(categoryInflations).forEach(([categoryId, data]) => {
    if (data.totalWeight > 0) {
      categoryRates[categoryId] = (data.weighted / data.totalWeight) * 100;
    }
  });

  // Calculate monthly trend (last 6 months)
  const monthlyTrend: { month: string; rate: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const prevMonthStart = startOfMonth(subMonths(monthDate, 1));
    const prevMonthEnd = endOfMonth(subMonths(monthDate, 1));

    const monthRecords = priceRecords.filter((r) => {
      const date = new Date(r.date);
      return date >= monthStart && date <= monthEnd;
    });

    const prevMonthRecords = priceRecords.filter((r) => {
      const date = new Date(r.date);
      return date >= prevMonthStart && date <= prevMonthEnd;
    });

    const monthSpending = monthRecords.reduce((sum, r) => sum + r.totalPrice, 0);
    const prevSpending = prevMonthRecords.reduce((sum, r) => sum + r.totalPrice, 0);

    let rate = 0;
    if (prevSpending > 0 && monthSpending > 0) {
      rate = ((monthSpending - prevSpending) / prevSpending) * 100;
    }

    monthlyTrend.push({
      month: format(monthDate, 'MMM'),
      rate: Math.round(rate * 10) / 10,
    });
  }

  return {
    monthlyRate: Math.round(weightedInflation * 1000) / 10,
    // M6-B §6: bileşik yıllıklaştırma, üs HAM windowMonths'tan (12 / n).
    // 1 + weightedInflation ≤ 0 imkânsız (eşleşen kümede previous > 0 ve
    // current > 0; ağırlıklar negatif olamaz) — ayrıca korunmaz, kanıt ön kayıtta.
    yearlyRate:
      windowMonths > 0
        ? Math.round((Math.pow(1 + weightedInflation, 12 / windowMonths) - 1) * 1000) / 10
        : 0,
    // T-D1: matchedSpending yeniden hesaplanmaz, yukarıdaki değer kullanılır;
    // totalCurrentSpending bu yolda > 0 (erken dönüş 0'ı ele aldı), NaN imkânsız.
    coverageRate: Math.round((matchedSpending / totalCurrentSpending) * 1000) / 10,
    windowMonths: Math.round(windowMonths * 10) / 10,
    categoryRates,
    monthlyTrend,
  };
}

/**
 * Calculate spending breakdown by category
 */
export function calculateCategorySpending(
  priceRecords: PriceRecord[],
  products: Product[]
): CategorySpending[] {
  const categoryTotals: { [categoryId: string]: number } = {};
  let totalSpending = 0;

  priceRecords.forEach((record) => {
    const product = products.find((p) => p.id === record.productId);
    if (product) {
      if (!categoryTotals[product.categoryId]) {
        categoryTotals[product.categoryId] = 0;
      }
      categoryTotals[product.categoryId] += record.totalPrice;
      totalSpending += record.totalPrice;
    }
  });

  return Object.entries(categoryTotals)
    .map(([categoryId, total]) => ({
      categoryId,
      totalSpending: total,
      percentage: totalSpending > 0 ? (total / totalSpending) * 100 : 0,
    }))
    .sort((a, b) => b.totalSpending - a.totalSpending);
}

/**
 * Export data to CSV format
 */
export function exportToCSV(
  receipts: Receipt[],
  priceRecords: PriceRecord[],
  products: Product[]
): string {
  const headers = ['Tarih', 'Mağaza', 'Ürün', 'Kategori', 'Miktar', 'Birim Fiyat', 'Toplam'];
  const rows: string[][] = [];

  receipts.forEach((receipt) => {
    const items = priceRecords.filter((r) => r.receiptId === receipt.id);
    items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      rows.push([
        receipt.date,
        receipt.storeName,
        product?.name || 'Bilinmeyen',
        product?.categoryId || 'other',
        item.quantity.toString(),
        item.unitPrice.toFixed(2),
        item.totalPrice.toFixed(2),
      ]);
    });
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return csvContent;
}
