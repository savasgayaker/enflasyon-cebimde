# Asama 4 on kayit - veri sunucuya tasiniyor

Tarih: 14 Agu 2026. Taban: fe5fa2f.
Sartname: docs/asama-4-veri-mimarisi-kararlar.md, K1 ile K4.
Veri uretilmeden once commit'lenmistir.

## Amac

Bugun kayitlar yalnizca telefonda. Uygulama silinirse veri gider,
telefon degisirse tasinmaz, ortak fiyat havuzu olusmaz.

**Operasyonel olma noktasi bu asamanin sonudur.**

## Kesifin duzelttigi bir oncul

Blok 16 kapanisi birim alaninin **eksik** oldugunu yaziyordu. Bu
bayat bir devir notuna yaslanmisti; M7-A o isi kapatmisti ve
olcum bunu dogruladi.

**Dogrusu:** alan vardir ve zincir boyunca akar. Backend uretir,
esleme duz gecirir, kayit tipinde bulunur.

**Ancak iki sey acik ve kaydedilir:**

Birincisi, M7-A oncesi cihazda birikmis kayitlarda alan bostur ve
**K1 geregi geri doldurulamaz** - fis goruntusu atildigi icin
yeniden okunamaz. Bu kayitlar sunucuya bos alanla gidecektir.

Ikincisi, alanin cihazda **fiilen dolu geldigi hic olculmedi.**
M7-A metinsel kapilarla dogrulanmisti; calisma zamani kaniti
alinmadi. Bu asamada olculecektir.

## Karar: veritabani Supabase

Sunucu isi bolunur:

    MiniMax vekili    Mac mini    API anahtari sunucuda kalmali
    kimlik            Supabase    zaten orada calisiyor
    veritabani        Supabase    bu turun karari

**Gerekce teknik degil, dayaniklilik.** Tek kisilik bir ekipte
yedekleme disiplini en cok ihmal edilen seydir. Mac mini'de
veritabani kurulursa yedekleme, goc ve surum yukseltme tek kisinin
sirtina biner ve bir gun disk oler.

Kimlik zaten Supabase'de; veri de ayni yerde durursa iliskiler
basit kalir. Ikiye bolunurse her sorgu iki sistemi konusturur.

**Bedeli acikca yazilir:** veri yurt disinda tutulacaktir ve KVKK
icin standart sozlesme evraki gerekir. Bu bir kerelik bir yuktur;
yedekleme sorumlulugu ise sureklidir.

**Kilitlenme yoktur.** Supabase standart Postgres kullanir; tam
yedek alinip baska bir sunucuya tasinabilir.

## K1'in bu asamadaki anlami

Yazma aninda yazilmayan hicbir bilgi sonradan geri getirilemez.
Fis goruntusu diske hicbir kosulda yazilmaz ve cevap alininca
dusurulur.

**Sonuc: sunucu semasina hangi alanlarin girecegi geri donulemez
bir karardir.** Yazma aninda comert, yorumlamada tutucu olunur.

## Turlar

    A4-1  sema tasarimi - kagit uzerinde, kod yok
    A4-2  Supabase tablolari ve satir duzeyi guvenlik
    A4-3  yazma yolu - kayitlar sunucuya gider
    A4-4  okuma yolu ve cihazdaki mevcut verinin gocu
    A4-5  ortak fiyat havuzu (K3)

## Kabul kurali

    A. sema belgelendi ve dort tipi de kapsiyor
    B. tablolar olusturuldu, satir duzeyi guvenlik acik
    C. bir kullanici baskasinin verisini goremiyor - olculdu
    D. cihazda okunan fis sunucuda gorunuyor
    E. cihazdaki mevcut veri kayipsiz tasindi
    F. unit alani cihazda dolu geliyor - calisma zamani kaniti
    G. mevcut aletler yesil, tsc tam uc

**Kapi C pazarliga kapalidir.** Satir duzeyi guvenlik yanlis
kurulursa herkesin fis gecmisi herkese acik olur.

## Kapsam disi

Ortak havuzun istatistiksel esigi - bir urunun havuza kac
gozlemden sonra dahil edilecegi ayri bir karardir.

Cevrimdisi kuyruk. Internet yokken cekilen fisin sonradan
gonderilmesi; simdilik internet gerekli.

Duzenli yedek alma. Supabase'in kendi yedegi ucretsiz planda bir
haftaliktir; kendi yedegimiz ayri bir istir.

Gizlilik politikasi ve hesap silme - dis testci gerektirdiginde.

## Ilan edilmis sapmalar

    (bu satir kapanista silinecek; henuz sapma yok)

### S1 - Depoda cakisan iki sema tanimi bulundu

Tarih: 14 Agu 2026, A4-2 kosumundan sonra tespit edildi.

