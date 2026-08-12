# Blok 12-B on kayit - belge uclarinin kapatilmasi

Tarih: 12 Agu 2026. Taban: 4a59754.
Tetikleyen: Blok 13 kapanisinda kayda gecen acik yuzey.
Veri uretilmeden once commit'lenmistir.

## Olculen durum

FastAPI varsayilan kurulumla acildi ve uc belge ucu internetten
erisilebilir durumda: docs, redoc ve openapi semasi. Ucu de tunel
adresinden ikiyuz donuyor.

Ifsa edilen sey uc adlari, parametre bicimleri, model alanlari ve
hiz siniri davranisidir. Kritik uc JWT korumalidir ve jetonsuz
istek dortyuzbir doner; yani bu bir acik degil, gereksiz bir
yuzeydir.

## Karar: kosulsuz kapatma

    FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

**Elenen secenek: ortam degiskenli kapi.** Dev'de acik, uretimde
kapali yapmak daha esnek gorunur ancak bugun uretim diye ayri bir
ortam yoktur; tek backend, tek yapilandirma vardir. Ayrimi olmayan
bir ayrim icin mekanizma kurmak olurdu.

Ayrica degisken yanlis ayarlanirsa belge uclari **sessizce acik
kalir** ve bunu kimse fark etmez. Kosulsuz kapatma bu sessiz
basarisizligi ortadan kaldirir.

**Elenen secenek: acik birakmak.** Yuzey kucuk ve kritik uc
korumali; kabul edilebilir bir risk sayilabilirdi. Ancak faydasi
da yoktur: uclari elle denemek icin curl kullaniliyor ve sema
kodda gorunuyor.

## Kaybedilen

Tarayicidan uc denemek. Bedeli kucuktur ve geri alinmasi tek
satirdir.

## Olcum

Test bagimliligi sifirdir; hicbir alet belge uclarina dokunmuyor.
Olcu tunel adresinden alinan yanit kodlaridir.

**Bir kesif blogu guncellenmelidir:** Blok 13 oncesi kesif docs
ucundan ikiyuz bekliyordu. Kapatma sonrasi beklenen dortyuzdur.
Kural 13/c: her olcum kendi olculmus biciminden okunur.

## Kabul kurali

    A. docs, redoc ve openapi ucleri dortyuz donuyor
    B. saglik ucu hala ikiyuz donuyor
    C. jetonsuz parse-receipt hala dortyuzbir donuyor
    D. backend dogrulama aleti dokuz yesil
    E. silme sayisi bir ve silinen satir onceden adlandirilmis

## Kapsam disi

Baglama daraltmasi, tunelin kalici servise alinmasi, Mac mini'nin
surekli acik kalmasi. Ucu de Blok 14'un konusudur.
