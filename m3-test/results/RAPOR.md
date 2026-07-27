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

## Ek — 2000px denemesi ve süre kaydı düzeltmesi (26 Tem 2026)

Uzak çekim toleransı için `max_edge` geçici olarak 2000px'e çıkarıldı ve 6 fişlik
regresyonda geri alındı. O koşuda anılan **480,7 sn (File)** ve **246,5 sn (A101)**
rakamları tek çağrı süresi DEĞİL, timeout'a takılan denemeler dahil retry'lı
toplamlardır — yukarıdaki tablodaki tek-çağrı süreleriyle karşılaştırılamaz.
Karar: 1400px'e dönüldü; backend'e adaptif plan eklendi (1. deneme 1400px/120 sn,
timeout/ağ hatasında 2. deneme 1000px/90 sn). Boyut-mu-ürün-sayısı-mı sorusunun
kontrollü ölçümü ayrıca yapılmaktadır.

## Ek 2 — Gecikme ölçümü: süreyi ne belirliyor? (26 Tem 2026)

File (23 ürün) ve A101 (21 ürün), 1400px ve 2000px'te 3'er kez, SERİ ve tek
çağrıyla (600 sn timeout, retry'sız) ölçüldü. Bulgular:

1. **Süre ≈ çıktı uzunluğu.** Başarılı 9 koşuda süre, `completion_tokens` ile
   güçlü korelasyonlu (~100-150 token/sn); 28,4 sn ↔ 3 955 token'dan
   182,4 sn ↔ 24 000 token'a. Aynı fiş, aynı boyut, temperature 0'da bile
   token sayısı 4-6 kat savruluyor — belirleyici, modelin koşudan koşuya
   değişen reasoning uzunluğu.
2. **Görüntü boyutunun etkisi yok.** 1400 ve 2000px süre aralıkları tamamen
   iç içe (JPEG farkı da yalnız %15). Boyutla oynamak yanlış koldu.
3. **Tek çağrı güvenilirliği düşük: 12 koşudan 7 kullanılabilir sonuç.**
   3 koşu timeout/bağlantı kesilmesine takıldı (600 sn sınırımızdan çok önce —
   sağlayıcı tarafı kesintisi olası), 2 koşu token tavanına çarptı.
4. **Token tavanı (24 000) sessiz başarısızlık üretiyor:** finish_reason=length
   ile JSON kırpık geliyor; parse edilemiyor. "Yavaş fiş" ile "bozuk yanıt"
   aynı kök nedenin iki yüzü. (Backend artık finish_reason=length ve JSON
   hatasında da retry ediyor — kova 4.)

Sonuç: gerçek kaldıraç görüntü değil, modelin reasoning üretimini kısmak
(thinking parametresi / sıcaklık) veya akışı yönetmek (streaming).

## Ek 3 — Varyant ölçümü: thinking kapalı vs temperature 0.3 (26 Tem 2026)

A101 + File, 1400px, her varyantta 3'er koşu, SERİ. Karşılaştırma tabanı:
temp 0.0 + thinking adaptif (Ek 2'deki 1400px koşuları).

| Varyant | Fiş | Süre | completion_tokens | Başlık | Fiyat isabeti |
|---|---|---|---|---|---|
| thinking_off | A101 | 8,2–9,9 sn | 764–780 | 3/3 ×3 | 18/21 ×3 |
| thinking_off | File | 6,2–8,7 sn | 727–754 | 3/3 ×3 | 18–21/23 |
| temp 0.3 | A101 | 87,9–92,2 sn | 10 035–11 383 | 3/3 ×3 | 21/21 ×3 |
| temp 0.3 | File | 149,5 sn; 2 koşu TIMEOUT | 20 605; — | 3/3; — | 19/23; — |

**Çürüyen hipotez (kayda değer — yeniden denenmesin):** "24 000 token'a
çarpan koşular tekrar döngüsüdür, sıcaklık artınca kaybolur" doğrulanMAdı.
temp 0.3, File'da 3'er denemeli iki koşuyu üst üste timeout'a sürükledi;
A101'de token ~10k'ya oturdu ama süre hâlâ ~90 sn. Sıcaklık çözüm değil.

**thinking_off bulgusu:** süre 10-20× düşüyor (≈8 sn, timeout sıfır, token
727–780 bandında neredeyse deterministik), başlıklar kusursuz — AMA fiyat
isabeti %100 → %86-91. Kritik nüans (ek doğrulama çağrısıyla ölçüldü):

- File'da hatalar toplamı bozuyor (fark 445,50) → aritmetik kontrol yakalar.
- A101'de model fiyatları kalemler ARASINDA kaydırıp iç tutarlılığı koruyor
  (sum = totalAmount = 2164,50) → **aritmetik kontrol kör; yanlış veri
  sessizce enflasyon serisine girer.**

Karar (Savaş): yayın konfigürasyonu değişmedi, thinking AÇIK kalıyor.
thinking_off'un hata deseni (yanlış kalem kümesi koşular arasında sabit mi
değişken mi) ve hizalama-kuralı prompt varyantı ölçülüyor; Aşama 3 kapanışı
bu karara bağlı.

## Ek 4 — thinking_off hata deseni: küme değişken, hizalama kuralı elendi (26 Tem 2026)

2 varyant × A101 + File × 5 koşu (thinking_off, 1400px, temp 0). Sorular ve cevaplar:

**Yanlış kalem kümesi koşular arasında sabit mi?** DEĞİŞKEN — iki hata sınıfı ayrışıyor:
- *Kayma hataları* (komşu satır fiyatının yazılması; enflasyonu bozan büyük sapmalar)
  koşudan koşuya farklı kalemlerde. A101'de 5 koşunun 3'ü tamamen temiz.
- *Tutarlı okuma hataları* (File: PINAR SÜT 158↔159 5/5, HARRAS 498↔499) her koşuda
  aynı — görüntü okunaklılık sınırı, ±1 TL gürültü.
- Sonuç: iki paralel thinking_off çağrısı + kalem karşılaştırması BÜYÜK hataları
  yakalar (değişken taraf), tutarlı ±1 hatalarına kördür. Yol açık; karar bekliyor.

**Hizalama kuralı ("fiyatı aynı satırdaki tutardan oku") işe yaradı mı?** HAYIR —
elendi. A101'de fark yok; File'da kötüleşme: 13 kalemlik kayma zinciri (koşu 3),
yeni null fiyatlar, aritmetik fark 302-778. Kural modeli düzeltmek yerine
"göremiyorsan null yaz"a itti.

**Bonus:** bu sette aritmetik kontrol hatalı 10 koşunun 10'unu yakaladı (fark
2,0-778,0). Ek 3'teki "iç tutarlı sessiz kayma" tekrarlamadı — gerçek ama nadir
(~11 hatalı koşuda 1 gözlem).

