#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KDV döküm bloğu pilotu — Aşama 3.5 (Ek 11 ölçümü)
=================================================
Tek soru: model, fişin altındaki KDV döküm tablosunu ne kadar doğru okuyor?

6 fiş x 1 koşum = 6 çağrı.

ÜRETİM REJİMİ (v2'de düzeltildi — v1'in eksiğiydi):
  thinking: disabled + max_tokens 24000 + 45 sn timeout + 1400->1000 px merdiveni.
  Hepsi backend/server.py'deki değerlerin AYNISI. v1 bu ayarları göndermediği
  için thinking AÇIK koştu; o yüzden a101 312 sn sürdü, file hiç bitmedi.
  (26 Tem vision koşumları da thinking AÇIK'tı: a101 246 sn, file 480 sn —
  yani yavaşlık kdvBlok'tan değil, rejimden geliyordu.)

Prompt DEĞİŞTİRİLMEZ: backend/receipt_prompt.py'deki RECEIPT_PROMPT bellekte
genişletilir (şemaya kdvBlok alanı + 3 kural). Çapa metinleri bulunamazsa betik
durur — sessizce başka bir prompt ölçmesin.

Ölçülenler:
  1) blok doğruluğu  : model kdvBlok  vs  ground-truth/kdv-bloklari.json
  2) iç tutarlılık   : model kdvBlok  vs  MODELİN KENDİ kalemlerinin oran toplamı
                       (üretimdeki mutabakatın gerçek yanlış-alarm göstergesi)
  3) taban regresyon : yeni alan eklenince temel çıkarım bozuldu mu
                       (run_test.compare ile aynı puan satırı)
  4) maliyet         : çağrı başı token — Ek 10'un "Ölçülmeyen" kalemi

DAYANIKLILIK (v2): bir fiş düşerse diğerleri etkilenmez ve ham sonuç dosyası
HER durumda yazılır. v1'de file'ın timeout'u tüm koşumu düşürdü, 5 başarılı
fişin ham çıktısı da onunla birlikte kayboldu.

Kullanım:
  cd m3-test && python3 kdv-blogu-pilot.py
  python3 kdv-blogu-pilot.py --only file
