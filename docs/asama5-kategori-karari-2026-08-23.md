# Asama 5 - kategori ve enflasyon hesabi karari

Tarih: 23 Agu 2026. Durum: **karar kaydi, kod yok.**
Kaynak: TUIK TUFE mal ve hizmet sepeti, 2025 esas yilli.

Bu belge dort seyi karara baglar: kategori taksonomisi, esleme
yontemi, enflasyon hesabi ve sunum dili.

## K6 - Kategoriler TUIK sinifi olur

Uygulamanin kendi on bir kategorisi birakilir; yerine TUIK
siniflari gecer.

Gerekce: mevcut kategoriler cok genis. Gida tek bir kova ve ekmek
de zeytinyagi da oraya duser. **Agirlik verilebilmesi icin
kategori TUIK'in sinifi olmak zorunda** - agirlik yalnizca o
kodlara tanimli.

### Iki alan yazilir, biri ince biri kaba

    madde kodu    yedi hane, TUIK madde listesinden
    sinif kodu    dort hane, madde kodunun ilk dort hanesi

**Madde kodu somuttur ve model icin kolaydir.** Sinif adi soyut
(tahillar ve tahil urunleri), madde adi somut (ekmek). Model
somut olani daha isabetli secer.

**Sinif kodu agirligi tasir ve hesap orada yapilir.**

**Kazanci: hesap seviyesi sonradan degistirilebilir.** Bugun dort
hanede toplaniyor; veri birikince bes haneye inilmek istenirse
kayitlara dokunulmadan yapilir cunku ince bilgi zaten duruyor.

Bu K4 kural ikinin aynisi: hesaplanmis sayi saklanmaz, olgu
saklanir. Madde kodu olgudur; sinif ondan turetilen gruplamadir.

### Olculen kapsama

Fisten gorulebilen siniflar sayildi: gida, alkolsuz icecek,
alkol, tutun, temizlik, evcil hayvan mamasi, kisisel bakim.

    yirmi bir sinif
    toplam agirlik yuzde yaklasik otuz

**Sepetin geri kalani BUGUN fiste gorunmez** - kira, ulastirma,
saglik, egitim, lokanta.

**Bu sayi zamanla buyuyecektir.** Lokanta harcamasi, mobilya
alisverisi, akaryakit fisi ileride eklenebilir; her biri kapsamayi
yukseltir. Kapsama sabit bir sinir degil, **buyuyen bir olcudur.**

## K7 - Ad kalir, kapsama gorunur, aciklama erisilebilir olur

**Ekranda kisisel enflasyon yazar.** Ad degistirilmez.

Iki gerekce:

**Kapsam genisleyecek.** Bugun market sepeti yazilsa yarin
lokanta ve mobilya eklendiginde ad yanlis kalir ve degistirmek
gerekir. Kullanici da neyin degistigini anlamaz.

**Olculen sey gercekten kisiye aittir.** Agirliklar TUIK'ten gelse
de fiyatlar kullanicinin kendi aldigi urunlerden geliyor.

### Ama kapsama ANA EKRANDA gorunur

**Aciklama bolumu tek basina yeterli degildir.** Kullanicilarin
cogu bilgi sayfasini hic acmaz; oranini gorup ekran goruntusu alan
biri o sayiyi sepetin ucte birinden olculmus olarak paylasmaz.

Bu yuzden oranin altinda kapsama satiri bulunur:

    sepetinin yuzde otuz biri olculdu

**Mekanizma zaten vardir.** M6-D'de kapsama orani hesaplanip
ekrana yazildi ve yuzde elli altinda uyari kondu. Bu tur o satiri
kaldirmaz; **TUIK agirliklariyla yeniden anlamlandirir.**

### Aciklama bolumu

Ayri bir sayfada su anlatilir: oranin nasil hesaplandigi, TUIK
rakamindan neden farkli oldugu, hangi harcamalarin dahil olup
hangilerinin olmadigi, ve kapsamanin zamanla buyuyecegi.

**Uc katman birlikte hem sik hem durusttur:** ad kisisel
enflasyon, altinda kapsama, arkasinda aciklama.

## K8 - Eslemeyi model onerir, kullanici duzeltir, surum damgalanir

**Model onerir.** M3 fisi zaten okuyor; prompt'a TUIK madde
listesi eklenir ve model madde kodunu da soyler.

**Kullanici duzeltir.** Arayuzde kategori secici var; duzeltme o
urun icin kalici olur.

**Surum damgalanir.** Her esleme karari hangi kural surumuyle
verildigi yazilarak saklanir.

### Surum damgasi neden zorunlu

K4 kural bir bunu sart kosuyor: esleme kararinin surumu
kaydedilmezse **gecmis yeniden hesaplanamaz.**

Kurallar iyilesecek. Surum yazilmazsa hangi kaydin eski hangisinin
yeni kuralla etiketlendigi bilinmez ve toplu yeniden etiketleme
imkansizlasir.

### Kullanici karari surumu yener

Elle duzeltilmis bir esleme, sonraki surum yeniden kostugunda
**degistirilmez.** Aksi halde kullanicinin duzeltmesi silinir ve
ayni hata geri gelir.

### Iki cop kutusu sinifi

