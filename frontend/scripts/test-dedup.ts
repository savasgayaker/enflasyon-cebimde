/**
 * M8 - urun adi tekillestirme olcum aleti.
 *
 * K4'un istedigi uc ayri sayaci uretir:
 *   dogru birlestirme    ayni urun, birlestirildi
 *   kacirilan            ayni urun olabilir, birlestirilmedi
 *   yanlis birlestirme   FARKLI urun, birlestirildi - SIFIR olmali
 *
 * M8-2'de olculen kural bugunku uretim kuralidir
 * (useAppStore.ts findOrCreateProduct: toLowerCase karsilastirmasi).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

interface Cift {
  a: string;
  b: string;
  beklenen: 'birlestir' | 'ayri';
  gerekce: string;
  sinif: 'T1' | 'YANLIS' | 'KACIRILAN';
}

const yol = join(__dirname, '../../m3-test/ground-truth/dedup-anahtari.json');
const anahtar = JSON.parse(readFileSync(yol, 'utf-8')) as { ciftler: Cift[] };

// Bugunku uretim kurali - useAppStore.ts findOrCreateProduct
function bugunkuKural(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

let yesil = 0;
let kirmizi = 0;
let dogruBirlestirme = 0;
let kacirilan = 0;
let yanlisBirlestirme = 0;

console.log('=== cift bazinda ===');
for (const c of anahtar.ciftler) {
  const bulunan = bugunkuKural(c.a, c.b) ? 'birlestir' : 'ayri';
  const gecti = bulunan === c.beklenen;
  if (gecti) {
    yesil++;
    console.log('  yesil   [' + c.sinif + '] ' + c.a + '  ||  ' + c.b);
  } else {
    kirmizi++;
    console.log('  KIRMIZI [' + c.sinif + '] ' + c.a + '  ||  ' + c.b);
    console.log('            bulunan=' + bulunan + ' beklenen=' + c.beklenen);
  }
  if (bulunan === 'birlestir') {
    if (c.sinif === 'YANLIS') yanlisBirlestirme++;
    else dogruBirlestirme++;
  } else if (c.beklenen === 'birlestir') {
    kacirilan++;
  }
}

console.log('');
console.log('=== K4 sayaclari ===');
console.log('  dogru birlestirme  : ' + dogruBirlestirme);
console.log('  kacirilan          : ' + kacirilan);
console.log('  YANLIS BIRLESTIRME : ' + yanlisBirlestirme + '  (sifir olmali)');

console.log('');
console.log('=== olculmus ongoru: noktali buyuk I ===');
const buyukI = 'İ';
const kucuk = buyukI.toLowerCase();
const kodlar: string[] = [];
for (const ch of kucuk) {
  kodlar.push('U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0'));
}
console.log('  U+0130 toLowerCase -> ' + kodlar.join(' ') + '  uzunluk ' + kucuk.length);
console.log('  noktasiz i ile esit mi: ' + (kucuk === 'i'));

console.log('');
console.log('Toplam: ' + yesil + ' yesil kontrol, ' + kirmizi + ' kirmizi kontrol');
process.exit(kirmizi === 0 ? 0 : 1);
