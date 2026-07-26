# ÖNERİ — ground-truth kalemlerine unit + vatRate (ONAY BEKLİYOR)

Kaynak: `m3-test/photos/*.jpeg` fotoğraflarının doğrudan incelenmesi (model
çıktısı KULLANILMADI — cevap anahtarını model dolduramaz). Her fişte iki
bağımsız kanıt arandı: (1) kalem satırındaki basılı % işareti ve varsa
miktar/birim çarpan satırı, (2) fiş altındaki KDV döküm bloğunun aritmetiği
(oran → KDV dahil toplam, kalemlerle çapraz sağlama).

Birim kuralı (fiş formatının doğası): tartılı satış HER ZAMAN "x,xxx kg X
birim-fiyat" çarpan satırı basar; çarpan satırı olmayan kalem 1 birim
ambalajdır → "adet". Adetli çoklu satışta "N ad X fiyat" / "N x fiyat TL/ad"
satırı bulunur.

"?" işareti: emin olunamayan değer. Bu turda **0 adet** — gerekçe: tüm
fotoğraflar okunaklı ve 6/6 fişte KDV döküm bloğu kalem oranlarını kuruşuna
kadar doğruladı. Yine de üç kalem "dikkat" notuyla işaretlendi (aşağıda).

---

## bim.json (3 kalem) — KDV dökümü teyidi: %1→125,00 · %20→124,00 ✓

| # | Kalem | qty | unit | vatRate | Fotoğraftaki kanıt |
|---|---|---|---|---|---|
| 0 | CBK-TOPTNEPEYNIR250G | 1 | adet | 1 | satırda `%1.` basılı |
| 1 | TUVALET KAGIDI 16LI | 1 | adet | 20 | satırda `%20` |
| 2 | ALISVERIS POSETI BIM | 1 | adet | 20 | satırda `%20` |

## migros.json (6 kalem) — KDV dökümü: %1→199,90 · %10→147,50 · %20→13,90 ✓

| # | Kalem | qty | unit | vatRate | Kanıt |
|---|---|---|---|---|---|
| 0 | COCA-COLA ZERO 450 | 1 | adet | 10 | satırda `%10` |
| 1 | LIPTON ICE TEA KARPZ | 1 | adet | 10 | `%10` |
| 2 | COCA-COLA ZERO 330 | 1 | adet | 10 | `%10` |
| 3 | MIGROS ISLAK HAVLU | 1 | adet | 20 | `%20` |
| 4 | M&M'S FISTIKLI DRAJE | 1 | adet | 1 | `%1` — **DİKKAT 1** |
| 5 | M&M'S FISTIKLI DRAJE | 1 | adet | 1 | `%1` — **DİKKAT 1** |

