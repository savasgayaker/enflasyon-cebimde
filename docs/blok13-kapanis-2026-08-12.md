# Blok 13 kapanis - uctan uca, hucresel veriyle

Tarih: 12 Agu 2026.
Durum: **KABUL.** 12-A'nin acik kalan kabul maddesi F kapandi.

**Not:** bu belge gecikmeli yazilmistir. Olcum 12 Agustos'ta
yapildi ancak kayit blogu o gun kosulmadi ve eksiklik Blok 14
kapanisinda capa kapisi tarafindan yakalandi. Icerik olcum
anindaki gozlemlerdir.

## Olculen

Telefon **Wi-Fi kapali, hucresel veri acik** durumda:

    uygulama Metro tunelinden yuklendi
    fis fotografi cekildi
    backend Mac mini'de, Cloudflare Tunnel arkasinda
    fis dogru okundu
    fiste indirim vardi ve o da dogru okundu

Ev agina hicbir baglanti yoktu. Tunelin varlik sebebi
kanitlanmistir.

## Kod degisikligi gerekmedi

config.ts zaten EXPO_PUBLIC_BACKEND_URL degiskenine oncelik
veriyordu; degisken frontend/.env dosyasina yazildi.

Degisken yorumlanirsa uygulama Metro'nun hostUri'sinden LAN
adresini turetir ve ev agi moduna doner. Iki mod arasinda gecis
tek satirlik.

## Metro de tunellendi

Gelistirme modunda uygulama Metro'dan yuklenir ve Metro yerel
agdadir. Bu nedenle expo start --tunnel kullanildi; aksi halde
telefon backend'e ulasir ama uygulamanin kendisini yukleyemezdi.

Bu yalniz gelistirme kisitidir. TestFlight yayininda uygulama
pakette gelir ve Metro gerekmez.

## Yan kanit

Bu kosum M7 ve M8'in cihaz kanitlarini da tazeledi: indirimli fis
tunel arkasinda da dogru okundu ve kaydedildi.

## Acik kalan ve devredilen

**Tek isci calisma zamaninda olculmedi.** Kisit Dockerfile satir
kirkta sabittir ve gerekce yorumu otuzaltinci satirdadir; statik
kanit vardir, calisma zamani olcumu yoktur.

**docs ucu internetten erisilebilir.** Blok 12-B'de kapatildi.

**Tunel el ile calisiyor.** Blok 14'te kalici servise alindi.

**Baglama daraltmasi yapilmadi.** Backend sekiz bin portu yerel
aga acik.
