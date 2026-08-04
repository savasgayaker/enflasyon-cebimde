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

## Ek 10 — Docker kabini + jetonlu uçtan uca kabul testi (3 Ağu 2026)

**Gerekçe:** Aşama 4 Adım 3'te sunucuya kimlik doğrulama eklendi (`76b5ffc`),
istemci jeton göndermeye başladı (`9a3b03b`), kabul testi jetonu kendisi alır
hale getirildi (`cdb3884`) ve servis Docker kabinine taşındı (`9bbc4fc`).
Bunların hiçbiri model doğruluğunu değiştirmemeli — ama kabin farklı bir Python
(3.11-slim) ve farklı kütüphane sürümleri demek. Ek 8'in düzeni aynen
tekrarlandı: 6 fiş × 5 koşum = 30 gerçek çağrı, bu kez **kap üzerinden ve her
istek Bearer jetonuyla**.

### Ana tablo — regresyon kontrolü

| Metrik | Ek 8 (venv, jetonsuz) | Kap (jetonlu) | Kural | Sonuç |
|---|---|---|---|---|
| (c) SESSİZ hata | 0/30 | **0/30** | 0 olmak zorunda | ✓ GEÇTİ |
| (b) yakalanan hata | 6/30 | **7/30** | 6-10 arası normal | ✓ bandın içinde |
| Yanlış alarm | 8/30 | **10/30** | ≤13/30 | ✓ eşik altı |
| Ortalama süre | 6,5 sn | **5,1 sn** | ≤8,5 sn | ✓ GEÇTİ |
| Kimlik hatası (401/429) | — | **0/30** | 0 olmak zorunda | ✓ GEÇTİ |

**Süre yorumu — dikkat:** 6,5 → 5,1 sn düşüşü kaba MAL EDİLEMEZ. Kap aynı
MiniMax API'sine gidiyor ve araya bir ağ sıçraması daha ekliyor; model tarafını
hızlandıramaz. Fark uçta: maksimum 14,8 → 8,4 sn, yani uzun kuyruk kaybolmuş —
bu, sağlayıcı tarafındaki o günkü yük farkının imzası (Ek 2: süreyi çıktı
uzunluğu belirliyor). Doğru okuma: **kap süreyi bozmadı.**

### Fiş bazında hareket — gerileme değil, model kararsızlığı

| Fiş | Ek 8 hatalı koşum | Kap hatalı koşum |
|---|---|---|
| file | 5/5 | **3/5** |
| a101 | 0/5 | **2/5** |
| migros | 0/5 | **1/5** |
| gimsa | 1/5 | 1/5 |
| bim | 0/5 | 0/5 |
| bildirici | 0/5 | 0/5 |

Yönler karışık: bir fiş düzelirken iki fiş bozuluyor. Kaptan gelen bir gerileme
tek yönlü olurdu. Fiş başına 5 koşum bu farkı ayırt edemeyecek kadar küçük bir
örneklem; toplam 7 hatalı koşum kabul kuralındaki 6-10 bandının içinde.

### Kalem düzeyi bayrak kapsaması

Hatalı kalemlerin kalem düzeyinde bayraksız kalma oranı %29'dan (14 kalemde 4)
**%18'e** (17 kalemde 3) indi. Küçük örneklem, ama yön doğru — ve bu oran zaten
güvenlik ağının İKİNCİ katmanı; birinci katman fiş düzeyi bayrak.

### migros 5. koşum — Ek 9 karar 2'nin ilk gerçek vakası

İki ölçümün toplam 13 hatalı koşumu içinde **fiş düzeyi bayrağın `False`
kaldığı tek koşum.** Hata yalnız kalem düzeyi `needsReview` sayesinde yakalandı.
Sebebi rastlantı değil:

| Kalem | Model | Doğru | Fark | KDV |
|---|---|---|---|---|
| LIPTON ICE TEA KARPZ | 97,50 | 47,50 | **+50,00** | %10 |
| M&M'S FISTIKLI DRAJE | 49,95 | 99,95 | **−50,00** | %1 |

