"""A5-3b - prompt provenans aleti.

Aciklamadaki sha iddiasinin gercek dizeyle esit oldugunu dogrular.
Bu kapi olmasaydi iddia sessizce bayatlardi; A5-3 kesfinde tam
oyle olmus bir bayatlama olculdu.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import receipt_prompt  # noqa: E402

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


def _kaynak():
    return (Path(__file__).parent / "receipt_prompt.py").read_text(encoding="utf-8")


def _gercek_sha():
    return hashlib.sha256(
        receipt_prompt.RECEIPT_PROMPT.encode("utf-8")).hexdigest()


def _iddia_sha():
    m = re.search(r"sha256\(RECEIPT_PROMPT\)\s*==\s*([0-9a-f]{64})", _kaynak())
    return m.group(1) if m else None


def _liste():
    yol = Path(__file__).parent / "data" / "tuik-sepeti.json"
    return json.loads(yol.read_text(encoding="utf-8"))


def calis():
    print("=== prompt provenansi ===")
    g = _gercek_sha()
    i = _iddia_sha()
    print("  gercek sha: %s" % g[:24])
    print("  iddia  sha: %s" % (i[:24] if i else "YOK"))
    print("")

    kontrol("P1 aciklamadaki sha gercege esit", lambda: _iddia_sha(), _gercek_sha())

    d = _liste()
    metin = receipt_prompt.RECEIPT_PROMPT

    kontrol("P2 prompt madde listesini iceriyor",
            lambda: all(m["ad"] in metin for m in d["maddeler"]), True)

    kontrol("P3 prompt madde adi alanini istiyor",
            lambda: "tuikMadde" in metin, True)

    kontrol("P4 promptaki ad sayisi liste ile ayni",
            lambda: sum(1 for m in d["maddeler"] if m["ad"] in metin),
            len(d["maddeler"]))

    print("")
    print("Toplam: %d yesil kontrol, %d kirmizi kontrol" % (_yesil, _kirmizi))
    sys.exit(0 if _kirmizi == 0 else 1)


if __name__ == "__main__":
    calis()
