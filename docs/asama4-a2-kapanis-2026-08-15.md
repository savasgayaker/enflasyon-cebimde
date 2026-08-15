# A4-2 kapanis - tablolar ve satir duzeyi guvenlik

Tarih: 15 Agu 2026. Taban: d3c02f8.
Durum: **KABUL.** On kayittaki Kapi B kapandi.

## Olculen

Dogrulama sorgusu tam on iki satir dondurdu ve **eski taslaktan
tek bir nesne kalmadi.**

    YENI_TABLO               dort
    POLITIKA                 dort, hepsi using ve with check dolu
    RLS                      dort, hepsi acik
    ESKI_TABLO_KALDI         sifir
    ESKI_FONKSIYON_KALDI     sifir
    ESKI_TETIKLEYICI_KALDI   sifir

Sorgunun listeleri arsivden uretildi; yirmi yedi eski adin
tamaminin sorulmus oldugu ayrica olculdu.

## Bu turun asil dersi: listeler ve sayaclar

Bu turda ayni aileden **bes olay** yasandi. Ucu kosumu durdurdu,
biri bir varsayimi devirdi, biri kosumdan sonra yakalandi:

**Bir - eski taslak fiilen kurulu cikti** (varsayimi deviren).
S1 goc dosyalarini arsive tasirken hicbirinin uygulanmadigini
**varsaymisti.** Olcum tersini gosterdi: dokuz tablo, on iki
fonksiyon ve alti tetikleyici veritabaninda duruyordu.

**Iki - fonksiyon adlari uydurulmustu** (kosumu durdurdu). Ilk
temizlik taslagi dusurme listesini elle yazdi; iki ad yanlisti ve
on kadar fonksiyon listede hic yoktu. Silme ifadesi var olmayan
adi sessizce yutar; oksuz fonksiyonlar kalirdi.

**Uc - imza uretimi yorumdaki paranteze takildi** (kosumu
durdurdu). Ikinci taslak listeyi arsivden uretti ama imzalari da
uretti. Bir fonksiyonun argüman satirinda parantezli bir aciklama
vardi; yakalama orada durdu ve uretilen imzaya ayrilmis bir
sozcuk sizdi. Sozdizimi hatasi betigi **ortasinda** durdururdu -
tablolar hic dusmeden.

**Dort - dogrulama sorgusu kendi listesini sayiyordu** (kosumdan
sonra yakalandi). Sekiz ad sordu ve sekiz ad buldu; arsivde dokuz
tablo vardi. Sorgu sonradan arsivden yeniden uretildi.

**Bes - sayim kapisinin kendisi ayni tuzaga dustu** (kosumu
durdurdu). Bu notun sayim tutarliligini olcen kapi, sinif
etiketlerini birebir dize olarak ariyordu; metnin satir
kaydirmasi iki etiketi ortadan bolmustu ve kapi kendi kosumunu
RET etti. Icerik dogruydu, desen metnin gercek bicimine karsi
dogrulanmamisti.

Kapi artik metni bosluk-normalize ederek sayiyor.

**Ortak ders: bir liste elle yazilirsa eksik olur ve bir desen
metnin gercek bicimine karsi dogrulanmazsa yaniltir.** Cozum
listeyi bagimsiz kaynaktan uretmek, kapiyi ayni kaynaga karsi
kosmak ve sayimi bicimden bagimsiz yapmaktir.

## Kararlar uygulandi

    kimlikler metin, birincil anahtar kullanici arti kimlik
    para numeric on iki virgul iki, miktar uc haneli
    goruntu yolu semada YOK
    urunler kullaniciya ait
    RLS dort tabloda, hem okuma hem yazma kilitli

**with check ozellikle onemliydi:** onsuz bir kullanici
baskasinin adina satir yazabilirdi - okuyamaz ama yazabilirdi.
Dort politikada da dolu oldugu olculdu.

## Kanitlanmayan sey

**Izolasyon canli olarak sinanmadi.** RLS acik ve politikalar
dogru yazilmis gorunuyor, ancak **iki ayri kullaniciyla gercek
bir deneme yapilmadi.**

On kayittaki Kapi C budur ve pazarliga kapalidir. A4-3'te veri
yazilmaya baslayinca olculecektir.

## Sirada

A4-3: yazma yolu. Kayitlar cihazdan sunucuya gidecek.
