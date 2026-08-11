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
import { ayniUrunMu, NORMALIZE_SURUMU } from '../src/utils/urunAdiNormalize';
import { urunleriGrupla, temsilciHaritasi } from '../src/utils/urunGruplama';

interface Cift {
  a: string;
  b: string;
  beklenen: 'birlestir' | 'ayri';
  gerekce: string;
  sinif: 'T1' | 'YANLIS' | 'KACIRILAN';
}

const yol = join(__dirname, '../../m3-test/ground-truth/dedup-anahtari.json');
const anahtar = JSON.parse(readFileSync(yol, 'utf-8')) as { ciftler: Cift[] };

// M8-3: olculen kural artik normalizasyon modulu.
// Bugunku uretim kurali (toLowerCase) M8-2'de olculdu:
// 12 yesil / 10 kirmizi, kacirilan 10.
function olculenKural(a: string, b: string): boolean {
  return ayniUrunMu(a, b);
}

let yesil = 0;
let kirmizi = 0;
let dogruBirlestirme = 0;
let kacirilan = 0;
let yanlisBirlestirme = 0;

console.log('=== cift bazinda ===');
for (const c of anahtar.ciftler) {
  const bulunan = olculenKural(c.a, c.b) ? 'birlestir' : 'ayri';
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
console.log('');

// --- M8-4: gruplama kontrolleri ---
let gYesil = 0;
let gKirmizi = 0;
function gKontrol(etiket: string, bulunan: unknown, beklenen: unknown) {
  const a = JSON.stringify(bulunan);
  const b = JSON.stringify(beklenen);
  if (a === b) {
    gYesil++;
    console.log('  yesil   ' + etiket);
  } else {
    gKirmizi++;
    console.log('  KIRMIZI ' + etiket);
    console.log('            bulunan=' + a + ' beklenen=' + b);
  }
}

console.log('');
console.log('=== gruplama ===');
{
  const urunler = [
    { id: 'p1', name: 'POSET', createdAt: 3 },
    { id: 'p2', name: 'PO\u015eET', createdAt: 1 },
    { id: 'p3', name: 'COCA-COLA ZERO 330', createdAt: 2 },
    { id: 'p4', name: 'COCA-COLA ZERO 450', createdAt: 4 },
    { id: 'p5', name: '  POSET  ', createdAt: 5 },
  ];
  const s = urunleriGrupla(urunler);
  gKontrol('G1 grup sayisi', s.gruplar.length, 3);
  const h = temsilciHaritasi(s);
  gKontrol('G2 POSET varyantlari ayni temsilcide',
    [h.get('p1'), h.get('p2'), h.get('p5')], ['p2', 'p2', 'p2']);
  gKontrol('G3 temsilci en eski uye', h.get('p1'), 'p2');
  gKontrol('G4 farkli boyutlar ayri grupta',
    h.get('p3') === h.get('p4'), false);
  gKontrol('G5 surum ciktida tasiniyor', s.kuralSurumu, 1);
}
{
  const s = urunleriGrupla([]);
  gKontrol('G6 bos girdi bos sonuc', s.gruplar.length, 0);
}
{
  const s = urunleriGrupla([
    { id: 'x1', name: 'TEK URUN' },
  ]);
  gKontrol('G7 createdAt yokken de temsilci secilir',
    s.gruplar[0].temsilciId, 'x1');
}
console.log('  gruplama: ' + gYesil + ' yesil, ' + gKirmizi + ' kirmizi');

console.log('normalizasyon kural surumu: ' + NORMALIZE_SURUMU);
console.log('Toplam: ' + (yesil + gYesil) + ' yesil kontrol, ' + (kirmizi + gKirmizi) + ' kirmizi kontrol');
process.exit(kirmizi === 0 && gKirmizi === 0 ? 0 : 1);
