
---

## Aşama 3.5 kapanışı ve ÖLÇÜM DİSİPLİNİ — BAĞLAYICI (2026-08-04)

**Durum:** Aşama 3.5 (KDV bloğu ile mutabakat) kapandı. `kdvBlok`'lu prompt +
`backend/kdv_mutabakat.py` üretimde. Commit zinciri: `7fdef86` (kod) → `89e1406`
(Ek 12b ön kaydı, veri üretilmeden) → `99aa2e1` (Ek 12b sonucu + rapor).
Ölçülen kazanım: KDV oranı doğruluğu %78,3 → %89,1, yanlış oran %11,7 → %3,4,
C_SESSIZ üç turda da 0, süre maliyeti ~+0,17 sn (ihmal edilebilir).

### Bir sonraki oturumun uyması gereken kurallar
Bunlar tercih değil, bedeli ödenerek öğrenilmiş şartlardır. Gerekçeleri
`m3-test/results/RAPOR.md` Ek 10, Ek 11, Ek 12 ve Ek 12b bölümlerinde.

1. **Ön kayıt.** Kabul ölçütleri ve karar kuralı koşumdan ÖNCE yazılır ve tercihen
   veri üretilmeden commit edilir. Sonuç görüldükten sonra ölçüt esnetilmez —
   yeni engel eklemek de gol direğini oynatmaktır.
2. **Aleti ölçtüğün turda değiştirme.** Ölçüm aracı (`m3-test/acceptance_dual.py`)
   bir değişikliği ölçtüğün turda düzenlenmez. Yeni bir şey ölçülecekse arşiv
   üzerinde çalışan ayrı bir puanlayıcı yazılır ki aynı puanlayıcı her iki tura da
   uygulanabilsin (`puanla_bilesik.py`, `puanla-kdv-oran.py` böyle doğdu).
3. **Eşleştirilmiş tasarım şartı.** Bileşik doğruluk oranına (ölçüt 3) dayanan
   hiçbir kabul/ret kararı, iki kolu FARKLI GÜNLERDE koşan tek kollu bir turla
   verilemez. Gün etkisi ölçtüğümüz etkiden büyüktür: aynı yapılandırma iki turda
   kendinden 1,70 puan saptı ve ~0,61 sn gecikme farkı yarattı. İki kol aynı gün
   koşulur.
4. **Aletin çözünürlüğü N ≈ 1,70 puandır.** 30 koşumda bundan küçük gerçek bir
   gerileme SAPTANAMAZ. "KABUL", "gerileme yoktur" değil "gösterilememiştir"
   demektir. Daha küçük bir etki iddia edilecekse koşum sayısı artırılmalıdır.
5. **Havuzlanmış oran kullan.** Fişlerin kalem sayıları farklı olduğu için
   koşum başına ortalamaların ortalaması yanıltır; paylar ve paydalar toplanır.
   (Koşum bazında standart sapma 3–4,5 puandır; tek koşuma asla bakılmaz.)
6. **Hiçbir koşum dışlanmaz.** Dejenere görünen koşumlar da (ör. Ek 12'de a101
   koşu 5) havuza girer; dışlama ancak ön kayıtta ilan edilmişse yapılabilir.
7. **Sayı elle aktarılmaz.** Rapor bölümleri arşivlerden programla üretilir ve
   üretici idempotent olur (kes-sonra-yaz), böylece tekrar çalıştırmak bölüm
   çoğaltmaz.
8. **Yanlış çıkmış karar silinmez, üzerine yazılır.** Ek 12'nin RET satırı
   yerinde duruyor; altına Ek 12b göndermesi eklendi.
9. **Karakterizasyon ≠ şartname.** "Mevcut davranış, DEĞİŞTİRİLMEYECEK" başlıklı her madde kodun ne *yaptığını* anlatmalıdır — yazarın ne yapması gerektiğini düşündüğünü değil. M6-A'da bu ikisi karıştı: senaryoların hiçbiri farkı göremezdi, fark ancak koda bakılarak bulundu ve tur kendi durdurma kuralıyla durdu. Karakterizasyon maddeleri yazılmadan önce ilgili satırlar kodun kendisinden okunur (`docs/m6a2-kapanis-2026-08-05.md`).
10. **Tavsiye kabul kapisi degildir.** On kayittaki "onerilen sekil" yol gostericidir, kabul kurali baglayicidir. Ikisi celisirse kabul kapisi uygulanir; sapma veri gorulmeden once ilan edilir ve kapanis kaydina gecer. Celiski, on kaydi yazanin hatasidir.
11. Kapi boru hattina baglanmaz — bir kapinin cikisi tee gibi bir boruya verilmez; once dosyaya yazilir, ayri komutla basilir, boru zorunluysa set -o pipefail ilan edilir (set -e yalnizca boru hattinin son komutunu gorur, tee her zaman 0 doner ve kapiyi sessizce iptal eder). Ayrica calisan bir olcum deseni sebepsiz degistirilmez; degistirilecekse once gercek cikti uzerinde eslestigi gosterilir. Kaynak: M6-B kapanisi, 6c7373c.

