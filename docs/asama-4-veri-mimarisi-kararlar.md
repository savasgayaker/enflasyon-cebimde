# Asama 4 - Veri mimarisi kararlari

Durum: yasayan belge. Asama 3 (M3 vision fis okuma) 26 Tem 2026'da kapandi.
Bu belge ondan sonraki veri ve sunucu mimarisi kararlarinin kaydidir.
K1-K4 sohbet ortaminda alinmis, 08 Agu 2026'da depoya tasinmistir.
K5 08 Agu 2026'da alinmistir.

## K1 - Fis goruntusu saklanmayacak

Fis fotografi telefondan sunucuya gelir, sunucunun **belleginde** kalir,
MiniMax M3'e gonderilir, cevap alininca dusurulur. **Diske hicbir kosulda
yazilmaz** - gecici klasor dahil.

Gerekce: KVKK yukunun en agir parcasi (fis goruntusu arsivi) ortadan kalkar.

Bedeli: model ileride iyilestiginde eski fisler yeniden okunamaz; kullanici
"yanlis okundu" dediginde asli elde olmaz. Telafi: goruntu kullanicinin kendi
telefon galerisinde kalir; hatali okuma duzeltmesi needsReview akisiyla elle
yapilir.

**Sonuc kurali:** Goruntu atildigi icin, ayristirma aninda yazilmayan hicbir
bilgi sonradan geri getirilemez. **Yazma aninda comert, yorumlamada tutucu ol.**

## K2 - Giris: Google + Apple, anonim baslangicla

Hem Google hem Apple ile giris olacak. Apple App Store Guideline 4.8 geregi
ucuncu taraf girisi sunan uygulamalar, veri toplamayi ad ve e-posta ile
sinirlayan bir alternatif de sunmak zorunda; yani Google konacaksa Apple
zorunlu.

Kimlik sistemi elle yazilmayacak. Karar: Supabase.

Akis: kullanici uygulamayi acar acmaz hesap istenmez. Once ilk fisini ceker,
sayisini gorur; sonra "verilerini kaybetmemek icin giris yap" denir. Anonim
oturum sonradan Google/Apple hesabina veri kaybi olmadan baglanir.
Bunun icin linkIdentity() kullanilir, signInWithOAuth() asla kullanilmaz.

## K3 - Ortak fiyat havuzu bir ana ozellik

Tum kullanicilarin fislerinden olusan havuzdan "ortalama enflasyon"
hesaplanmasi uygulamanin ana hatlarindan biri. Bu karar "sunucuyu sonra
kurariz" tavsiyesini gecersiz kilar: ortak ortalama yalniz sunucuda var
olabilir.

Havuza kimlik bilgisi yazilmaz: yalniz tarih, market, urun, fiyat.
Kullanicinin kendi gecmisi kimligine bagli ve ozel kalir.

Az veri sorunu: enflasyon ayni urunun iki farkli zamandaki fiyatini gerektirir.
Kucuk havuzda urunlerin cogu bir kez gorunur. Karar: sayiyi saklamak yerine
**agirligiyla birlikte gostermek** - "Havuz: %47 - 34 kisinin 210 fisinden
hesaplandi."

## K4 - Urun tekillestirme: ham sakla, sonradan temizle

Urun adlari fisten geldigi gibi yazilir; birkac aylik gercek veri biriktikten
sonra tekillestirme kodu yazilir ve gelistirilerek yeniden kosturulur.

Uc kural:

1. **Ham ad asla uzerine yazilmaz.** Iki ayri alan: fisten gelen ham ad
   (hic dokunulmaz) ve yeniden hesaplanabilir tekil-urun baglantisi.
   Eslestirme kararinin hangi kural surumuyle verildigi de kaydedilir.
2. **Hesaplanmis sayi saklanmaz, olgu saklanir.** Tekillestirme yeniden
   kostugunda gecmis enflasyon sayilari degisir. Bu, sayilar okuma aninda
   veriden hesaplaniyorsa dogal; onceden kaydedilmisse felakettir.
3. **Yanlis birlestirmek, birlestirmemekten kotudur.** Uydurulmus veri,
   eksik veriden her zaman kotudur. Tekillestirici tutucu olmali.

