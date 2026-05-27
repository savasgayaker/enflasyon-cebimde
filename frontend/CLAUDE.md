# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `frontend/` (this directory).

- `npm install` — install dependencies
- `npm start` / `npx expo start` — start Metro dev server (then `i` iOS, `a` Android, `w` web)
- `npm run ios` / `npm run android` / `npm run web` — start with a specific target
- `npm run lint` — ESLint via `eslint-config-expo`
- There is **no test runner configured**. Do not invent `npm test`.

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

### OCR — two layers, intentionally separated

Two functions exist; they do different jobs and **must not be confused**:

| Function | File | Returns | Used by |
|---|---|---|---|
| `extractTextFromImage(uri)` | `src/services/ocrService.ts` | `OCRRawResult` — raw text, lines, blocks | `app/ocr-test.tsx` (debug screen) |
| `processReceipt(uri)` | `src/utils/mockOCR.ts` | `OCRResult` — pre-parsed store/items/total | `app/(tabs)/scan.tsx` (production flow) |

**Phase 1 (current):** Real on-device OCR via Google ML Kit lives in `ocrService.ts` using `@infinitered/react-native-mlkit-text-recognition`. It runs entirely on-device, no network. The `scan.tsx` → `receipt-preview.tsx` flow still calls the **mock** `processReceipt` — we have not wired the real OCR into the production path yet. Both files coexist on purpose.

**Phase 2 (planned):** Write a Turkish receipt parser that converts `OCRRawResult` → `OCRResult` (store name detection, line-item extraction with quantity/price regex, total amount, date). Then `scan.tsx` will call `extractTextFromImage` + parser, and `mockOCR.ts` can be deleted.

**Do not change the existing scan flow or `receipt-preview.tsx`** until the parser exists — the mock is the fallback that lets the rest of the app stay testable.

#### Testing OCR

Settings tab → **Geliştirici → OCR Test** (only visible when `__DEV__` is true). Pick from gallery or take a photo, see `fullText` / lines / blocks, copy raw text to clipboard. The screen runs the real ML Kit pipeline against a single image — useful for prompt-tuning the upcoming parser.

#### ML Kit constraints

- **iOS Simulator is unsupported** by Google ML Kit's iOS framework — test OCR on a physical iPhone or an Android emulator/device. UI work without OCR still runs in the simulator.
- Confidence per-element is not exposed by the JS binding; `OCRRawResult.confidence` is always `1` until ML Kit surfaces it.
- Latin script (Turkish characters Ç Ş İ Ğ Ü Ö) is the default — no per-language config needed.

### i18n

Turkish-only. `src/i18n/tr.ts` holds all strings; `t('a.b.c')` does dotted-path lookup and returns the key itself on miss. Don't hardcode user-facing strings — add them to `tr.ts` and reference via `tr.x.y` (direct object access is the common pattern in this codebase) or `t()`.

### Theme

`src/constants/theme.ts` exports `colors` (with separate `light`/`dark` palettes plus a `category` map), `spacing`, `borderRadius`, `typography`, `shadows`. Pick the theme with `const theme = darkMode ? colors.dark : colors.light` — that pattern is repeated in every screen and layout.

### Categories

`src/constants/categories.ts` defines 11 fixed categories with keyword arrays. `suggestCategory(name)` does a lowercase substring match against keywords and falls back to `other`. The mock OCR and any new product-creation flow should route through this.

### Path alias

`tsconfig.json` maps `@/*` → `./*` from the `frontend/` root (not `src/`). So `@/src/store/useAppStore` resolves, not `@/store/useAppStore`. The existing screens use relative imports (`../src/...`); follow the local convention in each directory.

## Project-wide conventions

- TypeScript `strict` is on; React 19 + React Native 0.81 + Expo SDK 54 with **New Architecture enabled** (`newArchEnabled: true`).
- `metro.config.js` pins a stable on-disk cache at `.metro-cache/` and caps `maxWorkers: 2`. Don't bump workers without reason — this exists to keep the dev machine responsive.
- The repo root (`../`) contains a separate FastAPI `backend/` and a `test_result.md` testing protocol. The Expo app does **not** call that backend — all data is local in AsyncStorage. Don't add network calls to the backend without explicit direction.
