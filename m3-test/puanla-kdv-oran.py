#!/usr/bin/env python3
"""Ek 12 puanlayıcı — acceptance_dual.py'nin HAM çıktısını cevap anahtarıyla
karşılaştırır.

Neden ayrı betik: bir değişikliği ölçtüğümüz turda ölçüm aletini de
değiştirirsek, çıkan farkın koddan mı aletten mi geldiğini ayıramayız.
Bu yüzden acceptance_dual.py ve run_test.py'ye DOKUNULMAZ; bu betik yalnız
diske yazılmış sonucu okur. Aynı betik hem Ek 10 arşivine hem Ek 12 turuna
uygulanır — iki tur ancak böyle gerçekten karşılaştırılabilir.

Kullanım:  python3 puanla-kdv-oran.py acceptance_results.json "Ek 12"
"""
import json, sys, re, difflib
from collections import Counter, defaultdict

TR = str.maketrans("ıİşŞğĞüÜöÖçÇ", "IISSGGUUOOCC")

def anahtarla(ad):
    a = (ad or "").translate(TR).upper()
    a = re.sub(r"%\s*\d+", " ", a)
    a = re.sub(r"[^A-Z0-9]+", " ", a)
    return " ".join(a.split())

def oran(v):
    return None if v is None else round(float(v), 2)

def gt_yukle(fixture, onbellek={}):
    if fixture not in onbellek:
        with open("ground-truth/%s.json" % fixture, encoding="utf-8") as f:
            onbellek[fixture] = json.load(f).get("items", [])
    return onbellek[fixture]

def esle(resp_items, gt_items):
    gt_anahtar = [anahtarla(g.get("name")) for g in gt_items]
    kalan = list(range(len(gt_items)))
    eslesen, bosta = [], []
    for r in resp_items:
        ra = anahtarla(r.get("name"))
        bulundu = next((i for i in kalan if gt_anahtar[i] == ra), None)
        if bulundu is None:
            bosta.append((r, ra))
        else:
            kalan.remove(bulundu)
            eslesen.append((r, gt_items[bulundu]))
    for r, ra in list(bosta):
        en_iyi, skor = None, 0.0
        for i in kalan:
            s = difflib.SequenceMatcher(None, ra, gt_anahtar[i]).ratio()
            if s > skor:
                en_iyi, skor = i, s
        if en_iyi is not None and skor >= 0.80:
            kalan.remove(en_iyi)
            eslesen.append((r, gt_items[en_iyi]))
            bosta.remove((r, ra))
    return eslesen, [r for r, _ in bosta], len(kalan)

def main():
    yol = sys.argv[1] if len(sys.argv) > 1 else "acceptance_results.json"
    etiket = sys.argv[2] if len(sys.argv) > 2 else yol
    kayitlar = json.load(open(yol, encoding="utf-8"))

    top = Counter()
    fis_bazli = defaultdict(Counter)
    siniflar = Counter()
    sureler = []
    skorlar = []

    for k in kayitlar:
        fix = k.get("fixture")
        siniflar[k.get("cls")] += 1
        if isinstance(k.get("seconds"), (int, float)):
            sureler.append(k["seconds"])
        if isinstance(k.get("score"), (int, float)):
            skorlar.append(k["score"])
        gt = gt_yukle(fix)
        eslesen, fazla, eksik = esle(k.get("resp_items") or [], gt)
        top["eslesmeyen_cevap"] += len(fazla)
        top["eslesmeyen_anahtar"] += eksik
        for r, g in eslesen:
            beklenen = oran(g.get("vatRate"))
            if beklenen is None:
                top["anahtarda_oran_yok"] += 1
                continue
            gelen = oran(r.get("vatRate"))
            if gelen is None:
                sonuc = "bos"
            elif abs(gelen - beklenen) < 0.001:
                sonuc = "dogru"
            else:
                sonuc = "yanlis"
            top[sonuc] += 1
            fis_bazli[fix][sonuc] += 1

    puanlanan = top["dogru"] + top["yanlis"] + top["bos"]
    yuzde = lambda n: (100.0 * n / puanlanan) if puanlanan else 0.0

    print("")
    print("=" * 62)
    print("%s  —  %d kosum, %d puanlanan kalem" % (etiket, len(kayitlar), puanlanan))
    print("=" * 62)
    print("  dogru oran : %5d  (%%%.1f)" % (top["dogru"], yuzde(top["dogru"])))
    print("  YANLIS oran: %5d  (%%%.1f)   <-- kotulesme bu sayida gorulur" % (top["yanlis"], yuzde(top["yanlis"])))
    print("  bos (null) : %5d  (%%%.1f)" % (top["bos"], yuzde(top["bos"])))
    print("  --")
    print("  anahtarda orani olmayan kalem : %d" % top["anahtarda_oran_yok"])
    print("  eslesmeyen (cevapta fazla)    : %d" % top["eslesmeyen_cevap"])
    print("  eslesmeyen (anahtarda eksik)  : %d" % top["eslesmeyen_anahtar"])
    print("  sinif dagilimi : %s" % dict(siniflar))
    if skorlar:
        print("  ortalama skor  : %.4f" % (sum(skorlar) / len(skorlar)))
    if sureler:
        s = sorted(sureler)
        print("  sure ort/ortanca/en yuksek : %.2f / %.2f / %.2f sn"
              % (sum(s) / len(s), s[len(s) // 2], s[-1]))
    print("  --  fis bazinda (dogru/yanlis/bos)")
    for fix in sorted(fis_bazli):
        c = fis_bazli[fix]
        print("     %-10s %3d / %3d / %3d" % (fix, c["dogru"], c["yanlis"], c["bos"]))
    print("")

if __name__ == "__main__":
    main()
