#!/usr/bin/env node
/**
 * mapM3Response (M3 backend yanıtı → ParsedReceipt) birim testi.
 *
 * Kullanım: npm run test:m3-mapper
 *
 * Senaryo fiyatları GİMSA fişinin elle doğrulanmış ground-truth'undan
 * (m3-test/ground-truth/gimsa.json) — gerçek satırlar, uydurma değil.
 */
import { mapM3Response, type M3Response } from '../src/services/m3Mapper';

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = Object.is(actual, expected);
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}: ${JSON.stringify(actual)}`);
  } else {
    failed++;
    console.log(
      `  ✗ ${label}: beklenen ${JSON.stringify(expected)}, alınan ${JSON.stringify(actual)}`,
    );
  }
}

function baseResponse(items: M3Response['items']): M3Response {
  return {
    storeName: 'GİMSA',
    date: '2026-05-10',
    totalAmount: 1391.8,
    needsReview: false,
    items,
  };
}

function item(over: Partial<M3Response['items'][number]>): M3Response['items'][number] {
  return {
    name: 'TEST ÜRÜNÜ',
    quantity: 1,
    unitPrice: null,
    totalPrice: null,
    needsReview: false,
    ...over,
  };
}

// ---------------------------------------------------------------------------
console.log('1) Çok adetli (POŞET): quantity 3, totalPrice 3.00 → unitPrice 1.00');
{
  const r = mapM3Response(baseResponse([
    item({ name: 'POŞET', quantity: 3, totalPrice: 3.0 }),
  ]));
  check('unitPrice', r.items[0].unitPrice, 1.0);
  check('totalPrice', r.items[0].totalPrice, 3.0);
  check('quantity', r.items[0].quantity, 3);
  check('needsReview', r.items[0].needsReview, false);
}

console.log('2) Tekli (COCA COLA ZERO 1 LT): quantity 1, totalPrice 49.50 → unitPrice 49.50');
{
  const r = mapM3Response(baseResponse([
    item({ name: 'COCA COLA ZERO 1 LT', quantity: 1, totalPrice: 49.5 }),
  ]));
  check('unitPrice', r.items[0].unitPrice, 49.5);
  check('needsReview', r.items[0].needsReview, false);
}

console.log('3) Tartılı (KURU PASTA NORMAL): quantity 0.542, totalPrice 107.86 → unitPrice 199.00');
{
  const r = mapM3Response(baseResponse([
    item({ name: 'KURU PASTA NORMAL', quantity: 0.542, totalPrice: 107.86 }),
  ]));
  check('unitPrice', r.items[0].unitPrice, 199.0);
}

console.log('4) Tartılı (İÇLİ KÖFTE): quantity 1.034, totalPrice 619.88 → unitPrice 599.50');
{
  const r = mapM3Response(baseResponse([
    item({ name: 'ICLI KOFTE', quantity: 1.034, totalPrice: 619.88 }),
  ]));
  check('unitPrice', r.items[0].unitPrice, 599.5);
}

console.log('5) totalPrice null → unitPrice null + needsReview true');
{
  const r = mapM3Response(baseResponse([
    item({ name: 'OKUNAMAYAN ÜRÜN', quantity: 1, totalPrice: null, needsReview: false }),
  ]));
  check('unitPrice', r.items[0].unitPrice, null);
  check('totalPrice', r.items[0].totalPrice, null);
  check('needsReview', r.items[0].needsReview, true);
}

console.log('6) quantity 0 → çökmez, unitPrice null (sıfıra bölme koruması)');
{
  const r = mapM3Response(baseResponse([
    item({ name: 'BOZUK MIKTAR', quantity: 0, totalPrice: 10.0 }),
  ]));
  check('unitPrice', r.items[0].unitPrice, null);
  check('quantity (1e normalize)', r.items[0].quantity, 1);
}

console.log('7) quantity eksik (undefined) → çökmez, unitPrice null');
{
  const r = mapM3Response(baseResponse([
    item({ name: 'MIKTARSIZ', quantity: undefined as unknown as number, totalPrice: 10.0 }),
  ]));
  check('unitPrice', r.items[0].unitPrice, null);
  check('quantity (1e normalize)', r.items[0].quantity, 1);
}

console.log('8) Backend unitPrice zaten vermişse dokunulmaz');
{
  const r = mapM3Response(baseResponse([
    item({ name: 'HAZIR BIRIM', quantity: 2, unitPrice: 5.25, totalPrice: 10.5 }),
  ]));
  check('unitPrice', r.items[0].unitPrice, 5.25);
}

console.log('9) Fiş seviyesi needsReview kalemlere yayılır');
{
  const resp = baseResponse([
    item({ name: 'NORMAL ÜRÜN', quantity: 1, totalPrice: 5.0, needsReview: false }),
  ]);
  resp.needsReview = true;
  const r = mapM3Response(resp);
  check('needsReview (yayılmış)', r.items[0].needsReview, true);
}

console.log('10) Boş ürün listesi → yönlendirme mesajlı Error');
{
  let threw = false;
  try {
    mapM3Response(baseResponse([]));
  } catch (e) {
    threw = e instanceof Error && e.message.includes('yakından');
  }
  check('throw + mesaj', threw, true);
}

// ---------------------------------------------------------------------------
console.log('');
console.log(`Sonuç: ${passed}/${passed + failed} kontrol başarılı.`);
process.exit(failed === 0 ? 0 : 1);