İki hata fiş toplamında birbirini TAM olarak götürüyor. "Toplam tutuyor mu"
kontrolü bu fişi kusursuz sayardı. Ama kalemler farklı KDV gruplarında: %10
grubu 50 fazla, %1 grubu 50 eksik. **Ek 9 karar 2'de tarif edilen KDV bloğu
bazlı grup mutabakatı bu hatayı yakalardı.** Karar 2 böylece teorik gerekçeden
ölçülmüş gerekçeye terfi etti; Aşama 3.5 planındaki önceliği buna göre
okunmalı.

### Kimlik katmanı

30 koşumun 30'u geçerli Bearer jetonuyla gitti; 401/429 hiç görülmedi, betiğin
erken durdurma koruması tetiklenmedi. Jeton yenileme dahil kimlik katmanı ölçüm
boyunca şeffaf kaldı. (Canlı davranış matrisi ayrıca elle doğrulanmıştı:
jetonsuz → 401, sahte jeton → 401, geçerli jeton + boş dosya → 400.)

### Ölçülmeyen

Bu koşumun **parasal maliyeti kaydedilmedi** — koşum öncesi/sonrası MiniMax
bakiyesi not alınmadı. Fiş başına gerçek maliyet hâlâ AÇIK KALEM; bir sonraki
kabul turunda bakiye farkı mutlaka not edilmeli.

**Karar:** tüm zorunlu kurallar geçti. Kabin ve kimlik katmanı model
doğruluğunu bozmadı; `asama4-sunucu` dalı birleştirilebilir.

## Ek 11 — KDV grup mutabakatı pilotu: mekanizmanın yeri alarm değil ONARIM (4 Ağu 2026)

**Gerekçe:** Ek 9 karar 2, fişin altındaki KDV döküm bloğunu okuyup kalem
toplamlarıyla karşılaştırmayı öneriyordu. Aşama 3.5'te önce ucuz pilot koşuldu:
prompt'a `kdvBlok` alanı eklendi, 6 fiş × 1 koşum = 6 gerçek çağrı. Üretim
prompt'u (`backend/receipt_prompt.py`) DEĞİŞTİRİLMEDİ — pilot metni bellekte
genişletir, çapa metinleri bulunmazsa durur.

### Rejim uyarısı — ilk koşum (v1) geçersiz sayıldı

