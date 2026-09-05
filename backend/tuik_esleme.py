"""TUIK madde adi - kod eslemesi.

Saf modul: ag cagrisi yok, dosya yalniz bir kez okunur.

Model prompt'ta madde ADLARINI gorur, kodu gormez. Bu modul donen
adi koda cevirir. Ad listede yoksa **reddedilir** - uydurulmus kod
sessizce yanlis agirliga girer ve enflasyon hesabini bozar.

A5-3a: govde ikinci yarida doldurulur.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, Tuple

_LISTE_YOLU = Path(__file__).parent / "data" / "tuik-sepeti.json"

# Turkce kucuk harf katlamasi.
#
# Python'un lower() metodu yerel bilgisizdir: buyuk I harfini
# noktali i'ye cevirir. Turkcede buyuk I'nin karsiligi NOKTASIZ
# i'dir; noktali I'nin karsiligi ise noktali i'dir.
#
# Yanlis katlama farkli urunleri eslestirir. M8'de ayni tuzak
# cihaz tarafinda olculmustu.
_KATLAMA = {
    "I": "\u0131",   # buyuk I  -> noktasiz i
    "\u0130": "i",   # noktali I -> noktali i
}


def _katla(metin: str) -> str:
    """Turkce duyarli kucuk harfe cevirir ve bosluklari kirpar."""
    cikti = []
    for ch in metin:
        cikti.append(_KATLAMA.get(ch, ch.lower()))
    return " ".join("".join(cikti).split())


def _liste():
    """Listeyi bir kez okur ve ad-kod sozlugunu kurar."""
    global _SOZLUK, _SURUM
    if _SOZLUK is None:
        with open(_LISTE_YOLU, encoding="utf-8") as f:
            d = json.load(f)
        _SURUM = int(d["surum"])
        _SOZLUK = {}
        for m in d["maddeler"]:
            anahtar = _katla(m["ad"])
            # Ayni katlanmis ad iki koda gitmemeli; olcumde
            # tekrar bulunmadi ama sessiz cakismayi engelle.
            if anahtar in _SOZLUK:
                raise ValueError("katlanmis ad cakisti: " + m["ad"])
            _SOZLUK[anahtar] = m["kod"]
    return _SOZLUK


_SOZLUK = None
_SURUM = None


def sepet_surumu() -> int:
    """Listenin surumu; kaynak damgasinda kullanilir (K8)."""
    _liste()
    return _SURUM


def madde_koduna_cevir(ad):
    """Madde adini (madde kodu, sinif kodu) ciftine cevirir.

    Ad listede yoksa (None, None) doner. Bu REDDETME kasitlidir:
    uydurulmus kod sessizce yanlis agirliga girer ve enflasyon
    hesabini bozar; bulunamayan ad yalnizca eksik veridir.
    """
    if not ad or not isinstance(ad, str):
        return (None, None)
    kod = _liste().get(_katla(ad))
    if kod is None:
        return (None, None)
    return (kod, kod[:4])


def uzlastir(a, b):
    """Iki cagrinin madde adini uzlastirir.

    Ayni ise korunur, celisirse None, biri bossa dolu olan kazanir.
    Celiskide None donmesi kasitlidir: iki yanit farkli sey
    soyluyorsa hangisinin dogru oldugu bilinmiyor demektir.
    """
    if a and b:
        return a if _katla(a) == _katla(b) else None
    return a or b or None