**DİKKAT 1:** Şekerlemede %1 beklenmedik olabilir ama fiş iki yerde de %1
diyor: kalem satırı VE döküm (%1 → KDV'li toplam 199,90 = tam 2×99,95).
Öneri fişe sadıktır.

## bildirici.json (9 kalem) — döküm: %01→791,80 · %10→142,85 · %20→376,35 ✓

| # | Kalem | qty | unit | vatRate | Kanıt |
|---|---|---|---|---|---|
| 0 | MARKET POSET | 3 | adet | 20 | üst satır `3 ADx 1,00`, `%20` |
| 1 | ELMA KG STARKING 1 | 1.496 | kg | 1 | üst satır `1,496 KGx 94,95`, `%01` |
| 2 | ULUDAG 1LT LIMONATA | 1 | adet | 10 | `%10`, çarpan satırı yok |
| 3 | PINAR 430GR SOSIS EK | 1 | adet | 1 | `%01` |
| 4 | CITIR EKMEK 7LI SAND | 1 | adet | 1 | `%01` |
| 5 | BEYPAZARI 6X200ML SO | 1 | adet | 1 | `%01` |
| 6 | GILL BLUE III 3 ADET | 1 | adet | 20 | `%20` — **DİKKAT 2** |
| 7 | DURU 4*150GR SAB.OKY | 1 | adet | 20 | `%20` |
| 8 | DIMES 1LT MEY.SUYU S | 1 | adet | 10 | `%10` |

**DİKKAT 2:** Üründeki "3 ADET" ambalaj içeriğidir (3'lü bıçak paketi);
fişte çarpan satırı yok, tek fiyat 168,60 → qty 1, unit adet.

## gimsa.json (17 kalem) — döküm: %1→1260,30 · %10→128,50 · %20→3,00 ✓

| # | Kalem | qty | unit | vatRate | Kanıt |
|---|---|---|---|---|---|
| 0 | POSET | 3 | adet | 20 | `3 AD *1,00-B`, `%20` |
| 1 | COCA COLA ZERO 1 LT | 1 | adet | 10 | `1 AD`, `%10` |
| 2 | NUTELLA GO | 1 | adet | 1 | `1 AD`, `%01` |
| 3 | NUTELLA GO | 1 | adet | 1 | `1 AD`, `%01` |
| 4 | NUTELLA GO | 1 | adet | 1 | `1 AD`, `%01` |
| 5 | CIX BUBBLE TEA SEFTALI 300 ML | 1 | adet | 10 | `1 AD`, `%10` |
| 6 | RAMAZAN PIDESI GIMSA 200 GR | 1 | adet | 1 | `1 AD`, `%01` |
| 7 | EKER MEYVELI YOGURT 65 GR SEF-KAY. | 1 | adet | 1 | `1 AD`, `%01` |
| 8 | NUTELLA GO | 1 | adet | 1 | `1 AD`, `%01` |
| 9 | KURU PASTA NORMAL | 0.542 | kg | 1 | `0,542 KG *199,00-B`, `%01` |
| 10 | EKER MEYVELI YOGURT 65 GR SEF-KAY. | 1 | adet | 1 | `1 AD`, `%01` |
| 11 | ICLI KOFTE | 1.034 | kg | 1 | `1,034 KG`, `%01` — **DİKKAT 3** |
| 12 | KINDER PINGUI 4 LU 120 GR | 1 | adet | 1 | `1 AD`, `%01` |
| 13 | TRILECE TATLISI | 0.588 | kg | 1 | `0,588 KG`, `%01` |
| 14 | ATOM | 0.21 | kg | 1 | `0,21 KG`, `%01` |
| 15 | ACUKA KAHVALTILIK | 0.244 | kg | 1 | `0,244 KG`, `%01` |
| 16 | CIX BUBBLE TEA ANANAS 300 ML | 1 | adet | 10 | `1 AD`, `%10` |

**DİKKAT 3:** Ek 5 gözle kontrolünde model İÇLİ KÖFTE'ye 10 demişti; fiş
%01 diyor ve döküm teyit ediyor (%10 bloğu = 128,50 = yalnız Cola + 2×Bubble
Tea). Fiş kazanır.

## a101.json (21 kalem) — döküm: %20→900,00 · %1→1.264,50 ✓

| # | Kalem | qty | unit | vatRate | Kanıt |
|---|---|---|---|---|---|
| 0 | KOPUK SABUN 400 ML ZEYTINYAGLI | 1 | adet | 20 | satır sonunda `%20` |
| 1 | KOPUK SABUN 400 ML BEYAZSABUN | 1 | adet | 20 | `%20` |
| 2 | SAMPUAN 330ML MENTOL HEADSHOUL | 1 | adet | 20 | `%20` |
| 3 | KOPUK SABUN 400 ML MANOLYA AQU | 1 | adet | 20 | `%20` |
| 4 | TIRAS BICAGI 10LU 3 BIC. SAMUR | 1 | adet | 20 | `%20` |
| 5 | ALISVERIS POSETI | 6 | adet | 20 | üst satır `6 x1,00 TL/ad`, `%20` |
| 6 | UN BUGDAY 2 KG SOKE GELENEK | 1 | adet | 1 | `%01`; "2 KG" ambalaj boyu, çarpan satırı yok |
| 7 | PIRINC BALDO 1000 G OVADAN | 1 | adet | 1 | `%01` |
| 8 | CIKOLATA CUBUK 28 G NUTELLA GO | 1 | adet | 1 | `%01` |
| 9 | CIKOLATA CUBUK 28 G NUTELLA GO | 1 | adet | 1 | `%01` |
| 10 | KEK CIKOLATA SOSLU 9X20 G BROW | 1 | adet | 1 | `%01` |
| 11 | BUZGULU COP TORBASI 15LI SPON | 1 | adet | 20 | `%20` |
| 12 | KEK CILEKLI 35 G ULKER KEKSTRA | 4 | adet | 1 | üst satır `4 x9,75 TL/ad`, `%01` |
| 13 | DOND. MAG MN 7LI BDM/DBL KDT 3 | 1 | adet | 1 | `%01` |
| 14 | KEK FRAMBUAZLI 114 G ETI TARTI | 1 | adet | 1 | `%01` |
| 15 | SUT YAGLI 200 ML PINAR | 1 | adet | 1 | `%01` |
| 16 | SUT YAGLI 200 ML PINAR | 1 | adet | 1 | `%01` |
| 17 | GRISSINI TAMBUGDAYCIYATOHUMLU | 1 | adet | 1 | `%01` |
| 18 | ZEYTINYAGI SIZMA 1L YALIN EGEM | 1 | adet | 1 | `%01`; "1L" ambalaj boyu |
| 19 | SIVI DET. RENKLI 2,97 L PERWOL | 1 | adet | 20 | `%20`; "2,97 L" ambalaj boyu |
| 20 | SU 1.5 L | 6 | adet | 1 | üst satır `6 x11,50 TL/ad`, `%01` |

## file.json (23 kalem) — döküm: %1→2.940,97 · %10→60,00 · %20→60,00 ✓

| # | Kalem | qty | unit | vatRate | Kanıt |
|---|---|---|---|---|---|
| 0 | ITHAL MUZ | 1.178 | kg | 1 | `1.178 kg X 99.90`, `%1.` |
| 1 | ALISVERIS POSETI | 7 | adet | 20 | `7 ad X 1.00`, `%20` |
| 2 | MISIR ADET | 10 | adet | 1 | `10 ad X 20.90`, `%1.` |
| 3 | PIL.FILETO KG SENPLC | 0.822 | kg | 1 | `0.822 kg X 289.00`, `%1.` |
| 4 | SUTAS YOGURT 1000 G | 1 | adet | 1 | `%1.`, çarpan yok |
| 5 | HARRAS RUL TERYG 1KG | 1 | adet | 1 | `%1.`, çarpan yok; "1KG" ambalaj |
| 6 | PINAR YAGLI SUT 1LT | 2 | adet | 1 | `2 ad X 79.50`, `%1.` |
| 7 | TARLA KABAK | 1.12 | kg | 1 | `1.12 kg X 59.90`, `%1.` |
| 8 | YABAN MERSINI 300 GR | 1 | adet | 1 | `%1.` |
| 9 | FELIX TON BALIK 85 G | 1 | adet | 20 | `%20` (mama) |
| 10 | FELIX TAVUKLU 85 G | 1 | adet | 20 | `%20` |
| 11 | DANA ORTAYAGLI KUSB. | 0.692 | kg | 1 | `0.692 kg X 795.00`, `%1.` |
| 12 | EKS KRM SG 55G ZUBER | 1 | adet | 1 | `%1.` |
| 13 | SAC YUFKASI 1000G | 1 | adet | 1 | `%1.`, çarpan yok |
| 14 | BOREK KG | 0.158 | kg | 1 | `0.158 kg X 375.00`, `%1.` |
| 15 | YUMURTA 15LI ABALICI | 1 | adet | 1 | `%1.` |
| 16 | YBN MRSNLI KEFIR 250 | 2 | adet | 1 | `2 ad X 49.00`, `%1.` |
| 17 | SADE BAGET 250G | 1 | adet | 1 | `%1.` |
| 18 | BAHARATLI 160G LAYS | 1 | adet | 1 | `%1.` |
| 19 | CIKO.BEYAZ 70G ULKER | 2 | adet | 1 | `2 ad X 92.50`, `%1.` |
| 20 | SEFTALI | 0.728 | kg | 1 | `0.728 kg X 89.90`, `%1.` |
| 21 | COCA COLA ZERO 1L | 1 | adet | 10 | `%10` (döküm: %10 bloğu tam 60,00) |
| 22 | PATLAMIS MISIR 150 G | 1 | adet | 1 | `%1.` |

---

## Özet

- 79 kalem: **79 öneri, 0 adet "?"** — her değer fotoğraftaki basılı satıra
  dayanıyor ve 6/6 fişte KDV döküm bloğu aritmetiğiyle çapraz doğrulandı.
- Onay sırasında özellikle bakılması önerilen 3 nokta: DİKKAT 1 (M&M %1),
  DİKKAT 2 (GILL BLUE "3 ADET" adı), DİKKAT 3 (İÇLİ KÖFTE %01, model 10 demişti).
- Onay sonrası bu tablolar `ground-truth/*.json` dosyalarına işlenecek;
  bu dosya o zamana kadar tek referans.