v1, `server.py`'nin gönderdiği `"thinking": {"type": "disabled"}` ayarını
göndermiyordu (`run_test.py`'den miras). Sonuç: a101 312 sn, file 3 denemede de
timeout. Bu **kdvBlok'a mal EDİLEMEZ**: 26 Tem'in kdvBlok'suz doğrudan-API
koşumları aynı rejimde a101 246,5 sn ve file 480,7 sn sürmüştü. Yavaşlığın
kaynağı istenen alan değil, açık bırakılan thinking. v2, `server.py`'nin
ayarlarıyla (thinking kapalı, max_tokens 24000, 1400→1000 px / 45 sn merdiveni)
yeniden koştu: 6/6 sonuç, timeout yok, toplam 10,4 sn.

### Ana tablo (v2, üretim rejimi)

| Fiş | Süre | Blok ↔ cevap anahtarı | Kalem toplamı ↔ blok | Taban çıkarım |
|---|---|---|---|---|
| bim | 3,8 sn | tam 2/2 | tutuyor | 3/3 ✓ |
| migros | 4,2 sn | tam 3/3 | tutuyor | 6/6 ✓ |
| bildirici | 5,0 sn | 2 tam / 1 sapan (0,20) | sapma 0,20 | 9/9 ✓ |
| gimsa | 6,9 sn | tam 3/3 | sapma 99,00 | 17/17 ✓ |
| file | 8,6 sn | tam 3/3 | %1 grubu ölçülemiyor | 21/23 |
| a101 | 10,2 sn | 2 sapan (±364,50) | sapma 364,50 | 21/21 ✓ |

Blok 6/6 okundu, 4/6 kuruşuna tam, grup düzeyinde 13/16. Taban çıkarım
bozulmadı — yeni alan eklenmesi kalem/fiyat isabetini düşürmedi.

### Sapmanın dört ayrı kaynağı — ve kaçı gerçek

Ham mutabakat "4/6 fişte sinyal" veriyor. Sinyallerin anatomisi ayrıştırıldığında
tablo tersine dönüyor:

- **a101 — etiket takası, YANLIŞ ALARM.** Model bloğu `{%20: 1264,50, %1: 900,00}`
  yazmış; fişte tersi basılı. Kalemler ise kusursuz (21/21 fiyat) ve grup
  toplamları cevap anahtarıyla birebir aynı. Yani hata kalemlerde değil, yalnız
  bloğun iki etiketinde. Kullanıcıya bayrak gitseydi tamamen yersiz olurdu.
- **bildirici — blok yanlış okundu, YANLIŞ ALARM.** %1 bloğu 791,80 yerine
  791,60 okunmuş; kalemler 9/9 doğru. Sapmanın suçlusu yine blok.
- **file — mekanizmanın katkısı YOK (tespitte).** Blok kuruşuna doğru; kalem
  toplamı 2.979,97 ≠ 3.060,97 çünkü iki fiyat yanlış (PINAR SÜT 159→158,
  ÇİKO 185→105). Bu farkı **mevcut aritmetik kontrol zaten yakalıyor**
  (`validate_and_flag`). Blok burada tespit değil, aşağıdaki onarımı sağlıyor.
- **gimsa — TEK GERÇEK YENİ YAKALAMA.** Kalem toplamı totalAmount'a tam uyuyor,
  yani mevcut kontrol kör; ama KINDER PİNGUİ (99,00) %10 grubunda dururken
  bloğa göre %1'de olmalı. Ek 9'un `%1→%10 sistematiği` bu.

Özet: 6 fişte ham mutabakat 4 sinyal üretir; bunların **2'si yanlış alarm,
1'i zaten yakalanan bir hata, 1'i gerçek yeni yakalama.**

### İki kapı — cevap anahtarı gerektirmeyen özdenetim

Yanlış alarmların ikisi de fiş üzerindeki bilgiyle ayıklanabiliyor:

| Kapı | Kural | Fişte tetiklenen |
|---|---|---|
| A | `sum(kdvBlok) == totalAmount` değilse blok şüphelidir, kullanılmaz | bildirici (1.310,80 ≠ 1.311,00) |
| B | Blok değerleri kalem gruplarının permütasyonu ise etiket takasıdır, blok kullanılmaz | a101 (aynı iki değer, ters etiket) |

Kapı A'nın gücü şu: bildirici'de kalem toplamı totalAmount'a tam uyuyor, blok
uymuyor — hangi tarafın yanlış olduğu **ölçülebiliyor**, tahmin edilmiyor.

### Onarım — mekanizmanın asıl değeri

Kapıları geçen blok, bayrak kaynağı değil veri kaynağı olarak kullanılır:

- **Onarım 1 — oran ithafı.** Blokta bir oran varken o orana hiç kalem
  atanmamışsa ve oransız kalemler varsa, o kalemler tek aday gruba yazılır.
  file'da **19 kalem** böyle oran kazanıyor (blok %1/%10/%20, kalemlerde yalnız
  %10 ve %20 dolu → boş kalan tek grup %1). Ek 9'un "vatRate doluluğu düşük"
  sorununa doğrudan cevap.
- **Onarım 2 — tek çözümlü taşıma.** Bir kalemin başka gruba taşınması
  mutabakatı sağlıyorsa ve bu çözüm TEK ise taşınır. gimsa'da 99,00 tutarlı
  kalem tek: KINDER PİNGUİ → %1. Birden çok aday varsa taşıma YAPILMAZ
  (alt-küme belirsizliği).