"""
import argparse
import base64
import hashlib
import json
import sys
import time
import traceback
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import run_test as rt                      # API_URL, MODEL, shrink_image, extract_json, compare
from receipt_fields import normalize_vat_rate   # backend/ yolu run_test tarafından eklendi

GT_DIR = HERE / "ground-truth"
RESULTS_DIR = HERE / "results"
BLOK_DOSYA = GT_DIR / "kdv-bloklari.json"
TOL = 0.01          # kuruş toleransı; cevap anahtarında sapma tabanı 0.00

# --- üretim ayarları: backend/server.py ile birebir aynı -------------------
MAX_TOKENS = 24000                       # server.MINIMAX_MAX_TOKENS
THINKING = {"type": "disabled"}          # server: "thinking kapalı — 10-20x hız"
DENEMELER = [(1400, 45), (1000, 45)]     # server.MINIMAX_ATTEMPTS

# --------------------------------------------------------------------------
# Prompt genişletmesi — üretime girecek metnin aynısı
# --------------------------------------------------------------------------
CAPA_SEMA = '  "totalAmount": 0.0,\n  "items": ['
YENI_SEMA = ('  "totalAmount": 0.0,\n'
             '  "kdvBlok": {"1": 0.0, "10": 0.0, "20": 0.0},\n'
             '  "items": [')

CAPA_KURAL = "- Emin olamadığın alanları uydurma; null kullan."
YENI_KURAL = (
    "- kdvBlok, fişin altındaki KDV döküm tablosudur (KDV DAHİL / DAHİL TUTAR / KDVLİ TOPLAM sütunu). "
    "Anahtar KDV oranıdır (1, 10, 20), değer o oran için fişte BASILI KDV DAHİL tutardır.\n"
    "- Tabloda MATRAH ve KDV TUTARI sütunları da varsa onları yazma; yalnız KDV DAHİL sütununu yaz. "
    "Fişte KDV DAHİL sütunu basılı değilse kendin toplama/hesaplama yapma, kdvBlok değerini null bırak.\n"
    "- kdvBlok'a yalnız fişte basılı oranları koy; basılı olmayan oranı ekleme. Bloklardaki tutarların "
    "toplamı totalAmount'a eşit çıkmasa bile değerleri DÜZELTME — fişte ne yazıyorsa onu yaz.\n"
    + CAPA_KURAL
)


def prompt_genislet(p: str) -> str:
    if p.count(CAPA_SEMA) != 1 or p.count(CAPA_KURAL) != 1:
        sys.exit("HATA: backend/receipt_prompt.py degismis — capa metinleri bulunamadi. "
                 "Pilot durdu (yanlis prompt olcmemek icin).")
    return p.replace(CAPA_SEMA, YENI_SEMA).replace(CAPA_KURAL, YENI_KURAL)


PROMPT = prompt_genislet(rt.PROMPT)
PROMPT_SHA = hashlib.sha256(PROMPT.encode()).hexdigest()


# --------------------------------------------------------------------------
# API — server.py'nin gövdesiyle aynı ayarlar; ek olarak usage + finish_reason
# --------------------------------------------------------------------------
def cagir(api_key, foto, denemeler=DENEMELER):
    """Üretimdeki merdiveni izler: 1400px/45sn, olmazsa 1000px/45sn."""
    son_hata = None
    gecmis = []
    for sira, (max_edge, timeout_s) in enumerate(denemeler, start=1):
        img_bytes, mime = rt.shrink_image(foto, max_edge=max_edge)
        b64 = base64.b64encode(img_bytes).decode()
        body = {
            "model": rt.MODEL,
            "temperature": 0.0,
            "max_tokens": MAX_TOKENS,
            "thinking": THINKING,
            "messages": [
                {"role": "system", "content": PROMPT},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                    {"type": "text", "text": "Bu fiş fotoğrafını analiz et ve şemaya uygun JSON döndür."},
                ]},
            ],
        }
        req = urllib.request.Request(
            rt.API_URL, data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        )
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                data = json.loads(resp.read().decode())
            saniye = round(time.time() - t0, 1)
            secim = data["choices"][0]
            gecmis.append({"deneme": sira, "px": max_edge, "saniye": saniye,
                           "finish_reason": secim.get("finish_reason"), "sonuc": "ok"})
            return {
                "icerik": secim["message"].get("content") or "",
                "usage": data.get("usage") or {},
                "finish_reason": secim.get("finish_reason"),
                "saniye": saniye, "px": max_edge, "denemeler": gecmis,
            }
        except (urllib.error.URLError, urllib.error.HTTPError, KeyError, TimeoutError, OSError) as e:
            saniye = round(time.time() - t0, 1)
            son_hata = e
            ayrinti = ""
            if isinstance(e, urllib.error.HTTPError):
                try:
                    ayrinti = e.read().decode()[:300]
                except Exception:
                    pass
            gecmis.append({"deneme": sira, "px": max_edge, "saniye": saniye,
                           "sonuc": f"{type(e).__name__}: {e} {ayrinti}".strip()})
            print(f"    ! deneme {sira} basarisiz ({max_edge}px, {saniye}s): {e} {ayrinti}")
    raise RuntimeError(f"{len(denemeler)} denemede basarisiz: {son_hata}", gecmis)


# --------------------------------------------------------------------------
# Ölçüm yardımcıları
# --------------------------------------------------------------------------
def blok_normalize(ham):
    """Model kdvBlok -> {int oran: float tutar}. Okunamayan anahtar/deger atilir."""
    if not isinstance(ham, dict):
        return None, []
    temiz, atilan = {}, []
    for k, v in ham.items():
        oran = normalize_vat_rate(k)
        try:
            tutar = None if v is None else round(float(str(v).replace(",", ".")), 2)
        except (TypeError, ValueError):
            tutar = None
        if oran is None or tutar is None:
            atilan.append({"anahtar": k, "deger": v})
            continue
        temiz[int(oran)] = tutar
    return temiz, atilan


def kalemlerden_gruplar(items):
    """Kalemleri vatRate'e gore toplar. Fiyatsiz ve oransiz kalemler ayri sayilir."""
    gruplar, oransiz_toplam = {}, 0.0
    oransiz, fiyatsiz = 0, 0
    for it in items or []:
        try:
            fiyat = None if it.get("totalPrice") is None else float(it["totalPrice"])
        except (TypeError, ValueError):
            fiyat = None
        oran = normalize_vat_rate(it.get("vatRate"))
        if fiyat is None:
            fiyatsiz += 1
            continue
        if oran is None:
            oransiz += 1
            oransiz_toplam += fiyat
            continue
        gruplar[int(oran)] = round(gruplar.get(int(oran), 0.0) + fiyat, 2)
    return gruplar, oransiz, fiyatsiz, round(oransiz_toplam, 2)


