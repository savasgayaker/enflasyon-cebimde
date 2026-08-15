/**
 * A4-3b - sunucuya yazma aleti.
 *
 * Sahte yazici kullanir; gercek aga cikmaz.
 * Kontrol asenkrondur (S4/a): olcum kendi try blogunun icinde
 * yapilir, aksi halde iskele istisnasi sureci oldururdu.
 */
import { fisiGonder, fisiSil } from '../src/services/sunucuYazma';
import type { Yazici, YazilacakFis, YazilacakUrun, YazilacakKayit }
  from '../src/services/sunucuYazma';

let yesil = 0;
let kirmizi = 0;

async function kontrol(
  etiket: string,
  uret: () => Promise<unknown>,
  beklenen: unknown,
) {
  let bulunan: unknown;
  try {
    bulunan = await uret();
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
    console.log('            bulunan=' + a);
    console.log('            beklenen=' + b);
  }
}

interface Cagri { tablo: string; satirlar: Record<string, unknown>[] }
interface Silme { tablo: string; kullanici: string; alan: string; deger: string }

function sahteYazici(patlat?: string) {
  const cagrilar: Cagri[] = [];
  const silmeler: Silme[] = [];
  const y: Yazici = {
    async upsert(tablo, satirlar) {
      if (patlat === tablo) throw new Error('sahte hata: ' + tablo);
      cagrilar.push({ tablo, satirlar });
    },
    async sil(tablo, kullanici, alan, deger) {
      if (patlat === tablo) throw new Error('sahte hata: ' + tablo);
      silmeler.push({ tablo, kullanici, alan, deger });
    },
  };
  return { y, cagrilar, silmeler };
}

const FIS: YazilacakFis = {
  id: 'f1', storeName: 'A101', date: '2026-08-08',
  totalAmount: 677, imageUri: 'file:///gizli/yol.jpg',
  createdAt: '2026-08-08T10:00:00.000Z',
};
const URUNLER: YazilacakUrun[] = [
  { id: 'u1', name: 'SAMPUAN', categoryId: 'kisisel' },
];
const KAYITLAR: YazilacakKayit[] = [
  { id: 'k1', productId: 'u1', receiptId: 'f1', productName: 'SAMPUAN',
    unitPrice: 299, quantity: 1, totalPrice: 299, date: '2026-08-08',
    unit: 'adet', vatRate: 20, satirTipi: 'urun' },
  { id: 'k2', productId: null, receiptId: 'f1',
    productName: '10 TL UZERINE SAMPUA',
    unitPrice: null, quantity: 1, totalPrice: -170, date: '2026-08-08',
    unit: null, vatRate: null, satirTipi: 'indirim',
    hamEtiket: '10 TL UZERINE SAMPUA' },
];
const SIMDI = '2026-08-15T12:00:00.000Z';

async function calis() {
  console.log('=== sunucuya yazma ===');

  await kontrol('Y1 oturum yoksa yazma denenmez', async () => {
    const { y, cagrilar } = sahteYazici();
    const s = await fisiGonder(y, null, FIS, URUNLER, KAYITLAR, SIMDI);
    return [s.gonderildi, cagrilar.length];
  }, [false, 0]);

  await kontrol('Y2 sira: urunler, fis, fiyat kayitlari', async () => {
    const { y, cagrilar } = sahteYazici();
    await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    return cagrilar.map((c) => c.tablo);
  }, ['urunler', 'fisler', 'fiyat_kayitlari']);

  await kontrol('Y3 her satirda kullanici kimligi', async () => {
    const { y, cagrilar } = sahteYazici();
    await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    return cagrilar.every((c) => c.satirlar.every((s) => s.kullanici === 'kul1'));
  }, true);

  await kontrol('Y4 goruntu yolu gonderilmez', async () => {
    const { y, cagrilar } = sahteYazici();
    await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    const metin = JSON.stringify(cagrilar);
    return metin.includes('gizli') || metin.includes('imageUri');
  }, false);

  await kontrol('Y5 para alani sayi', async () => {
    const { y, cagrilar } = sahteYazici();
    await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    const fis = cagrilar.find((c) => c.tablo === 'fisler')!.satirlar[0];
    return typeof fis.toplam;
  }, 'number');

  await kontrol('Y6 indirimde urun kimligi bos', async () => {
    const { y, cagrilar } = sahteYazici();
    await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    const k = cagrilar.find((c) => c.tablo === 'fiyat_kayitlari')!.satirlar;
    return k.find((s) => s.satir_tipi === 'indirim')!.urun_kimligi;
  }, null);

  await kontrol('Y7 birim ve kdv bos gecilebilir', async () => {
    const { y, cagrilar } = sahteYazici();
    await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    const k = cagrilar.find((c) => c.tablo === 'fiyat_kayitlari')!.satirlar;
    const i = k.find((s) => s.satir_tipi === 'indirim')!;
    return [i.birim, i.kdv_orani];
  }, [null, null]);

  await kontrol('Y8 ham etiket korunur', async () => {
    const { y, cagrilar } = sahteYazici();
    await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    const k = cagrilar.find((c) => c.tablo === 'fiyat_kayitlari')!.satirlar;
    return k.find((s) => s.satir_tipi === 'indirim')!.ham_etiket;
  }, '10 TL UZERINE SAMPUA');

  await kontrol('Y9 basarida gonderildi dogru', async () => {
    const { y } = sahteYazici();
    const s = await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    return [s.gonderildi, s.gonderimZamani];
  }, [true, SIMDI]);

  await kontrol('Y10 yazici hata atarsa gonderildi yanlis', async () => {
    const { y } = sahteYazici('urunler');
    const s = await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    return [s.gonderildi, typeof s.hata];
  }, [false, 'string']);

  await kontrol('Y11 kismi basarisizlikta gonderildi yanlis', async () => {
    const { y, cagrilar } = sahteYazici('fiyat_kayitlari');
    const s = await fisiGonder(y, 'kul1', FIS, URUNLER, KAYITLAR, SIMDI);
    return [s.gonderildi, cagrilar.length];
  }, [false, 2]);

  await kontrol('Y12 silme urunlere DOKUNMAZ', async () => {
    const { y, silmeler } = sahteYazici();
    const s = await fisiSil(y, 'kul1', 'f1');
    return [s.gonderildi, silmeler.map((x) => x.tablo)];
  }, [true, ['fiyat_kayitlari', 'fisler']]);

  console.log('');
  console.log('Toplam: ' + yesil + ' yesil kontrol, ' + kirmizi + ' kirmizi kontrol');
  process.exit(kirmizi === 0 ? 0 : 1);
}

calis();
