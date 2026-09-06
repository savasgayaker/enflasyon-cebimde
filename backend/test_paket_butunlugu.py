"""A5-3/S1 - paket butunlugu aleti.

Uretim kodunun ihtiyac duydugu her sey imaja giriyor mu.

Dockerfile dosyalari adla kopyaliyor; elle yazilan bir liste
eksik kalir ve konteyner acilista coker. Bu alet listeyi kodun
KENDISINDEN turetir: uretim giris noktasindan import agacini
yurur ve okunan veri izlerini tarar.

Sinir: gereksinim import grafigi uzerinden turetilir. Uretimden
henuz import edilmeyen bir modul bugun gorunmez; baglandigi anda
kapi onu ister.
"""
from __future__ import annotations

import ast
import sys
from pathlib import Path

_KOK = Path(__file__).parent
_GIRIS = "server.py"

_yesil = 0
_kirmizi = 0


def kontrol(etiket, uret, beklenen):
    global _yesil, _kirmizi
    try:
        bulunan = uret()
    except Exception as e:
        _kirmizi += 1
        print("  KIRMIZI " + etiket)
        print("            istisna: " + repr(e))
        return
    if bulunan == beklenen:
        _yesil += 1
        print("  yesil   " + etiket)
    else:
        _kirmizi += 1
        print("  KIRMIZI " + etiket)
        print("            bulunan=%r" % (bulunan,))
        print("            beklenen=%r" % (beklenen,))


def _yerel_moduller(giris=_GIRIS, gorulen=None):
    if gorulen is None:
        gorulen = set()
    if giris in gorulen:
        return gorulen
    gorulen.add(giris)
    yol = _KOK / giris
    if not yol.exists():
        return gorulen
    for d in ast.walk(ast.parse(yol.read_text(encoding="utf-8"))):
        adlar = []
        if isinstance(d, ast.Import):
            adlar = [a.name for a in d.names]
        elif isinstance(d, ast.ImportFrom) and d.module and d.level == 0:
            adlar = [d.module]
        for a in adlar:
            aday = a.split(".")[0] + ".py"
            if (_KOK / aday).exists():
                _yerel_moduller(aday, gorulen)
    return gorulen


def _veri_izleri():
    bulunan = set()
    for m in _yerel_moduller():
        yol = _KOK / m
        if not yol.exists():
            continue
        metin = yol.read_text(encoding="utf-8")
        for parca in metin.split('"'):
            if parca.endswith(".json") and "/" not in parca:
                bulunan.add(parca)
        if '"data"' in metin:
            bulunan.add("data")
    return bulunan


def _dockerfile():
    return (_KOK / "Dockerfile").read_text(encoding="utf-8")


def calis():
    print("=== paket butunlugu ===")
    df = _dockerfile()
    mod = sorted(_yerel_moduller())
    veri = sorted(_veri_izleri())
    print("  yerel modul (%d): %s" % (len(mod), mod))
    print("  veri izi (%d): %s" % (len(veri), veri))
    print("")

    kontrol("D1 her yerel modul kopyalaniyor",
            lambda: [m for m in sorted(_yerel_moduller()) if m not in _dockerfile()],
            [])

    kontrol("D2 veri dosyasi kopyalaniyor",
            lambda: [v for v in sorted(_veri_izleri()) if v not in _dockerfile()],
            [])

    print("")
    print("Toplam: %d yesil kontrol, %d kirmizi kontrol" % (_yesil, _kirmizi))
    sys.exit(0 if _kirmizi == 0 else 1)


if __name__ == "__main__":
    calis()
