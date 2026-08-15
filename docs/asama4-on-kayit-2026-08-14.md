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

## A4-3 kararlari - 15 Agu 2026, kod yazilmadan once

### Karar 1 - yerel once, sunucu arkadan, ama SESSIZ DEGIL

Kayit her zaman **once cihaza** yazilir. Sunucuya gonderme
ardindan gelir.

**Elenen secenek: hepsi ya hic.** Sunucu yazmasi basarisiz olunca
yerel kaydi da geri almak, internet yokken **fis kaydedilemez**
demektir. Uygulama bugun calisirken yarin calismaz olurdu ve
kullanici en cok ihtiyac duydugu anda - markette, zayif sebekede -
engellenirdi.

**Ama sessiz basarisizlik daha kotudur.** Kullanici verisinin
sunucuda oldugunu saniyorsa ve degilse, telefonunu kaybettiginde
gecmisi de gider.

**Cozum: kayit yerelde durur, gonderilmedigi GORUNUR.** Fis
kaydinda bir gonderim damgasi tutulur; gonderilmemis fisler
kullaniciya isaretle gosterilir.

Damganin kendisi bu turda eklenir; **yeniden gonderme akisi
kapsam disidir** ve cevrimdisi kuyrukla birlikte ele alinir.

### Karar 2 - silme sunucuya yansir

Cihazda silinen fis sunucudan da silinir. Aksi halde cihaz ve
sunucu **sessizce ayrisir** ve kullanici sildigini sandigi verinin
durdugunu bilmez.

Silme de gonderim gibi basarisiz olabilir; ayni damga mantigi
uygulanir.

### Karar 3 - upsert kullanilir

Sema birincil anahtari kullanici arti kimliktir; ayni kayit iki
kez gonderilirse ikincisi birincinin uzerine yazar.

Gerekce: yeniden gonderme guvenli olur. Yoksa her yeniden deneme
catisma hatasi verirdi ve kuyruk mimarisi zorunlu hale gelirdi.

### Karar 4 - kimlik yazma aninda alinir

Semada kullanici sutununun varsayilani yoktur; istemci her satira
kendi kimligini yazar. Oturum bugun fis okuma zincirinde tembel
aciliyor ve ayni desen yazmada da kullanilir.

**Oturum yoksa yazma denenmez** ve kayit gonderilmemis olarak
isaretlenir.

### Kapsam disi

Cevrimdisi kuyruk ve yeniden gonderme akisi. Bu turda yalnizca
**damga** eklenir; gonderilmemis kayitlarin sonradan
gonderilmesi ayri bir istir.

Mevcut yerel verinin gocu - A4-4.

Okuma yolu. Uygulama okumayi cihazdan yapmaya devam eder.

### Olculen bir cift kod

Kaydetme ekrani kimlik uretecini store'dan almak yerine ayni
ifadeyi kopyalayarak kullaniyor. Bu turun konusu degildir ve
devredilir; ancak sunucu kimlikleri bu ureticten geldigi icin
kayda gecirilir.

## A4-3 kabul kurali

    A. gonderim damgasi tipe ve persist'e eklendi
    B. yazma yolu saf modulde, ekran cagirir
    C. fis kaydedilince sunucuda gorunuyor - canli olculdu
    D. silme sunucuya yansiyor - canli olculdu
    E. **iki ayri kullanici birbirinin verisini goremiyor**
    F. oturum yokken kayit yerelde duruyor ve isaretleniyor
    G. mevcut aletler yesil, tsc tam uc

**Kapi E pazarliga kapalidir** ve on kayittaki Kapi C'nin canli
karsiligidir.

### S3 - Damga istege bagli olur, sema surumu birde kalir

Tarih: 15 Agu 2026, A4-3a kosumundan once ilan edildi.

A4-3 kararlari damganin **eklenecegini** yaziyordu ama tipini
belirtmemisti. Karar: **istege bagli alan, sema surumu birde
kalir, goc gerekmez.**

Gerekce olgusal durustluktur. Uc durum vardir ve ucu farklidir:

    tanimsiz   bilinmiyor - kayit damga eklenmeden once yazildi
    yanlis     gonderilmedi - denendi ve olmadi, ya da denenmedi
    dogru      gonderildi

**Zorunlu alan yapip eski kayitlara yanlis yazmak, goc aninda bir
olgu uydurmak olurdu.** O kayitlarin sunucuya gidip gitmedigi
bilinmiyor - cunku sunucuya yazma daha once hic yoktu.

Ayrim ileride ise yarar: cevrimdisi kuyruk yazildiginda
gonderilmemis kayitlar taranacak ve tanimsiz olanlarin da
gonderilmesi gerekecek. Ikisi ayni kovaya konsaydi bu ayrim
kaybolurdu.

**Ikinci alan: gonderim zamani.** Basarili gonderimde yazilir.
Tanisiz kalabilir ve bu normaldir.
