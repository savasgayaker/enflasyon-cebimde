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

## A4-3b dagilimi - 15 Agu 2026, kosumdan once

Yeni saf modul sunucuYazma.ts ve aleti.

**Modul Supabase'i DOGRUDAN CAGIRMAZ.** Bir yazici arayuzu alir.
Boylece alet gercek aga cikmadan modulu olcer; bugune kadar
hicbir saf modul ag cagrisi yapmadi ve desen bozulmuyor.

Modulun isi ikidir: cihaz nesnelerini sunucu satirlarina cevirmek
ve **sirayi yonetmek.** Urunler once, sonra fis, en son fiyat
kayitlari - fiyat kayitlari ikisine de basvurur.

**Dagilim: 0 yesil / 12 kirmizi, sonra 12 yesil / 0 kirmizi.**

    Y1   oturum yoksa yazma denenmez
    Y2   sira dogru: urunler, fis, fiyat kayitlari
    Y3   her satira kullanici kimligi yazilir
    Y4   goruntu yolu gonderilmez
    Y5   para alanlari sayi olarak gider
    Y6   indirim satirinda urun kimligi bos gider
    Y7   birim ve kdv orani bos gecilebilir
    Y8   ham etiket korunur
    Y9   basarida gonderildi dogru doner
    Y10  yazici hata atarsa gonderildi yanlis doner
    Y11  kismi basarisizlikta gonderildi yanlis doner
    Y12  silme fis ve kayitlarina gider, urunlere GITMEZ

**Kismi basarisizlik onemlidir:** urunler gidip fiyat kayitlari
gitmezse fis gonderilmis sayilmaz. Yarim gonderimi basarili
saymak sessiz veri kaybidir.

### S4 - Silme urunlere dokunmaz

Ilk taslak silmenin uc tabloya gitmesini bekliyordu. **Bu veri
yok ederdi ve kosumdan once yakalandi.**

Iki gerekce olculdu:

**Katalog fisler arasi paylasilir.** Bir fis silinince o
kullanicinin baska fislerindeki kayitlarin urunu de yok olurdu.

**Cihaz davranisiyla celisirdi.** Cihazdaki silme akisi fisi ve
fiyat kayitlarini siliyor, urunlere dokunmuyor. Sunucu daha
fazlasini silseydi iki taraf ayrisirdi.

Ayrica mekanik olarak da imkansizdi: silme fonksiyonu yalnizca
fis kimligi aliyor ve urun tablosunda fise bagli bir sutun yok.

**Duzeltilmis beklenti: fiyat kayitlari once, sonra fis.**

### S4/a - Kontrol fonksiyonu asenkron olur

Ilk taslakta olcum cagrisi kontrol fonksiyonunun disindaydi;
iskele istisnasi surecin tamamini oldururdu ve **ozet satiri hic
basilmazdi.** Ilan edilen dagilim olculemezdi.

Kontrol fonksiyonu asenkron yapilir ve olcum kendi try blogunun
icine alinir.

## A4-3c ilani - 15 Agu 2026, kosumdan once

Modul uretim yoluna baglanir ve **ilk kez aga cikilir.**

### Adaptor hata YUTMAZ

Supabase istemcisi hata atmaz; sonuc nesnesinde bir hata alani
dondurur. Adaptor bunu **istisnaya cevirir.**

Aksi halde Y10 ve Y11'in olctugu basarisizlik yolu sessizce oler:
modul hata gormeden basarili doner ve **gonderilmemis fis
gonderildi sayilir.** Sessiz veri kaybinin tam tanimi.

### Bu tur uc yerde degisiklik yapar

    yeni dosya   supabase yazici adaptoru
    kaydetme     gonderim cagrisi ve damga guncellemesi
    silme        sunucudan silme cagrisi

### Olcu

Adaptorun kendisi birim testiyle olculmez; gercek istemciyi
sarar. Olcusu **canli ölcumdur** ve kabul maddeleri C, D, E, F
onu sinar.

Metinsel kapilar: modul cagriliyor mu, hata yutuluyor mu, damga
yaziliyor mu.

### Kaydetme akisi bozulmaz

Gonderim **kaydetmeden sonra** yapilir ve basarisizligi kaydi
engellemez (Karar 1). Kullanici fisini her kosulda kaydeder;
gonderilmemisse damga yanlis kalir.

### S5 - Gonderim beklenir, Alert'ten once

Tarih: 15 Agu 2026, bagla kosumundan once ilan edildi.

Ilk plan gonderimi **beklemeden** baslatmakti; kullanici
beklemesin diye. Capa okumasi bunun riskini gosterdi: basari
uyarisindan sonra ekran degistiriliyor ve **ekran kapaninca
beklenmeyen bir istek yarida kesilebilir.**

O durumda damga hic yazilmaz ve tanimsiz kalir. S3'te uc durumu
ayirmak icin ozellikle ugrasmistik: tanimsiz **bilinmiyor**
demektir, gonderilmedi demek degil. Yarida kesilen bir gonderim
tanimsiz birakirsa o ayrim bozulur.

**Karar: gonderim beklenir ve damga yazilir, sonra uyari
gosterilir.**

