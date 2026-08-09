import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// M7-A3: sema surum damgasi. Surum 1, kimlik gocu (S5).
// unit ve vatRate optional alanlar oldugu icin donusume gerek yok;
// amac mekanizmayi kurmak ve kayitlarin hangi semayla yazildigini damgalamak.
export const SEMA_SURUMU = 1;

export function semaGocu(kalan: unknown, oncekiSurum: number): unknown {
  void oncekiSurum;
  return kalan;
}

export interface Receipt {
  id: string;
  storeName: string;
  date: string;
  totalAmount: number;
  imageUri?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  barcode?: string;
  createdAt: string;
}

export interface PriceRecord {
  id: string;
  productId: string;
  receiptId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
  unit?: string | null;
  vatRate?: number | null;
  satirTipi?: string | null;
}

export interface UserSettings {
  name: string;
  email: string;
  currency: string;
  language: string;
  darkMode: boolean;
  notifications: boolean;
  onboardingComplete: boolean;
}

interface AppState {
  // Data
  receipts: Receipt[];
  products: Product[];
  priceRecords: PriceRecord[];
  
  // Settings
  settings: UserSettings;
  
  // Actions
  addReceipt: (receipt: Receipt) => void;
  updateReceipt: (id: string, data: Partial<Receipt>) => void;
  deleteReceipt: (id: string) => void;
  
  addProduct: (product: Product) => Product;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  addPriceRecord: (record: PriceRecord) => void;
  deletePriceRecordsByReceipt: (receiptId: string) => void;
  
  updateSettings: (data: Partial<UserSettings>) => void;
  completeOnboarding: () => void;
  
  // Helpers
  getProductPriceHistory: (productId: string) => PriceRecord[];
  getCategoryProducts: (categoryId: string) => Product[];
  getReceiptItems: (receiptId: string) => PriceRecord[];
  findOrCreateProduct: (name: string, categoryId: string) => Product;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial data
      receipts: [],
      products: [],
      priceRecords: [],
      
      settings: {
        name: '',
        email: '',
        currency: 'TRY',
        language: 'tr',
        darkMode: false,
        notifications: true,
        onboardingComplete: false,
      },
      
      // Receipt actions
      addReceipt: (receipt) => set((state) => ({
        receipts: [...state.receipts, receipt],
      })),
      
      updateReceipt: (id, data) => set((state) => ({
        receipts: state.receipts.map((r) =>
          r.id === id ? { ...r, ...data } : r
        ),
      })),
      
      deleteReceipt: (id) => set((state) => ({
        receipts: state.receipts.filter((r) => r.id !== id),
      })),
      
      // Product actions
      addProduct: (product) => {
        set((state) => ({
          products: [...state.products, product],
        }));
        return product;
      },
      
      updateProduct: (id, data) => set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...data } : p
        ),
      })),
      
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      })),
      
      // Price record actions
      addPriceRecord: (record) => set((state) => ({
        priceRecords: [...state.priceRecords, record],
      })),
      
      deletePriceRecordsByReceipt: (receiptId) => set((state) => ({
        priceRecords: state.priceRecords.filter((r) => r.receiptId !== receiptId),
      })),
      
      // Settings actions
      updateSettings: (data) => set((state) => ({
        settings: { ...state.settings, ...data },
      })),
      
      completeOnboarding: () => set((state) => ({
        settings: { ...state.settings, onboardingComplete: true },
      })),
      
      // Helpers
      getProductPriceHistory: (productId) => {
        return get().priceRecords
          .filter((r) => r.productId === productId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      },
      
      getCategoryProducts: (categoryId) => {
        return get().products.filter((p) => p.categoryId === categoryId);
      },
      
      getReceiptItems: (receiptId) => {
        return get().priceRecords.filter((r) => r.receiptId === receiptId);
      },
      
      findOrCreateProduct: (name, categoryId) => {
        const existing = get().products.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        
        if (existing) return existing;
        
        const newProduct: Product = {
          id: generateId(),
          name,
          categoryId,
          createdAt: new Date().toISOString(),
        };
        
        return get().addProduct(newProduct);
      },
    }),
    {
      name: 'enflasyon-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: SEMA_SURUMU,
      migrate: semaGocu,
    }
  )
);
