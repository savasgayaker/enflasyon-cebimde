import { colors } from './theme';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  keywords: string[];
}

export const categories: Category[] = [
  {
    id: 'food',
    name: 'Gıda',
    icon: 'restaurant',
    color: colors.category.food,
    keywords: ['ekmek', 'süt', 'peynir', 'yoğurt', 'et', 'tavuk', 'balık', 'sebze', 'meyve', 'makarna', 'pirinç', 'yumurta', 'tereyağı', 'zeytinyağı', 'un', 'şeker', 'tuz', 'baharat'],
  },
  {
    id: 'beverages',
    name: 'İçecek',
    icon: 'local-cafe',
    color: colors.category.beverages,
    keywords: ['su', 'cola', 'meyve suyu', 'ayran', 'çay', 'kahve', 'gazlı', 'içecek', 'soda', 'bira', 'şarap'],
  },
  {
    id: 'cleaning',
    name: 'Temizlik',
    icon: 'cleaning-services',
    color: colors.category.cleaning,
    keywords: ['deterjan', 'yumuşatıcı', 'çamaşır', 'bulaşık', 'temizlik', 'sabun', 'çöp poşeti', 'bez', 'süpürge', 'paspas'],
  },
  {
    id: 'personalCare',
    name: 'Kişisel Bakım',
    icon: 'face',
    color: colors.category.personalCare,
    keywords: ['şampuan', 'duş jeli', 'diş macunu', 'diş fırçası', 'deodorant', 'tıraş', 'krem', 'parfüm', 'tuvalet kağıdı', 'peçete', 'ped'],
  },
  {
    id: 'homeAndLiving',
    name: 'Ev & Yaşam',
    icon: 'home',
    color: colors.category.homeAndLiving,
    keywords: ['ampul', 'pil', 'mutfak', 'ev', 'mobilya', 'dekor', 'havlu', 'nevresim', 'perde'],
  },
  {
    id: 'clothing',
    name: 'Giyim',
    icon: 'checkroom',
    color: colors.category.clothing,
    keywords: ['gömlek', 'pantolon', 'elbise', 'ayakkabı', 'çanta', 'kemer', 'çorap', 'iç çamaşırı', 'mont', 'ceket'],
  },
  {
    id: 'transportation',
    name: 'Ulaşım',
    icon: 'directions-car',
    color: colors.category.transportation,
    keywords: ['benzin', 'mazot', 'akaryakıt', 'otobüs', 'metro', 'taksi', 'park', 'otopark'],
  },
  {
    id: 'health',
    name: 'Sağlık',
    icon: 'local-hospital',
    color: colors.category.health,
    keywords: ['ilaç', 'eczane', 'vitamin', 'doktor', 'hastane', 'yara bandı', 'antiseptik'],
  },
  {
    id: 'education',
    name: 'Eğitim',
    icon: 'school',
    color: colors.category.education,
    keywords: ['kitap', 'defter', 'kalem', 'okul', 'kurs', 'eğitim', 'kırtasiye'],
  },
  {
    id: 'entertainment',
    name: 'Eğlence',
    icon: 'movie',
    color: colors.category.entertainment,
    keywords: ['sinema', 'tiyatro', 'konser', 'oyun', 'restoran', 'kafe', 'eğlence'],
  },
  {
    id: 'other',
    name: 'Diğer',
    icon: 'more-horiz',
    color: colors.category.other,
    keywords: [],
  },
];

export function suggestCategory(productName: string): Category {
  const lowercaseName = productName.toLowerCase();
  
  for (const category of categories) {
    if (category.keywords.some(keyword => lowercaseName.includes(keyword))) {
      return category;
    }
  }
  
  return categories.find(c => c.id === 'other')!;
}