- Onarılan kalemlerde `vat_rate_source = 'kdv_blogu'`.
- **Bayrak yalnız** blok iki kapıyı da geçmiş, mutabakat tutmamış ve tek çözümlü
  onarım bulunamamışsa çıkar. Bu örneklemde **0/6** — yani mekanizma sıfır yeni
  yanlış alarmla 20 kalem oranı düzeltiyor ve mevcut kontrolün göremediği bir
  oran hatasını sessizce onarıyor.

### KARAR

1. KDV bloğu **alarm kaynağı değil, onarım kaynağıdır**. Ek 9 karar 2'nin
   "uyuşmazlık ⇒ needsReview" kurgusu bu ölçümle DEĞİŞTİRİLDİ: ham kural 6 fişin
   4'ünde tetiklenirdi ve bunların yarısı yersizdi (Ek 6'nın yanlış alarm
   bütçesi buna dayanmaz).
2. Kapı A ve Kapı B, blok kullanılmadan önce zorunludur.
3. Onarım 1 ve 2 uygulanır; belirsizse dokunulmaz.
4. Bayrak, yalnız yukarıdaki dar koşulda çıkar.

### Maliyet — Ek 10'un açık kalemi kapandı

| Fiş | Kalem | prompt tk | completion tk | toplam tk |
|---|---|---|---|---|
| bim | 3 | 3.122 | 172 | 3.294 |
| migros | 6 | 3.122 | 291 | 3.413 |
| bildirici | 9 | 3.122 | 420 | 3.542 |
| gimsa | 17 | 3.122 | 750 | 3.872 |
| file | 23 | 3.122 | 979 | 4.101 |
| a101 | 21 | 3.122 | 1.271 | 4.393 |

Çağrı başı 3,3–4,4 bin token; sabit 3.122'si görüntünün kendisi. Değişken kısım
**kalem sayısıyla** birlikte büyüyor — kdvBlok alanı çıktıya üç satır JSON
ekliyor, yani onlarca token mertebesinde. "Blok istemek token'ı katladı" okuması
bu veriyle desteklenmiyor; kdvBlok'suz aynı-rejim ölçümü yok, olsaydı fark
ölçülebilirdi.

### Ölçülmeyen / riskler

- n = 6, fiş başına tek koşum. Kapı B **tek gözleme** dayanıyor; a101'de
  kalemlerin doğru, bloğun yanlış olduğu doğrulandı ama bu genel bir kanıt değil.
  Bu yüzden Kapı B'de onarım da bayrak da yapılmaz, blok yalnızca atılır —
  en kötü durumda sinyal kaybedilir, veri bozulmaz.
- Onarımın DOĞRU veriyi bozup bozmadığı ölçülmedi. 30 koşumluk kabul turunda
  "onarım sonrası kalem oranı cevap anahtarına göre kötüleşti mi" ayrı metrik
  olarak izlenmeli.
- Süre: v2 ortalaması 6,5 sn, Ek 10'un 5,1 sn'sinin üstünde ve fiş bazında
  6/6'sında Ek 10'un 5 koşumluk maksimumunu aşıyor. Tutarlı bir kayma, ama iki
  ölçüm farklı yoldan geçiyor (kap + çift çağrı vs doğrudan tek çağrı), bu yüzden
  artış bloğa mal EDİLEMEZ. Temiz cevap için aynı betikle kdvBlok'lu/kdvBlok'suz
  A/B gerekir (12 çağrı) — tasarımı değiştirmediği için şimdilik açık bırakıldı.

## Dosyalar

- `m3-test/run_test.py` — izole test aracı (sandbox'tan API'ye erişim olan ortamda `--mode both` ile aynı testi koşar)
- `m3-test/ground-truth/*.json` — 6 fişin elle doğrulanmış cevap anahtarları
- `m3-test/results/karsilastirma.json` — alan alan karşılaştırma çıktısı
- `m3-test/results/ek8-acceptance-2026-07-26.json` — Ek 8 ham çıktısı (venv, jetonsuz taban)
- `m3-test/results/ek10-acceptance-2026-08-03.json` — Ek 10 ham çıktısı (kap, jetonlu)
- `m3-test/kdv-blogu-pilot.py` — Ek 11 pilot aracı (KDV bloğu çıkarımı, üretim rejimiyle)
- `m3-test/results/ek11-kdv-pilot-2026-08-04.json` — Ek 11 ham çıktısı (6 çağrı, prompt metni dahil)
- Fotoğraflar ve `.env` (MiniMax anahtarı) git'e girmez (`.gitignore`)

