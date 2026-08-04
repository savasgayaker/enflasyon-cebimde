"""KDV bloğu mutabakatı testleri (Ek 11 kararı).

İki katman:
  1) Sentetik birim testleri — her kapı ve her onarım tek tek.
  2) Yeniden oynatma — Ek 11 pilotunun GERÇEK ham çıktısı (repoda duruyor)
     mekanizmadan geçirilir ve altı fişin her birinin beklenen kararı doğrulanır.
     Bu, "kod Ek 11'de yazılana sadık mı" sorusunun cevap anahtarıdır.
"""
import json
import pathlib
import sys

import pytest

KOK = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK / "backend"))

from kdv_mutabakat import (  # noqa: E402
    blok_normalize, gruplar_hesapla, kdv_mutabakati,
)
from receipt_fields import extract_kdv_rate, normalize_vat_rate  # noqa: E402


def k(ad, tutar, oran):
    return {"name": ad, "totalPrice": tutar, "vatRate": oran, "vatRateSource": None}


# --- blok_normalize ---------------------------------------------------------

def test_blok_normalize():
    assert blok_normalize({"1": 125.0, "20": 124.0}) == {1.0: 125.0, 20.0: 124.0}
    assert blok_normalize({1: 125, "%20": "124,00"}) == {1.0: 125.0, 20.0: 124.0}
    assert blok_normalize({"5": 10.0}) is None          # geçersiz oran atılır
    assert blok_normalize({"1": None}) is None
    assert blok_normalize({}) is None
    assert blok_normalize(None) is None
    assert blok_normalize("1:125") is None


def test_gruplar_hesapla():
    items = [k("A", 10.0, 1.0), k("B", 20.0, 1.0), k("C", 5.0, None), k("D", None, 20.0)]
    gruplar, oransiz, fiyatsiz = gruplar_hesapla(items)
    assert gruplar == {1.0: 30.0}
    assert oransiz == [2]
    assert fiyatsiz is True


# --- temiz fiş --------------------------------------------------------------

def test_tamam_hicbir_sey_yapmaz():
    items = [k("A", 125.0, 1.0), k("B", 124.0, 20.0)]
    r = kdv_mutabakati(items, {"1": 125.0, "20": 124.0}, 249.0, True)
    assert r["durum"] == "tamam"
    assert r["uyusmazlik"] is False
    assert r["onarimlar"] == []
    assert items[0]["vatRateSource"] is None


def test_blok_yoksa_dokunulmaz():
    items = [k("A", 125.0, None)]
    r = kdv_mutabakati(items, None, 125.0, True)
    assert r["durum"] == "blok_yok"
    assert items[0]["vatRate"] is None


# --- Kapı A: blok toplamı totalAmount'u tutturmuyor (bildirici deseni) ------

def test_kapi_a_blok_atilir():
    # Kalemler 1311.00'a tam oturuyor; blok 1310.80 veriyor → suçlu blok.
    items = [k("A", 791.8, 1.0), k("B", 142.85, 10.0), k("C", 376.35, 20.0)]
    r = kdv_mutabakati(items, {"1": 791.6, "10": 142.85, "20": 376.35}, 1311.0, True)
    assert r["durum"] == "kapi_a"
    assert r["uyusmazlik"] is False
    assert items[0]["vatRate"] == 1.0        # kalemlere dokunulmadı


# --- Kapı B: etiket takası (a101 deseni) ------------------------------------

def test_kapi_b_permutasyon():
    items = [k("A", 900.0, 20.0), k("B", 1264.5, 1.0)]
    r = kdv_mutabakati(items, {"20": 1264.5, "1": 900.0}, 2164.5, True)
    assert r["durum"] == "kapi_b"
    assert r["uyusmazlik"] is False
    assert [it["vatRate"] for it in items] == [20.0, 1.0]   # takas UYGULANMADI


def test_permutasyon_degilse_kapi_b_gecmez():
    # Değerler farklı → permütasyon değil; gerçek uyuşmazlık.
    items = [k("A", 900.0, 20.0), k("B", 1264.5, 1.0)]
    r = kdv_mutabakati(items, {"20": 1000.0, "1": 1164.5}, 2164.5, True)
    assert r["durum"] == "uyusmazlik"
    assert r["uyusmazlik"] is True