Bedeli olculebilir bir gecikmedir: uc yazma cagrisi, saniyenin
altinda. Ag kopuksa modul hata dondurur - firlatmaz - uyari yine
cikar ve kayit yine durur.

**Karar 1 bozulmaz:** kayit gonderimden once yapilir ve gonderim
basarisizligi kaydi engellemez.

### S6 - Ilk bagla yamasi dort kusurla RET aldi

Tarih: 15 Agu 2026, ikinci bagla kosumundan once ilan edildi.

Ilk yama tsc kapisinda durduruldu. Dort kusur olculdu; ikisi
yerlestirme, ikisi anlamsal.

**Yerlestirme bir - import capasi cok satirli import'un ORTASINA
girdi.** Capa satir basindaki import sozcugunu ariyordu ve son
eslesme, cok satirli bir import'un **acilis satiriydi.** Dort yeni
import onun icine gomuldu.

Dogru capa: import bolumunun son **kapanis** satiri.

**Yerlestirme iki - urun biriktirme uclu operatorun ortasina
girdi.** Cagri bir uclu deyimin soru kolundaydi; parantez denge
taramasi cagri kapanisinda durunca eklenen blok iki kol arasina
yerlesti.

Dogru capa: deyimin noktali virgulle biten satiri.

**Anlamsal bir - fis toplami gonderilmiyordu.** Alan istege bagli
oldugu icin derlenirdi ama **sunucuda toplam sifir yazilirdi.**
Sessiz veri bozulmasi.

**Anlamsal iki - oturum edinimi kendi hatasini yutmuyordu.**
Oturum fonksiyonu firlatir ve cagri kayit try blogunun icindeydi;
cevrimdisiyken istisna yerel kayit yakalayicisina duser ve
**kullaniciya fis kaydedilemedi denirdi** - oysa kayit yapilmisti.
Karar 1'in dogrudan ihlali.

Duzeltme: oturum edinimi kendi yakalayicisinda yapilir ve
basarisizlikta kimlik bos gecilir; modul Karar 4 geregi denemeden
doner.

**Ayrica adlar uydurulmustu.** Gercek adlar olcumle alindi:
dongu degiskeni, urun nesnesi, kayit nesnesi, magaza ve tarih
alanlari, oturum fonksiyonunun donus tipi.

### S7 - Satir tipi alani null kabul eder

Tarih: 15 Agu 2026, ucuncu bagla kosumundan once ilan edildi.

Ikinci yama tsc kapisinda durduruldu. Sebep tek bir tip
uyusmazligiydi: modul satir tipini yalnizca metin ya da tanimsiz
kabul ediyordu; cihaz tarafinda alan **null da olabiliyor.**

**Karar: modul tipi genisletilir ve null kabul eder.**

Gerekce: tip beyani cihaz gercegini yansitmalidir. Modul govdesi
zaten null toleranslidir - deger yoksa urun varsayilanina duser -
yani **davranis degismez, yalnizca beyan duzeltilir.**

**Elenen secenek: ekranda null'i tanimsiza cevirmek.** Module
dokunmazdi ama uyusmazligi gizlerdi ve null sessizce tanimsiza
donusurdu. Iki deger farkli seylerdir.

**Alet degismez ve on iki kontrol yesil kalir.** Degisen sey
olcum aleti degil, olculen modulun tip beyanidir.

Ayrica girinti duzeltmesi: urun biriktirme blogu uclu deyimin
devam girintisini almisti; deyim duzeyine cekilir.

### S8 - Silme cevrimici bir islemdir

Tarih: 15 Agu 2026, silme kosumundan once ilan edildi.

Karar 2 silmede de damga mantigini ongoruyordu. **Capa okumasi
bunun imkansiz oldugunu gosterdi:** damganin yazilacagi nesne
silme aninda ortadan kalkiyor. Gonderilmemis bir silmeyi
hatirlayacak yer yok.

Uc yol olculdu:

**Once sunucu, sonra yerel.** Sunucudan silinemezse cihazdan da
silinmez ve kullanici uyarilir. Iki taraf asla ayrismaz; bedeli
cevrimdisiyken silememektir.

**Once yerel, sonra sunucu.** Cevrimdisiyken calisir ama sunucuda
oksuz kayit kalir ve bunu hatirlayacak yer yoktur - **Karar 2'nin
yasakladigi sessiz ayrisma.**

**Mezar tasi.** Silinen kimlik bir listede tutulur ve kuyrukla
supurulur. Dogru cozum ama kuyruk mimarisi bu turda kapsam
disidir.

**Karar: once sunucu, sonra yerel.**

**Karar 1 ile celismez cunku silme kaydetmenin aynasi degildir.**
Kaydetme veri **uretir**; engellenirse kullanici markette fisini
kaybeder ve o an bir daha gelmez. Silme veri **yok eder**;
ertelenmesi kimseyi hicbir seyden mahrum birakmaz. Kullanici
internete kavustugunda siler.

Asimetri budur ve Karar 1'in gerekcesi silmeye tasinmaz.

**Mezar tasi cozumu cevrimdisi kuyruk turuna devredilir.**