Goc klasorunde 26 Temmuz tarihli dort eski dosya duruyor ve
**A4-1 kararlariyla dogrudan celisiyorlar:**

    kategori tablosu var        A4-1: kod sabiti, tablo yok
    tekillestirme tablolari var K4 kural 2: saklanmaz, okuma
                                aninda hesaplanir
    magaza tablolari var        A4-1: magaza yalniz metin
    havuz ayri tablo            A4-1: havuz goruntu

Hicbiri uygulanmamistir; proje o sirada bagli degildi.

**Olculen risk:** Supabase araci bir gun goc dosyalarini toplu
uygularsa dosyalar **sozluksel sirayla** calisir. Yeni dosyanin
adi eski dosyalardan once gelir; yani once A4-1 semasi kurulur,
ardindan eski dokuz tablo ustune yazilir ve kararlar fiilen
delinir.

Ikinci risk sessizdir: depo hangi tanimin otorite oldugunu
soylemiyor ve gelecek bir oturum yanlisini secebilir.

**Karar: arsive tasinir, silinmez.**

Silmek yerine tasima secildi cunku o dosyalar bir **dusunce
kaydidir** - Temmuz'da nasil dusunuldugunu ve K4'un neyi
reddettigini gosterirler. Ancak goc klasorunde durmalari araca
verilmis bir emirdir; oradan cikarlar.

Arsiv klasorune bir uyari dosyasi konur.

**Ikinci karar: dosya adi zaman damgali bicime gecer.** Arac
uyumu icin; ayni sozluksel sira sorununun tersini yasamamak icin.

### S2 - Eski taslak veritabaninda FIILEN KURULU cikti

Tarih: 15 Agu 2026, temizlik kosumundan once ilan edildi.

S1 eski goc dosyalarini arsive tasimisti ve **hicbirinin
uygulanmadigi varsayilmisti.** Dogrulama sorgusu bunun yanlis
oldugunu olctu: eski tablolar veritabaninda duruyor.

Kullanici tablosunda on uc satir, kategori tablosunda on bir
satir, digerleri bos. RLS hepsinde acik.

**Sayim uyarisi:** dogrulama sorgusu sekiz ad saydi cunku
listesinde sekiz ad vardi. Arsiv **dokuz tablo** iceriyor; sorgu
birini hic sormadi. Dusurme dokuzunu da kapsar. Bir sayac kendi
listesini sayar - Kural 13 ailesi.

**Tehlikeli olan bir tetikleyici:** auth kullanicisi
olusturuldugunda eski kullanici tablosuna satir yaziyor ve iki
sayim esit olculdu. Tabloyu once dusurmek yeni kullanici kaydini
kirardi; sira tersine olmali.

### S2/a - Ilk iki temizlik taslagi da kusurluydu

**Birinci taslak fonksiyon adlarini elle yazmisti** ve ikisi
arsivdeki gercek adlarla eslesmiyordu; ayrica on kadar fonksiyon
listede hic yoktu. Silme ifadesi var olmayan adi sessizce yutar;
oksuz fonksiyonlar kalirdi ve bazilari dusen tablolara
basvurdugu icin cagrildiginda hata verirdi. Postgres fonksiyon
govdelerini bagimlilik olarak izlemez.

**Ikinci taslak listeyi arsivden uretti ama imzalari da uretti.**
Imza cikarimi yorum icindeki parantezlere takiliyordu: bir
fonksiyonun argüman satirinda parantezli bir aciklama vardi ve
yakalama orada duruyordu. Uretilen imzaya ayrilmis bir sozcuk
siziyor ve **sozdizimi hatasi betigi ortasinda durduruyordu** -
tablolar hic dusmeden. Kismi temizlik en kotu sonuctur.

**Duzeltme: imza hic uretilmez.** Postgres parantezsiz bicimi tek
tanimli adlarda kabul eder ve arsivdeki adlarin hepsinin tek
tanimli oldugu olculdu. Kapi ayrica parantezli imza ve supheli
token arar.

## Karar: eski taslak dusurulur

Kullanilmiyorlar ve A4-1 kararlariyla celisiyorlar. Durmalari iki
zarar veriyor: hangi semanin otorite oldugu belirsiz kaliyor ve
gelecekte bir sorgu yanlis tabloyu okuyabiliyor.

## Kaydedilen iki bilgi

**Temmuz taslaginda havuz onayi alanlari vardi** - havuza katilim
onayi ve onay zamani. Yeni semada yoklar. K3 havuzu ana ozellik
sayiyor; **havuza veri gonderilmeden once onay tasarlanmalidir.**
A4-5'e devredildi.

**Sehir alani da vardi.** Bolgesel fiyat karsilastirmasi ileride
gundeme gelebilir.
