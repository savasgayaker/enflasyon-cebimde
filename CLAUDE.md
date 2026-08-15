
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
  (d) Yapilandirilmis veri dosyalarina program eliyle yazarken tam
  serilestirme (json.dump gibi) yapilmaz; metin eki yapilir. Tam
  serilestirme dokunulmamis kayitlari yeniden bicimlendirir ve sayi
  gosterimini bozar. M7-B1'de olculdu: kdv-bloklari.json'a girdi
  json.dump ile eklenince dosyanin tamami yeniden bicimlendi,
  kompakt satirlar acildi ve 249.00 gosterimi 249.0 oldu. Cevap
  anahtarlarinda bu, fotograftan birebir aktarim ilkesini deler.
  Silme-0 kapisi yakaladi.
  (e) Olcum degerlendiricileri tasima hatasini basarisizliktan ayirmak
  zorundadir. HTTP hatasi, zaman asimi veya kimlik hatasi alan bir
  cagri olcum degildir; kaldi diye sayilirsa yanlis kirmizi uretir ve
  gecersiz bir kapi degeri dogurur. M7-B3a ikinci turunda olculdu:
  suresi dolmus jetonla alti cagri 401 aldi ve degerlendirici bunlari
  esik dususu olarak raporladi.
  (f) Silme kapisinin degeri, yamanin degistirdigi aralıktan degil
  git'in raporladigi silmeden turetilir. Git ortak satirlari baglam
  olarak esler: eski ve yeni govdede bayt kimlik ayni ve ayni sirada
  duran satirlar silinmis sayilmaz. M7-D4-2'de olculdu.
  (g) Karakter kapisi kok CLAUDE.md'de pozitif delta ile calisir:
  yalniz eklenen satirlar taranir. Dosyada onceden yasayan tipografi
  kapinin konusu degildir; kumeyi genisleterek cozmek kapiyi her yeni
  karakterde gevsetmeyi gerektirir. docs dosyalari tam tarama kalir.
  (h) Bir kapinin desen eslesmemesi, olculen seyin basarisiz oldugu
  anlamina GELMEZ. Sayi cikarimi eslesmezse kapi sessizce yanlis bir
  teshis basabilir: M8-5a'da test:inflation gecmisken kapi mevcut
  kontroller bozuldu diye raporladi, cunku desen ASCII arıyordu ve
  aletin bicimi Turkceydi. Sayi cikarimlari bicimden bagimsiz
  yazilir; eslesme yoksa kapi RET degil DUR vermelidir.
  Bir kapinin **degeri** yanlis ilan edilmisse desen kalibrasyonuyla
  duzeltilemez; ilan edilmis sapma gerekir (M7-A/S7).

  (i) Bir kapi, yamanin kendisinden BAGIMSIZ bir kaynagi olcmelidir.
  M8-5a'da tarih sabitlerinin varligi grep sayimiyla olculdu ama
  sayilan satirlarin tamami yamanin kendi ekledigi kullanim
  satirlariydi; kapi kendi urettigi metni kanit kabul etti ve gecti.
  Sabit ve tip dogrulamalari yamadan ONCE, tanim satirlari uzerinden
  yapilir.
### Ölçüm araçları nerede
- `m3-test/acceptance_dual.py` — ölçüm aleti (jetonlu, 6 fiş × 5 koşum = 30).
- `m3-test/puanla_bilesik.py` — başlık+eşleşme+fiyat bileşik oranı, arşivden.
  (j) Lint kapisi, dokunulan dosya zaten temiz degilse DELTA olur:
  temiz tabanda bulgu sayisi olculur ve yamadan sonra ayni sayi
  beklenir. M8-5b'de olculdu - kullanilmayan bir import yamadan once
  de vardi ve kapi turu haksiz yere RET etti. Yeni ihlal sizmasi
  yakalanir, mevcut borc turun sirtina yuklenmez.