12. **Olcum ani ilan edilir.** Her kabul maddesi, ilan edilen tur sirasinda hangi turdan SONRA saglanabilir oldugunu acikca yazar. On kayit yazilirken her madde icin "bu ne zaman olculebilir?" sorusu tur kapsamlariyla karsilastirilarak tek tek cevaplanir. M6-E'de iki ayri ic celiski dogrudan bu adimin atlanmasindan dogdu. Ayni kural ifadenin okunmasi icin de gecerlidir: bir kosul kod grafigine atifta bulunuyorsa, metinsel mi calisma zamani mi okunacagi onceden yazilir; yazilmamissa yorum karari ilan edilir ve mumkunse makineyle sinanir.

- **Kural 13**: kapi desenleri, olctukleri metnin gercek bicimine karsi
  dogrulanmadan yazilmaz. Uc olculmus tuzak:
  (a) `grep '^-[^-]'` ile silinen satir cikarmak, madde imiyle baslayan
  silinmis satirlari yutar; dogrusu `grep '^-' | grep -v '^--- '`.
  (b) `[a-z]` Turkce harfleri kapsamaz; `sinirinda` gibi kelimeler
  aranirken birebir dize kullanilir.
  (c) Ozet satiri bicimleri aletten alete degisir; her alet kendi
  olculmus biciminden okunur.
  Bir kapinin **degeri** yanlis ilan edilmisse desen kalibrasyonuyla
  duzeltilemez; ilan edilmis sapma gerekir (M7-A/S7).

### Ölçüm araçları nerede
- `m3-test/acceptance_dual.py` — ölçüm aleti (jetonlu, 6 fiş × 5 koşum = 30).
- `m3-test/puanla_bilesik.py` — başlık+eşleşme+fiyat bileşik oranı, arşivden.
- `m3-test/puanla-kdv-oran.py` — KDV oranı doğru/yanlış/boş, arşivden.
- `m3-test/karar-ek12b.py` — ön kayıtlı karar kuralını otomatik uygular.
- Arşivler: `m3-test/results/ek*-*.json|txt` (izlenmeleri `m3-test/.gitignore`
  içindeki DAR negation'larla sağlanır — kök `.gitignore`'dan delinemez).
- `frontend/scripts/test-inflation.ts` — enflasyon hesabinin olcum araci: 23 senaryo / 54 kontrol (`npm run test:inflation`, frontend/ icinden; cikis kodu 0 = hepsi yesil). Beklenen degerlerin gerekcesi on kayitlarda: `docs/m6a2-on-kayit-2026-08-05.md` (fiyat toplulastirma) ve `docs/m6c-on-kayit-2026-08-05.md` (agirlik paydasi).
- Bu aletin ozet satirinin birebir bicimi: Toplam: <yesil> yesil kontrol, <kirmizi> kirmizi kontrol — senaryo sayisi bu satirda YOKTUR, kaynaktaki senaryo( cagrilarindan ya da DAGILIM etiketlerinden sayilir. Ayristirici yazan her blok bu bicime uyar, tahmin etmez.
- Ekran metinleri aleti: `frontend/scripts/test-ekran-metinleri.ts` — 27 kontrol, ekranMetinleri.ts'in saf fonksiyonlarini olcer. package.json'da betigi YOK; `npx tsx scripts/test-ekran-metinleri.ts` ile calistirilir. Ozet satiri biçimi yukaridakiyle aynidir.
frontend/scripts/test-m3-mapper.ts        24 kontrol (npm run test:m3-mapper)
  Ozet satiri bicimi digerlerinden FARKLI: Sonuc: P/T kontrol basarili.
  Yesil = P, kirmizi = T eksi P (M7-A/S1 karari).
- Kaynak dogrulama kanali (mimar icin): `https://raw.githubusercontent.com/savasgayaker/enflasyon-cebimde/<commit-sha>/<yol>`. **Daima commit sha'sina sabitle** — dal ucuna (`main`) giden yol bayat kopya dondurebiliyor (2026-08-05'te dondurdu). Push'suz commit'ler bu kanaldan gorunmez.

### Prompt provenansı
`backend/receipt_prompt.py` içindeki `RECEIPT_PROMPT` tek kaynaktır; `server.py` ve
`m3-test/run_test.py` onu okur. Prompt değiştiğinde commit mesajına sha256 geçişi
YAZILIR. Güncel üretim: `ba68058f…8baf08` (2422 karakter, `kdvBlok` var).
Önceki: `73f7177c…fba888` (1812 karakter, `kdvBlok` yok).


## M7-A kapandi (08 Agu 2026)

unit ve vatRate artik backend'den store'a kadar tasiniyor. Dort tur
KABUL: A1 (olcum aleti, kirmizi), A2 (M3Response, ParsedItem,
PriceRecord + mapper eslemesi), A3 (persist surum damgasi), A4
(UIItem, sinir eslemesi, priceRecord kurulumu).

Store sema surumu artik 1. SEMA_SURUMU ve semaGocu useAppStore.ts'te
disa aktarilmistir; goc kimliktir, donusum yapmaz.

