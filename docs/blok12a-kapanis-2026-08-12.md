# Blok 12-A kapanis - tunel calisiyor

Tarih: 12 Agu 2026. Taban: 4dafa79.
Durum: **KISMI KABUL.** Yedi kabul maddesinden besi kapandi, ikisi
acik ve asagida listelenmistir.

## Ne yapildi

Mac mini'deki backend artik internetten erisilebiliyor.

    alan adi   enflasyoncebimde.com, Cloudflare Registrar, Active
    tunel      enflasyon-mac-mini, dort baglanti, Frankfurt, QUIC
    adres      api.enflasyoncebimde.com  ->  localhost:8000
    yanit      durum ok, auth jwks

Yonlendirici uzerinde port acilmadi. Baglanti disa dogrudur:
Mac mini Cloudflare'e baglanir, disaridan Mac mini'ye baglanti
acilmaz.

## Kapanan kabul maddeleri

    A  cloudflared kurulu ve surum basiliyor
    B  tunel adresinden saglik ucu 200 donuyor
    D  jeton depoda gorunmuyor: gitignore, git status, takipli
       dosyalar ve gecmis - dordu de temiz
    E  Access alan adina konmamis
    G  tum aletler yesil, tsc tam 3

**Access olcumunde bir tuzak vardi ve kayda geciyor:** ilk kontrol
HEAD istegiyle yapildi ve 405 dondu. Bu Access degil, saglik
ucunun yalniz GET kabul etmesidir. Dogru olcum GET istegiyle
yapilir; korumasiz uctan 200 alinmasi Access'in konmadiginin
kanitidir.

## Acik kalan iki madde

**C - tek isci olculmedi.** Konteynerde ps yoktur ve olcum
basarisiz oldu. Kisit gecerliligini koruyor: auth.py satir 141
bellek ici hiz siniri tek isciye baglidir ve tunel dunyaya
acildigi icin bu sinir artik daha da anlamlidir.

Olculmesi Blok 13'e birakildi.

**F - uctan uca olculmedi.** Asil kanit budur: telefon hucresel
veriyle, ev agina bagli olmadan fis okutabilmelidir.

Bu Blok 13'un isidir ve tunelin varlik sebebidir.

## Ogrenilen: panel adlandirmasi

Cloudflare panelinde uc benzer sekme vardir ve ikisi yanlis
yoldur:

    Hostname routes              private, WARP istemcisi gerektirir
    CIDR routes                  ag blogu yonlendirmesi
    Published application routes DOGRU - internetten erisilebilir

Ilk denemede private yola girildi ve uyari metninden anlasildi:
Cloudflare One Client gerektiren bir yapilandirma, uygulamanin
telefonundan erisilemez.

## Guvenlik durumu

Jeton yalniz gitignore'lu cloudflared.env dosyasinda, izinler
kullaniciya ozel. Dogrulamalar bayt ve satir sayimiyla yapildi;
deger hicbir kosumda basilmadi.

Access alan adina konmadi ve konmayacaktir: korumayi Supabase JWT
sagliyor ve Access uygulamanin her istegini kirardi.

## Bilinen ve kapsam disi durumlar

**Baglama daraltmasi yapilmadi.** Backend 8000 portu yerel aga
acik kalmaya devam ediyor. Blok 11 notu bunun 127.0.0.1'e
cekilmesini ongoruyor; tunelin calistigi gorulduguune gore artik
yapilabilir ama ayri turdur.

**Tunel el ile calisiyor.** Terminal kapanirsa veya Mac yeniden
baslarsa tunel duser. Kalici servis kurulumu Blok 14'un konusudur.

**Makinede ilgisiz iki konteyner** kosuyor ve biri 4040 portunu
disa aciyor. Olculdu, kapsam disi.

## Sirada

Blok 13: uygulamanin tunele baglanmasi ve telefondan hucresel
veriyle uctan uca test. M7-A, M7-D ve M8'in bekleyen calisma
zamani kanitlari da orada gorulecek.
