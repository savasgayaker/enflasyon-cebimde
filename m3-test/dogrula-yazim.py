#!/usr/bin/env python3
"""Blok 7-D yazım kanıtı: ground-truth/*.json'a YALNIZ unit+vatRate eklendiğini,
mevcut hiçbir anahtarın değişmediğini git'teki eski hale karşı doğrular.

Kullanım: python3 dogrula-yazim.py [ESKI_REF]   (varsayılan HEAD)
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
FISLER = ["bim", "migros", "bildirici", "gimsa", "a101", "file"]
BEKLENEN_YENI = {"unit", "vatRate"}


def main():
    ref = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
    hata = False
    for fis in FISLER:
        yol = f"m3-test/ground-truth/{fis}.json"
        eski_raw = subprocess.run(
            ["git", "show", f"{ref}:{yol}"],
            capture_output=True, text=True, check=True,
            cwd=HERE.parent,
        ).stdout
        eski = json.loads(eski_raw)
        yeni = json.loads((HERE / "ground-truth" / f"{fis}.json").read_text())

        sorunlar = []
        if len(eski["items"]) != len(yeni["items"]):
            sorunlar.append(f"kalem sayısı {len(eski['items'])} → {len(yeni['items'])}")
        else:
            for i, (e, y) in enumerate(zip(eski["items"], yeni["items"])):
                for k, v in e.items():
                    if k not in y:
                        sorunlar.append(f"kalem {i}: eski anahtar {k!r} yenide YOK")
                    elif y[k] != v:
                        sorunlar.append(f"kalem {i}: {k!r} değişti {v!r} → {y[k]!r}")
                fazla = set(y.keys()) - set(e.keys())
                if fazla != BEKLENEN_YENI:
                    sorunlar.append(f"kalem {i}: eklenen küme {sorted(fazla)} ≠ ['unit', 'vatRate']")
        # kalem dışı üst-düzey alanlar da değişmemiş olmalı
        for k, v in eski.items():
            if k == "items":
                continue
            if yeni.get(k) != v:
                sorunlar.append(f"üst alan {k!r} değişti")

        if sorunlar:
            hata = True
            print(f"{fis:10s}: FARK VAR")
            for s in sorunlar:
                print(f"    - {s}")
        else:
            print(f"{fis:10s}: DEĞİŞMEDİ / EKLENEN: unit, vatRate ({len(yeni['items'])} kalem)")
    return 1 if hata else 0


if __name__ == "__main__":
    sys.exit(main())