- `m3-test/puanla-kdv-oran.py` — KDV oranı doğru/yanlış/boş, arşivden.
- `m3-test/karar-ek12b.py` — ön kayıtlı karar kuralını otomatik uygular.
- Arşivler: `m3-test/results/ek*-*.json|txt` (izlenmeleri `m3-test/.gitignore`
  içindeki DAR negation'larla sağlanır — kök `.gitignore`'dan delinemez).
  (k) Bir dosyadan dongu ile okurken, dongunun icinde calisan komut
  ayni girdi akisini miras alir ve kalan satirlari yutabilir. 16-B'de
  olculdu: uc degiskenden yalniz biri yazildi cunku ilk komut dosyanin
  geri kalanini tuketti. Ic komutlara girdi akisi bos verilir.
  (l) Dogrulama bolumunun RET dali yoksa eksik sonuc commit mesajina
  yanlis iddia olarak sizar. 16-B'de olculdu: eksik yazma goruldu,
  kosum durmadi ve mesaj uc degiskenin de yazildigini iddia etti.
  Kural 13/h kapinin yanlis teshis yazmasiydi; bu onun kardesi -
  kapinin yoklugu yanlis iddiayi gecirir. Olculen her sey kapiya
  baglanir ya da hic olculmez.
- `frontend/scripts/test-inflation.ts` — enflasyon hesabinin olcum araci: 23 senaryo / 54 kontrol (`npm run test:inflation`, frontend/ icinden; cikis kodu 0 = hepsi yesil). Beklenen degerlerin gerekcesi on kayitlarda: `docs/m6a2-on-kayit-2026-08-05.md` (fiyat toplulastirma) ve `docs/m6c-on-kayit-2026-08-05.md` (agirlik paydasi).
- Bu aletin ozet satirinin birebir bicimi: Toplam: <yesil> yesil kontrol, <kirmizi> kirmizi kontrol — senaryo sayisi bu satirda YOKTUR, kaynaktaki senaryo( cagrilarindan ya da DAGILIM etiketlerinden sayilir. Ayristirici yazan her blok bu bicime uyar, tahmin etmez.
- Ekran metinleri aleti: `frontend/scripts/test-ekran-metinleri.ts` — 27 kontrol, ekranMetinleri.ts'in saf fonksiyonlarini olcer. package.json'da betigi YOK; `npx tsx scripts/test-ekran-metinleri.ts` ile calistirilir. Ozet satiri biçimi yukaridakiyle aynidir.
frontend/scripts/test-m3-mapper.ts        24 kontrol (npm run test:m3-mapper)
  (m) Bir kapi, olculen ortamin kullandigi aletin AYNI SURUMUNU
  kullanmalidir. 16-C'de olculdu: kilit dosyasi yerel npm 11'de
  gecerli, EAS'in npm 10'unda gecersizdi. Yerel surumle kurulan kapi
  duzeltmeden once de yesil yanardi ve yanlis bir senkronlandi
  iddiasini gecirirdi. Surum farki olan yerde kapi hedef surumu
  acikca cagirir.
  Ozet satiri bicimi digerlerinden FARKLI: Sonuc: P/T kontrol basarili.
  Yesil = P, kirmizi = T eksi P (M7-A/S1 karari).
backend/test_dogrulama.py                 9 kontrol
  Kosum: backend/venv/bin/python3 backend/test_dogrulama.py
  (n) Bir metinde dize sayan kapi, metni once bosluk-normalize
  etmelidir. A4-2'de olculdu: satir kaydirmasi iki sinif etiketini
  ortadan bolmustu ve kapi kendi kosumunu haksiz RET etti. Icerik
  dogruydu; desen metnin gercek bicimine karsi dogrulanmamisti.
  Blok 14'te ayni sinif bilgi amacli bir sayacta gorulmus ve kosumu
  etkilememisti.
  Indirim satiri dogrulamasi: tur gecisi, negatif dali,
  tur celiskisi. Ozet satiri TS aletleriyle ayni bicimde.
frontend/scripts/test-fis-kalem-kurallari.ts   15 kontrol
  Kosum: npx tsx frontend/scripts/test-fis-kalem-kurallari.ts
  Fis kalemi kurallari: gecerlilik, serit seviyesi, kayit karari.
frontend/scripts/test-dedup.ts                29 kontrol
  Urun adi tekillestirme: 22 cift arti 7 gruplama kontrolu.
  K4'un uc sayacini basar; YANLIS birlestirme sifir olmali.
frontend/scripts/test-urun-listesi.ts         13 kontrol
  Liste kurulumu ve grup cozumu.
- Kaynak dogrulama kanali (mimar icin): `https://raw.githubusercontent.com/savasgayaker/enflasyon-cebimde/<commit-sha>/<yol>`. **Daima commit sha'sina sabitle** — dal ucuna (`main`) giden yol bayat kopya dondurebiliyor (2026-08-05'te dondurdu). Push'suz commit'ler bu kanaldan gorunmez.