def bloklari_karsilastir(a, b):
    """a (model) ile b (referans) bloklarini oran oran karsilastirir."""
    a = a or {}
    b = b or {}
    satirlar, en_buyuk = [], 0.0
    tam = sapan = eksik = fazla = 0
    for oran in sorted(set(a) | set(b)):
        av, bv = a.get(oran), b.get(oran)
        if av is None:
            eksik += 1
            satirlar.append({"oran": oran, "model": None, "referans": bv, "durum": "eksik"})
            en_buyuk = max(en_buyuk, abs(bv or 0.0))
        elif bv is None:
            fazla += 1
            satirlar.append({"oran": oran, "model": av, "referans": None, "durum": "fazla"})
            en_buyuk = max(en_buyuk, abs(av))
        else:
            fark = round(av - bv, 2)
            if abs(fark) < TOL:
                tam += 1
                satirlar.append({"oran": oran, "model": av, "referans": bv, "fark": 0.0, "durum": "tam"})
            else:
                sapan += 1
                satirlar.append({"oran": oran, "model": av, "referans": bv, "fark": fark, "durum": "sapan"})
                en_buyuk = max(en_buyuk, abs(fark))
    return {
        "satirlar": satirlar, "tam": tam, "sapan": sapan, "eksik": eksik, "fazla": fazla,
        "en_buyuk_sapma": round(en_buyuk, 2),
        "tumu_tam": (sapan == 0 and eksik == 0 and fazla == 0 and tam > 0),
    }


def fotograf_bul(fixture):
    for ext in (".jpg", ".jpeg", ".png", ".heic", ".webp"):
        p = rt.PHOTOS_DIR / f"{fixture}{ext}"
        if p.exists():
            return p
    return None


def bir_kosum(api_key, fixture, dogru_bloklar):
    """TEK fis. Hicbir kosulda istisna FIRLATMAZ — dusen fis digerlerini
    dusurmesin ve ham sonuc dosyasi her zaman yazilabilsin diye."""
    kayit = {"fixture": fixture, "seconds": None, "usage": {}, "raw_output": None,
             "parsed": None, "hata": None, "denemeler": []}
    try:
        foto = fotograf_bul(fixture)
        if foto is None:
            kayit["hata"] = "fotograf yok"
            print(f"  [{fixture}] ATLANDI — photos/{fixture}.* yok")
            return kayit

        try:
            cevap = cagir(api_key, foto)
        except RuntimeError as e:
            kayit["hata"] = str(e.args[0])
            kayit["denemeler"] = e.args[1] if len(e.args) > 1 else []
            print(f"  [{fixture}] DUSTU — {kayit['hata'][:140]}")
            return kayit

        kayit.update({"seconds": cevap["saniye"], "usage": cevap["usage"],
                      "finish_reason": cevap["finish_reason"], "px": cevap["px"],
                      "denemeler": cevap["denemeler"], "raw_output": cevap["icerik"]})

        try:
            parsed = rt.extract_json(cevap["icerik"])
        except (ValueError, json.JSONDecodeError) as e:
            kayit["hata"] = f"JSON: {e}"
            print(f"  [{fixture}] JSON HATASI ({cevap['saniye']}s): {str(e)[:120]}")
            return kayit
        kayit["parsed"] = parsed

        # 1) blok dogrulugu — model blogu vs cevap anahtari
        model_blok, atilan = blok_normalize(parsed.get("kdvBlok"))
        kayit["kdv_blok_ham"] = parsed.get("kdvBlok")
        kayit["kdv_blok_atilan"] = atilan
        ref = {int(k): float(v) for k, v in dogru_bloklar["bloklar"].items()}
        kayit["referans_blok"] = ref
        kayit["blok_dogrulugu"] = (bloklari_karsilastir(model_blok, ref)
                                   if model_blok is not None else {"okunamadi": True})

        # 2) ic tutarlilik — model blogu vs modelin kendi kalemleri
        gruplar, oransiz, fiyatsiz, oransiz_toplam = kalemlerden_gruplar(parsed.get("items"))
        kayit["kalem_gruplari"] = gruplar
        kayit["oransiz_kalem"] = oransiz
        kayit["fiyatsiz_kalem"] = fiyatsiz
        kayit["oransiz_kalem_toplami"] = oransiz_toplam
        kayit["ic_tutarlilik"] = (bloklari_karsilastir(gruplar, model_blok)
                                  if model_blok else {"okunamadi": True})

        # 3) taban regresyon — yeni alan temel cikarimi bozdu mu
        gt_path = GT_DIR / f"{fixture}.json"
        if gt_path.exists():
            try:
                kayit["taban_puan"] = rt.compare(json.loads(gt_path.read_text()), parsed)["score"]
            except Exception as e:
                kayit["taban_puan"] = f"puanlanamadi: {e}"

        bd, it = kayit["blok_dogrulugu"], kayit["ic_tutarlilik"]
        print(f"  [{fixture}] {cevap['saniye']}s | blok: " +
              ("OKUNAMADI" if bd.get("okunamadi") else
               f"tam {bd['tam']} / sapan {bd['sapan']} / eksik {bd['eksik']} / fazla {bd['fazla']}"
               f" (en buyuk {bd['en_buyuk_sapma']})") +
              " | ic tutarlilik: " +
              ("-" if it.get("okunamadi") else
               ("TUTUYOR" if it["tumu_tam"] else f"sapma {it['en_buyuk_sapma']}")) +
              f" | {kayit.get('taban_puan','')}")
        return kayit
    except Exception as e:                      # beklenmedik her sey
        kayit["hata"] = f"beklenmedik: {type(e).__name__}: {e}"
        kayit["traceback"] = traceback.format_exc()[-1500:]
        print(f"  [{fixture}] BEKLENMEDIK HATA: {e}")
        return kayit


