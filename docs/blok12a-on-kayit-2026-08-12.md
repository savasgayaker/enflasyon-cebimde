# Blok 12-A on kayit - alan adi ve Cloudflare Tunnel

Tarih: 12 Agu 2026. Taban: 9efd365.
Amac: Mac mini'deki backend'e internetten erisilebilmesi.
Veri uretilmeden once commit'lenmistir.

## Neden

Backend bugun yalniz ev agindan erisilebiliyor. Ev disinda fis
okutulamiyor; kayitli veriler telefonda durdugu icin gorunuyor ama
yeni okuma yapilamiyor.

Tunel ayrica TestFlight'in **onkosuludur**: testcilerin telefonu
yerel agdaki bir adrese ulasamaz.

## Alan adi

enflasyoncebimde.com, Cloudflare Registrar uzerinden alindi ve
durumu Active. Tunel adresi api alt alan adi olacaktir.

## Tur 0'in olctugu dort kisit

**1. Tek isci zorunlu.** Backend uvicorn ile tek iscide kosuyor ve
auth.py satir 141 bellek ici durumun buna bagli oldugunu soyluyor.
**Tunel arkasinda da bir isci korunur.** Aksi halde kimlik
dogrulama sessizce bozulur; sessiz bozulma en kotu tur.

**2. Frontend kod degisikligi gerektirmez.** config.ts backend
adresini once ortam degiskeninden okuyor, yoksa Metro'nun
hostUri'sinden turetiyor. Tunel adresi degisken olarak verilecek.

**3. CORS degisiklik gerektirmez.** allow_origins yildiz ve
allow_credentials kapali; tunel alan adi zaten kapsaniyor.
Daraltma ayri bir karardir ve bu blokta yapilmaz.

**4. JWT yuzeyi OLCULMEDI.** Tur 0'in grep'i yalniz server.py'yi
taradi ve bulunan tek yetkilendirme basligi MiniMax cagrisina
aitti. Supabase dogrulamasi auth.py'de yasiyor.

Tunel bir ters vekildir ve dogrulamanin degismesi beklenmez, ancak
**beklenmez olcum degildir.** auth.py capasi tunel kurulmadan once
okunur.

## Turlar

    12-A1  cloudflared kurulumu ve auth.py capa okumasi
    12-A2  tunel olusturma, jeton gitignore'lu dosyaya
    12-A3  tunelin baglanmasi ve saglik ucundan dogrulama
    12-A4  uctan uca: telefon hucresel veriyle fis okutur

## Guvenlik kisitlari - pazarliga kapali

**Tunel jetonu asla sohbete girmez.** Jeton dogrudan gitignore'lu
cloudflared.env dosyasina yazilir. Dogrulamalar satir sayimiyla
yapilir; deger hic basilmaz.

**Cloudflare Access alan adina KONMAZ.** Konursa uygulamanin her
istegi kirilir.

**Depo public.** Alan adi ve tunel kimlikleri commit'lenebilir
ancak jeton, anahtar ve parola asla.

## Kapsam disi

**Baglama daraltmasi.** Blok 11 notu compose baglamasinin
127.0.0.1'e cekilmesini ongoruyor. Once tunelin calistigi
gorulmelidir; daraltma ayri turdur. Bugun 8000 portu yerel aga
aciktir ve bu **bilinen bir durumdur.**

Makinede projeyle ilgisiz iki konteyner kosuyor ve biri 4040
portunu disa aciyor. Kapsam disidir; olculdugu icin kaydedilmistir.

**Mac mini'nin surekli acik kalmasi** Blok 14'un konusudur.

## Kabul kurali

    A. cloudflared kurulu ve surum basiliyor
    B. tunel calisiyor ve saglik ucu tunel adresinden 200 donuyor
    C. backend hala tek isciyle kosuyor
    D. jeton depoda gorunmuyor: git ls-files ve grep temiz
    E. Cloudflare Access alan adina konmamis
    F. telefon hucresel veriyle fis okutabiliyor
    G. tum mevcut aletler yesil, tsc tam 3

Kapi F asil kanittir ve yalniz 12-A4'te olculebilir.

## Ilan edilmis sapmalar

    (bu satir kapanista silinecek; henuz sapma yok)
