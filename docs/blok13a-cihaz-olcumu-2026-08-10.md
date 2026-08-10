# Blok 13-A - ilk cihaz olcumu (kismi)

Tarih: 10 Agu 2026. Taban: 51416cd.
Ortam: iPhone 15, Expo Go, yerel ag (tunel yok).
Kol: konteyner prompt sha aa0de6a2, diskle esit dogrulandi (S6).

Durum: **KISMI.** M7-A ve M7-D'nin bekleyen kanitlarinin bir kismi
kapandi; dordu hala acik ve asagida ayrica listelenmistir.

## Yontem ve sinirlari

Olcum kullanicinin telefonunda uygulamayi acip uc gercek fis
okutmasi ve ekran goruntusu almasiyla yapildi. On dokuz goruntu
alindi; **hepsi Fis Onizleme ekranindandir.** Kayit sonrasi
ekranlarin goruntusu yoktur.

Kayitlar sunucudan sorgulanamaz: store yalniz AsyncStorage'a
persist ediyor (useAppStore.ts satir 195), store'da ag cagrisi yok,
backend'de kayit alan uc yok (yalniz /status ve /parse-receipt),
Supabase tablo cagrisi yok. Akis yuzde yuz yereldir. Bu nedenle
kayit sonrasi davranis yalniz ekran goruntusuyle olculebilir.

## Kapanan kanitlar

### 1. Uc fisin ucu de dogru okundu

    A101   677,00   11 kalem, indirim -170,00 listede
    Migros 2706,89  21 kalem, dort indirim de listede
    A101   551,00   12 kalem, indirim -130,00

Ucunde de ekranda gorunen toplam cevap anahtariyla birebir aynidir.

### 2. Indirim satiri kirmizi serit uretmiyor

Butun indirim satirlari sari INCELEYIN seridiyle gorundu; hicbirinde
kirmizi FIYAT GIRIN cikmadi. M7-D4'un serit kuralinin cihazdaki
karsiligi budur.

### 3. Indirimli fis kaydedilebiliyor

**M7-D'nin ana iddiasi dogrulandi.** Kullanici Onayla ve Kaydet'e
basti, uygulama incelenmesi gereken kalemler oldugunu bildiren bir
onay sordu, kullanici onayladi ve fisler kaydedildi.

Tur 0'da olculen durum buydu: indirimli fis hic kaydedilemiyordu,
sert kontrol birim fiyati sifirin altindaki kalemi reddediyor ve
akis duruyordu. O engel kalkmistir.

Not: cikan uyari M7-D'nin kaldirdigi engel degildir. Kaldirilan
engel secenek birakmayan bir reddir; bu uyari bayrakli kalem
oldugunda sorulan ve onaylanabilen bir sorudur.

### 4. Ucuncu indirim sekli okundu

A101 551,00 fisinde indirim eksi isaretiyle degil, tutar sonuna D
soneki konarak yazilmis (*130,00-D) ve ayri bir Urun Indirimleri
blogunda duruyor. Model bunu dogru okudu ve toplami tutturdu.

Bu prompt kuralinin **harfine degil anlamina** gore calistigini
gosterir: kural fis toplamina katilan negatif satirdan soz ediyordu,
model negatif isaret aramak yerine toplamdan dusulen satiri buldu.

Tek gozlemdir. Fis dokuzuncu fixture olarak arsive alindi (51416cd)
ve bu davranisin muhafizi odur.

## Olculen iki kusur

### K-1. Aritmetik korlugun gercek ornegi

A101 677,00 fisinde onuncu kalem (CIPS MISIR TACO) ekranda **miktar
2, birim fiyat 31, toplam 62** olarak gorundu. Dogrusu miktar 1,
birim fiyat 62'dir.

Toplam dogru oldugu icin **aritmetik kontrol bunu goremez.** Asama
3'te yapisal korluk diye adlandirilan durumun gercek bir ornegidir.

Capraz kontrol yakaladi: o kalem INCELEYIN ile isaretliydi.

