import { suggestCategory } from '../constants/categories';

export interface OCRItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  categoryId: string;
}

export interface OCRResult {
  storeName: string;
  date: string;
  items: OCRItem[];
  totalAmount: number;
}

/**
 * Mock OCR function that simulates receipt scanning
 * Returns sample data - ready for real ML Kit integration later
 */
export async function processReceipt(imageUri: string): Promise<OCRResult> {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Generate random store name
  const stores = ['Migros', 'A101', 'BİM', 'ŞOK', 'CarrefourSA', 'Macro Center', 'File', 'Getir'];
  const storeName = stores[Math.floor(Math.random() * stores.length)];

  // Generate today's date or recent date
  const daysAgo = Math.floor(Math.random() * 7);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const dateStr = date.toISOString().split('T')[0];

  // Sample products that might appear on a receipt
  const sampleProducts = [
    { name: 'Süt 1L', minPrice: 15, maxPrice: 25 },
    { name: 'Ekmek', minPrice: 8, maxPrice: 15 },
    { name: 'Yumurta 15\'li', minPrice: 50, maxPrice: 80 },
    { name: 'Peynir 500g', minPrice: 80, maxPrice: 150 },
    { name: 'Domates 1kg', minPrice: 20, maxPrice: 40 },
    { name: 'Patates 1kg', minPrice: 15, maxPrice: 30 },
    { name: 'Tavuk Göğsü 1kg', minPrice: 120, maxPrice: 180 },
    { name: 'Ayçiçek Yağı 1L', minPrice: 50, maxPrice: 80 },
    { name: 'Makarna 500g', minPrice: 15, maxPrice: 30 },
    { name: 'Pirinç 1kg', minPrice: 40, maxPrice: 70 },
    { name: 'Deterjan 4kg', minPrice: 150, maxPrice: 250 },
    { name: 'Tuvalet Kağıdı 12\'li', minPrice: 100, maxPrice: 180 },
    { name: 'Şampuan 500ml', minPrice: 60, maxPrice: 120 },
    { name: 'Diş Macunu', minPrice: 30, maxPrice: 60 },
    { name: 'Cola 1L', minPrice: 15, maxPrice: 30 },
    { name: 'Meyve Suyu 1L', minPrice: 20, maxPrice: 40 },
    { name: 'Çay 1kg', minPrice: 100, maxPrice: 200 },
    { name: 'Kahve 100g', minPrice: 50, maxPrice: 100 },
    { name: 'Yoğurt 1kg', minPrice: 35, maxPrice: 60 },
    { name: 'Tereyağı 250g', minPrice: 60, maxPrice: 100 },
  ];

  // Randomly select 3-8 products
  const numItems = Math.floor(Math.random() * 6) + 3;
  const shuffled = [...sampleProducts].sort(() => 0.5 - Math.random());
  const selectedProducts = shuffled.slice(0, numItems);

  const items: OCRItem[] = selectedProducts.map((product) => {
    const quantity = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 2 : 1;
    const unitPrice = Math.floor(Math.random() * (product.maxPrice - product.minPrice)) + product.minPrice;
    const totalPrice = unitPrice * quantity;
    const category = suggestCategory(product.name);

    return {
      name: product.name,
      quantity,
      unitPrice,
      totalPrice,
      categoryId: category.id,
    };
  });

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    storeName,
    date: dateStr,
    items,
    totalAmount,
  };
}

/**
 * Create an empty OCR result for manual entry
 */
export function createEmptyResult(): OCRResult {
  return {
    storeName: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    totalAmount: 0,
  };
}