Olcum yontemi: elle dogru gruplanmis yaklasik 200 gercek urun adindan bir
cevap anahtari hazirlanir; her surum dogru birlestirme / kacirilan birlestirme
/ **yanlis birlestirme** olarak ayri ayri puanlanir. Yanlis birlestirme sifira
yakin tutulmalidir.

## K5 - Indirim satirlari: olgu saklanir, fiyat turetilir

Tarih: 08 Agu 2026. Tetikleyen: A101 Agridag Etimesgut fisi (08.08.2026 12:58,
belge no 00778010260808125941).

### Olgu

A101 kampanyalarinda indirim, urunun fiyatini degistirerek degil, urun
satirindan hemen **sonra gelen ayri bir negatif satir** olarak basilir:

    SAMPUAN KOMPLE DIRENC 400ML EL%20      *299,00
    10 TL UZERINE SAMPUA                   -170,00

Bu satir fisin kendi aritmetigine dahildir. Kalem toplami:

    89,50 + 85,00 + 299,00 - 170,00 + 62,00 + 79,50
    + 89,00 + 62,00 + 17,00 + 62,00 + 2,00 = 677,00

677,00 = ARA TOPLAM = ODENECEK TUTAR. Negatif satir atilirsa toplam tutmaz.
Mevcut aritmetik kontrolun dogru calismasi bu satirin korunmasina baglidir.

### KDV kovasi baglantiyi bagimsiz olarak dogrular

Ayni fiste KDV dokumu, indirimin hangi urune ait oldugunu ikinci bir yoldan
kanitlar:

    %1  kalemleri toplami = 546,00 ; fiste yazan %1  tutari = 546,00
    %20 kalemleri (299,00 + 2,00) = 301,00
    301,00 - 170,00 = 131,00 ; fiste yazan %20 tutari = 131,00

Indirim %20 kovasindan dusulmustur. Poset 2,00 TL oldugu icin geriye tek aday
kalir: sampuan. Sampuanin fiilen odenen fiyati 129,00 TL, etiket fiyati
299,00 TL.

### Karar

**Tek fiyat yazilmaz. Uc olgu yazilir:**

    etiket fiyati    299,00   (fiste basilan)
    indirim tutari   170,00
    indirim etiketi  "10 TL UZERINE SAMPUA"  (ham, yazicinin kestigi haliyle)

Odenen fiyat (129,00) bu ucunden her an hesaplanir; saklanmaz. K4 kural 2'nin
dogrudan uygulanmasidir: hesaplanmis sayi saklanmaz, olgu saklanir.

K1 geregi goruntu atildigi icin bu karar geri donulemezdir. Yazma aninda
yazilmayan indirim bilgisi sonsuza kadar kaybolur.

### Hangi fiyat enflasyon serisine girer

Varsayilan: **odenen fiyat.** Kisisel enflasyon, kisinin sepetinin
maliyetindeki degisimdir; cebinden 129 ciktiysa olcum 129'dur. Bu indirim
herkese acik ve uyelik gerektirmiyor, yani bir islem fiyatidir.

Bilinen tehlike: kucuk veride kampanyalar enflasyon uydurur. Sampuan bu ay
129, gelecek ay 299 alinirsa motor artan yonde buyuk bir oran gosterir; bu
enflasyon degil kampanya zamanlamasidir. Buyuk orneklemde ortalamada erir,
20 fiste erimez.

Bu nedenle indirimli gozlemler **isaretli** kalir. Motorun bu isareti nasil
kullanacagi (taban donemden dislama, iki seri gosterme) ayri bir on kayit
konusudur ve K5 kapsaminda karara baglanmamistir.

### Baglanti kurali (09 Agu 2026'da genisletildi)

Ilk hali tek fisten (A101) yazilmisti ve konumu birincil sinyal ilan
ediyordu. Ikinci bir fis (Migros, 09.08.2026) bu kurali curuttu: ayni
zincirde indirimler fisin sonunda ayri bir INDIRIMLER blogunda toplanir
ve konum kurali dordun ucunde yanlis urune baglar.

**Sinyal, indirim satirinin kendi seklinden secilir:**

    satir bir urun adi tasiyorsa    ada gore eslestir
    tasimiyorsa                     kendinden onceki kaleme bagla

