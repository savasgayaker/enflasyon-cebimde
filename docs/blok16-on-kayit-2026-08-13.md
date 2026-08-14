# Blok 16 on kayit - EAS build ve TestFlight

Tarih: 13 Agu 2026. Taban: 89ddad5.
Amac: uygulamanin baskalarinin telefonuna kurulabilmesi.
Veri uretilmeden once commit'lenmistir.

## Kesifin olctugu zemin

Hazir olanlar: bundle kimligi tanimli, surum bir sifir sifir,
Turkce izin metinleri yazili, dokuz varlik dosyasinin hepsi
yerinde, eas-cli calisiyor.

Eksik olanlar: eas.json yok, proje bir EAS projesine bagli degil.

## Uc risk kaydediliyor

**Risk bir - ML Kit build'de baglanacak mi.** Paket hala
bagimliliktir ve tek kullanicisi emekli bir servistir. Eklenti
listesinde kayitli degildir; otomatik baglanmaya guveniliyor.

**Dev client'ta calismasi EAS build'de calisacaginin kaniti
degildir.** Ilk build basarisiz olursa en olasi sebep budur.

Bu tur ML Kit'i cikarmaz - emekli ama silinmez karari
frontend/CLAUDE.md'de kayitlidir. Ancak build patlarsa cikarma
karari gundeme gelir.

**Risk iki - ortam degiskenleri build'e girmez.** Uc degisken
gitignore'lu bir dosyada yasiyor ve EAS onu yuklemez. Ayrica
tanitilmalari gerekir.

Ucu de gomulmesi guvenli siniftadir: Supabase adresi, herkese
acik olacak sekilde tasarlanmis anahtar, ve tunel adresi.
**Sir sinifi hicbir deger frontend'e girmez** - gizli anahtarlar
ve servis anahtarlari bu listede yoktur ve olmayacaktir.

**Risk uc - build kredisi tuketir.** Her build sayilidir. Bu
nedenle build komutu **acik onay olmadan kosulmaz**; karar
frontend/CLAUDE.md'de kayitlidir.

## Turlar

    16-A  eas.json ve proje baglama - kullanici girisi gerekir
    16-B  ortam degiskenlerinin EAS'a tanitilmasi
    16-C  ilk build - acik onayla
    16-D  App Store Connect ve TestFlight dahili test

## Kullanici adimlari - Claude kosamaz

    Expo hesabina giris        etkilesimli kimlik dogrulama
    Apple hesabina giris       ayni
    build onayi                kredi tukettigi icin acik onay
    TestFlight davetleri       App Store Connect arayuzu

## Kabul kurali

    A. eas.json olusturuldu ve proje bagli
    B. ortam degiskenleri EAS'ta tanimli, sir sinifi deger yok
    C. build basarili tamamlandi
    D. uygulama TestFlight'ta gorunuyor
    E. **telefona TestFlight'tan kurulan uygulama fis okuyor**
    F. mevcut aletler yesil, tsc tam uc

**Kapi E asil kanittir.** Build'in tamamlanmasi uygulamanin
calistigini kanitlamaz; Expo Go ile calisan bir sey pakette
calismayabilir - ozellikle yerli modul baglanmasi nedeniyle.

## Kapsam disi

Android yayini. Izin listesinde eski tip depolama izinleri
duruyor ve Android gundeme gelirse gozden gecirilir.

Dis testci daveti. Gizlilik politikasi ve uygulama ici hesap
silme gerektirir; ayri bir istir.

App Store yayini. TestFlight dahili test bu blogun sinusdur.

### S1 - 16-B yarim kaldi ve commit mesaji yanlis iddia tasidi

Tarih: 13 Agu 2026, kosumdan sonra tespit edildi.

16-B blogu uc ortam degiskenini uc ortama yazacakti. **Yalnizca
birincisi yazildi.**

**Kok neden:** degiskenler bir dosyadan dongu ile okunuyordu ve
dongunun icinde calisan komut ayni girdi akisini miras aldi.
Komut kalan satirlari yutunca dongu bir tur sonra bitti.

**Ikinci kusur birinciden agir:** dogrulama bolumunun RET dali
yoktu. Eksik sonuc goruldu ama kosum durmadi ve **commit mesaji
uc degiskenin de yazildigini iddia etti.** Iddia o anda yanlisti.

Commit push edilmistir ve tarih degistirilmez. Duzeltme buraya
yazilir: db9ac28 mesajindaki "uc EXPO_PUBLIC degiskeni uc ortama
da yazildi" cumlesi **o an icin yanlistir.** Eksik iki degisken
ayni kosum sonrasi tamamlandi ve uc ortamda uc ad olculdu.

**Kayda gecirilen sinif:** dogrulama kapisiz olursa eksik sonuc
commit mesajina yanlis iddia olarak sizar. Kural 13/h kapinin
yanlis teshis yazmasiydi; bu onun kardesidir - kapinin yoklugu
yanlis iddiayi gecirir.

### S2 - Ilk build'in kok nedeni ve kapinin surum tuzagi

Tarih: 14 Agu 2026, ikinci build denemesinden once ilan edildi.

Ilk build bagimlilik kurulumu asamasinda dustu. **Sebep ML Kit'in
baglanamamasi degildi** - on kayittaki Risk bir henuz sinanmadi
bile; kurulum asamasi ondan once gelir.

**Gercek sebep: kilit dosyasi npm surumleri arasinda farkli
yorumlaniyor.** EAS npm onuncu nesli kullaniyor ve kilitte dort
ic ice kayit ariyor; yerel makinede npm on birinci nesil var ve
ayni zinciri ic ice kayit uretmeden cozuyor. Iki taraf da kendi
acisindan tutarli; kilit yerelde gecerli, EAS'ta gecersiz.

Eksik bildirilen dort paket ML Kit'in ic zincirindendir.

**Ilk taslak bunu bayat kilit sandi ve yanlis bir duzeltme
onerdi.** O taslak kosulsaydi uc sey olurdu: yerel npm kilide
hicbir satir eklemezdi, kapi duzeltmeden once de yesil yanardi
(cunku yerel npm kilidi zaten kabul ediyor), ve commit mesaji
senkronlandi diye yanlis iddia tasirdi. Ikinci build de ayni
hatayla duserdi.

**Kayda gecirilen sinif:** bir kapi, olculen ortamin kullandigi
aletin **ayni surumunu** kullanmalidir. Baska surum olcen kapi
yanlis yesil verir.

Kural 13/m olarak eklenmistir.

## Duzeltilmis mekanik

    kilit EAS ile ayni nesil npm ile yeniden uretilir
    kapi iki kollu: EAS esdegeri npm ve yerel npm
    dort paketin kilitte gorunmesi kirmizidan yesile kanit
    eas.json'a node yirmi iki pini - kilit ureticisiyle EAS'i
      ayni hizaya getirir ve Supabase uyarisini da kapatir
