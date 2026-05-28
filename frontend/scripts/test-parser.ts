#!/usr/bin/env node
/**
 * Türkçe fiş parser'ı için basit fixture testi.
 *
 * Kullanım:   npm run test:parser
 *
 * Fixture dizini: <repo>/parser-fixtures/*.json
 * Her fixture şu şekilde:
 *
 *   {
 *     "name": "Migros 2024-04-12",
 *     "raw":  <OCRRawResult — ocr-test ekranındaki "OCR JSON'u Kopyala">,
 *     "expected": {
 *       "storeName": "Migros",     // opsiyonel — eksik bırakılan alanlar kontrol edilmez
 *       "date": "2024-04-12",
 *       "totalAmount": 248.75
 *     }
 *   }
 *
 * Beklenen alanların `Partial` olması, fixture'ları parça parça doldurmaya
 * (önce storeName, sonra date eklemek gibi) izin verir.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseReceipt, type ParsedReceipt } from '../src/services/receiptParser';
import type { OCRRawResult } from '../src/services/ocrService';

interface Fixture {
  name: string;
  raw: OCRRawResult;
  expected: Partial<ParsedReceipt>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '..', 'parser-fixtures');

function loadFixtures(): Fixture[] {
  if (!existsSync(FIXTURES_DIR)) return [];
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const path = join(FIXTURES_DIR, f);
    const data = JSON.parse(readFileSync(path, 'utf8')) as Fixture;
    if (!data.name) data.name = f.replace(/\.json$/, '');
    return data;
  });
}

interface CheckResult {
  field: string;
  pass: boolean;
  expected: unknown;
  actual: unknown;
  /** items karşılaştırması için kalem bazlı diff satırları */
  itemMessages?: string[];
}

function checkFixture(fx: Fixture): CheckResult[] {
  const actual = parseReceipt(fx.raw);
  const checks: CheckResult[] = [];
  for (const key of Object.keys(fx.expected) as (keyof ParsedReceipt)[]) {
    const expected = fx.expected[key];
    const actualValue = actual[key];
    if (key === 'items') {
      const cmp = compareItems(
        (expected as ParsedReceipt['items']) ?? [],
        (actualValue as ParsedReceipt['items']) ?? [],
      );
      checks.push({
        field: key,
        pass: cmp.pass,
        expected,
        actual: actualValue,
        itemMessages: cmp.messages,
      });
    } else {
      const pass = deepEqual(actualValue, expected);
      checks.push({ field: key, pass, expected, actual: actualValue });
    }
  }
  return checks;
}

/**
 * Kalem bazlı karşılaştırma — name'leri trim edip karşılaştırır, diğer
 * alanları birebir kontrol eder. JSON.stringify diff'i okunamadığı için
 * her uyuşmazlığı tek satır mesajla raporlar.
 */
function compareItems(
  expected: ParsedReceipt['items'],
  actual: ParsedReceipt['items'],
): { pass: boolean; messages: string[] } {
  const messages: string[] = [];
  if (expected.length !== actual.length) {
    messages.push(
      `kalem sayısı uyuşmuyor: beklenen ${expected.length}, alınan ${actual.length}`,
    );
    // En azından ortak indislerin diff'ini de yaz ki ne çıktığı görünsün
    const limit = Math.max(expected.length, actual.length);
    for (let i = 0; i < limit; i++) {
      const e = expected[i];
      const a = actual[i];
      messages.push(
        `      [${i}] expected=${e ? JSON.stringify(e.name) : '∅'}  actual=${a ? JSON.stringify(a.name) : '∅'}`,
      );
    }
    return { pass: false, messages };
  }
  let pass = true;
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i];
    const a = actual[i];
    const eName = (e.name ?? '').trim();
    const aName = (a.name ?? '').trim();
    const fields: string[] = [];
    if (eName !== aName) {
      fields.push(`name: ${JSON.stringify(eName)} ≠ ${JSON.stringify(aName)}`);
    }
    if (e.quantity !== a.quantity) {
      fields.push(`quantity: ${e.quantity} ≠ ${a.quantity}`);
    }
    if (e.unitPrice !== a.unitPrice) {
      fields.push(`unitPrice: ${e.unitPrice} ≠ ${a.unitPrice}`);
    }
    if (e.totalPrice !== a.totalPrice) {
      fields.push(`totalPrice: ${e.totalPrice} ≠ ${a.totalPrice}`);
    }
    if (e.categoryId !== a.categoryId) {
      fields.push(
        `categoryId: ${JSON.stringify(e.categoryId)} ≠ ${JSON.stringify(a.categoryId)}`,
      );
    }
    if (e.needsReview !== a.needsReview) {
      fields.push(`needsReview: ${e.needsReview} ≠ ${a.needsReview}`);
    }
    if (fields.length > 0) {
      pass = false;
      messages.push(`      [${i}] ${JSON.stringify(eName)}`);
      for (const f of fields) messages.push(`         ${f}`);
    }
  }
  return { pass, messages };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function fmt(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `Array(${v.length})`;
  return String(v);
}

// ---- main ----
const fixtures = loadFixtures();

if (fixtures.length === 0) {
  console.log(`ℹ  parser-fixtures/ boş veya yok (${FIXTURES_DIR}).`);
  console.log('   OCR Test ekranında "OCR JSON\'u Kopyala" ile fixture topla,');
  console.log('   parser-fixtures/<isim>.json olarak kaydet.');
  process.exit(0);
}

let totalChecks = 0;
let passedChecks = 0;
let failedFixtures = 0;

for (const fx of fixtures) {
  const checks = checkFixture(fx);
  const allPass = checks.every((c) => c.pass);
  console.log(`${allPass ? '✓' : '✗'} ${fx.name}`);
  for (const c of checks) {
    totalChecks++;
    if (c.pass) {
      passedChecks++;
      console.log(`    ✓ ${c.field}: ${fmt(c.actual)}`);
    } else {
      console.log(
        `    ✗ ${c.field}: expected ${fmt(c.expected)}, got ${fmt(c.actual)}`,
      );
      if (c.itemMessages) {
        for (const m of c.itemMessages) {
          console.log(`    ${m}`);
        }
      }
    }
  }
  if (!allPass) failedFixtures++;
}

console.log('');
console.log(
  `Sonuç: ${passedChecks}/${totalChecks} kontrol başarılı, ${fixtures.length - failedFixtures}/${fixtures.length} fixture tamamen geçti.`,
);

process.exit(failedFixtures === 0 ? 0 : 1);