# --- Onarım 1: oran ithafı (file deseni) -----------------------------------

def test_onarim1_tek_acik_gruba_ithaf():
    items = [k("A", 60.0, 10.0), k("B", 60.0, 20.0), k("C", 100.0, None), k("D", 40.0, None)]
    r = kdv_mutabakati(items, {"1": 140.0, "10": 60.0, "20": 60.0}, 260.0, True)
    assert r["durum"] == "onarildi"
    assert r["onarimlar"] == [{"tur": "oran_ithafi", "oran": 1.0, "kalem_sayisi": 2}]
    assert items[2]["vatRate"] == 1.0 and items[2]["vatRateSource"] == "kdv_blogu"
    assert items[3]["vatRate"] == 1.0


def test_onarim1_iki_acik_grup_varsa_dokunulmaz():
    # Hem %1 hem %10 açık → oransız kalem nereye gideceği belirsiz.
    items = [k("A", 60.0, 20.0), k("B", 100.0, None)]
    r = kdv_mutabakati(items, {"1": 50.0, "10": 50.0, "20": 60.0}, 160.0, True)
    assert r["durum"] == "belirsiz_oransiz"
    assert r["uyusmazlik"] is False
    assert items[1]["vatRate"] is None


# --- Onarım 2: tek çözümlü taşıma (gimsa deseni) ---------------------------

def test_onarim2_tek_aday_tasinir():
    items = [k("A", 1161.3, 1.0), k("B", 128.5, 10.0), k("C", 99.0, 10.0), k("D", 3.0, 20.0)]
    r = kdv_mutabakati(items, {"1": 1260.3, "10": 128.5, "20": 3.0}, 1391.8, True)
    assert r["durum"] == "onarildi"
    assert r["onarimlar"][0]["tur"] == "tek_cozumlu_tasima"
    assert items[2]["vatRate"] == 1.0 and items[2]["vatRateSource"] == "kdv_blogu"
    assert r["uyusmazlik"] is False


def test_onarim2_iki_aday_varsa_dokunulmaz_ve_bayrak_cikar():
    # 99.00'lık İKİ kalem var → hangisinin taşınacağı belirsiz.
    items = [k("A", 1062.3, 1.0), k("B", 99.0, 10.0), k("C", 99.0, 10.0),
             k("D", 128.5, 10.0), k("E", 3.0, 20.0)]
    r = kdv_mutabakati(items, {"1": 1161.3, "10": 227.5, "20": 3.0}, 1391.8, True)
    assert r["durum"] == "uyusmazlik"
    assert r["uyusmazlik"] is True
    assert items[1]["vatRate"] == 10.0 and items[2]["vatRate"] == 10.0


# --- bayrağın dar koşulu ----------------------------------------------------

def test_aritmetik_bozuksa_yeni_bayrak_cikmaz():
    # Kalem toplamı 240 ≠ totalAmount 249 → fiş zaten bayraklı; blok sapması
    # bunun sonucudur, bağımsız sinyal değildir.
    items = [k("A", 116.0, 1.0), k("B", 124.0, 20.0)]
    r = kdv_mutabakati(items, {"1": 125.0, "20": 124.0}, 249.0, False)
    assert r["durum"] == "aritmetik_bozuk"
    assert r["uyusmazlik"] is False


def test_fiyatsiz_kalem_varsa_mekanizma_susar():
    items = [k("A", 125.0, 1.0), k("B", None, 20.0)]
    r = kdv_mutabakati(items, {"1": 125.0, "20": 124.0}, 249.0, False)
    assert r["durum"] == "fiyat_eksik"
    assert r["uyusmazlik"] is False


# --- 2) Ek 11 pilotunun gerçek çıktısıyla yeniden oynatma -------------------

HAM = KOK / "m3-test" / "results" / "ek11-kdv-pilot-2026-08-04.json"

# Ek 11'de kayda geçen kararlar (RAPOR.md Ek 11):
BEKLENEN = {
    "bim":       {"durum": "tamam",           "onarim": 0, "bayrak": False},
    "migros":    {"durum": "tamam",           "onarim": 0, "bayrak": False},
    "bildirici": {"durum": "kapi_a",          "onarim": 0, "bayrak": False},
    "a101":      {"durum": "kapi_b",          "onarim": 0, "bayrak": False},
    "gimsa":     {"durum": "onarildi",        "onarim": 1, "bayrak": False},
    "file":      {"durum": "aritmetik_bozuk", "onarim": 1, "bayrak": False},
}