---

## Ek 12 — kdvBlok'lu prompt + mutabakat katmanının kabul turu (4 Ağustos 2026)

**Soru.** Aşama 3.5'te üretim prompt'una `kdvBlok` alanı eklendi ve KDV bloğu
mutabakatı (Kapı A/B + Onarım 1/2) koda girdi. Bu değişiklik fiş okuma
doğruluğuna zarar verdi mi; KDV oranı doğruluğunu gerçekten iyileştirdi mi?

**Yöntem.** Ölçüm aletine dokunulmadı: `acceptance_dual.py` ve `run_test.py`
Ek 10'daki hâliyle koştu. Yeni metrikler, diske yazılmış ham çıktının üstünde
çalışan ayrı bir puanlayıcıyla hesaplandı (`m3-test/puanla-kdv-oran.py`). Aynı
puanlayıcı Ek 10 arşivine de uygulandı — taban çizgisi yeniden ölçüldü, önceki
rapordan aktarılmadı. Bir değişikliği ölçtüğümüz turda ölçüm aletini de
değiştirseydik, farkın koddan mı aletten mi geldiğini bir daha ayıramazdık.
Kabul ölçütü tur **başlamadan** yazıldı ve sonuca göre değiştirilmedi.

### Sayılar

| metrik | Ek 10 (eski prompt, mutabakat yok) | Ek 12 (kdvBlok + mutabakat) |
|---|---|---|
| koşum | 30 | 30 |
| puanlanan kalem | 392 | 387 |
| KDV oranı doğru | 307 (%78.3) | 345 (%89.1) |
| KDV oranı **yanlış** | 46 (%11.7) | 13 (%3.4) |
| KDV oranı boş (null) | 39 (%9.9) | 29 (%7.5) |
| başlık (havuzlanmış) | 90/90 (%100.00) | 90/90 (%100.00) |
| ürün eşleşme (havuzlanmış) | 394/395 (%99.75) | 392/395 (%99.24) |
| fiyat doğru (havuzlanmış) | 378/395 (%95.70) | 370/395 (%93.67) |
| **başlık+kalem bileşik oranı** | %97.95 | %96.82 |
| fazladan kalem (teşhis, ölçüt değil) | 0 | 1 |
| sınıf dağılımı | {'A_dogru_bayrakli': 10, 'B_yakalandi': 7, 'A_dogru': 13} | {'A_dogru_bayrakli': 11, 'B_yakalandi': 6, 'A_dogru': 13} |
| süre ort / ortanca / en yüksek | 5.06 / 4.60 / 8.40 sn | 5.83 / 5.90 / 9.90 sn |
| eşleşmeyen (cevapta fazla / anahtarda eksik) | 2 / 3 | 6 / 8 |

### Fiş bazında (doğru / yanlış / boş)

| fiş | Ek 10 | Ek 12 |
|---|---|---|
| a101 | 103 / 0 / 2 | 102 / 0 / 0 |
| bildirici | 45 / 0 / 0 | 45 / 0 / 0 |
| bim | 15 / 0 / 0 | 15 / 0 / 0 |
| file | 63 / 29 / 23 | 78 / 7 / 27 |
| gimsa | 55 / 17 / 10 | 75 / 6 / 2 |
| migros | 26 / 0 / 4 | 30 / 0 / 0 |

### Kabul ölçütleri

- **yanlis oran artisi <= 1 puan** — GEÇTİ (%11.7 -> %3.4 (-8.4 puan))
- **dogru oran dusmemis** — GEÇTİ (%78.3 -> %89.1 (+10.8 puan))
- **baslik+kalem bilesik orani dusmemis** — KALDI (%97.95 -> %96.82 (-1.14 puan))
- **C_SESSIZ artmamis** — GEÇTİ (0 -> 0)
- Alt metrik uyarısı: bileşik oran geçse de şu metrik(ler) düştü: ürün eşleşme, fiyat doğru.