### Prompt provenansı
`backend/receipt_prompt.py` içindeki `RECEIPT_PROMPT` tek kaynaktır; `server.py` ve
`m3-test/run_test.py` onu okur. Prompt değiştiğinde commit mesajına sha256 geçişi
YAZILIR. Güncel üretim: `ba68058f…8baf08` (2422 karakter, `kdvBlok` var).
Önceki: `73f7177c…fba888` (1812 karakter, `kdvBlok` yok).


## Asama 4 basladi (14-15 Agu 2026) - veri sunucuya

**Karar: veritabani Supabase.** Gerekce dayaniklilik - tek kisilik
ekipte yedekleme disiplini en cok ihmal edilen sey. Kimlik zaten
orada. Bedeli: veri yurt disinda, KVKK evraki gerekir. Kilitlenme
yok, standart Postgres.

**A4-1 sema tasarlandi:** dort tablo, kimlikler metin, birincil
anahtar kullanici arti kimlik, para numeric on iki virgul iki,
goruntu yolu semada YOK (K1), urunler kullaniciya ait (K4). Ortak
havuz tablo degil goruntu.

**A4-2 tablolar kuruldu ve RLS acildi.** Dogrulama on iki satir:
dort tablo, dort politika hepsi using ve with check dolu, dort
RLS acik, eski taslaktan sifir nesne.

**Eski Temmuz taslagi veritabaninda FIILEN KURULUYDU** ve
temizlendi - yirmi yedi nesne. Goc dosyalari supabase/arsiv/
altina tasindi.

**Bu turun dersi:** bir liste elle yazilirsa eksik olur ve bir
desen metnin gercek bicimine karsi dogrulanmazsa yaniltir. Ayni
aileden bes olay yasandi; sonuncusu sayim kapisinin kendisiydi ve
kendi kosumunu haksiz RET etti (Kural 13/n). Cozum: listeyi
bagimsiz kaynaktan uret, kapiyi ayni kaynaga karsi kos, sayimi
bicimden bagimsiz yap.

**Kanitlanmayan:** izolasyon canli sinanmadi - Kapi C, A4-3'te.

Ayrinti: docs/asama4-on-kayit-2026-08-14.md,
docs/asama4-sema-2026-08-14.md,
docs/asama4-a2-kapanis-2026-08-15.md

## Blok 16 kapandi (14 Agu 2026) - TestFlight

Uygulama TestFlight'tan telefona kuruldu ve **gercek bir fis okudu
ve kaydetti.** Expo Go degil: Metro yok, kod pakette, ortam
degiskenleri gomulu, yerli moduller bagli.

ML Kit riski sinandi ve gecti - yerli baglanma sorunsuz.

Uc build harcandi: birincisi Apple hesabindaki bekleyen maddeler
yuzunden hic baslamadi, ikincisi kilit dosyasi npm surumleri
arasinda farkli yorumlandigi icin dustu (S2), ucuncusu basarili.

**TESTFLIGHT OPERASYONEL DEMEK DEGILDIR.** Kayitlar hala yalnizca
telefonda; sunucuya gitmiyor ve ortak fiyat havuzu olusmuyor.
Testciler fis okuyacak ama o veri hicbir yere ulasmayacak.
TestFlight arayuz ve okuma testidir, veri toplama degil.
Operasyonel olma noktasi Asama 4'un sonudur.

**Ogrenilen:** elle silinen bir yapilandirma, onu ureten eklenti
ayarindan kapatilmazsa arac bir sonraki turetmede geri yazar.
16-B'de mikrofon izni icin yanlis dugmeye basildi.

Ayrinti: docs/blok16-on-kayit-2026-08-13.md,
docs/blok16-kapanis-2026-08-14.md

## Izleme kuruldu (13 Agu 2026)

Dis bir sondaj servisi saglik ucunu bes dakikada bir yokluyor ve
kesintide e-posta gonderiyor. **Gercek bir kesintiyle sinandi:**
konteyner durduruldu, uyari geldi, servis geri alindi.
Makine kendini izleyemez - kapandiginda haber veremez.

