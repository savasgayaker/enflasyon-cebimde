#!/usr/bin/env python3
"""Blok 8 (ek) — Ek 8'in KAYDEDİLMİŞ ham çıktısını (yeni API çağrısı YOK)
unit/vatRate cevap anahtarına karşı puanlar.

Eşleştirme: ada göre — normalizasyon: upper + trim + ardışık boşluk→tek +
sondaki KDV ekini at. Eşleşmeyenler puanlanmaz, ayrı raporlanır.

Eşleme modları (--esleme):
  dar   (varsayılan) yukarıdaki normalizasyon — mevcut davranış
  genis dar + Türkçe katlama (İ→I, Ğ→G, Ü→U, Ş→S, Ö→O, Ç→C) +
        noktalama temizliği (. , ; : - / atılır) + ardışık boşluk→tek.
        Kısaltma açma (K.PEK → KOPUK) YAPILMAZ — yalnız karakter düzeyi.

Puanlama (unit ve vatRate ayrı ayrı):
  DOĞRU  = model değeri anahtar ile aynı
  YANLIŞ = model DEĞER verdi ama anahtardan farklı  (needsReview yakalayamaz!)
  BOŞ    = model null verdi                          (dürüst boşluk)
"""
import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "backend"))
from receipt_fields import strip_kdv_suffix  # sondaki KDV ekini atmak için

VERI = HERE / "results" / "ek8-acceptance-2026-07-26.json"
GT_DIR = HERE / "ground-truth"
FISLER = ["a101", "bildirici", "bim", "file", "gimsa", "migros"]


def norm(ad: str) -> str:
    s = strip_kdv_suffix(ad or "")
    s = s.upper().strip()
    return re.sub(r"\s+", " ", s)