**Karar: RET.**

> **ÜSTÜ ÇİZİLMEDİ, ÜZERİNE YAZILDI:** Bu RET kararı Ek 12b (2026-08-04) ile geçersiz kılınmıştır — bkz. `## Ek 12b`. Ölçüt değiştirilmedi; aynı ölçüt, gün etkisini eleyen eşleştirilmiş bir tasarımla yeniden ölçüldü ve düşüşün aletin kendi gürültüsü içinde kaldığı görüldü.


### Mutabakatın saha davranışı

Kap günlüğünden (`results/ek12-kdv-gunluk-2026-08-04.txt`) sayılan durumlar: `kapi_a` 14, `kapi_b` 4, `belirsiz_oransiz` 3, `aritmetik_bozuk` 2, `uyusmazlik` 3.

Teşhisler Ek 11 pilotuyla aynı çıktı: `a101` permütasyon (Kapı B) ile, `bildirici`
blok toplamı tutmadığı için (Kapı A) elendi; iki fişte de kalemlere dokunulmadı.
`file`'da Onarım 1 iki koşumda çalıştı ve 19 kaleme %1 ithaf etti — cevap
anahtarındaki 19 adet %1'lik kalemle birebir. Diğer `file` koşumlarında durum
`belirsiz_oransiz` kaldı ve tasarım gereği dokunulmadı; `file`'ın boş sayısındaki
artış buradan geliyor. Bu bilinçli bir tercih: emin olunmayan yerde null bırakmak,
yanlış oran yazmaktan iyidir — yanlış oran sessizce yanlış enflasyon üretir.

### Düzeltmeler ve sınırlar

**Ek 11'in "0 yeni bayrak" ifadesi sahada birebir tutmadı.** Ek 11 altı *sabit*
model çıktısı üzerinde oynatılmıştı; canlıda çıktı koşumdan koşuma değişiyor ve
dar bayrak koşuluna düşen bir koşum çıkabiliyor. `gimsa`'da bir koşumda
`uyusmazlik` görüldü. Doğru ifade: **30 koşumda 1 yeni yanlış alarm (%3,3)**.

**Süre farkı nedensel olarak ölçülmedi.** İki tur farklı günlerde, farklı API
yükü altında koştu; Ek 10'un kendi içindeki dağılımı bile 4,6-8,4 sn arasında.
Ortalamadaki artış kaydedilmiştir ama `kdvBlok`'a atfedilemez. Bunu ayırmak için
park edilmiş 12 çağrılık A/B (kdvBlok'lu vs kdvBlok'suz, aynı oturumda,
dönüşümlü) gerekiyor. AÇIK KALEM.

**Eşleşmeyen kalem artışı denetlendi, puanlama artefaktı değil.** Dışarıda kalan
çiftler isim varyansından kaynaklanıyor (`KOLİYE SABUN` ↔ `KOPUK SABUN`,
`MISIR NIŞASTA 1000G` ↔ `MISIR ADET`, iki turda da görülen `COCA COLA` ↔ `POSET`
kayması). Bu kalemlerin oranları cevap anahtarıyla zaten uyumluydu; eşleşselerdi
"doğru" hanesine yazılacaklardı. Yani dışlama Ek 12'yi şişirmiyor, hafifçe eksik
gösteriyor. İsim varyansı Aşama 5'in (ürün birleştirme) girdisidir.

