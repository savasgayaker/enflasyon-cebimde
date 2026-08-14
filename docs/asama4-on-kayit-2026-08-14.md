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
