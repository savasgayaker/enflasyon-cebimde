# Blok 14 kapanis - surekli calisma

Tarih: 13 Agu 2026. Taban: a9f2bdd.
Durum: **KABUL.** Zincir gozetimsiz calisiyor.

## Olculen zincir

Elektrik geldiginde hicbir insan mudahalesi olmadan:

    makine acilir          autorestart bir
    oturum acilir          otomatik giris
    Docker kalkar          oturum acilinca baslar
    konteyner kalkar       restart always
    tunel kalkar           LaunchDaemon, boot'ta

Ikinci reboot olcumunde saglik ucu **ilk denemede** ikiyuz dondu;
bekleme veya mudahale gerekmedi.

## Kabul maddeleri

    A  uyku sifir, otomatik acilma bir - reboot sonrasi kalici
    B  Docker kendiliginden kalkti, konteyner saglikli, always
    C  cloudflared LaunchDaemon olarak boot'ta kalkti
    E  saglik ikiyuz, belge uclari dortyuz, jetonsuz istek
       dortyuzbir - hicbiri beklemedi
    F  dokuz alet yesil, tsc tam uc

## Dort yanlis teshis duzeltildi

**Birincisi - uykuyu ne tutuyordu.** Kesif sirasinda makineyi
ayakta tutan sey bir yardimci uygulamaydi ve enerji ayari bir
dakikaydi. Ayar sifira cekildikten sonra **yardimci uygulama
kapatilarak yeniden olculdu** ve makine yine uyumadi. Ayarin
kalici oldugu boylece kanitlandi.

Bu duzeltme kullanicidan geldi ve olcumu gerceklestirdi.

**Ikincisi - ilk reboot neyi olctu.** Ilk yeniden baslatmada
Docker kalkmisti ancak sebep kullanicinin **elle giris yapmasiydi**;
otomatik giris o sirada kapaliydi. Yani ilk olcum gozetimsiz
senaryoyu hic olcmedi. S1 bunu kayda gecirdi ve kapi E yeniden
tanimlandi.

**Ucuncusu - jeton kaydinin kendisi.** Bu notun ilk taslagi
"olculmus bir sizinti yoktur" diye yaziyordu. **Bu, olculmus bir
sizintinin uzerine yazilmis olurdu** ve kosumdan once yakalandi.
Duzeltilmis hali asagidadir.

**Dorduncusu - eksik kayit.** Blok 13'un kapanis notu hic
yazilmamisti; olcum yapilmis ancak kayit blogu kosulmamisti.
Eksiklik bu turun capa kapisi tarafindan yakalandi ve gecikmeli
olarak tamamlandi.

## Jeton durumu - sizinti KAYITLI, rotasyon yapilmadi

Jeton bir kez, surec listesini basan bir arac ciktisiyla **oturum
kaydina girdi** (halka acik depoya degil). Bu o anda ihlal olarak
raporlanmis ve rotasyon onerilmisti.

Panelde yenileme secenegi bulunamadi ve mevcut jetonla devam
edildi. **Bu, kaydedilmis sizintiya ragmen bilincli olarak kabul
edilmis bir risktir.**

Hafifleticiler:

    transkript yerel ve ozel, halka acik depoda degil
    panelde tek etkin baglayici goruldu
    jeton artik dosyadan okunuyor ve surec listesinde gorunmuyor

**Panel secenek sundugunda rotasyon yapilacaktir.**

Servis kurulumunun bir yan kazanci oldu: cloudflared jetonu artik
dosyadan okuyor. Once komut satirinda argumandi ve surec listesini
basan her arac onu gosterebiliyordu - sizintinin mekanizmasi da
buydu.

## Bilincli odunlesimler

**FileVault kapali.** Gozetimsiz sunucu icin gerekli: acik olsaydi
kesinti sonrasi disk kilitli kalir ve kimse parola girene kadar
hicbir servis calismazdi. Bedeli diske fiziksel erisimi olan
birinin veriyi okuyabilmesidir.

**Otomatik giris acik.** FileVault kararinin mantiksal devami;
yeni bir risk sinifi eklemez. Makine evde durmaktadir.

**restart always.** Elle durdurulan konteyner de daemon yeniden
baslatildiginda geri gelir. Gelistirme sirasinda bir konteyneri
kapali tutmak icin compose down kullanilir.

## Kapsam disi ve devredilen

**Baglama daraltmasi.** Sekiz bin portu yerel aga acik kalmaya
devam ediyor. Tunel calistigina gore artik daraltilabilir.

**Izleme ve uyari.** Servis dustugunde kimse haberdar olmuyor.

**Jeton rotasyonu.** Panel secenek sundugunda yapilacak.

**Metro kalicilastirilmadi** ve gerekmiyor; gelistirme aracidir.

## Sirada

EAS build ve TestFlight dahili test. M7-C indirim baglanti kurali
da bekliyor.