def _kalemleri_hazirla(parsed):
    """validate_and_flag'in oran çıkarımını birebir taklit eder."""
    items = []
    toplam = 0.0
    eksik = False
    for it in parsed.get("items") or []:
        tp = it.get("totalPrice")
        if tp is not None:
            tp = round(float(tp), 2)
            toplam += tp
        else:
            eksik = True
        ad = str(it.get("name") or "")
        oran = normalize_vat_rate(it.get("vatRate"))
        kaynak = "model" if oran is not None else None
        if oran is None:
            oran = extract_kdv_rate(ad)
            kaynak = "kural" if oran is not None else None
        items.append({"name": ad, "totalPrice": tp, "vatRate": oran,
                      "vatRateSource": kaynak})
    tutar = round(float(parsed["totalAmount"]), 2)
    aritmetik = (not eksik) and abs(round(toplam, 2) - tutar) <= 0.01
    return items, tutar, aritmetik


@pytest.mark.skipif(not HAM.exists(), reason="Ek 11 ham çıktısı yok")
@pytest.mark.parametrize("fixture", sorted(BEKLENEN))
def test_ek11_yeniden_oynatma(fixture):
    ham = json.loads(HAM.read_text())
    kayit = next(x for x in ham["kayitlar"] if x["fixture"] == fixture)
    items, tutar, aritmetik = _kalemleri_hazirla(kayit["parsed"])
    r = kdv_mutabakati(items, kayit.get("kdv_blok_ham"), tutar, aritmetik)
    b = BEKLENEN[fixture]
    assert r["durum"] == b["durum"], f"{fixture}: {r}"
    assert len(r["onarimlar"]) == b["onarim"], f"{fixture}: {r['onarimlar']}"
    assert r["uyusmazlik"] is b["bayrak"], f"{fixture}: {r}"


@pytest.mark.skipif(not HAM.exists(), reason="Ek 11 ham çıktısı yok")
def test_ek11_toplam_bilanco():
    """Ek 11'in sayısal iddiası: 6 fişte YENİ bayrak 0, onarılan kalem 20."""
    ham = json.loads(HAM.read_text())
    yeni_bayrak = 0
    onarilan = 0
    for kayit in ham["kayitlar"]:
        items, tutar, aritmetik = _kalemleri_hazirla(kayit["parsed"])
        r = kdv_mutabakati(items, kayit.get("kdv_blok_ham"), tutar, aritmetik)
        if r["uyusmazlik"]:
            yeni_bayrak += 1
        onarilan += sum(1 for it in items if it["vatRateSource"] == "kdv_blogu")
    assert yeni_bayrak == 0
    assert onarilan == 20


# --- 3) server.validate_and_flag ile uçtan uca (yapıştırma katmanı) ---------
# server.py'nin import'u fastapi/PIL/jwt ister; yoksa test ATLANIR (kırmızı
# değil sarı) — mekanizmanın kendisi yukarıdaki katmanlarda zaten doğrulanıyor.

@pytest.mark.skipif(not HAM.exists(), reason="Ek 11 ham çıktısı yok")
def test_validate_and_flag_ek11_fisleri():
    server = pytest.importorskip("server", reason="sunucu bağımlılıkları yok")
    ham = json.loads(HAM.read_text())
    gorulen = {}
    onarilan = 0
    for kayit in ham["kayitlar"]:
        sonuc = server.validate_and_flag(kayit["parsed"])
        gorulen[kayit["fixture"]] = sonuc["kdvDurum"]
        onarilan += sum(1 for it in sonuc["items"]
                        if it["vatRateSource"] == "kdv_blogu")
        # Bayrak semantiği: yalnız 'uyusmazlik' durumu yeni bayrak üretebilir.
        assert sonuc["kdvUyusmazligi"] is (sonuc["kdvDurum"] == "uyusmazlik")
        # needsReview hâlâ SADECE aritmetiği anlatır (yanıt seçimi buna bakıyor).
        assert isinstance(sonuc["needsReview"], bool)
    assert gorulen == {f: b["durum"] for f, b in BEKLENEN.items()}
    assert onarilan == 20
