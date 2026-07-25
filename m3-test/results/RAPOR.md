# MiniMax M3 Fiş Okuma Testi — Sonuç Raporu

**Tarih:** 25 Temmuz 2026 · **Model:** MiniMax-M3 (api.minimax.io, OpenAI-uyumlu chat/completions)
**Yöntem:** Sandbox ağ kısıtı nedeniyle çağrılar kullanıcının Chrome tarayıcısı üzerinden (Claude in Chrome + sayfa içi fetch) yapıldı. Fotoğraflar tarayıcı içinde 1400px / JPEG %80'e küçültülüp base64 data-URL olarak gönderildi.

## Test düzeni

- **Vision yolu:** 6 YENİ fiş fotoğrafı (A101, Bildirici, BİM, File, GİMSA, Migros) doğrudan M3'e verildi. Cevap anahtarı: fotoğraflardan elle çıkarılmış, aritmetik doğrulamalı `ground-truth/*.json` (6/6 fişte ürün toplamı = fiş toplamı, kuruş kuruşuna).
- **ML Kit metni yolu:** repodaki 5 ESKİ fixture'ın ham OCR metni M3'e verildi. Cevap anahtarı: fixture `expected` blokları.
- Puanlama: `run_test.py`'deki bulanık eşleştirici (isim benzerliği + fiyat eşleşmesi; vision'ın düzelttiği bozuk OCR adlarını doğru saymak için).

## Sonuçlar — Vision (fotoğraf → M3)

| Fiş | Mağaza/Tarih/Toplam | Ürün bulma | Fiyat doğruluğu | Süre |
|---|---|---|---|---|
| A101 (21 ürün) | 3/3 ✓ | 21/21 | 21/21 | 47 sn |
| Bildirici (9) | 3/3 ✓ | 9/9 | 9/9 | 12 sn |
| BİM (3) | 3/3 ✓ | 3/3 | 3/3 | 8 sn |
| File (23) | 3/3 ✓ | 23/23 | 20/23 | 141 sn |
| GİMSA (17) | 3/3 ✓ | 15/17 | 15/17 | 15 sn |
| Migros (6) | 3/3 ✓ | 6/6 | 6/6 | 8 sn |
| **TOPLAM** | **18/18 (%100)** | **77/79 (%97,5)** | **74/79 (%93,7)** | medyan ~14 sn |

Hatalar:
- **File:** `2 ad X 79,50` miktar satırını yanlış ürüne bağladı (HARRAS 499,00 yerine 159,00; PINAR SÜT 159,00 yerine 150,00) + `EKŞ KRM ZÜBER` 69,90→69,30 okuma hatası. (Eski regex parser'ın da zorlandığı Düzen B miktar-satırı problemi.)
- **GİMSA:** POŞET (3,00) ve 4. NUTELLA GO (24,90) atlandı.
- **Kritik gözlem:** 5 hatanın 5'i de `ürünler toplamı ≠ fiş toplamı` aritmetik kontrolüyle OTOMATİK YAKALANABİLİR → mevcut needsReview UI'ına bağlanır.

## Sonuçlar — ML Kit metni (OCR → M3)

| Fixture | Başlık | Ürün/Fiyat | Süre |
|---|---|---|---|
| A101 | 3/3 | 4/4, 4/4 | 5 sn |
| Bildirici | 3/3 | 10/10, 10/10 | 46 sn |
| BİM | 3/3 | 4/4, 4/4 | 90 sn |
| File | 3/3 | 9/9, 9/9 | 153 sn |
| Migros | — | **2 denemede de TAKILDI (>8 dk, yanıt yok)** | — |

Not: M3, bozuk OCR adlarını kendiliğinden düzeltti (ör. `PILICPAŘVAKBONFILE` → `PİLİÇ PARÇA BONFİLE`) — eski regex parser'ın 20/20 baseline'ından nitelik olarak üstün. Ancak en dağınık OCR'da (Migros: sütunlar ayrı bloklar halinde) model determinist şekilde takıldı; ayrıca süre değişkenliği yüksek (5 sn – 153 sn).

## Karar önerisi

**VISION-FIRST ONAYLANDI.** Gerekçe:
1. Başlık alanları (mağaza/tarih/toplam — kişisel enflasyon hesabının bel kemiği) vision'da %100.
2. Vision, ML Kit'in hiç göremediğini de görüyor; metin yolu OCR hatasını devralıyor.
3. Metin yolunun takılma/yavaşlık riski vision'dan yüksek çıktı (Migros vakası).
4. Vision hatalarının tamamı aritmetik kontrolle yakalanıp mevcut needsReview akışına düşürülebilir.

**Uygulama planına eklenecek güvenlik ağı:** `parseReceipt` (M3 sürümü) yanıtı geldiğinde `sum(items.totalPrice)` ile `totalAmount` karşılaştırılacak; fark > 0,01 TL ise fiş `needsReview` işaretlenecek (UI zaten hazır). `max_tokens` yüksek tutulmalı (≥16k; reasoning payı) ve 60 sn timeout + 1 retry önerilir.

## Sıradaki adımlar

1. Backend proxy (FastAPI `/api/parse-receipt`): fotoğrafı al → küçült → M3'e ilet → ParsedReceipt JSON dön. API anahtarı yalnızca sunucuda.
2. `ocrService.extractTextFromImage` + `receiptParser.parseReceipt` yerine tek `parseReceiptViaM3(imageUri)` servisi (ParsedReceipt tipi ve receipt-preview/needsReview UI aynen korunuyor; regex parser silinmeden emekliye ayrılıyor).
3. Aritmetik kontrol + needsReview bağlantısı.
4. Not: Bu sandbox'tan repoya push YAPILAMIYOR (GitHub vekil kısıtı) — kod değişiklikleri farklı bir yoldan repoya taşınacak.

## Dosyalar

- `m3-test/run_test.py` — izole test aracı (sandbox'tan API'ye erişim olan ortamda `--mode both` ile aynı testi koşar)
- `m3-test/ground-truth/*.json` — 6 fişin elle doğrulanmış cevap anahtarları
- `m3-test/results/karsilastirma.json` — alan alan karşılaştırma çıktısı
- Fotoğraflar ve `.env` (MiniMax anahtarı) git'e girmez (`.gitignore`)
