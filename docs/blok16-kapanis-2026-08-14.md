# Blok 16 kapanis - TestFlight

Tarih: 14 Agu 2026.
Durum: **KABUL.** Alti kabul maddesi de gecti.

## Olculen

Uygulama TestFlight uzerinden telefona kuruldu ve **gercek bir fis
okudu ve kaydetti.**

Bu Expo Go degildir. Metro yoktur, kod pakettedir, ortam
degiskenleri derleme sirasinda gomulmustur ve yerli moduller
paketle birlikte baglanmistir.

    A  eas.json olusturuldu, proje EAS'a bagli
    B  uc ortam degiskeni uc ortamda, kapiyla olculdu
    C  build basarili
    D  uygulama TestFlight'ta
    E  TestFlight'tan kurulan uygulama fis okudu
    F  aletler yesil, tsc tam uc

## Risk bir sinandi ve gecti

On kayit ML Kit'in yerli baglanmasini bir risk olarak yazmisti:
paket eklenti listesinde kayitli degildi ve otomatik baglanmaya
guveniliyordu.

**Sinandi ve gecti.** Build'in yerli derleme asamalari sorunsuz
tamamlandi. Dev client'ta calismasinin kanit olmadigi dogruydu -
ama bu kez sonuc olumluydu.

## Uc build harcandi, ikisi ogretti

**Birinci build - Apple hesabinda bekleyen maddeler.** Lisans
sozlesmesi ve ticari statu beyani tamamlanmamisti. Derleme hic
baslamadi.

**Ikinci build - kilit dosyasi.** Bagimlilik kurulumu asamasinda
dustu. Sebep ML Kit degildi: kilit dosyasi npm surumleri arasinda
farkli yorumlaniyordu. S2'de kayitli.

**Ucuncu build - basarili.**

## Yol boyunca ogrenilen uc sey

**Kapinin surum tuzagi (Kural 13/m).** Kilit sorununun ilk teshisi
yanlisti ve onerilen duzeltme yerel npm ile olculecekti. Yerel npm
kilidi zaten kabul ediyordu; kapi duzeltmeden once de yesil
yanacakti ve commit yanlis iddia tasiyacakti.

**Elle silmek yetmez, ureteni kapatmak gerekir.** Mikrofon izni
16-B'de listeden silinmisti ancak arac bir sonraki turetmede geri
yazdi. Yanlis dugmeye basilmisti: kullanilan ayar iOS izin
metnini yonetiyordu, Android iznini degil.

**Dongu icindeki komut girdi akisini yutar (Kural 13/k).** Uc
ortam degiskeninden yalnizca biri yazilmisti ve dogrulama kapisiz
oldugu icin commit mesaji yanlis iddia tasidi (Kural 13/l).

## Bu blogun KANITLAMADIGI sey

**TestFlight operasyonel demek degildir.**

Kayitlar hala yalnizca telefonda. Sunucuya gitmiyor, ortak fiyat
havuzu olusmuyor, uygulama silinirse veri gidiyor.

Testciler fis okuyacak ve kendi telefonlarinda biriktirecek; o
veri hicbir yere ulasmayacak. **TestFlight arayuz ve okuma
testidir, veri toplama degil.**

Operasyonel olma noktasi Asama 4'un sonudur.

## Devredilen

Dis testci daveti - gizlilik politikasi ve uygulama ici hesap
silme gerektirir.

Android yayini. Ilk build kosumu mikrofon iznini geri yazmisti ve
dogru dugmeyle kapatildi; Android gundeme gelirse izin listesi
butunuyle gozden gecirilir.

App Store yayini.

## Sirada

**Asama 4 - veri mimarisi.** Sema yazili degil ama fiilen vardir;
kalici hale getirilmeli. Iki acik soru bekliyor: birim alani
eksik ve K1 geregi sonradan geri getirilemez, ve sunucunun nerede
duracagi kararlastirilmadi.