**Olculen kor nokta:** saglik ucu hicbir dis bagimliligi kontrol
etmiyor. Ikiyuz yaniti MiniMax anahtarinin gecerliligini,
Supabase erisimini veya veritabanini KANITLAMAZ. Docker'in
saglikli demesi de ayni seyi soyluyor: surec cevap veriyor.

**Izleme uygulama calisiyor demez, surec cevap veriyor der.**
MiniMax kotasi bittiginde izleme sessiz kalir ve kullanici fis
okutamadiginda anlar.

Saglik ucu bilincli olarak derinlestirilmedi: derin kontrol her
sondajda API cagrisi harcar, dis servis yavasladiginda yanlis
alarm uretir, ve asil ariza sinifi (makine kapanmasi, internet,
Docker) zaten basit sondajla yakalanir.

**Sondaj GET ile yapiliyor.** HEAD istegi dortyuzbes doner ve
izleme bunu surekli ariza sanardi (Blok 12-A'da olculdu).

**MiniMax kota takibi saglayici panelinden okunur.** Backend
token sayisini loglamiyor; kodda gecen token rakamlari gecmis bir
olcumun yorumlaridir.

Ayrinti: docs/blok15-izleme-2026-08-13.md

## Blok 14 kapandi (13 Agu 2026) - surekli calisma

Mac mini gozetimsiz sunucu olarak calisiyor. Elektrik geldiginde
hicbir insan mudahalesi olmadan zincir kendini toparliyor:
makine acilir (autorestart), oturum acilir (otomatik giris),
Docker kalkar, konteyner kalkar (restart always), tunel kalkar
(LaunchDaemon). Ikinci reboot olcumunde saglik ilk denemede 200.

**Dort yanlis teshis duzeltildi.** Uykuyu tutan seyin enerji
ayari mi yardimci uygulama mi oldugu, uygulama kapatilarak
olculdu. Ilk reboot'ta Docker'in kalkma sebebi elle giris
yapilmasiydi ve o olcum gozetimsiz senaryoyu hic olcmedi (S1).
Ucuncusu bu kaydin kendisiydi: ilk taslak jeton icin sizinti yok
diyordu ve kosumdan once duzeltildi. Dorduncusu Blok 13'un
kapanis notunun hic yazilmamis olmasiydi; capa kapisi yakaladi.

**Jeton sizintisi KAYITLI.** Jeton bir kez, surec listesini basan
bir arac ciktisiyla oturum kaydina girdi (halka acik depoya
degil). Panelde yenileme secenegi bulunamadi; mevcut jetonla
devam edildi ve bu bilincli kabul edilmis bir risktir.
Hafifleticiler: transkript ozel, panelde tek etkin baglayici,
jeton artik dosyadan okunuyor ve surec listesinde gorunmuyor.
**Panel secenek sundugunda rotasyon yapilacaktir.**

**Bilincli odunlesimler:** FileVault kapali (acik olsaydi kesinti
sonrasi disk kilitli kalirdi), otomatik giris acik (ayni kararin
devami), restart always (elle durdurulan konteyner de geri gelir).

**Acik:** baglama daraltmasi yapilmadi; izleme yok - servis
dustugunde kimse haberdar olmuyor; jeton rotasyonu bekliyor.

Ayrinti: docs/blok14-on-kayit-2026-08-12.md,
docs/blok14-kapanis-2026-08-13.md

## Blok 12-A, 12-B ve 13 kapandi (12 Agu 2026) - tunel

Backend internetten erisilebilir: api.enflasyoncebimde.com
Cloudflare Tunnel uzerinden localhost:8000'e yonleniyor.
Yonlendiricide port acilmadi; baglanti disa dogru.

**Uctan uca kanit alindi (Blok 13):** telefon Wi-Fi kapali,
hucresel veri acik durumda fis okuttu ve dogru okundu; fiste
indirim de vardi.

Kod degisikligi gerekmedi - config.ts zaten
EXPO_PUBLIC_BACKEND_URL'e oncelik veriyordu. Degisken
frontend/.env'e yazildi; yorumlanirsa ev agi moduna doner.

Gelistirmede Metro de tunellenmeli (expo start --tunnel), cunku
uygulama Metro'dan yukleniyor. TestFlight'ta gerekmez.

**Blok 12-B:** belge uclari kapatildi. docs, redoc ve openapi
artik 404 donuyor. Kosulsuz kapatma secildi; ortam degiskenli
kapi elendi cunku degisken yanlis ayarlanirsa uclar sessizce
acik kalirdi.

**Guvenlik:** Cloudflare Access alan adina KONMADI ve konmayacak
- konursa uygulamanin her istegi kirilir; korumayi Supabase JWT
sagliyor (jetonsuz parse-receipt 401 donuyor, olculdu).

**Olcum tuzagi kayda gecti:** Access kontrolu HEAD istegiyle
yapilirsa 405 doner ve bu Access degil, saglik ucunun yalniz GET
kabul etmesidir. Dogru olcum GET ile yapilir.

**Acik:** tek isci calisma zamaninda olculmedi (kisit
Dockerfile'da sabit); baglama daraltmasi yapilmadi.

Ayrinti: docs/blok12a-on-kayit-2026-08-12.md,
docs/blok12a-kapanis-2026-08-12.md,
docs/blok12b-on-kayit-2026-08-12.md,
docs/blok13-kapanis-2026-08-12.md

## M8 kapandi (11 Agu 2026) - urun adi tekillestirme

K-3'te olculen bolunmeler kapandi. Ayni tekil urunun kayitlari
tek seride toplaniyor: liste tek satir gosteriyor, detay birlesik
gecmis ciziyor, motor tek seri uzerinden hesapliyor.

Mekanizma tek satirdaydi: useAppStore.ts:178 toLowerCase
karsilastirmasi. Yerel bilgisiz calisir; S-cedilla ve yumusak G
hic eslesmez, noktali I kucultulunce birlesen nokta uretir.

**Esleme SAKLANMAZ** (S2, K4 kural 2): okuma aninda hesaplanir.
Persist semasi degismedi, goc gerekmedi, sema surumu 1'de kaldi.

Kapsam yalniz Turkce harf ve bosluk katmani. Bulanik benzerlik
kapsam disi ve hic yapilmayabilir: CAMLA/DAMLA SU bir karakter
farkli ve ayni urun, ZERO 330/450 iki karakter farkli ve FARKLI
urun; duzenleme mesafesi ayiramaz (K4 kural 3).

K4'un uc sayaci: dogru birlestirme 11, kacirilan 0, YANLIS
birlestirme 0. Yanlis birlestirme kapisi hicbir turda ihlal
edilmedi.

**findOrCreateProduct hala eski kurali kullaniyor.** Yeni kayitlar
bolunmeye devam eder ve okuma aninda gruplanir - K4 geregi yazma
aninda normallestirme yapilmaz. Katalogda hala iki ayri Product
kaydi gorunur; birlesme ekranda ve motorda olur.

On bir ilan edilmis sapma, uc yeni Kural 13 maddesi (h, i, j).

Ayrinti: docs/m8-on-kayit-2026-08-11.md,
docs/m8-kapanis-2026-08-11.md.

## Blok 13-A - ilk cihaz olcumu (10 Agu 2026, KISMI)

Uc gercek fis iPhone'da okutuldu; ucunun de toplami cevap
anahtariyla birebir tuttu. **Indirimli fis artik kaydedilebiliyor**
- M7-D'nin ana iddiasi cihazda dogrulandi. Indirim satirlari sari
serit aliyor, kirmizi degil.

Ucuncu indirim sekli olculdu: eksi isareti yerine D soneki
(*130,00-D). Model dogru okudu; dokuzuncu fixture o davranisin
muhafizi.

Iki kusur olculdu: bir kalemde miktar ve birim fiyat kaymasi
(toplam dogru oldugu icin aritmetik kontrol koru, capraz kontrol
yakaladi) ve Migros'ta yirmi bir kalemin yirmi birinin bayraklanmasi
(yanlis alarm orani).

**Dort kanit hala acik** ve kapanis notlarindaki listelerden
silinmedi: sahte urun kirliligi, ham etiket gorunumu, dokunma
korumasi, motor dislamasi. M7-A'nin unit/vatRate kaniti da acik.

Kayitlar yalniz telefonda: store AsyncStorage'a persist ediyor,
backend'de kayit alan uc yok. Kayit sonrasi davranis ancak ekran
goruntusuyle olculebilir.

Ayrinti: docs/blok13a-cihaz-olcumu-2026-08-10.md

**Ikinci oturum (10 Agu, aksam):** dort acik kanittan ucu kapandi.
Ham etiket cihazda gorunuyor, dokunma korumasi calisiyor, sahte urun
kirliligi YOK. Sonuncusu dogrudan olculdu: uc indirim bagli olduklari
urunle ayni adi tasiyordu ve katalogdaki kayit sayilari artmadi -
findOrCreateProduct cagrilsaydi artardi. M7-D'nin cekirdek karari
cihazda dogrulandi.

Acik kalan tek kanit motor dislamasi; ana ekran -% gosteriyor ve bu
sifir cikti oldugu icin filtreyi kanitlamaz. Enflasyon fiilen
hesaplanmaya baslayinca olculebilir. M7-A'nin unit/vatRate kaniti da
acik (alanlar arayuzde gosterilmiyor).

**K-3 - urun adi dedup sorunu sahada gerceklesti.** Katalogda ayni
urun defalarca ayri kayit: POSET uc ayri girdi, EKER MEYVELI YOGURT
iki girdi, CIPS MISIR TACO uc girdi. Fark cogunlukla tek bir Turkce
harf (I, S, G). Asama 3'un acik borcu. Motoru dogrudan etkiliyor:
fiyat serisi bolununce her parcada tek gozlem kalir ve enflasyon
hesaplanamaz. Veri kaybi yok (K4: ham adlar sakli, tekillestirme
sonradan gecmise uygulanabilir).

## M7-D kapandi (09 Agu 2026)

Indirimli fis artik cihazda kaydedilebiliyor. Tur 0 olcumu bunun
onceden mumkun olmadigini gostermisti: sert kontrol birim fiyati
sifirin altindaki kalemi reddediyordu.

Indirim satiri satirTipi isaretli ayri bir PriceRecord olarak
yazilir; productId null kalir ve findOrCreateProduct cagrilmaz
(sahte urun kirliligi). hamEtiket alani fisten geldigi haliyle,
trim edilmeden saklanir. Motor productId null olan kayitlari
gruplamaya sokmaz - iki dongu de kendi basina korunur.

Serit artik tutara degil ture bakar: indirim incele alir, eksik
degil. Indirim satirinda girilecek bir fiyat yoktur.

Karar mantigi saf modulde: frontend/src/utils/fisKalemKurallari.ts
(kalemGecerliMi, seritSeviyesi, kayitKarari). Ekranlar karar
mantigi icermez; cagirir ve basar.

On dort ilan edilmis sapma. Bunlarin besi ayni hata sinifidir:
olculmeden ilan edilen kapi degeri veya oncülü. Sinif Kural 13'un
alti maddesiyle kayitlidir.

Kapanis notundaki 'M7-D'nin KANITLAMADIGI seyler' bolumu okunmadan
bu is kapali sayilmaz: cihazda hicbir sey olculmedi.

Ayrinti: docs/m7d-on-kayit-2026-08-09.md,
docs/m7d-kapanis-2026-08-09.md.

## M7-B kapandi (09 Agu 2026)

Indirim satirlari taniniyor. K5 sartname, iki gercek fis cevap
anahtari: a101-indirim (satir-ici indirim, KDV kova tablosu var) ve
migros-indirim (dort indirim, ucu fis sonundaki blokta, kova yok).
Vision regresyonu artik 8 fis.

Turlar: B1 ve B1b cevap anahtarlari, B2 kirmizi olcum, B3a prompt
(iki tur), B3b dogrulama (iki tur). Dokuz ilan edilmis sapma.

K5'in baglanti kurali Migros fisiyle genisletildi: konum birincil
sinyal DEGILDIR. Indirim satiri urun adi tasiyorsa ada gore, aksi
halde onceki kaleme baglanir. KDV kovasi zorunlu kapi degil, ek
kanittir - her fis kova basmaz.

M7-C icin baglayici: indirimin hangi urune ait oldugu ayri ve acik
bir alan olarak modelden istenecek. Ad benzerliginden cikarim
yapilmayacak; ad savrulmasi uc kez olculdu.

Ayrinti: docs/m7b-on-kayit-2026-08-08.md, m7b2-kapanis-2026-08-09.md,
m7b3a-kapanis-2026-08-09.md, m7b3b-kapanis-2026-08-09.md.

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