def ozet_yaz(kayitlar, toplam_sure):
    dusen = [k for k in kayitlar if k.get("hata")]
    okunan = [k for k in kayitlar
              if not k.get("hata") and not k.get("blok_dogrulugu", {}).get("okunamadi")]
    tam_fis = [k for k in okunan if k["blok_dogrulugu"]["tumu_tam"]]
    grup_tam = sum(k["blok_dogrulugu"]["tam"] for k in okunan)
    grup_hep = sum(k["blok_dogrulugu"][x] for k in okunan
                   for x in ("tam", "sapan", "eksik", "fazla"))
    ic_tutan = [k for k in okunan if k["ic_tutarlilik"].get("tumu_tam")]
    sureler = [k["seconds"] for k in kayitlar if k.get("seconds") is not None]
    tokenlar = [k["usage"].get("total_tokens") for k in kayitlar if isinstance(k.get("usage"), dict)]
    tokenlar = [t for t in tokenlar if isinstance(t, int)]

    print("\n" + "=" * 68)
    print("OZET   (thinking: disabled — uretim rejimi)")
    print(f"  cagri                    : {len(kayitlar)}  (dusen {len(dusen)})")
    print(f"  blok okunabildi          : {len(okunan)}/{len(kayitlar)} fis")
    print(f"  blok TAM dogru (fis)     : {len(tam_fis)}/{len(kayitlar)}")
    print(f"  grup duzeyinde kurusuna  : {grup_tam}/{grup_hep} grup")
    print(f"  ic tutarlilik TUTUYOR    : {len(ic_tutan)}/{len(kayitlar)} fis")
    if sureler:
        print(f"  sure ort/min/max         : {round(sum(sureler)/len(sureler),1)} / {min(sureler)} / {max(sureler)} sn")
    if tokenlar:
        print(f"  token toplam / cagri basi: {sum(tokenlar)} / {round(sum(tokenlar)/len(tokenlar))}")
    else:
        print("  token: API usage alani donmedi — maliyet yine olculemedi")
    for k in dusen:
        print(f"  ! DUSEN {k['fixture']}: {str(k['hata'])[:100]}")
    print("=" * 68)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="tek fis (or. file)")
    ap.add_argument("--etiket", default="", help="cikti dosyasi son eki (or. file-tekrar)")
    args = ap.parse_args()

    api_key = rt.load_env()
    anahtar = json.loads(BLOK_DOSYA.read_text())
    fixtures = sorted(k for k in anahtar if not k.startswith("_"))
    if args.only:
        fixtures = [f for f in fixtures if f == args.only]
    if not fixtures:
        sys.exit("Calistirilacak fis yok.")

    print(f"KDV blogu pilotu v2 | model: {rt.MODEL} | {len(fixtures)} cagri (fis basi 1)")
    print(f"rejim: thinking=disabled, max_tokens={MAX_TOKENS}, merdiven={DENEMELER}")
    print(f"prompt sha256: {PROMPT_SHA[:16]}...  (uretim prompt'u DEGISTIRILMEDI)\n")

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=6) as pool:
        kayitlar = [f.result() for f in
                    [pool.submit(bir_kosum, api_key, f, anahtar[f]) for f in fixtures]]
    toplam_sure = round(time.time() - t0, 1)

    ozet_yaz(kayitlar, toplam_sure)

    RESULTS_DIR.mkdir(exist_ok=True)
    ek = f"-{args.etiket}" if args.etiket else ""
    out = RESULTS_DIR / f"ek11-kdv-pilot-{time.strftime('%Y-%m-%d')}{ek}.json"
    out.write_text(json.dumps({
        "tarih": time.strftime("%Y-%m-%d %H:%M"),
        "model": rt.MODEL,
        "rejim": {"thinking": THINKING, "max_tokens": MAX_TOKENS, "merdiven": DENEMELER},
        "prompt_sha256": PROMPT_SHA,
        "prompt": PROMPT,
        "tolerans": TOL,
        "toplam_sure": toplam_sure,
        "kayitlar": kayitlar,
    }, ensure_ascii=False, indent=2))
    print(f"\nHam sonuc: {out}")
    print(f"Toplam sure: {toplam_sure} sn")


if __name__ == "__main__":
    main()
