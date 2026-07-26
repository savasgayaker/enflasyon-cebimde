# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `frontend/` (this directory).

- `npm install` — install dependencies
- `npm start` / `npx expo start` — start Metro dev server (then `i` iOS, `a` Android, `w` web)
- `npm run ios` / `npm run android` / `npm run web` — start with a specific target
- `npm run lint` — ESLint via `eslint-config-expo`
- `npm run test:parser` — run the receipt parser against fixtures in `parser-fixtures/` (see *Testing the parser* below)

### Dev Client workflow (after ML Kit)

This project uses **`expo-dev-client`** — ML Kit ships native frameworks that the stock Expo Go app cannot load. The dev loop:

1. **One-time native build per platform:** `npx expo run:ios` (Mac + Xcode required) or `npx expo run:android` (Android Studio). First build is 5–15 min; subsequent native builds when `app.json` plugins/permissions change or new native modules are added.
2. **Daily JS work:** `npx expo start` → open the **custom dev client** binary on the device (not Expo Go) → JS hot reload is instant, same as before.
3. **EAS Build** is not configured. Do not run `eas build` without explicit approval — it consumes build credits.

Plain `npx expo start` with the **Expo Go** app will fail to load the JS bundle once you import `@infinitered/react-native-mlkit-text-recognition`. That's expected; use the dev client build.

### `npm run reset-project` — destructive

`scripts/reset-project.js` was written for the default Expo template (`app/`, `components/`, `hooks/`, `constants/`, `scripts/` at the repo root). This project's source layout is different (real code lives in `src/`, plus `app/` for routing). Running the reset script will move/delete the real `app/` and `scripts/` directories. Do not run it unless the user explicitly asks.

## Architecture

### File-based routing (Expo Router)

`app/` is the route tree, not source code. Adding a `.tsx` file here adds a screen.

- `app/_layout.tsx` — root `Stack`. Registers `index`, `onboarding`, `(tabs)`, and modal/detail screens (`receipt-preview`, `product-detail`, `receipt-detail`). Themes the stack from `useAppStore().settings.darkMode`.
- `app/index.tsx` — boot splash; redirects to `/(tabs)` or `/onboarding` based on `settings.onboardingComplete`.
- `app/(tabs)/_layout.tsx` — bottom tab bar: `index` (home), `scan`, `products`, `analytics`, `settings`.
- `app/+html.tsx` — web-only HTML shell.

`typedRoutes` is enabled (`app.json`), so `router.push('/foo')` is type-checked against the route tree.

### State (`src/store/useAppStore.ts`)

Single Zustand store, persisted to `AsyncStorage` under the key `enflasyon-storage`. Domain types:

- `Receipt` — header (store, date, total, image URI)
- `Product` — name + categoryId (+ optional barcode)
- `PriceRecord` — line item linking a `Product` to a `Receipt` with `unitPrice`/`totalPrice`/`quantity`/`date`
- `UserSettings` — name, currency, language, darkMode, notifications, onboardingComplete

Receipts/products/price records are three flat arrays joined by id. Always go through the helpers (`getReceiptItems`, `getProductPriceHistory`, `findOrCreateProduct`) instead of re-implementing the join — `findOrCreateProduct` is case-insensitive on `name` and is what keeps the product list deduplicated across scans.

Schema changes are breaking for existing users (data is local-only with no migration layer). If you change a persisted shape, either bump the persist version with a migrate fn or accept that users lose history.

### Personal inflation (`src/utils/inflation.ts`)

`calculateInflation` computes a Laspeyres-style weighted rate over a `{start, end}` window: for each product, weight = current-period spending ÷ total current spending, then sum `weight × (current_unit − previous_unit) / previous_unit` using the immediately preceding window of equal length as the baseline. Per-category rates re-normalize within each category. The `monthlyTrend` field is **not** the same metric — it's month-over-month *total spending* change for the last 6 months, kept for charts. Don't conflate the two.

Returns rates as percentages already (×100 happens inside).

### Receipt parsing pipeline (Aşama 3 — vision-first)

Production flow on the scan screen:

`scan.tsx` (camera / gallery) → `parseReceiptViaM3(imageUri)` → backend `/api/parse-receipt` → MiniMax M3 vision → `ParsedReceipt` → `receipt-preview.tsx` (review + edit + save).

