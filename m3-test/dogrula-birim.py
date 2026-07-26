#!/usr/bin/env python3
"""Blok 7-C — kör nokta raporu (dosya DEĞİŞTİRMEZ, yalnız ekrana basar).

1) EŞİT TOPLAM TAKAS RİSKİ: KDV-blok doğrulaması, oran grupları arasında
   toplamı değiştirmeyen takaslara kördür. İki tespit:
   - grup düzeyi: iki farklı oranın grup toplamı eşitse (±0.05)
   - kalem düzeyi: farklı oranlardaki iki kalemin fiyatı eşitse (±0.05)

2) BİRİM MANTIK SAĞLAMASI:
   a. quantity tam sayı değil + önerilen unit adet/paket → ŞÜPHELİ
   b. önerilen unit kg/lt/gr/ml + fişte çarpan satırı yok → ŞÜPHELİ
   c. quantity*unitPrice ≠ totalPrice (±0.05) → ŞÜPHELİ

Kural (b) için 'fişte çarpan satırı var mı' bilgisi fotoğraf incelemesinden
(ONERI-unit-vat.md kanıt sütunu) betiğe gömülüdür — betik fotoğrafa bakamaz.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
GT_DIR = HERE / "ground-truth"
TOL = 0.05
FISLER = ["bim", "migros", "bildirici", "gimsa", "a101", "file"]

# Fotoğrafta miktar/birim ÇARPAN SATIRI basılı kalemler (fiş, kalem indeksi).
# Kaynak: ONERI-unit-vat.md "Kanıt" sütunu (Blok 7 fotoğraf incelemesi).
CARPAN_SATIRI = {
    ("bildirici", 0),   # 3 ADx 1,00
    ("bildirici", 1),   # 1,496 KGx 94,95
    # GİMSA: fiş formatı gereği HER kalemde çarpan satırı var (1 AD / x,xxx KG)
    *{("gimsa", i) for i in range(17)},
    ("a101", 5),        # 6 x1,00 TL/ad
    ("a101", 12),       # 4 x9,75 TL/ad
    ("a101", 20),       # 6 x11,50 TL/ad
    ("file", 0),        # 1.178 kg X 99.90
    ("file", 1),        # 7 ad X 1.00
    ("file", 2),        # 10 ad X 20.90
    ("file", 3),        # 0.822 kg X 289.00
    ("file", 6),        # 2 ad X 79.50
    ("file", 7),        # 1.12 kg X 59.90
    ("file", 11),       # 0.692 kg X 795.00
    ("file", 14),       # 0.158 kg X 375.00
    ("file", 16),       # 2 ad X 49.00
    ("file", 19),       # 2 ad X 92.50
    ("file", 20),       # 0.728 kg X 89.90
}

TARTI_BIRIMLERI = {"kg", "lt", "gr", "ml"}


def main():
    oneri = json.loads((GT_DIR / "ONERI-unit-vat.json").read_text())
    takas_var = False
    supheli = []

    print("=" * 74)
    print("1) EŞİT TOPLAM TAKAS RİSKİ")
    print("=" * 74)
    for fis in FISLER:
        gt = json.loads((GT_DIR / f"{fis}.json").read_text())
        onr = oneri[fis]
        # oran → [(ad, fiyat)]
        gruplar = {}
        for g, o in zip(gt["items"], onr):
            gruplar.setdefault(o["vatRate"], []).append((g["name"], float(g["totalPrice"])))

        oranlar = sorted(gruplar)
        # grup düzeyi
        for i, o1 in enumerate(oranlar):
            for o2 in oranlar[i + 1:]:
                t1 = sum(f for _, f in gruplar[o1])
                t2 = sum(f for _, f in gruplar[o2])
                if abs(t1 - t2) <= TOL:
                    takas_var = True
                    print(f"\nTAKAS RİSKİ (grup düzeyi) — {fis}: %{o1} toplamı {t1:.2f} = %{o2} toplamı {t2:.2f}")
                    print(f"  Bu iki grup KOMPLE yer değiştirse KDV doğrulaması fark edemez.")
                    for o in (o1, o2):
                        for ad, fiyat in gruplar[o]:
                            print(f"    %{o:<3} {fiyat:>8.2f}  {ad}")
        # kalem düzeyi (farklı oranlar arası eşit fiyat)
        for i, o1 in enumerate(oranlar):
            for o2 in oranlar[i + 1:]:
                for ad1, f1 in gruplar[o1]:
                    for ad2, f2 in gruplar[o2]:
                        if abs(f1 - f2) <= TOL:
                            takas_var = True
                            print(f"\nTAKAS RİSKİ (kalem düzeyi) — {fis}: iki kalem fiyatı eşit, oranları takas edilse blok toplamları değişmez")
                            print(f"    %{o1:<3} {f1:>8.2f}  {ad1}")
                            print(f"    %{o2:<3} {f2:>8.2f}  {ad2}")
    if not takas_var:
        print("\n(hiç takas riski bulunamadı)")

    print()
    print("=" * 74)
    print("2) BİRİM MANTIK SAĞLAMASI")
    print("=" * 74)
    for fis in FISLER:
        gt = json.loads((GT_DIR / f"{fis}.json").read_text())
        onr = oneri[fis]
        for idx, (g, o) in enumerate(zip(gt["items"], onr)):
            qty = float(g["quantity"])
            unit = o["unit"]
            up = g.get("unitPrice")
            tp = float(g["totalPrice"])
            # a) kesirli quantity + adet/paket
            if abs(qty - round(qty)) > 1e-9 and unit in ("adet", "paket"):
                supheli.append((fis, g["name"], qty, up, tp, unit, "a"))
            # b) tartı birimi + çarpan satırı yok
            if unit in TARTI_BIRIMLERI and (fis, idx) not in CARPAN_SATIRI:
                supheli.append((fis, g["name"], qty, up, tp, unit, "b"))
            # c) qty * unitPrice ≠ totalPrice
            if up is not None and abs(qty * float(up) - tp) > TOL:
                supheli.append((fis, g["name"], qty, up, tp, unit, "c"))

    if supheli:
        print(f"\n{'FİŞ':10s} | {'KALEM':35s} | {'qty':>7s} | {'unitP':>8s} | {'totalP':>8s} | {'unit':5s} | KURAL")
        print("-" * 96)
        for fis, ad, qty, up, tp, unit, kural in supheli:
            print(f"{fis:10s} | {ad:35s} | {qty:>7g} | {up!s:>8s} | {tp:>8.2f} | {unit:5s} | {kural}")
    else:
        print("\nŞÜPHELİ YOK")

    print()
    print("=" * 74)
    print(f"ÖZET: takas riski {'VAR' if takas_var else 'YOK'}, birim şüphelisi {len(supheli)}")


if __name__ == "__main__":
    main()