def norm_genis(ad: str) -> str:
    """genis mod: dar + Türkçe katlama + noktalama temizliği (yalnız . , ; : - /)."""
    s = norm(ad)
    for a, b in (("İ", "I"), ("Ö", "O"), ("Ü", "U"), ("Ş", "S"), ("Ğ", "G"), ("Ç", "C")):
        s = s.replace(a, b)
    s = re.sub(r"[.,;:\-/]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--esleme", choices=["dar", "genis"], default="dar")
    args = ap.parse_args()
    n = norm if args.esleme == "dar" else norm_genis

    kayitlar = json.loads(VERI.read_text())
    gts = {f: json.loads((GT_DIR / f"{f}.json").read_text())["items"] for f in FISLER}

    toplam_model_kalem = 0
    eslesen = 0
    eslesen_genis_bilgi = 0  # yalnız dar modda bilgi satırı için

    # alan → sonuç sayaçları (genel + fiş bazında)
    genel = {"unit": Counter(), "vatRate": Counter()}
    fis_bazinda = defaultdict(lambda: {"unit": Counter(), "vatRate": Counter()})
    karisiklik = {"unit": Counter(), "vatRate": Counter()}
    yanlis_vat = Counter()  # (fis, kalem, anahtar, model) → koşum sayısı
    eslesmeyen = {}         # (fis, model adı) → en yakın anahtar adı

    for rec in kayitlar:
        fis = rec["fixture"]
        gt_items = gts[fis]
        havuz = list(range(len(gt_items)))
        havuz_bilgi = list(range(len(gt_items)))
        for mi in rec["resp_items"]:
            toplam_model_kalem += 1
            m_ad = n(mi["name"])
            hit = next((i for i in havuz if n(gt_items[i]["name"]) == m_ad), None)
            if args.esleme == "dar":
                m_ad_g = norm_genis(mi["name"])
                hit_g = next((i for i in havuz_bilgi
                              if norm_genis(gt_items[i]["name"]) == m_ad_g), None)
                if hit_g is not None:
                    havuz_bilgi.remove(hit_g)
                    eslesen_genis_bilgi += 1
            if hit is None:
                import difflib
                adaylar = [gt_items[i]["name"] for i in range(len(gt_items))]
                yakin = difflib.get_close_matches(mi["name"], adaylar, n=1, cutoff=0.0)
                eslesmeyen[(fis, mi["name"])] = yakin[0] if yakin else "(yok)"
                continue
            havuz.remove(hit)
            eslesen += 1
            g = gt_items[hit]
            for alan in ("unit", "vatRate"):
                mv = mi.get(alan)
                gv = g.get(alan)
                if mv is None:
                    sonuc = "BOŞ"
                elif (float(mv) == float(gv)) if alan == "vatRate" else (mv == gv):
                    sonuc = "DOĞRU"
                else:
                    sonuc = "YANLIŞ"
                    karisiklik[alan][(str(gv), str(mv))] += 1
                    if alan == "vatRate":
                        yanlis_vat[(fis, g["name"], gv, mv)] += 1
                genel[alan][sonuc] += 1
                fis_bazinda[fis][alan][sonuc] += 1

    def tablo_satir(c: Counter):
        t = sum(c.values()) or 1
        return (f"DOĞRU {c['DOĞRU']:4d} (%{c['DOĞRU']/t*100:5.1f}) | "
                f"YANLIŞ {c['YANLIŞ']:3d} (%{c['YANLIŞ']/t*100:4.1f}) | "
                f"BOŞ {c['BOŞ']:3d} (%{c['BOŞ']/t*100:4.1f})")

    print("=" * 78)
    print(f"EŞLEŞTİRME (mod: {args.esleme})")
    print("=" * 78)
    print(f"Model kalemi: {toplam_model_kalem} | Eşleşen: {eslesen} "
          f"(%{eslesen/toplam_model_kalem*100:.1f}) | Eşleşmeyen: {toplam_model_kalem - eslesen}")
    if args.esleme == "dar":
        print(f"[bilgi] genis modla eşleşirdi: "
              f"{eslesen_genis_bilgi} (%{eslesen_genis_bilgi/toplam_model_kalem*100:.1f}) — puanlamada KULLANILMADI")

    print()
    print("=" * 78)
    print("a) GENEL TABLO (yalnız eşleşen kalemler)")
    print("=" * 78)
    for alan in ("unit", "vatRate"):
        print(f"  {alan:8s}: {tablo_satir(genel[alan])}")

    print()
    print("=" * 78)
    print("b) FİŞ BAZINDA")
    print("=" * 78)
    for fis in FISLER:
        print(f"  {fis}:")
        for alan in ("unit", "vatRate"):
            print(f"    {alan:8s}: {tablo_satir(fis_bazinda[fis][alan])}")

    print()
    print("=" * 78)
    print("c) KARIŞIKLIK DÖKÜMÜ (anahtar → model : sayı)")
    print("=" * 78)
    for alan in ("unit", "vatRate"):
        print(f"  {alan}:")
        if not karisiklik[alan]:
            print("    (yanlış yok)")
        for (gv, mv), n in karisiklik[alan].most_common():
            print(f"    {gv} → {mv}: {n}")

    print()
    print("=" * 78)
    print("d) YANLIŞ vatRate LİSTESİ")
    print("=" * 78)
    if not yanlis_vat:
        print("  (yanlış vatRate yok)")
    else:
        satirlar = yanlis_vat.most_common()
        for (fis, ad, gv, mv), adet in satirlar[:20]:
            print(f"  {fis:10s} | {ad:35s} | anahtar %{gv} | model %{mv} | {adet} koşum")
        if len(satirlar) > 20:
            print(f"  ... toplam {len(satirlar)} farklı (fiş, kalem, oran) çifti")

    if args.esleme == "genis" and eslesmeyen:
        print()
        print("=" * 78)
        print("EŞLEŞMEYENLER (tekil; en fazla 15 — ürün birleştirme için ham veri)")
        print("=" * 78)
        print(f"  {'MODEL ADI':38s} | {'EN YAKIN ANAHTAR ADI':38s} | FİŞ")
        for (fis, m_ad), yakin in list(eslesmeyen.items())[:15]:
            print(f"  {m_ad:38s} | {yakin:38s} | {fis}")
        if len(eslesmeyen) > 15:
            print(f"  ... toplam {len(eslesmeyen)} tekil eşleşmeyen (fiş, ad) çifti")


if __name__ == "__main__":
    main()
