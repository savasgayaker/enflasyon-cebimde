"""TUIK madde adi - kod eslemesi.

Saf modul: ag cagrisi yok, dosya yalniz bir kez okunur.

Model prompt'ta madde ADLARINI gorur, kodu gormez. Bu modul donen
adi koda cevirir. Ad listede yoksa **reddedilir** - uydurulmus kod
sessizce yanlis agirliga girer ve enflasyon hesabini bozar.

A5-3a: govde ikinci yarida doldurulur.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, Tuple

_LISTE_YOLU = Path(__file__).parent / "data" / "tuik-sepeti.json"

_ISKELE = "A5-3a ikinci yari bekleniyor: govde yazilmadi"


def sepet_surumu() -> int:
    """Listenin surumu; kaynak damgasinda kullanilir (K8)."""
    raise NotImplementedError(_ISKELE)


def madde_koduna_cevir(ad: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Madde adini (madde kodu, sinif kodu) ciftine cevirir.

    Ad listede yoksa (None, None) doner.
    """
    raise NotImplementedError(_ISKELE)


def uzlastir(a: Optional[str], b: Optional[str]) -> Optional[str]:
    """Iki cagrinin madde adini uzlastirir.

    Ayni ise korunur, celisirse None, biri bossa dolu olan kazanir.
    """
    raise NotImplementedError(_ISKELE)
