"""M7-B3b - indirim satiri dogrulama birim aleti.

Kalicidir. Negatif dali ve tur celiskisi kolayca kirilabilecek
davranislardir; muhafizsiz birakilmaz.

Kosum:  backend/venv/bin/python3 backend/test_dogrulama.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import server

yesil = 0
kirmizi = 0


def kontrol(etiket, iddialar):
    """iddialar: (ad, bulunan, beklenen) uclulerinin listesi.

    Cek ancak tum iddialari tutarsa yesildir. Kirmizida hangi
    iddianin tutmadigi ayri ayri basilir (S9).
    """
    global yesil, kirmizi
    tutmayan = [(a, b, c) for a, b, c in iddialar if b != c]
    if not tutmayan:
        yesil += 1
        print("  yesil   %s" % etiket)
    else:
        kirmizi += 1
        print("  KIRMIZI %s" % etiket)
        for a, b, c in tutmayan:
            print("            %s: bulunan=%r beklenen=%r" % (a, b, c))


def fis(items, toplam):
    return {"storeName": "TEST", "date": "2026-08-09",
            "totalAmount": toplam, "items": items}


def kalem(ad, tp, tip=None, q=1, bf=None):
    d = {"name": ad, "quantity": q, "totalPrice": tp,
         "unitPrice": tp if bf is None else bf}
    if tip is not None:
        d["satirTipi"] = tip
    return d


def dogrula(items, toplam):
    return server.validate_and_flag(fis(items, toplam))


def ilk(sonuc, i=0):
    return (sonuc.get("items") or [])[i]


print("=== grup 1: satirTipi gecisi ===")

s = dogrula([kalem("SAMPUAN", 299.0, "urun"),
             kalem("10 TL UZERINE", -170.0, "indirim")], 129.0)
kontrol("G1.1 alan dolu gelir, tasinir", [
    ("urun satirTipi", ilk(s, 0).get("satirTipi"), "urun"),
    ("indirim satirTipi", ilk(s, 1).get("satirTipi"), "indirim"),
])

s = dogrula([kalem("EKMEK", 15.0)], 15.0)
kontrol("G1.2 alan hic gelmez, urun varsayilir", [
    ("satirTipi", ilk(s).get("satirTipi"), "urun"),
    ("needsReview", ilk(s).get("needsReview"), False),
])

s = dogrula([kalem("EKMEK", 15.0, "sacmalik")], 15.0)
kontrol("G1.3 bilinmeyen deger, urun varsayilir", [
    ("satirTipi", ilk(s).get("satirTipi"), "urun"),
])

print("=== grup 2: negatif dali ===")

s = dogrula([kalem("URUN", 299.0, "urun"),
             kalem("INDIRIM", -170.0, "indirim")], 129.0)
kontrol("G2.1 negatif arti indirim turu, kabul edilir", [
    ("satirTipi", ilk(s, 1).get("satirTipi"), "indirim"),
    ("needsReview", ilk(s, 1).get("needsReview"), False),
])

s = dogrula([kalem("URUN", 299.0, "urun"),
             kalem("BOZUK", -170.0, "urun")], 129.0)
kontrol("G2.2 negatif arti urun turu, kalem bayraklanir", [
    ("satirTipi", ilk(s, 1).get("satirTipi"), "urun"),
    ("needsReview", ilk(s, 1).get("needsReview"), True),
])

s = dogrula([kalem("URUN", 299.0, "urun"),
             kalem("TERS", 170.0, "indirim")], 469.0)
kontrol("G2.3 pozitif arti indirim turu, kalem bayraklanir", [
    ("satirTipi", ilk(s, 1).get("satirTipi"), "indirim"),
    ("needsReview", ilk(s, 1).get("needsReview"), True),
])

print("=== grup 3: tur celiskisi (S4) ===")


def capraz(tip_a, tip_b):
    a = dogrula([kalem("URUN", 299.0, "urun"),
                 kalem("INDIRIM", -170.0, tip_a)], 129.0)
    b = dogrula([kalem("URUN", 299.0, "urun"),
                 kalem("INDIRIM", -170.0, tip_b)], 129.0)
    server.cross_check(a, b)
    return ilk(a, 1)


k = capraz("indirim", "indirim")
kontrol("G3.1 iki yanit da indirim der, indirim kalir", [
    ("satirTipi", k.get("satirTipi"), "indirim"),
    ("needsReview", k.get("needsReview"), False),
])

k = capraz("indirim", "urun")
kontrol("G3.2 celiski, urun secilir ve bayraklanir", [
    ("satirTipi", k.get("satirTipi"), "urun"),
    ("needsReview", k.get("needsReview"), True),
])

k = capraz("indirim", None)
kontrol("G3.3 bir yanitta alan yok, urun secilir ve bayraklanir", [
    ("satirTipi", k.get("satirTipi"), "urun"),
    ("needsReview", k.get("needsReview"), True),
])

print("")
print("Toplam: %d yesil kontrol, %d kirmizi kontrol" % (yesil, kirmizi))
sys.exit(0 if kirmizi == 0 else 1)