Onemi: kisisel enflasyon birim fiyat uzerinden hesaplanir. 62 yerine
31 kaydedilirse o urunun fiyat serisi yariya iner ve yasanmamis bir
dusus uydurulur. Bayrak burada gercek is yapti.

### K-2. Yanlis alarm orani - Migros'ta 21/21 bayrak

Migros fisinde yirmi bir kalemin yirmi biri de INCELEYIN
isaretliydi. A101'de yalniz hatali kalem isaretliyken.

Yirmi bir bayrak, sifir bayrakla ayni bilgiyi tasir: kullanici hangi
kalemin gercekten sorunlu oldugunu goremez. Asama 3'un acik borcunda
yazili risk gerceklesmistir - bir guvenlik sinyali cok sik yanlis
oterse kullanici ona bakmayi birakir.

Muhtemel sebep B3a'da olculdu: iki paralel cagri Migros'ta ad
varyansinda anlasamiyor. Ayri bir turun konusudur; burada yalniz
kayda gecirilmistir.

## HALA ACIK OLAN DORT KANIT

Bunlar olculmedi ve kapanis notlarindaki listelerden **silinmemistir.**

1. **Sahte urun kirliligi.** Urunler listesinde kampanya adiyla bir
   urun olusup olusmadigi gorulmedi. Beklenen: 10 TL UZERINE SAMPUA
   ve yuzde 25 indirim gibi adlar listede OLMAMALI. BLADE200ML
   listede olmali cunku o gercek bir urundur, ama bir kez.
2. **Ham etiket.** Fis detayinda indirim satirinin kampanya
   etiketiyle mi yoksa bilinmeyen urun olarak mi gorundugu
   gorulmedi.
3. **Dokunma korumasi.** Fis detayinda indirim satirina dokununca
   bir ekran acilip acilmadigi gorulmedi. Acilirsa productId null
   ile product-detail'e gidiliyor demektir ve koruma calismamis
   demektir.
4. **Motor dislamasi.** Ana ekrandaki enflasyon sayisinin indirim
   kayitlarindan etkilenip etkilenmedigi gorulmedi.

Ayrica **M7-A'nin bekleyen kaniti da acik:** unit ve vatRate
alanlarinin cihazda dolu aktigi gorulmedi. Bu alanlar arayuzde
gosterilmiyor, dolayisiyla ekran goruntusuyle de olculemez; ayri bir
yol gerekir.

## Sirada

Dort kanit icin telefonda dort ekrana bakilmasi yeterlidir ve
ayri bir kod turu gerektirmez.

# Ek - 10 Agu 2026, ikinci oturum

Dort acik kanittan **ucu kapandi.** Ekran goruntuleriyle olculdu.

## Kapanan: ham etiket

Fis detayinda indirim satiri kampanya etiketiyle gorunuyor:
10 TL UZERINE SAMPUA, tutar -170,00. Bilinmeyen urun yazmiyor.

hamEtiket alani (M7-D3b-1) cihazda calisiyor. K5'in ucuncu olgusu
fiilen saklaniyor ve ekranda okunuyor.

## Kapanan: dokunma korumasi

Indirim satirina dokunuldugunda hicbir ekran acilmiyor. productId
null oldugu icin router.push cagrilmiyor (M7-D3b-2, S10 karari).

## Kapanan: sahte urun kirliligi

Urunler sekmesindeki katalogda hicbir kampanya adi yok. Aranan
adlarin hicbiri listede degil.

**Daha guclu bir kanit da olculdu.** Uc indirim, bagli olduklari
urunle **ayni adi** tasiyordu. Katalogdaki kayit sayilari:

    urun                    fis satiri  indirim  katalogda
    A.O.C. SADE DONDURMA        2          1      2 kayit
    NAMET DANA DONER            1          1      1 kayit
    BANVIT PLC.SCHNITZEL        1          1      1 kayit

findOrCreateProduct indirim icin cagrilsaydi ad zaten var olan
urunle eslesir ve sayac bir artardi; A.O.C. uc kayit olurdu.
Olmamis.