**Ölçüt 3 önce ölçülemedi — kaydı düşülüyor.** İlk değerlendirmede puanlayıcı
`score` alanını sayı sanıp süzdü; oysa `acceptance_dual.py` oraya `compare()`'in
özet dizesini yazıyor (`başlık 3/3, ürün eşleşme 21/21, ...`). Bu yüzden ölçüt 3
"değerlendirilemedi" düştü ve tümü-geçmeli mantık ilk turda RET üretti. Bu bir
gerileme bulgusu değil, ölçüm hatasıydı. Düzeltme ölçütü değiştirmek değil,
dizeyi ayrıştırıp ölçütü ölçülebilir kılmak oldu; havuzlanmış oran (koşum başına
ortalama değil) seçildi, çünkü kalem sayısı farklı fişleri eşit ağırlıklandırmak
tabloyu bozardı. Çözülemeyen koşum: Ek 10'da 0, Ek 12'de 0.

**Yöntemsel not.** Bu makinede Docker daemon saati ana makineden ~1 saat ileri;
`docker compose logs --since` bu yüzden boş döndü ve günlük filtresiz çekildi
(kabın tüm ömründeki POST sayısı 30 olduğu için pencere zaten yalnız bu tur).
Sonraki turlarda `--since`'a güvenilmemeli.

**`m3-test/kdv-blogu-pilot.py` artık tarihsel kayıttır.** Korumalı çapaları
değişmiş prompt'ta bulunmadığı için tasarımı gereği durur; yeniden koşturulmak
için değil, Ek 11'in nasıl ölçüldüğünü belgelemek için duruyor.

---

## Ek 12b — Eski kolun aynı gün tekrarı (gün etkisi testi)

**Tarih:** 2026-08-04 · **Ön kayıt:** `results/ek12b-on-kayit-2026-08-04.md` — koşum verisi
ÜRETİLMEDEN ÖNCE yazıldı ve push edildi (commit 89e1406). **Puanlayıcı:** `puanla_bilesik.py`,
**karar betiği:** `karar-ek12b.py` — ikisi de koşumdan önce yazıldı; ölçüm aletine
(`acceptance_dual.py`) dokunulmadı.