Iki sinif heterojendir ve model onlari siginak olarak kullanma
egilimindedir:

    0119  yemeye hazir gidalar ve baska yerde siniflandirilmamis
    1312  kisisel bakima yonelik malzemeler

**Prompt kurali: emin degilsen BOS BIRAK, cop kutusuna atma.**

Asama 3'un ilkesi burada da gecerlidir: uydurulmus veri, eksik
veriden her zaman kotudur. Bos madde kodu kullaniciya sorulabilir;
yanlis kod sessizce yanlis agirliga girer.

## K9 - Enflasyon sabit donemde, eslesen urun uzerinden hesaplanir

### Elenen yol: gunluk hiza bolmek

Bir onceki tasarim iki alisveris arasindaki fiyat farkini gun
sayisina bolup gunluk hiz cikariyor, sonra otuz veya uc yuz altmis
bes ile carpiyordu.

**Bu matematiksel olarak kiriktir ve olcum yerine alisveris
sikligini olcer.**

Ornek: ekmek on liradan on bir liraya cikti. Iki alisveris arasi
on gun ise yuzde on bolu on esittir gunde yuzde bir, yillik yuzde
uc yuz altmis bes. Ayni degisim yuz gun arayla gorulseydi gunde
yuzde sifir virgul bir, yillik yuzde otuz alti bucuk.

**Ayni fiyat degisimi, on kat farkli sonuc.**

Sebep: fiyatlar surekli degismez, **sicrar.** Ekmek bir gun on,
ertesi gun on bir olur ve uc ay oyle kalir. O sicramayi gunluk hiza
cevirip tekrar carpmak, bir kere olan seyi her gun oluyormus gibi
saymaktir.

Sik alinan urunler siser, seyrek alinanlar sonuk kalir.

### Elenen yol: kategori medyan urunu

Kategorideki medyan urun uzerinden hesaplama onerisi de sapma
uretir.

Ocak'ta pahali ekmek, Subat'ta ucuz ekmek alindi. Kategori medyani
dustu - **ama ekmek ucuzlamadi, farkli urun alindi.**

Buna ikame yanliligi denir.

### Secilen yol

**Sabit donem.** Ay ay karsilastirma. Fiyat sicramasi hangi gune
denk gelirse gelsin ay icinde emilir ve alisveris sikligi sonucu
degistirmez.

**Eslesen urun.** Bir urun hem bu ay hem gecen ay gorunuyorsa
degisimi hesaba girer; gorunmuyorsa girmez. **Urun kendi
gecmisiyle karsilastirilir**, kategorideki baska urunlerle degil.

**Kategori orani** o siniftaki eslesen ciftlerin medyanidir.
Medyan burada dogrudur: aykiri tek bir urun sinifi suruklemez.

**Kisisel oran** kategori oranlarinin TUIK agirliklariyla
ortalamasidir - ancak **yalniz veri bulunan siniflar uzerinden
yeniden normalize edilerek.** Sepetin yuzde kirki gorunuyorsa o
kirk kendi icinde yuze tamamlanir.

**Yilliga cevirme** aylik orandan bilesik olarak yapilir. Iki
aylik veriyle yillik tahmin zayiftir; en az uc dort ay gerekir ve
bu kullaniciya soylenir.

### Kategori icindeki urun cesitliligi sorun degildir

Endise soyleydi: bir sinifa cok farkli urunler girerse hesap
bozulur mu.

**Bozulmaz, cunku sinif icindeki urunler birbiriyle
karsilastirilmiyor.** Ekmek ekmekle, makarna makarnayla esleser;
sinif yalnizca o degisimleri toplayan ve agirliklandiran bir
kovadir.

Karisiklik ancak dogrudan fiyat karsilastirmasi yapilsaydi zarar
verirdi - elenen medyan urun yolu tam olarak o yuzden kiriktir.

### Gercek sorun: seyrek siniflar

Bir sinifta eslesen cift sayisi azsa medyan guvenilmez olur. Kahve
sinifinin agirligi yuzde sifir virgul uc ve kapsaminda iki madde
var; ayda bir kavanoz kahve alan biri icin tek gozlem cikar ve tek
gozlemden medyan olmaz.

**Bu granulerlikten degil veri seyrekliginden gelir.** Bes haneye
inmek kotulestirir, uc haneye cikmak siniflari anlamsizlastirir.

Cozum ortak havuzdur: seyrek siniflarda kendi veri yetmezse havuz
orani kullanilir, **agirlik kullanicinin kendi sepetinden kalir.**

Havuzun istatistiksel esigi bu belgenin konusu degildir.

## Bu belgenin ACMADIGI seyler

Sema degisikligi. Iki yeni alan ve surum damgasi ayri bir turdur.

Mevcut on bir kategorinin gocu. Cihazda ve sunucuda kayitli
kategoriler var; nasil tasinacaklari ayri bir karardir.

Prompt degisikligi ve madde listesinin modele nasil verilecegi.

Motorun yeniden yazilmasi. Mevcut hesap M6'da kuruldu ve bu tasarim
onu degistirir.

Aciklama sayfasinin metni ve tasarimi.

Havuz esigi ve havuzun kendisi.
