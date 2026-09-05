"""A5-3a - TUIK ad-kod eslemesi aleti."""
from __future__ import annotations

import sys

from tuik_esleme import madde_koduna_cevir, sepet_surumu, uzlastir

_yesil = 0
_kirmizi = 0


def kontrol(etiket, uret, beklenen):
    global _yesil, _kirmizi
    try:
        bulunan = uret()
    except Exception as e:  # iskele istisnasi dahil
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


def calis():
    print("=== TUIK ad-kod eslemesi ===")

    kontrol("T1 gecerli ad koda cevrilir",
            lambda: madde_koduna_cevir("Ekmek")[0], "0111311")

    kontrol("T2 sinif maddenin ilk dort hanesi",
            lambda: madde_koduna_cevir("Ekmek")[1], "0111")

    kontrol("T3 listede olmayan ad REDDEDILIR",
            lambda: madde_koduna_cevir("UYDURMA URUN"), (None, None))

    kontrol("T4 bos ve None girdi None doner",
            lambda: [madde_koduna_cevir(""), madde_koduna_cevir(None)],
            [(None, None), (None, None)])

    kontrol("T5 buyuk kucuk harf tolere edilir",
            lambda: madde_koduna_cevir("EKMEK")[0], "0111311")

    kontrol("T6 bastaki sondaki bosluk tolere edilir",
            lambda: madde_koduna_cevir("  Ekmek  ")[0], "0111311")

    # Turkce harf duyarliligi: Sarap ve Sarap benzer gorunur ama
    # listede yalniz biri var. Yerel bilgisiz donusum bunlari
    # birbirine karistirirsa yanlis urun eslesir (M8 dersi).
    kontrol("T7 Turkce harf duyarli",
            lambda: [madde_koduna_cevir("Sarap")[0],
                     madde_koduna_cevir("Şarap")[0]],
            [None, "0212101"])

    kontrol("T8 uzlastirma ayni ise korunur",
            lambda: uzlastir("Ekmek", "Ekmek"), "Ekmek")

    kontrol("T9 uzlastirma celiskide None",
            lambda: uzlastir("Ekmek", "Yumurta"), None)

    kontrol("T10 uzlastirma biri bossa dolu kazanir",
            lambda: [uzlastir("Ekmek", None), uzlastir(None, "Ekmek")],
            ["Ekmek", "Ekmek"])

    print("")
    print("Toplam: %d yesil kontrol, %d kirmizi kontrol" % (_yesil, _kirmizi))
    sys.exit(0 if _kirmizi == 0 else 1)


if __name__ == "__main__":
    calis()
