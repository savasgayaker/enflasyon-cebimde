/**
 * M8-5b - urun listesi kurulum aleti.
 *
 * Cekler bugunku davranisi korur; degisen tek sey gruplamadir.
 */
import { listeSatirlariniKur } from '../src/utils/urunListesi';
import type { ListeKaydi, ListeUrunu } from '../src/utils/urunListesi';
import { urunleriGrupla } from '../src/utils/urunGruplama';

let yesil = 0;
let kirmizi = 0;

function kontrol(etiket: string, uret: () => unknown, beklenen: unknown) {
  let bulunan: unknown;
  try {
    bulunan = uret();
  } catch (e) {
    kirmizi++;
    console.log('  KIRMIZI ' + etiket);
    console.log('            istisna: ' + String(e));
    return;
  }
  const a = JSON.stringify(bulunan);
  const b = JSON.stringify(beklenen);
  if (a === b) {
    yesil++;
    console.log('  yesil   ' + etiket);
  } else {
    kirmizi++;
    console.log('  KIRMIZI ' + etiket);
    console.log('            bulunan=' + a + ' beklenen=' + b);
  }
}

// POSET ve PO<S-cedilla>ET ayni tekil urun; iki ayri Product kaydi.
const URUNLER: ListeUrunu[] = [
  { id: 'v1', name: 'POSET', categoryId: 'gida', createdAt: '2026-01-01' },
  { id: 'v2', name: 'POŞET', categoryId: 'temizlik', createdAt: '2026-02-01' },
  { id: 'z3', name: 'COCA-COLA ZERO 330', categoryId: 'icecek', createdAt: '2026-01-01' },
];
const KAYITLAR: ListeKaydi[] = [
  { productId: 'v1', unitPrice: 10, date: '2026-03-01' },
  { productId: 'v2', unitPrice: 12, date: '2026-05-01' },
  { productId: 'v1', unitPrice: 11, date: '2026-04-01' },
  { productId: 'z3', unitPrice: 30, date: '2026-03-01' },
  { productId: null, unitPrice: -170, date: '2026-06-01' },
];

function kur(urunler = URUNLER, kayitlar = KAYITLAR) {
  return listeSatirlariniKur(urunleriGrupla(urunler).gruplar, urunler, kayitlar);
}

console.log('=== urun listesi kurulumu ===');

kontrol('L1 gruplanmis liste tek satir uretir',
  () => kur().length, 2);
kontrol('L2 kayit sayaci uyelerin toplami',
  () => kur().find((s) => s.id === 'v1')?.recordCount, 3);
kontrol('L3 son fiyat birlesik serinin en yenisi',
  () => kur().find((s) => s.id === 'v1')?.lastPrice, 12);
kontrol('L4 ilk fiyat birlesik serinin en eskisi',
  () => kur().find((s) => s.id === 'v1')?.firstPrice, 10);
kontrol('L5 degisim birlesik seriden hesaplanir',
  () => kur().find((s) => s.id === 'v1')?.priceChange, 20);
kontrol('L6 farkli urunler ayri satirlarda',
  () => kur().find((s) => s.id === 'z3')?.recordCount, 1);
kontrol('L7 null productId hicbir gruba girmez',
  () => kur().reduce((t, s) => t + s.recordCount, 0), 4);
kontrol('L8 kayitsiz urun sifir fiyatla gorunur',
  () => {
    const u: ListeUrunu[] = [{ id: 'y1', name: 'YENI', categoryId: 'gida' }];
    const s = kur(u, []);
    return [s[0].lastPrice, s[0].firstPrice, s[0].priceChange];
  }, [0, 0, 0]);
kontrol('L9 kategori temsilciden okunur',
  () => kur().find((s) => s.id === 'v1')?.categoryId, 'gida');

console.log('');
console.log('Toplam: ' + yesil + ' yesil kontrol, ' + kirmizi + ' kirmizi kontrol');
process.exit(kirmizi === 0 ? 0 : 1);