## Ek 5 — KARAR ve KABUL TESTİ: çift-paralel thinking_off (26 Tem 2026)

**Karar (Savaş, A seçeneği):** yayın akışı çift-paralel thinking_off + iki
katmanlı doğrulamaya geçti. Mimari: iki bağımsız M3 çağrısı eşzamanlı;
kalemler sıra→bulanık eşleştirmeyle karşılaştırılır, ad/miktar/fiyat
uyuşmazlığı kalemi, sayı/toplam uyuşmazlığı fişi needsReview yapar; sunulan
yanıt aritmetiği tutan (yoksa ilk gelen); tek çağrı düşerse zarif bozulma
(diğeri + fiş needsReview). Timeout planı (1400px, 45sn)+(1000px, 45sn).

**Kabul testi:** 6 fiş × 5 koşu = 30 gerçek endpoint çağrısı:

| Sınıf | Adet |
|---|---|
| (a) Tamamen doğru | **22/30** (12 bayraksız + 10 yanlış-alarmlı) |
| (b) Hata var, katmanlar YAKALADI | **8/30** |
| (c) Hata var, SESSİZ geçti | **0/30** ✓ |

Ortalama uçtan uca süre **6,7 sn** (3,4–11,7) — thinking'li tek çağrının
90-150 sn'sine karşı ~15-20×. En dağınık fiş (File) 5/5 koşuda hatalıydı
ama 5'inde de yakalandı; ±1 TL çekirdeği (PINAR 158↔159) dahil.