Yedi ilan edilmis sapma ve uc capa kalibrasyonu var; hepsi kosumdan
once duyuruldu. Ayrinti: docs/m7a-on-kayit-2026-08-08.md ve
docs/m7a-kapanis-2026-08-08.md.

Kapanis notundaki 'M7-A'nin KANITLAMADIGI seyler' bolumu okunmadan
bu is kapali sayilmaz. Ozetle: alanlarin cihazda fiilen aktigi
metinsel kapiyla degil, Blok 13 uctan uca testiyle kanitlanacaktir.

Asama 4 kararlari (K1-K5) artik depoda:
docs/asama-4-veri-mimarisi-kararlar.md. K5 indirim satirlarini
duzenler ve M7-B'nin sartnamesidir.
### Açık kalemler (2026-08-05 itibarıyla)
- **Blok 13** — uygulamayı arka uca bağlama + iPhone uçtan uca test. Tünel için
  alan adı henüz alınmadı; bu karar verilmeden Blok 12-A başlamaz.
- M6 — kayıt sonrası uçtan uca akış. **M6-A2 KABUL (2026-08-05, `32c5df3`)**: `inflation.ts`'teki fiyat toplulaştırma hatası düzeltildi; dönem fiyatı artık `Σ(unitPrice × quantity) / Σ(quantity)`, yani gösterilen enflasyon alışveriş sıklığından şişmiyor. Kanıt zinciri: `4336ccf` (M6-A ön kayıt, durdurma kuralıyla durdu) → `e5d3913` (M6-A2 ön kayıt) → `1b7766b` (düzeltme öncesi KIRMIZI kanıt) → `32c5df3` (düzeltme) → `49214a6` (kapanış notu `docs/m6a2-kapanis-2026-08-05.md`). Kalan işler aşağıdaki M6-B…M6-E maddeleridir.
- M6-B — yilliklastirma bilesik ve pencere uzunluguna gore normalize: **KABUL** (zincir: 64d2240 on kayit -> 3bc771e kirmizi -> d716fb7 uygulama -> 6c7373c kapanis)
- **M6-C KABUL (2026-08-05, `47932cf`)**: agirlik paydasi eslesen orneklemle sinirlandi (`weight = spending / matchedSpending`); genel oran artik kategori oranlariyla ic tutarli ve yeni urun almak orani seyreltmiyor. On kayit `docs/m6c-on-kayit-2026-08-05.md`, kapanis `docs/m6c-kapanis-2026-08-05.md`, zincir `171597c` -> `818d283` -> `47932cf` -> `cef4ec6`.
- M6-D (kapsama gostergesi, coverageRate): KABUL 2026-08-05. Zincir: 6ad408a on kayit -> 0c1d33b alti senaryo KIRMIZI -> 916059c uygulama (+9/-0) -> 4d0bb21 kapanis. Not: docs/m6d-kapanis-2026-08-05.md. Invaryans (T-D3) uc bagimsiz yoldan olculdu: sifir silinen satir, 7/7 bayt-kimlik, S1-S12 dokunulmamis beklentilerle yesil.
- M6-E — ekran katmani: **KABUL** — dokuz alt tur (E0..E5d), dort ilan edilmis sapma; zincir f1db5ce -> 1f03926 -> 5d2dded -> 68bec88 -> 26b66c7 -> e6cb0bc -> 89e2459 -> 9a7b688 -> e6a5eca -> c8453ca -> ea4dd46 -> 631b06d; kapanis notu docs/m6e-kapanis-2026-08-07.md
Sonraki is: M7-B, M7-C, M7-D (K5 indirim satirlari), ardindan
Blok 12-A (alan adi + Cloudflare Tunnel) ve yayin hatti.
Bu sira zorunludur: K5 bir yazma ani kararidir ve K1 geregi geri
donulemez. Yayina cikilip gercek fisler kaydedilmeye baslandiktan
sonra indirim alanlari eklenirse, aradaki fislerin indirim bilgisi
sonsuza kadar kaybolur.
- **Adım 2.5** — kategori kelime-sınırı iyileştirmesi (ölçmek yeni bir kabul turu ister).
- **Ürün birleştirme** (Ek 9 karar 3) — isim varyansı ölçümlerde eşleşmeyen kalem
  olarak görünüyor; ürün kimliği çözülmeden kişisel enflasyon serisi kurulamaz.
- **Canlı yanlış alarm oranı** — Ek 12'de 30 koşumda 1 yanlış `kdvUyusmazligi`
  bayrağı (%3,3). Ek 11'in "0 yeni bayrak" iddiası sabit çıktı tekrarına dayanıyordu,
  canlıda geçerli değil.
- **3 adet `tsc` hatası** (expo-file-system ×2, gifted-charts ×1) — park edilmiş.
- Saklama süresi planlaması + 30 gün uyarı e-postası; `/api/saglik` için uptime izleme.
- Docker VM saati ana makineden ~1 saat ileri; `docker compose logs --since` bu
  makinede güvenilmez (Docker yeniden başlatılana kadar).
