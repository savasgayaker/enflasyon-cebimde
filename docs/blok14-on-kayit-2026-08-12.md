# Blok 14 on kayit - surekli calisma

Tarih: 12 Agu 2026. Taban: bd391c6.
Amac: Mac mini gozetimsiz calissin; tunel ve backend el ile
baslatilmadan ayakta kalsin.
Veri uretilmeden once commit'lenmistir.

## Olculen uc kirilgan halka

**1. Uyku - en kirilgan.** AC gucte uyku suresi bir dakikaya
ayarli. Makinenin su an uyanik kalmasinin tek sebebi bir yardimci
uygulamadir; o kapanirsa makine bir dakika icinde uyur ve tunel
ile backend erisilmez olur.

**2. Docker yeniden baslatmada kalkmiyor.** Otomatik baslatma
kapali ve oturum acilis ogeleri arasinda yok. Compose'daki yeniden
baslatma politikasi dogru ancak Docker arka plani calismadikca
islevsizdir.

**3. Tunel kalici degil.** El ile baslatilmis bir surectir; sistem
servisi kurulu degildir. Terminal kapanirsa veya makine yeniden
baslarsa duser.

## Karar: tunel servisi jeton rotasyonuyla BIRLIKTE kurulur

Kalici servis kurulumu jetonu argüman olarak ister ve sistem
dizinine yazar. Bugunku jeton bir kez ekranda gorunmustur.

**Ikisi tek hamlede yapilir:** panelden jeton yenilenir, eski jeton
gecersiz kalir, yeni jetonla servis kurulur. Boylece hem
kaliciliksizlik hem jeton borcu ayni anda kapanir.

Ayri ayri yapilirsa servis eski jetonla kurulur ve rotasyon
sonrasi yeniden kurmak gerekir.

## FileVault kapali - bilincli odunlesim

Makine yeniden baslatildiginda parola beklemeden acilir. Gozetimsiz
sunucu icin gereklidir: FileVault acik olsaydi elektrik kesintisi
sonrasi disk kilitli kalir ve kimse parola girene kadar hicbir
servis calismazdi.

Bedeli acikca yazilir: **diske fiziksel erisimi olan biri veriyi
okuyabilir.** Makine evde durdugu icin bu risk kabul edilmistir.
Fis fotograflari zaten diske yazilmiyor (K1) ve MiniMax anahtari
gitignore'lu dosyada.

## Elektrik kesintisi

Otomatik yeniden baslatma kapali olcuIdu. Sunucu kullanimi icin
acilmasi degerlendirilecektir; kesinti sonrasi makine kendiliginden
acilmazsa uygulama elle mudahaleye kadar erisilmez kalir.

## Kullanici adimlari - Claude kosamaz

Uc adim da yonetici parolasi veya arayuz etkilesimi gerektirir:

    uyku kapatma        sudo pmset -c sleep 0
    otomatik acilma     sudo pmset -c autorestart 1
    Docker otomatik     Docker Desktop ayarlarindan
    tunel servisi       sudo cloudflared service install <yeni jeton>

Jeton bu sohbete girmez; kurulum komutu dogrudan terminalde
calistirilir.

## Kabul kurali

    A. uyku suresi sifir, otomatik acilma bir
    B. Docker oturum acilisinda kendiliginden basliyor
    C. cloudflared sistem servisi kurulu ve calisiyor
    D. eski jeton gecersiz - panelde tek etkin baglayici
    E. yeniden baslatma sonrasi elle mudahale olmadan:
         saglik ucu ikiyuz
         belge uclari dortyuz
         jetonsuz parse-receipt dortyuzbir
    F. tum aletler yesil, tsc tam uc

**Kapi E asil kanittir** ve yalniz gercek bir yeniden baslatmayla
olculebilir.

## Kapsam disi

Baglama daraltmasi; Metro'nun kalicilastirilmasi - gelistirme
araci oldugu icin gerekmez; izleme ve uyari kurulumu.

### S1 - Kapi E'nin hangi senaryoyu olctugu netlestirildi

Tarih: 12 Agu 2026, ikinci reboot turundan once ilan edildi.

Ilk reboot olcumu kapi E'de RET verdi ve kok neden iki ayri
halkada bulundu.

**Halka 1 - konteyner politikasi.** Yeniden baslatmada Docker
konteyneri temiz durdurdu ve unless-stopped politikasi bunu elle
durdurulmus sayarak geri kaldirmadi.

**Halka 2 - oturum bagimliligi.** Docker Desktop bir **kullanici
uygulamasidir** ve oturum acilmadan kalkmaz. Ilk reboot'ta
kalkmasinin sebebi kullanicinin giris yapmasiydi. Sistem
LaunchDaemon'lari yalnizca ayricalikli yardimcilardir ve sanal
makineyi baslatmazlar.

**Sonuc: kapi E ilk kosumda gozetimsiz senaryoyu hic olcmedi.**
Insan girisli bir yeniden baslatmayi olctu.

## Karar: otomatik giris ve always politikasi

Ikisi birlikte uygulanir.

    otomatik giris    makine acilinca oturum kendiliginden acilir
    restart always    konteyner daemon her kalktiginda geri gelir

**Otomatik girisin gerekcesi FileVault kararinin devamidir.**
FileVault zaten kapalidir; diske fiziksel erisimi olan biri veriyi
okuyabiliyordu. Otomatik giris yeni bir risk sinifi eklemez, ayni
kararin mantiksal sonucudur. Kazanc gozetimsiz calismadir ve bu
Blok 14'un amacidir.

**Elenen secenek - yalniz always.** Insan girisli yeniden
baslatmalarda kapi E'yi gecirir ancak gozetimsiz senaryo acik
kalir. Blok 14 tam olarak o senaryo icin yazilmistir.

**Elenen secenek - oturumsuz konteyner calistiricisi.** Docker
Desktop yerine daemon olarak calisan bir alternatif kurmak tam
cozumdur ancak yeni bir arac zinciri getirir ve ayri bir blok
ister. Bugun gerekmiyor.

**always politikasinin bedeli acikca yazilir:** elle durdurulan bir
konteyner de daemon yeniden baslatildiginda geri gelir. Sunucu
kullanimi icin dogru yondur; gelistirme sirasinda bir konteyneri
kapali tutmak istenirse compose down kullanilir.

## Kapi E yeniden tanimlanir

    E. **fisi cekilmis gibi** yeniden baslatma sonrasi, giris
       ekraninda hicbir sey yapmadan:
         saglik ucu ikiyuz
         belge uclari dortyuz
         jetonsuz parse-receipt dortyuzbir

Olcum yontemi: makine yeniden baslatilir, **kullanici hicbir tusa
basmaz**, otomatik giris beklenir ve ardindan uclar olculur.