Not: 10/30 koşuda fiş doğruyken kalem bayrağı çıktı (yanlış alarm) —
kullanıcı birkaç doğru kalemi teyit etmek zorunda kalıyor; güvenliğin
bilinçli bedeli.

**AŞAMA 3 KAPANDI** — kriter (c=0) karşılandı, Savaş onayı verildi (26 Tem 2026).

## Ek 6 — Bayrak daraltma ayarı: güvenlik korundu, yanlış alarm yapısal (26 Tem 2026)

Ayar: yalnız AD farkı (miktar+fiyatlar aynı) artık kalemi bayraklamıyor;
iki addan iyisi seçiliyor (Türkçe karakterli > uzun). Kabul testi tekrarı
(6 fiş × 5 koşu):

| Metrik | Önce (Ek 5) | Sonra |
|---|---|---|
| (c) SESSİZ | 0/30 | **0/30** ✓ (geri alma gerekmedi) |
| (b) yakalandı | 8/30 | 7/30 |
| Yanlış alarm | 10/30 | **10/30 — DÜŞMEDİ** |
| Ortalama süre | 6,7 sn | 7,6 sn |

**Neden düşmedi — bayrak anatomisi:** yanlış alarmların kaynağı ad farkı
değilmiş:
- A101 5/5 koşuda TAM 4 kalem işaretli (fiş bayrağı yok) — sistematik desen;
  büyük olasılıkla çok adetli kalemlerde iki çağrının unitPrice temsili
  farklı (None ↔ dolu). Olası iyileştirme: unitPrice karşılaştırmasını
  "ikisi de doluysa" ile sınırlamak (totalPrice zaten karşılaştırılıyor).
- GİMSA'da fiş-seviyesi bayrak (kalem sayısı/total uyuşmazlığı) — karşı
  çağrının GERÇEK hatasının gölgesi: seçilen yanıt doğru, öteki hatalı,
  uyuşmazlık dürüstçe işaretleniyor. Bu, çift-çağrı mimarisinin yapısal
  bedeli; ancak üçüncü çağrı (oylama) veya bayrak gevşetme (güvenlik
  riski) ile azalır.

Ad-seçim iyileştirmesi yine de kazanç: ürün adları artık iki çağrının
iyisinden (Türkçe karakterli) geliyor — dedup borcuna küçük iyileşme.

## Ek 7 — unitPrice değer-karşılaştırması: sistematik desen kırıldı, taban yapısal (26 Tem 2026)

Ayar: unitPrice çapraz kontrolü temsile değil DEĞERE (etkin birim fiyat =
unitPrice ?? totalPrice/quantity); biri hesaplanamıyorsa bu alandan bayrak yok.

| Metrik | Ek 6 | Sonra |
|---|---|---|
| (c) SESSİZ | 0/30 | **0/30** ✓ (ayar kalıyor) |
| (b) yakalandı | 7/30 | 8/30 |
| Yanlış alarm | 10/30 | **10/30** |
| Ortalama süre | 7,6 sn | 7,1 sn |

Toplam sayı değişmedi AMA hedeflenen desen giderildi: A101'in her koşuda
"tam 4 kalem" sistematik sahte bayrağı kırıldı (artık 2/8/5/2/2 — değişken).
Kalan alarmlar karşı çağrının GERÇEK hatalarının gölgesi (nondeterminizm her
koşuda birkaç kalemde farklı değer üretiyor; doğru yanıt seçiliyor ama
uyuşmazlık dürüstçe işaretleniyor). Bu ~%30 taban çift-çağrı mimarisinin
yapısal bedeli; ancak 3. çağrı/oylama (maliyet) veya bayrak gevşetme
(güvenlik riski) ile düşer. Mevcut denge kabul edildi.

## Ek 8 — unit/vatRate prompt genişletmesi kabul testi (26 Tem 2026)

Prompt commit'i `a390372` (uzunluk 1328 → 1812 karakter, +%36). Aynı düzen:
6 fiş × 5 koşum = 30 gerçek endpoint çağrısı (`acceptance_dual.py`).

