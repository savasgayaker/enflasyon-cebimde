#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ek 12b kararı. Kural ön kayıtta sabitlendi; bu betik koşumdan ÖNCE yazıldı ve
veri görüldükten SONRA DEĞİŞTİRİLMEZ."""
import glob, os, sys
KOK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, KOK)
from puanla_bilesik import puanla, yaz

TABAN_BANT = 0.25          # 1 kalem / 395 kalem
C10_BEK, C12_BEK = 97.95, 96.82

def tek(desen):
    a = sorted(glob.glob(os.path.join(KOK, desen)))
    if len(a) != 1:
        sys.exit("HATA: %s icin tam 1 dosya bekleniyordu, %d bulundu: %s" % (desen, len(a), a))
    return a[0]

r10  = puanla(tek("results/ek10-acceptance-*.json"))
r12  = puanla(tek("results/ek12-acceptance-*.json"))
r10b = puanla(tek("results/ek12b-eski-kol-*.json"))
for r in (r10, r12, r10b):
    yaz(r)

C10, C12, C10b = r10["bilesik"], r12["bilesik"], r10b["bilesik"]
print("\nALET DOGRULAMASI: C10 %.2f (bek. %.2f) | C12 %.2f (bek. %.2f)"
      % (C10, C10_BEK, C12, C12_BEK))
if abs(C10 - C10_BEK) > 0.01 or abs(C12 - C12_BEK) > 0.01:
    sys.exit("HATA: puanlayici ilan edilen taban degerleri uretmedi -> KARAR VERILMEZ.")

N = abs(C10b - C10)
B = max(N, TABAN_BANT)
E = C10b - C12
print("\nC10  (eski kol, dun)   = %.2f" % C10)
print("C10b (eski kol, bugun) = %.2f" % C10b)
print("C12  (yeni kol, bugun) = %.2f" % C12)
print("N (ayni yapilandirma, iki tur farki) = %.2f puan" % N)
print("B (bant = max(N, %.2f))              = %.2f puan" % (TABAN_BANT, B))
print("E (eski bugun - yeni bugun)          = %+.2f puan" % E)
print("\nKARAR: " + ("KABUL — olcut 3 ihlali gosterilemedi"
                     if E <= B else "RET ONAYLANDI — dusus aletin kendi hatasini asiyor"))
print("\nBETIMLEYICI (karara girmez) — sure:")
for ad, r in (("eski kol dun", r10), ("yeni kol bugun", r12), ("eski kol bugun", r10b)):
    if r["sure_ort"] is not None:
        print("  %-16s ort %.2f / ortanca %.2f / max %.2f sn"
              % (ad, r["sure_ort"], r["sure_ortanca"], r["sure_max"]))