**Architecture decision (Aşama 3):** receipt reading moved from on-device ML Kit OCR + regex parser to **MiniMax M3 vision** via a backend proxy. Evidence and rationale live in **`../m3-test/results/RAPOR.md`** — vision read store/date/total 100% correct on 6/6 test receipts (item price accuracy 93.7%), while the ML Kit text → M3 route deterministically hung on Migros's fragmented OCR. The `m3-test/` folder at the repo root is the isolated test harness: `run_test.py` (reruns the comparison), `ground-truth/` (hand-verified answer keys), `results/RAPOR.md` (the decision record). Photos and `.env` in it are gitignored.

| Function | File | Notes |
|---|---|---|
| `parseReceiptViaM3(imageUri)` | `src/services/receiptParserM3.ts` | Uploads photo to backend, returns `ParsedReceipt`. Spreads receipt-level `needsReview` onto all items; adds `categoryId` via `suggestCategory`. |
| `BACKEND_URL` | `src/constants/config.ts` | Single source of truth for the backend address (dev: Mac's LAN IP). |
| `POST /api/parse-receipt` | `../backend/server.py` | Shrinks image (2000px / JPEG 80%, EXIF-corrected), calls MiniMax-M3 (60s timeout + 1 retry, max_tokens 24000), validates schema. API key only server-side (`backend/.env`, template in `.env.example`). Field finding: distant shots lose text detail after downscaling — the frame-guide hint and empty-result error push users to fill the frame. |

**Arithmetic cross-check → needsReview:** the backend compares `sum(items.totalPrice)` against `totalAmount`; a gap > 0.01 TL (or any null price) marks the response `needsReview: true`. All 5 vision errors in testing were catchable by this check. The existing receipt-preview UI (yellow "İNCELEYİN" / red "FİYAT GİRİN" strips) renders these flags unchanged.

#### Retired (but kept) regex parser

`extractTextFromImage` (`src/services/ocrService.ts`) + `parseReceipt` (`src/services/receiptParser.ts`) are **retired from the production path but intentionally NOT deleted** — they are the offline fallback if the M3 route proves unreliable. `npm run test:parser` (20/20 baseline) and the OCR Test screen stay green as the insurance policy; don't break them in unrelated changes.

#### Parser internals (`src/services/receiptParser.ts` — retired path)

Turkish supermarket receipts come in two visual layouts; the parser handles both with a two-stage matching pass:

- **Düzen A** (A101, Migros, Bildirici): product name and price share the same y-band (`[-10, +20]` px). Items default to `needsReview: false`.
- **Düzen B** (File, BİM): name is on one line, price on the line below within a down-offset band. These items are tagged `needsReview: true` so the user sees the yellow ⚠ chip and double-checks them.

`ParsedItem.totalPrice` is `number | null`. A null means the parser found a product line but couldn't confidently match a price. The UI renders these with a red strip and `FİYAT GİRİN` chip — the user must enter the price before save.

**Arithmetic cross-check:** if exactly one item has a null price and `totalAmount` was parsed, the missing price is back-computed as `total − sum(rest)` and the item is tagged `needsReview: true`. This is how Migros's `DAMLA SU 500ML` (often unreadable in OCR) gets recovered.

**Store name + total detection:**
- `STORE_ALIASES` (e.g. `BIY BIRLESIK → BİM`, `CARREFOURSA → CarrefourSA`) normalize OCR'd store strings.
- `TOTAL_KEYWORDS` priority: `['ÖDENECEK', 'GENEL TOPLAM', 'TOPLAM', 'TUTAR']`. KDV lines are skipped (`/K[DO]V/` trap).
- Turkish normalize step folds `Ö → O`, `İ → I` only for keyword matching, never for display.

#### Testing the parser

Fixtures live in `frontend/parser-fixtures/` — 5 JSON files capturing raw OCR output for each target chain (A101, Migros, Bildirici, File, BİM). Each fixture includes the raw `OCRRawResult` plus the expected `ParsedReceipt` (storeName / date / totalAmount / items[] with needsReview flags).

Run with: `npm run test:parser` (alias for `frontend/scripts/test-parser.ts`). Current baseline: **20/20 assertions across 5 fixtures (4 fields per fixture: `storeName`, `date`, `totalAmount`, `items[]`)** must pass. Per-item diffs are reported inside the items field.

When a new receipt produces wrong output:
1. Open OCR Test screen (Settings → Geliştirici → OCR Test), scan the receipt, copy the raw output.
2. Add a new fixture under `parser-fixtures/` with the raw OCR and the expected parsed result.
3. Re-run `npm run test:parser`; iterate on the parser until the new fixture passes without breaking the existing 5.

#### OCR Test screen (debug only)

Settings tab → **Geliştirici → OCR Test** (only visible when `__DEV__` is true). Pick from gallery or take a photo, see `fullText` / lines / blocks, copy raw text to clipboard. This screen bypasses the parser and is the source for new fixtures.

#### ML Kit constraints

- **iOS Simulator is unsupported** by Google ML Kit's iOS framework — test OCR on a physical iPhone or an Android emulator/device. UI work without OCR still runs in the simulator.
- Confidence per-element is not exposed by the JS binding; `OCRRawResult.confidence` is always `1` until ML Kit surfaces it.
- Latin script (Turkish characters Ç Ş İ Ğ Ü Ö) is the default — no per-language config needed.

### i18n

Turkish-only. `src/i18n/tr.ts` holds all strings; `t('a.b.c')` does dotted-path lookup and returns the key itself on miss. Don't hardcode user-facing strings — add them to `tr.ts` and reference via `tr.x.y` (direct object access is the common pattern in this codebase) or `t()`.

### Theme

`src/constants/theme.ts` exports `colors` (with separate `light`/`dark` palettes plus a `category` map), `spacing`, `borderRadius`, `typography`, `shadows`. Pick the theme with `const theme = darkMode ? colors.dark : colors.light` — that pattern is repeated in every screen and layout.

### Categories

`src/constants/categories.ts` defines 11 fixed categories with keyword arrays. `suggestCategory(name)` does a lowercase substring match against keywords and falls back to `other`. The scan pipeline (`scan.tsx` → `parseReceipt` → product creation in `receipt-preview.tsx`) routes through this. **Known issue:** substring matching means `et` matches `POSET` (→ Gıda) and `su` matches `SUZME` (→ İçecek); a word-boundary fix is queued as Adım 2.5 (see *Bilinen teknik borç* below). Until then, the user can correct the category in `receipt-preview.tsx` before saving.

### Path alias

`tsconfig.json` maps `@/*` → `./*` from the `frontend/` root (not `src/`). So `@/src/store/useAppStore` resolves, not `@/store/useAppStore`. The existing screens use relative imports (`../src/...`); follow the local convention in each directory.

## Project-wide conventions

- TypeScript `strict` is on; React 19 + React Native 0.81 + Expo SDK 54 with **New Architecture enabled** (`newArchEnabled: true`).
- `metro.config.js` pins a stable on-disk cache at `.metro-cache/` and caps `maxWorkers: 2`. Don't bump workers without reason — this exists to keep the dev machine responsive.
- The repo root (`../`) contains the FastAPI `backend/` and a `test_result.md` testing protocol. Since Aşama 3 the app **does** call the backend for exactly one thing: `POST /api/parse-receipt` (receipt photo → MiniMax M3 vision → ParsedReceipt). All other data stays local in AsyncStorage — don't add further backend calls without explicit direction. Backend needs `MINIMAX_API_KEY` in `backend/.env` (see `.env.example`); MongoDB is optional (status endpoints return 503 without it, parse-receipt is unaffected).

## Bilinen teknik borç (Aşama 3 — kapanış reasoning kararına bağlı)

**Aşama 3'ün kapanışı, kabul testi sonucunun Savaş tarafından onaylanmasına bağlı.** Teknik iş tamam: backend proxy (`/api/parse-receipt`), `parseReceiptViaM3` + birim testli `mapM3Response` (`npm run test:m3-mapper`, 18/18), dinamik `BACKEND_URL`, iPhone saha testi doğrulandı. **Yayın konfigürasyonu: çift-paralel thinking_off** — iki eşzamanlı M3 çağrısı + kalem bazlı çapraz kontrol + aritmetik kontrol (karar ve kabul testi: RAPOR.md Ek 5; 30 koşuda 0 sessiz hata, ortalama 6,7 sn). Aşağıdaki maddeler biliniyor ve bilinçli olarak açık:

### M3 pipeline
- **Ürün adı normalizasyonu / dedup stratejisi:** M3 çıktısı koşudan koşuya deterministik değil (aynı fişte `KÖPÜK SABUN` ↔ `K*P*K SABUN`, Türkçe/ASCII savrulması). `findOrCreateProduct` ada göre eşleştirdiği için aynı ürünün fiyat serisi farklı kayıtlara bölünebilir — enflasyon hesabı ürünü izleyemez. Çözüm adayları: istemcide isim normalizasyonu, fuzzy eşleşme, veya prompt'a "Türkçe karakterleri koru" kuralı.
- **±1 TL sınıfı tutarlı okuma hataları** — çapraz kontrole kör (iki çağrı da aynı yanlışı okur; ör. File'da PINAR 158↔159), azaltma yolu fotoğraf kalitesi (yakın çekim), thinking açıkken de mevcut. Kabul testinde bu sınıf dahil 0 sessiz hata çıktı ama teorik körlük duruyor.
- **Yanlış alarm oranı:** kabul testinde 10/30 koşuda fiş doğruyken kalem bayrağı çıktı (model nondeterminizmi iki doğru-ya-yakın yanıtı da farklılaştırabiliyor) — kullanıcı fazladan teyit yapıyor. Bayrak eşiklerini gevşetme/isim-normalizasyonuyla azaltılabilir.
- ~~**Reasoning uzunluğu kontrolü**~~ **KARARA BAĞLANDI:** çift-paralel thinking_off yayında (RAPOR.md Ek 3-5). Streaming ihtiyacı büyük ölçüde ortadan kalktı (süre ~6,7 sn, deterministik); yalnızca thinking'e geri dönülürse yeniden değerlendirilir.
- ~~**`BACKEND_URL` elle yazılı**~~ **KAPANDI:** artık Metro `hostUri`'sinden türetiliyor (`src/constants/config.ts`); `EXPO_PUBLIC_BACKEND_URL` env değişkeni her zaman öncelikli. (Borcun bedeli bir kez ödendi: DHCP, Mac'in IP'sini .26→.20 değiştirdiğinde iPhone E2E sessizce koptu.)
- **Fiş-seviyesi needsReview kalemlere yayılıyor** (`receiptParserM3.ts`): toplam tutmadığında hangi kalemin hatalı olduğu bilinemediği için hepsi işaretleniyor. Kalem bazlı daraltma (ör. modelden şüphe skoru istemek) gelecek iş.

### Retired parser (düşük öncelik — üretim yolunda değil)
- DAMLA SU yinelenmesi (Migros), BİM apostrof varyantı, uzun barkod, File footer y-zon sızıntısı — ayrıntılar git geçmişinde (Aşama 2 dönemi). Parser artık yalnızca fallback; bu bug'lar ancak fallback'e dönülürse önem kazanır.

### Categories (`src/constants/categories.ts`)
- `suggestCategory` substring eşleme yapıyor: `POSET → Gıda` (çünkü "et"), `SUZME → İçecek` (çünkü "su"). Kelime-sınırlı eşleme (`\b` regex) ile düzeltilebilir. **Adım 2.5 olarak planlandı** — küçük, izole, yan-etkisiz. M3 isimleri düzeltip Türkçe karakter getirdiği için (`PİLİÇ PARÇA BONFİLE`) keyword isabeti arttı ama substring bug'ı aynen geçerli.

### UI / receipt-preview
- `handleSave` validation sırası: sert kontrol (`unitPrice <= 0` → "Tüm ürünlerin adı ve fiyatı olmalıdır") yumuşak needsReview Alert'inden ÖNCE çalışıyor. Beklenen davranış: önce "İncele / Yine de kaydet" Alert'i, sadece tüm fiyatlar gerçekten 0 ise sert hata.
- "Başarılı, fiş başarıyla kaydedildi" Alert'inden sonra Dashboard'a otomatik dönüş davranışı doğrulanmadı.

### Sonraki olası adımlar
- **Adım 2.5:** Kategori kelime-sınırlı eşleme — küçük, izole, hızlı kazanım.
- **M6:** Dashboard / Ürünler / Analitik ekranları kayıt sonrası nasıl davranıyor — uçtan uca veri akışını doğrula, gerekirse `inflation.ts` hesaplamasını gözden geçir.
- **Üretim hazırlığı:** BACKEND_URL'in ortam değişkenine taşınması, backend'in gerçek bir sunucuya dağıtımı, rate limit / maliyet takibi.