### Ana tablo — regresyon kontrolü

| Metrik | Ek 7 (taban) | Şimdi | Kural | Sonuç |
|---|---|---|---|---|
| (c) SESSİZ hata | 0/30 | **0/30** | 0 olmak zorunda | ✓ GEÇTİ |
| (b) yakalanan hata | 8/30 | **6/30** | 6-10 arası normal | ✓ bandın içinde |
| Yanlış alarm | 10/30 | **8/30** | ≤13/30 | ✓ yükselmedi, düştü |
| Ortalama süre | 7,1 sn | **6,5 sn** | ≤8,5 sn | ✓ GEÇTİ |

**Süre yorumu:** +%36 prompt'a rağmen süre DÜŞTÜ (6,5 sn; min 3,5, max 14,8).
thinking_off'ta süreyi çıktı uzunluğu belirliyor (Ek 2); +484 karakterlik
girdi artışının etkisi koşumlar arası doğal varyansın içinde kayboluyor.
Prompt kısaltması gerekmiyor.

### Yeni metrikler — ilk ölçüm (394 kalem üzerinden)

| Yeni metrik | Değer | Hedef | Sonuç |
|---|---|---|---|
| unit dolu oranı | **372/394 = %94,4** | ≥ %90 | ✓ GEÇTİ |
| vatRate dolu oranı | **347/394 = %88,1** | fişte basılıysa dolmalı | aşağıda |
| çelişkiden boşalan | unit **22 (%5,6)**, vatRate **30 (%7,6)** | > %10 ise kararsız | ✓ ikisi de eşik altı |

**vatRate fiş bazında:** A101/Bildirici/BİM/Migros **%100** — oranın net
basıldığı fişlerde tam doluluk. File %70, GİMSA %85: eksikler okunaksız
satırlar + çelişki boşaltmaları; uydurma yerine null tercih edildiği için
beklenen dürüst boşluk.

**unit boş kalan 22 kalem:** çoğunluğu File'ın bilinen sorunlu satırları
(HARRAS, PINAR SÜT vb. 16 vaka) + A101'de ambalajı litreli deterjan/yağ
satırları. Çelişki çiftlerinin dağılımı öğretici: 14/22'si `kg ↔ adet`
(tartılı üründe çağrılardan biri adet diyor); ambalaj tuzağı (`adet ↔ lt`)
yalnız 4 vaka — prompt'taki "SUT 1 L → adet" kuralı büyük ölçüde çalışıyor.

**Karar:** tüm zorunlu kurallar geçti; prompt commit'i KALIYOR. unit doluluk
hedefi aşıldı (%94,4); boş kalanlar uydurulmamış dürüst boşluk.

## Ek 9 — unit/vatRate: doluluk değil DOĞRULUK (28 Tem 2026)

**Gerekçe:** Ek 8 yalnız doluluk saydı (unit %94,4, vatRate %88,1) — dolu bir
alan yanlış da olabilir ve yanlışlar, iki çağrının anlaştığı durumda çapraz
kontrole yakalanmaz. Blok 7-D'de cevap anahtarına giren unit/vatRate ile artık
doğruluk ölçülebilir. Ek 8'in KAYDEDİLMİŞ ham çıktısı puanlandı
(`puanla-dogruluk.py`); yeni API çağrısı yapılmadı.

### İki eşleme modunda sonuçlar (yalnız ada göre eşleşen kalemler puanlanır)

| Mod | Eşleşme | unit D/Y/B | vatRate D/Y/B |
|---|---|---|---|
| dar (upper+trim+boşluk+KDV-eki) | 230/394 (%58,4) | %89,1 / %5,2 / %5,7 | %80,0 / %10,0 / %10,0 |
| genis (+TR katlama, noktalama) | 286/394 (%72,6) | %87,1 / %5,9 / %7,0 | %77,3 / %11,5 / %11,2 |

Fark (dar→genis): eşleşme +14,2 puan; unit DOĞRU −2,0, YANLIŞ +0,7, BOŞ +1,3;
vatRate DOĞRU −2,7, YANLIŞ +1,5, BOŞ +1,2 puan.