### Neden bu tur gerekti
Ek 12'de önceden ilan edilmiş ölçüt 3 düştü (bileşik oran 97.95 -> 96.82, -1.14 puan)
ve karar RET oldu. Ancak Ek 10 (eski kol) 2026-08-03'te, Ek 12 (yeni kol) 2026-08-04'te alınmıştı:
tek kollu ve farklı günlü bir karşılaştırma, "prompt etkisi" ile "gün etkisi"ni ayıramaz.
İkinci bir yeni-kol turu bu sorunu çözmezdi — karşılaştırma yine dünkü tek tura karşı yapılacaktı.
Bu yüzden aynı 30 çağrı, eski promptu (8e9fe96 sürümü, kdvBlok'suz) **bugün** koşmak için harcandı.
Tek tur iki bilinmeyeni birden çözer: C10b vs C12 eşleştirilmiş karşılaştırmayı verir (gün etkisi
elenir), C10b vs C10 ise aynı yapılandırmanın iki turu olarak **aletin kendi gürültüsünü** ölçer.

### Karar kuralı (veri görülmeden sabitlendi)
    N = |C10b - C10|            aynı yapılandırmanın iki turu arası fark
    B = max(N; 0,25 puan)       0,25 puan = 1 kalem / 395 kalem = aletin en küçük adımı
    E = C10b - C12              aynı gün, eski kol eksi yeni kol
    E <= B -> KABUL   |   E > B -> RET ONAYLANDI
Tam 1 tur; üçüncü tur yok. Hiçbir koşum dışlanmadı (dejenere koşumlar dahil).

### Ölçüm
| büyüklük | değer |
|---|---|
| C10 — eski kol, 2026-08-03 | 97.95 |
| C10b — eski kol, 2026-08-04 | 96.25 |
| C12 — yeni kol, 2026-08-04 | 96.82 |
| N — aynı yapılandırma, iki tur farkı | 1.70 puan |
| B — bant = max(N; 0,25) | 1.70 puan |
| E = C10b - C12 | -0.57 puan |

### KARAR: KABUL
E (-0.57) <= B (1.70) olduğu için ölçüt 3'ün ihlali gösterilememiştir. Ek 12'nin RET kararı
gün etkisiyle açıklanmıştır: aynı eski yapılandırma iki turda kendi kendinden 1.70 puan saptı,
yani RET'i tetikleyen -1.14 puanlık düşüş aletin kendi salınımının içinde kalıyor. Dahası
bugün eski kol, yeni kolun da **altında** kaldı (96.25 < 96.82).

### Üç turun alt kırılımı
| | Ek 10 (eski, dün) | Ek 12 (yeni, bugün) | Ek 12b (eski, bugün) |
|---|---|---|---|
| bileşik oran | 97.95 | 96.82 | 96.25 |
| başlık | 90/90 | 90/90 | 90/90 |
| ürün eşleşme | 394/395 | 392/395 | 391/395 |
| fiyat doğru | 378/395 | 370/395 | 366/395 |
| fazladan kalem | 0 | 1 | 0 |
| koşum bazında ss | 3.24 | 4.53 | 5.57 |
| süre ort/ortanca/max (sn) | 5.06 / 4.55 / 8.40 | 5.83 / 5.50 / 9.90 | 5.67 / 5.10 / 10.60 |
| sınıflar | A 13 / A-bayraklı 10 / B 7 / C_SESSIZ 0 | A 13 / A-bayraklı 11 / B 6 / C_SESSIZ 0 | A 9 / A-bayraklı 10 / B 11 / C_SESSIZ 0 |

### Ne öğrendik — bağlayıcı
1. **Aletin çözünürlüğü N = 1.70 puandır.** 30 koşumda bundan küçük gerçek bir gerileme
   SAPTANAMAZ. Bu KABUL "gerileme yoktur" demek değil, "gerileme gösterilememiştir" demektir.
2. **Gün etkisi, ölçülen etkiden büyüktür.** Bundan böyle ölçüt 3'e dayanan hiçbir kabul/ret
   kararı, iki kolu farklı günlerde koşan tek kollu bir turla verilmez; eşleştirilmiş (aynı gün,
   iki kol) tasarım ölçütün parçasıdır. Bu kural bizim aleyhimize de işler.
3. **B bandı kalıcıdır.** Sonuca göre esnetilemez; gelecekteki turlarda da geçerlidir.
4. **C_SESSIZ üç turda da 0.** Güvenlik ağı üç rejimde de tuttu.
5. **Süre AÇIK KALEM'i betimleyici olarak kapandı:** eski kol dün 5.06 sn -> bugün
   5.67 sn (gün etkisi +0.61 sn); yeni kol bugün 5.83 sn. kdvBlok'a
   atfedilebilecek fark +0.17 sn — ihmal edilebilir. Ek 12'de yazılan "+0,8 sn maliyet"
   okuması yanlıştı; farkın büyük kısmı gün etkisidir.

### Sınırlar (dürüst kayıt)
- N tek bir fark tahminidir ve kendisi de gürültülüdür; "bandın" kesinliği abartılmamalıdır.
- Eski kol bugün, `server.py` içinde `kdv_mutabakat` modülü YÜKLÜ halde koştu; ancak kdvBlok
  üretilmediği için modül `blok_yok` ile sessiz kaldı (KDV günlüğü 0 satır) ve modül
  zaten ürün adına/fiyatına/başlığa dokunmuyor. Ölçüt 3 açısından eski kol yapılandırması geçerlidir.
- Bugünkü turun genel kalitesi düşüktü (A 9 / A-bayraklı 10 / B 11 / C_SESSIZ 0). Bu kararın yönünü değiştirmiyor: ölçüt havuzlanmış
  orana bakar ve ön kayıt gereği hiçbir koşum dışlanmadı — düşük kalite eski kolun aleyhinedir,
  yani KABUL kararını kolaylaştırmamış, aksine gün etkisinin varlığını doğrulamıştır.

### Arşivler
- `results/ek12b-eski-kol-2026-08-04.json` (30 kayıt)
- `results/ek12b-kdv-gunluk-2026-08-04.txt` (0 satır — eski kolda beklenen sessizlik)
- `results/ek12b-on-kayit-2026-08-04.md` (sha256 88fe5ea7…ceb7e8a)
