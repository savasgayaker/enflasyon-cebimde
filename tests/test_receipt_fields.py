import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "backend"))
from receipt_fields import (strip_kdv_suffix, extract_kdv_rate,
    normalize_vat_rate, normalize_unit, reconcile_optional)


def test_strip():
    assert strip_kdv_suffix("PEYNIR 250G %1") == "PEYNIR 250G"
    assert strip_kdv_suffix("PEYNIR 250G %01") == "PEYNIR 250G"
    assert strip_kdv_suffix("SUT 1L %10") == "SUT 1L"
    assert strip_kdv_suffix("DETERJAN %20") == "DETERJAN"
    assert strip_kdv_suffix("DURU 4*150GR") == "DURU 4*150GR"
    assert strip_kdv_suffix("INDIRIM %100") == "INDIRIM %100"
    assert strip_kdv_suffix("URUN %1 -") == "URUN %1"      # mevcut davranış, kasıtlı
    assert strip_kdv_suffix("URUN - %1") == "URUN"
    assert strip_kdv_suffix("URUN %99") == "URUN"


def test_kdv_rate():
    assert extract_kdv_rate("PEYNIR 250G %1") == 1.0
    assert extract_kdv_rate("PEYNIR 250G %01") == 1.0
    assert extract_kdv_rate("SUT 1L %10") == 10.0
    assert extract_kdv_rate("DETERJAN %20") == 20.0
    assert extract_kdv_rate("ESKI FIS %18") == 18.0
    assert extract_kdv_rate("ESKI FIS %8") == 8.0
    assert extract_kdv_rate("URUN %99") is None
    assert extract_kdv_rate("URUN %5") is None
    assert extract_kdv_rate("DURU 4*150GR") is None
    assert extract_kdv_rate("") is None
    assert extract_kdv_rate(None) is None
    assert extract_kdv_rate("URUN %1 -") == 1.0


def test_vat_normalize():
    assert normalize_vat_rate(20) == 20.0
    assert normalize_vat_rate(20.0) == 20.0
    assert normalize_vat_rate("20") == 20.0
    assert normalize_vat_rate("%20") == 20.0
    assert normalize_vat_rate("10,0") == 10.0
    assert normalize_vat_rate(0.20) == 20.0
    assert normalize_vat_rate(0.01) == 1.0
    assert normalize_vat_rate(1) == 1.0
    assert normalize_vat_rate(8) == 8.0
    assert normalize_vat_rate(18) == 18.0
    assert normalize_vat_rate(5) is None
    assert normalize_vat_rate(0) is None
    assert normalize_vat_rate(-20) is None
    assert normalize_vat_rate(None) is None
    assert normalize_vat_rate("") is None
    assert normalize_vat_rate("yok") is None
    assert normalize_vat_rate(True) is None
    assert normalize_vat_rate(float("nan")) is None
    assert normalize_vat_rate(float("inf")) is None
    assert normalize_vat_rate([20]) is None


def test_unit():
    assert normalize_unit("adet") == "adet"
    assert normalize_unit("ADET") == "adet"
    assert normalize_unit("AD") == "adet"
    assert normalize_unit(" kg ") == "kg"
    assert normalize_unit("KG") == "kg"
    assert normalize_unit("Kilogram") == "kg"
    assert normalize_unit("gr") == "gr"
    assert normalize_unit("G") == "gr"
    assert normalize_unit("LT") == "lt"
    assert normalize_unit("L") == "lt"
    assert normalize_unit("litre") == "lt"
    assert normalize_unit("ML") == "ml"
    assert normalize_unit("PK") == "paket"
    assert normalize_unit("paket") == "paket"
    assert normalize_unit("kg.") == "kg"
    assert normalize_unit("KG/ADET") is None
    assert normalize_unit("kutu") is None
    assert normalize_unit("") is None
    assert normalize_unit(None) is None
    assert normalize_unit(1) is None
    assert normalize_unit("1 L") is None      # AMBALAJ BOYUTU, BİRİM DEĞİL
    assert normalize_unit("500 gr") is None   # AMBALAJ BOYUTU, BİRİM DEĞİL
    assert normalize_unit("2,5 kg") is None   # AMBALAJ BOYUTU, BİRİM DEĞİL


def test_reconcile():
    assert reconcile_optional("kg", "kg") == "kg"
    assert reconcile_optional("kg", "adet") is None
    assert reconcile_optional("kg", None) == "kg"
    assert reconcile_optional(None, "kg") == "kg"
    assert reconcile_optional(None, None) is None
    assert reconcile_optional(20.0, 20.0) == 20.0
    assert reconcile_optional(20.0, 10.0) is None
    assert reconcile_optional(20.0, None) == 20.0
