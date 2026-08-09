/**
 * M7-D1 - fis kalem kurallari birim aleti.
 *
 * Cekler BUGUNKU davranisi yazar. Indirim kaleminin reddedildigi
 * cekler dahil; bunlar D3 ve D4'te bilerek degisecek muhafizlardir
 * ve etiketlerinde oyle isaretlidir.
 */
import {
  kalemGecerliMi,
  seritSeviyesi,
  kayitKarari,
  type KalemGirdisi,
} from '../src/utils/fisKalemKurallari';

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

function senaryo(ad: string) {
  console.log('=== ' + ad + ' ===');
}

const k = (over: Partial<KalemGirdisi> = {}): KalemGirdisi => ({
  name: 'EKMEK',
  quantity: 1,
  unitPrice: 15,
  totalPrice: 15,
  needsReview: false,
  ...over,
});

senaryo('gecerlilik yuklemi');

kontrol('V1 normal kalem gecerli', () => kalemGecerliMi(k()), true);
kontrol('V2 adi bos kalem gecersiz',
  () => kalemGecerliMi(k({ name: '   ' })), false);
kontrol('V3 birim fiyat sifir gecersiz',
  () => kalemGecerliMi(k({ unitPrice: 0 })), false);
kontrol('V4 birim fiyat negatif gecersiz (bugunku davranis)',
  () => kalemGecerliMi(k({ unitPrice: -170, totalPrice: -170 })), false);
kontrol('V5 indirim turu de bugun gecersiz (D3 muhafizi)',
  () => kalemGecerliMi(k({ unitPrice: -170, totalPrice: -170,
                          satirTipi: 'indirim' })), false);

senaryo('serit seviyesi');

kontrol('S1 bayraksiz kalem seritsiz',
  () => seritSeviyesi(k()), 'yok');
kontrol('S2 bayrakli ve tutar sifir eksik',
  () => seritSeviyesi(k({ needsReview: true, totalPrice: 0 })), 'eksik');
kontrol('S3 bayrakli ve tutar pozitif incele',
  () => seritSeviyesi(k({ needsReview: true, totalPrice: 15 })), 'incele');
kontrol('S4 bayrakli ve tutar negatif bugun seritsiz (D4 muhafizi)',
  () => seritSeviyesi(k({ needsReview: true, totalPrice: -170 })), 'yok');

senaryo('kayit karari');

kontrol('K1 normal kalemde urun olusturulur',
  () => kayitKarari(k()).urunOlusturulsunMu, true);
kontrol('K2 indirim kaleminde de bugun olusturulur (D3 muhafizi)',
  () => kayitKarari(k({ satirTipi: 'indirim', unitPrice: -170,
                        totalPrice: -170 })).urunOlusturulsunMu, true);
kontrol('K3 kayit govdesi karar alanlarini tasir',
  () => kayitKarari(k({ quantity: 2, unitPrice: 15, totalPrice: 30 })).kayit,
  { quantity: 2, unitPrice: 15, totalPrice: 30 });

console.log('');
console.log('Toplam: ' + yesil + ' yesil kontrol, ' + kirmizi + ' kirmizi kontrol');
process.exit(kirmizi === 0 ? 0 : 1);
