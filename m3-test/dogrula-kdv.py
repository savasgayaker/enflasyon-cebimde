#!/usr/bin/env python3
"""ONERI-unit-vat.json'daki vatRate önerilerini fişlerin KDV döküm
bloklarıyla (kdv-bloklari.json) aritmetik olarak doğrular.

Fiyatlar ground-truth/<fis>.json'dan alınır (ONERI'den ASLA alınmaz);
öneri yalnız oran gruplamasını belirler. Böylece önerilen oranlar yanlışsa
grup toplamları fişte basılı bloklarla tutmaz ve fiş KALIR.

Kullanım: python3 dogrula-kdv.py [--kaynak=oneri|groundtruth]
  oneri       (varsayılan) oranlar ONERI-unit-vat.json'dan
  groundtruth oranlar ground-truth/<fis>.json kalemlerindeki vatRate'ten
              (Blok 7-D sonrası — yazımın aritmetiği koruduğunun teyidi)
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
GT_DIR = HERE / "ground-truth"
TOLERANS = 0.05  # oran grubu başına TL

FISLER = ["bim", "migros", "bildirici", "gimsa", "a101", "file"]


def beklenen_deger(grup_toplami_brut: float, oran: int, tur: str) -> float:
    """Önerilen gruba göre, fişin 'tur' formatında basması gereken değer."""
    if tur == "brut":
        return grup_toplami_brut
    if tur == "matrah":
        return grup_toplami_brut * 100 / (100 + oran)
    if tur == "kdv_tutari":
        return grup_toplami_brut * oran / (100 + oran)
    raise ValueError(f"bilinmeyen tur: {tur}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kaynak", choices=["oneri", "groundtruth"], default="oneri")
    args = ap.parse_args()

    if args.kaynak == "oneri":
        oneri = json.loads((GT_DIR / "ONERI-unit-vat.json").read_text())
    else:
        # ground-truth kalemlerinden aynı şemaya ({name, unit, vatRate}) indirge
        oneri = {}
        for fis in FISLER:
            gt_items = json.loads((GT_DIR / f"{fis}.json").read_text())["items"]
            oneri[fis] = [
                {"name": i["name"], "unit": i.get("unit"), "vatRate": i.get("vatRate")}
                for i in gt_items
            ]
    kdv = json.loads((GT_DIR / "kdv-bloklari.json").read_text())

    kalan = []
    print(f"{'FİŞ':10s} | {'ORAN':>4s} | {'KALEM':>5s} | {'HESAPLANAN':>10s} | {'FİŞTE YAZAN':>11s} | {'FARK':>7s} | SONUÇ")
    print("-" * 78)

    for fis in FISLER:
        gt = json.loads((GT_DIR / f"{fis}.json").read_text())
        onr = oneri[fis]
        blok = kdv[fis]
        tur = blok["tur"]

        if tur == "BELIRSIZ":
            print(f"{fis:10s} |  --  |  --   |     --     |     --      |   --   | ATLANDI (tur belirsiz)")
            kalan.append((fis, "tur BELIRSIZ"))
            continue

        # a) kalem sayısı
        if len(gt["items"]) != len(onr):
            print(f"{fis:10s} |  --  | {len(gt['items'])}≠{len(onr)} |     --     |     --      |   --   | KALDI (kalem sayısı)")
            kalan.append((fis, f"kalem sayısı {len(gt['items'])} ≠ {len(onr)}"))
            continue

        # b+c) fiyat GT'den, gruplama öneriden
        gruplar = {}
        for gt_item, on_item in zip(gt["items"], onr):
            oran = on_item["vatRate"]
            gruplar[oran] = gruplar.get(oran, 0.0) + float(gt_item["totalPrice"])

        # d) fişteki bloklarla karşılaştır — iki yönlü oran birleşimi
        fis_bloklari = {int(k): float(v) for k, v in blok["bloklar"].items()}
        tum_oranlar = sorted(set(gruplar) | set(fis_bloklari))
        fis_gecti = True
        for oran in tum_oranlar:
            hesap = beklenen_deger(gruplar.get(oran, 0.0), oran, tur)
            yazan = fis_bloklari.get(oran, 0.0)
            fark = hesap - yazan
            ok = abs(fark) <= TOLERANS
            if not ok:
                fis_gecti = False
            kalem_sayisi = sum(1 for o in onr if o["vatRate"] == oran)
            print(f"{fis:10s} | %{oran:<3d} | {kalem_sayisi:5d} | {hesap:10.2f} | {yazan:11.2f} | {fark:+7.2f} | {'✓' if ok else '✗ KALDI'}")

        # e) genel toplam
        genel_hesap = sum(float(i["totalPrice"]) for i in gt["items"])
        genel_yazan = float(blok["genel_toplam"])
        genel_fark = genel_hesap - genel_yazan
        genel_ok = abs(genel_fark) <= TOLERANS
        if not genel_ok:
            fis_gecti = False
        print(f"{fis:10s} | GNL  | {len(onr):5d} | {genel_hesap:10.2f} | {genel_yazan:11.2f} | {genel_fark:+7.2f} | {'✓' if genel_ok else '✗ KALDI'}")

        if not fis_gecti:
            kalan.append((fis, "aritmetik uyuşmazlığı (yukarıdaki ✗ satırları)"))

    print("-" * 78)
    if not kalan:
        print("TÜM FİŞLER GEÇTİ")
        return 0
    print("KALAN FİŞLER:")
    for fis, neden in kalan:
        print(f"  - {fis}: {neden}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