### Fiş bazında ayrışma

A101, Bildirici, BİM, Migros: vatRate **%100**, unit ≥%93,8 (her iki modda).
Tüm yanlışlar **File** (genis: unit %56,8 / vatRate %43,2 doğru) ve **GİMSA**
(unit %100 / vatRate %71,2) fişlerinde toplanıyor — sorun modelin KDV
kavrayışı değil, bu iki fişin baskı/çekim kalitesi.

### %1→%10 sistematiği

Karışıklık dökümünün ezici deseni `1 → 10` (dar 19/23, genis 25/33) —
`%01` / `%1.` yazımının `%10` okunması. En ısrarcılar: SUTAS YOGURT (5 koşum,
genis), KINDER PINGUI (4), TARLA KABAK %1→%20 (3), YABAN MERSINI %1→%20 (3).
Tam liste betik çıktısında (dar modda 14 tekil çift).

### Ad eşleşmesi ve ürün birleştirme

Dar modda kalemlerin %41,6'sı, genis modda %27,4'ü cevap anahtarıyla ada göre
eşleşemiyor. Eşleşmeyen örnekler (K.PEK / K•P•K ↔ KOPUK, HEADSHOULX20 eki,
P.RONE ↔ PIRINC) karakter temizliğiyle çözülmeyen ad varyansları.
`findOrCreateProduct` ada göre birleştirdiği için aynı varyans üretimde fiyat
serilerini bölecektir — ürün birleştirme (Aşama 5) için ilk ölçülmüş taban:
karakter temizliği sonrası bile ~%27 kayıp.

### ALINAN KARARLAR

1. Prompt'a %1/%10 kuralı EKLENMEYECEK. Sebep: hata 6 fişin
   2'sinde toplanmış; iki fişlik örnekleme prompt yazmak
   ezberletmektir. Yeni prompt = yeni kabul turu.
2. Yapısal çözüm Adım 3'e taşındı: model fişin KDV döküm
   bloğunu da çıkaracak, sunucu kalem gruplarının toplamını
   blokla karşılaştıracak, tutmayan kalemler needsReview.
   Bu, iki çağrının aynı yanlışta anlaşmasına KÖR DEĞİLDİR.
3. Ad eşleşme varyansı, ürün birleştirme işinin sanılandan
   zor olduğunun ilk ölçülmüş kanıtıdır. Aşama 5 planına girdi.

### Ek 9 — ek not: gerçek doğruluk tahmini

Genis moda geçişte yeni eşleşen 56 kalem, önceki 230 kalemden
düşük puan aldı: unit ~%79 (önceki %89), vatRate ~%66 (önceki
%80). Adı zor okunan kalem alanları da daha yanlış çıkarıyor;
ortak kök neden baskı/çekim kalitesi. Hâlâ eşleşmeyen 108 kalem
en az bu kadar zor olduğundan, 394 kalemin tamamı üzerinden
gerçek vatRate doğruluğu %77'nin ALTINDA, tahminen %72-75.

Sonuç: şema tasarımında vatRate ve unit "doğrulanmış" alan
olarak ele ALINMAYACAK; kaynağı ve doğrulanma durumu ayrıca
tutulacak (Adım 2 girdisi).

Ayrıca: SAMPUAN...HEADSHOULX20 örneğinde KDV eki ada yapışıyor
(% okunamayınca strip_kdv_suffix devreye girmiyor). Kör kuralla
düzeltilemez — "X20" 20'li ambalaj da olabilir. Çözüm yine Ek 9
karar 2'ye bağlı: kalemin gerçek oranı bilinirse sondaki sayının
vergi mi ambalaj mı olduğu ayırt edilebilir.

## Dosyalar

- `m3-test/run_test.py` — izole test aracı (sandbox'tan API'ye erişim olan ortamda `--mode both` ile aynı testi koşar)
- `m3-test/ground-truth/*.json` — 6 fişin elle doğrulanmış cevap anahtarları
- `m3-test/results/karsilastirma.json` — alan alan karşılaştırma çıktısı
- Fotoğraflar ve `.env` (MiniMax anahtarı) git'e girmez (`.gitignore`)