Bu dolayli degil dogrudan kanittir: kodda findOrCreateProduct
cagrisi ile productId atamasi ayni dala baglidir (M7-D3b-2).
Sayac artmadiysa dal calismis demektir.

**M7-D'nin cekirdek karari cihazda dogrulandi.**

## Acik kalan tek kanit: motor dislamasi

Ana ekranda kisisel enflasyon **-%** gosteriyor. Bu bir hata
degildir; M6-E'de kapsama sifirken uydurma sayi gosterilmemesi
icin boyle tasarlandi.

Ancak **-% motor filtresini KANITLAMAZ.** Motor hicbir sey
hesaplamiyor; filtre calissa da calismasa da ekranda ayni sey
yazardi. Sifir cikti iki durumu ayirt edemez.

Bu kanit ancak enflasyon fiilen hesaplanmaya basladiginda
alinabilir.

## K-3. Urun adi dedup sorunu sahada gerceklesti

Katalogda ayni urun defalarca ayri kayit olmus. Olculen ornekler:

    POSET (3) ve POSET (1) ve MARKET POSET (1)
    ALISVERIS POSETI (2) ve ALISVERIS POSETI (1) ve
      MIGROS PLASTIK POSET (2)
    EKER MEYVELI YOGURT (2) ve EKER MEYVELI YOGURT (2)
    LAVAS GELENEKSEL (2) ve LAVAS GELENEKSEL (1)
    KOZ BIBER (2) ve KOZ BIBER (1)
    BAHARAT SUSAM DIY (2) ve ayni urun DIV olarak (1)
    MIGROS ISLAK HAVLU (1) ve MIGROS ISLAK HAVLU (1)
    CIPS MISIR TACO uc ayri girdi (6, 3, 6 kayit)

Fark cogunlukla **tek bir Turkce harf**: buyuk I ile noktali I,
S ile S-cedilla, G ile yumusak G. M3 ayni urunu kosumdan kosuma
farkli yaziyor.

Asama 3'un acik borcunda yazili risk sahada gerceklesmistir.

**Motoru dogrudan etkiler:** ayni urunun fiyat serisi ikiye
bolununce her parcada tek gozlem kalir ve enflasyon hesaplanamaz.
Ana ekranda -% gorunmesinin sebeplerinden biri muhtemelen budur.

Veri kaybi yoktur: K4 geregi ham adlar saklaniyor ve tekillestirme
sonradan yazilip gecmise yeniden uygulanabilir. Ancak artik gercek
veriyle olculmus bir ornek vardir.

## Kapanan gozlemin durumu

    kanit                        durum
    indirimli fis kaydedilebilir  KAPANDI (ilk oturum)
    serit sari, kirmizi degil     KAPANDI (ilk oturum)
    ucuncu indirim sekli okundu   KAPANDI (ilk oturum)
    ham etiket                    KAPANDI
    dokunma korumasi              KAPANDI
    sahte urun kirliligi          KAPANDI
    motor dislamasi               ACIK - enflasyon hesaplanmali
    M7-A unit ve vatRate          ACIK - arayuzde gosterilmiyor

## Uc kucuk gozlem

1. Indirim satirinda birim fiyat isareti tutarsiz: bir kosumda
   birim 170 ve toplam -170 gorundu, digerinde ikisi de -170.
   Miktar bir iken carpim tutmuyor. Zarar vermiyor cunku
   gecerlilik kontrolu totalPrice'a bakiyor.
2. Urun sayisi indirimi de sayiyor: fis detayi 11 urun diyor,
   dogrusu 10 urun arti 1 indirim.
3. Indirim satirinda kategori secici var ve secilebiliyor.
   Indirimin kategorisi olmamalidir. Kozmetik.

## Sirada

K-3 sıralama karari gerektiriyor: indirimin hangi urune bagli
oldugunu bilmek (M7-C), urunlerin kendisi ikiye bolunmusken
sinirli deger tasir.