Iki sekil de olculmustur. Migros fisinin sonundaki blokta her indirim
urun adini kendisi tasir (NAMET DANA DONER, BANVIT PLC.SCHNITZEL,
A.O.C. SADE DONDURMA); ayni fisin ortasindaki indirim ad tasimaz
(yuzde 25 indirim) ve konumla dogru baglanir - onceki kalem 434,95 ve
434,95 carpi 0,25 esittir 108,74.

**KDV orani eleme sinyalidir, dogrulayici degil.** A101'de KDV kova
tablosu vardi ve baglantiyi bagimsiz dogruladi; Migros yalniz TOPKDV
basar, kova kirilimi yoktur. Kova kapisi bu nedenle zorunlu kapi
degildir, bulundugunda kullanilan ek kanittir. Satir basindaki oran
isareti ise her iki fiste de vardir: indirimin orani bagli oldugu
urunun oraniyla ayni olmalidir, tutmayan aday elenir.

**Baglanti birimi satir degil urundur.** Migros fisinde
A.O.C. SADE DONDURMA iki kez gecer (ikisi de 437,95) ve indirim
-437,95'tir; yani iki al bir ode. Indirimi tek bir satira baglamak
"biri 437,95, digeri bedava" gibi hic yasanmamis bir fiyat uydurur.
Dogrusu urun duzeyinde toplamaktir: 2 adet, odenen 437,95, birim
218,98. Ad ve fiyati birebir ayni olan satirlar bu amacla tek grup
sayilir.

**Yapisal basliklar ne urun ne indirimdir.** INDIRIMLER: gibi bolum
basliklari ucuncu bir satir cinsidir ve atilir; ancak ardindan gelenler
atilmaz. Mevcut prompt kuralinin en cok yanilttigi nokta burasidir.

**Kampanya kodu ham etikettir.** Migros'ta indirim iki satirdir: once
kampanya kodu (yildiz INDIRIM, yildiz SECALBANVI, yildiz AOCDONDURM),
sonra urun adi ve tutar. K5'in sakla dedigi ham etiket bu koddur.

Tutucu kural degismedi: baglantidan emin olunamiyorsa indirim fis
duzeyinde kalir ve hicbir urunun fiyati degistirilmez. Indirimi yanlis
urune baglamak, hic baglamamaktan kotudur.


### Urun indirimi ile odeme indirimi ayrimi

Uc tur ayirt edilecektir:

    urun indirimi     urunun fiyatini gercekten dusurur, seriye girer
    fis duzeyi        tek urune baglanamaz
    odeme/puan        kart kampanyasi, puan kullanimi; urunun fiyati
                      degismemistir, seriye girmemelidir

Siniflandirma yazma aninda yapilmaz. Ham etiket saklanir, siniflandirma
sonradan yazilir ve gecmise yeniden uygulanir - K4'un mantiginin aynisi.

### Cevap anahtari

Bu fis m3-test ground-truth setine yedinci fis olarak eklenir. Aritmetigi iki
bagimsiz yoldan dogrulanmistir (kalem toplami ve KDV kovasi), bu nedenle
indirim vakasinin referans fisidir. Mevcut a101 fisiyle ad cakismasi olmamasi
icin ayri bir ad kullanilir.

## Acik sorular

- Sunucu nerede: karar verildi. Supabase = veritabani + kimlik,
  Mac mini = sunucu.
- Yazma aninda hangi alanlar toplanacak: birim (kg/lt/adet) ve KDV orani
  bugun m3Mapper sinirinda dusuyor. M7-A bunu kapatir.
- Havuz ortalamasinin istatistiksel esigi (bir urun icin kac gozlemden sonra).
- Indirimli gozlemlerin enflasyon motorunda islenisi (K5, ayri on kayit).

## Maliyet cercevesi

Ilk yil ucretsiz, reklamsiz, sinirli kullanici beklentisi. Buyuyen tek kalem
M3 cagrilaridir; cift-paralel mimaride fis basina kabaca yarim sent.
Backend her cagrinin completion_tokens degerini logluyor; kesin olcum
Asama 4 kodlamasi baslamadan yapilmalidir.
