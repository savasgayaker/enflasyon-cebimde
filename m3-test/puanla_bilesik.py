#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bileşik oran puanlayıcısı — Ek 12b ön kaydı kapsamında koşumdan ÖNCE yazıldı.
Girdi: acceptance_dual.py arşivi (30 kayıtlık JSON listesi). Aleti DEĞİŞTİRMEZ."""
import json, re, statistics, sys

_CIFT  = re.compile(r"(\d+)\s*/\s*(\d+)")
_FAZLA = re.compile(r"fazladan\s+(\d+)")
ALANLAR = ("baslik", "eslesme", "fiyat")

def coz(metin):
    ciftler = _CIFT.findall(metin or "")
    if len(ciftler) < 3:
        return None
    d = {ad: (int(ciftler[i][0]), int(ciftler[i][1])) for i, ad in enumerate(ALANLAR)}
    m = _FAZLA.search(metin or "")
    d["fazladan"] = int(m.group(1)) if m else 0
    return d

def puanla(yol):
    with open(yol, encoding="utf-8") as f:
        kayitlar = json.load(f)
    alt = {ad: [0, 0] for ad in ALANLAR}
    pay = payda = fazladan = okunamayan = 0
    kosum, sureler, siniflar = [], [], {}
    for k in kayitlar:
        c_ad = k.get("cls", "?")
        siniflar[c_ad] = siniflar.get(c_ad, 0) + 1
        s = k.get("seconds")
        if isinstance(s, (int, float)):
            sureler.append(float(s))
        c = coz(str(k.get("score", "")))
        if c is None:
            okunamayan += 1
            continue
        kp = kpd = 0
        for ad in ALANLAR:
            a, b = c[ad]
            alt[ad][0] += a; alt[ad][1] += b
            kp += a; kpd += b
        pay += kp; payda += kpd
        fazladan += c["fazladan"]
        if kpd:
            kosum.append(100.0 * kp / kpd)
    return {
        "dosya": yol, "kayit": len(kayitlar), "okunamayan": okunamayan,
        "bilesik": (100.0 * pay / payda) if payda else float("nan"),
        "pay": pay, "payda": payda,
        "alt": {ad: tuple(alt[ad]) for ad in ALANLAR},
        "fazladan": fazladan,
        "kosum_min": min(kosum) if kosum else None,
        "kosum_max": max(kosum) if kosum else None,
        "kosum_ss": statistics.pstdev(kosum) if len(kosum) > 1 else 0.0,
        "sure_ort": statistics.mean(sureler) if sureler else None,
        "sure_ortanca": statistics.median(sureler) if sureler else None,
        "sure_max": max(sureler) if sureler else None,
        "siniflar": siniflar,
    }

def yaz(r):
    print("--- %s" % r["dosya"])
    print("    kayit %d, okunamayan skor %d" % (r["kayit"], r["okunamayan"]))
    print("    BILESIK ORAN: %.2f%%  (%d/%d)" % (r["bilesik"], r["pay"], r["payda"]))
    for ad in ALANLAR:
        a, b = r["alt"][ad]
        oran = ("  (%%%.2f)" % (100.0 * a / b)) if b else ""
        print("      %-9s %d/%d%s" % (ad, a, b, oran))
    print("    fazladan kalem toplami: %d" % r["fazladan"])
    if r["kosum_min"] is not None:
        print("    kosum bazinda bilesik: min %.2f / max %.2f / ss %.2f"
              % (r["kosum_min"], r["kosum_max"], r["kosum_ss"]))
    if r["sure_ort"] is not None:
        print("    sure ort/ortanca/max: %.2f / %.2f / %.2f sn"
              % (r["sure_ort"], r["sure_ortanca"], r["sure_max"]))
    print("    siniflar: %s" % r["siniflar"])

if __name__ == "__main__":
    for yol in sys.argv[1:]:
        yaz(puanla(yol))
