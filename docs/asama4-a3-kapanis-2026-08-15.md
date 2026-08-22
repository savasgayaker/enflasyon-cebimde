# A4-3 kapanis - yazma yolu

Tarih: 15 Agu 2026. Taban: 886429c.
Durum: **KABUL, bir acik borcla.**

## Ne degisti

Kayitlar artik sunucuya gidiyor. Fis kaydedilince fis, urunler ve
fiyat kayitlari yaziliyor; fis silinince sunucudan da siliniyor.

**Cihaz artik tek kopya degil.** Uygulama silinse veri sunucuda
kalir.

## Canli olculenler

**Kapi C - fis sunucuda gorunuyor.** Telefonda bir fis okutuldu ve
sunucuda bir fis, sekiz urun, on iki fiyat kaydi goruldu.

**Birim ve KDV alanlari on iki kaydin on ikisinde de doluydu.**
Bu M7-A'dan beri bekleyen kanitti: alan zincirde akiyordu ama
cihazda fiilen dolu geldigi hic olculmemisti. Metinsel kapilarla
dogrulanmisti, calisma zamani olcumu yoktu. **Artik var.**

**Kapi D - silme yansiyor ve S4 dogrulandi.** Fis silindi; fis ve
on iki kayit sunucudan gitti, **sekiz urun kaldi.** S4'te
tartisilan sey buydu: katalog fisler arasi paylasilir ve
silinseydi o kullanicinin baska fislerindeki kayitlarin urunu yok
olurdu. Karar artik olculmus.

**Kapi E - izolasyon, pazarliga kapali.** Iki anonim kullanici,
alti kontrol, hepsi yesil. Uc farkli sinyal ayri ayri olculdu:
okuma inkari bos sonuc, silme inkari kalicilik, yazma inkari
gercek hata.

**Pozitif kontroller olmadan bu olcum yaniltici olurdu:** hicbir
seyin okunamadigi bir durum da sifir satir dondurur ve izolasyon
sanilirdi.

Bu uc olcum kullanicinin cihaz ve panel gozlemleridir; kodun
davranisiyla tutarlidir.

## Acik borc: Kapi F

**Oturumsuz kayit olculmedi.**

Sebep mimaridir: fis okuma internet gerektirir. Internet yoksa
okuma hic olmaz ve kaydetme asamasina gelinmez. **Senaryo bugunku
mimaride olusmuyor.**

Ama olusmadigini soylemek olculdugunu soylemek degildir.

Birim duzeyinde kanit vardir: yazma aletinin birinci kontrolu
oturum yokken yazmanin denenmedigini olcuyor ve yesil. Uctan uca
kanit yoktur.

**Cevrimdisi kuyruk turunda dogal olarak olculecektir.**

## Yedi ilan edilmis sapma

    S3    damga istege bagli, sema surumu birde kalir
    S4    silme urunlere dokunmaz
    S4/a  kontrol fonksiyonu asenkron olur
    S5    gonderim beklenir, uyaridan once
    S6    ilk bagla yamasi dort kusurla RET aldi
    S7    satir tipi alani null kabul eder
    S8    silme cevrimici bir islemdir

## Turun dersi: capa yapinin KAPANISINA baglanir

Bagla yamasi uc kez RET aldi ve ikisi ayni aileden:

**Birinci** - import capasi cok satirli bir import'un **acilis**
satirini sonu sandi ve eklenen satirlar onun icine gomuldu.

**Ikinci** - parantez denge taramasi bir uclu deyimin soru kolunda
durdu ve eklenen blok iki kol arasina yerlesti.

Kural 13/o olarak eklendi.

**Ucuncu RET bir tip uyusmazligiydi** ve dogru duzeltme modulun
beyanini cihaz gercegine cekmekti - ekranda gizlemek degil.

## Yapisal bir duzeltme

Bugun iki kez sapma ilan edildi, sonra yama capa hatasindan
dustu ve **asili bir sapma kaydi kaldi.**

Duzeltme: **capa dogrulamasi ilan commit'inden once kosar.** Capa
tutmazsa hicbir sey yazilmaz. Silme bagla turunda uygulandi.

## Bir sayim daha yakalandi

Bu notun ilk taslagi sapma sayisini **bir fazla** yazmisti.
Kapisi da yalnizca sapma adlarinin varligini ariyordu, madde
saymiyordu - yani **kendi hatasini gecirirdi.**

A4-2'de tam bu sinif icin madde sayan kapi kurulmustu ve burada
uygulanmasi unutulmustu. Duzeltme: sayi **on kayittan olculur** ve
metne oradan yazilir; kapi ilan edilen sozcugu ve madde sayisini
birlikte sinar.

## Kanitlanmayan

Okuma yolu. Uygulama hala cihazdan okuyor; sunucudaki veri
goruntulenmiyor.

Mevcut cihaz verisinin gocu - A4-4.

Cevrimdisi kuyruk ve mezar tasi.

## Sirada

A4-4: okuma yolu ve goc.
