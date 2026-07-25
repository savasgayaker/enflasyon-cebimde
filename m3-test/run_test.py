#!/usr/bin/env python3
"""
MiniMax M3 fiş okuma testi — Enflasyon Cebimde
================================================
İki yolu karşılaştırır:
  (a) vision : fiş FOTOĞRAFI doğrudan M3'e gider  (photos/<fixture>.jpg)
  (b) text   : ML Kit OCR METNİ M3'e gider        (parser-fixtures/<fixture>.json → raw.fullText)

Kullanım:
  python3 run_test.py --mode text                # 5 fixture, ML Kit metni yolu
  python3 run_test.py --mode vision              # 5 fixture, fotoğraf yolu (photos/ dolu olmalı)
  python3 run_test.py --mode both                # ikisi birden + karşılaştırma
  python3 run_test.py --mode text --only migros  # tek fixture

API anahtarı: m3-test/.env dosyasında MINIMAX_API_KEY=... satırı
(.env commit EDİLMEZ — .gitignore'da.)
"""
import argparse
import base64
import difflib
import io
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).parent
FIXTURES_DIR = HERE.parent / "frontend" / "parser-fixtures"
PHOTOS_DIR = HERE / "photos"
RESULTS_DIR = HERE / "results"
FIXTURES = ["migros", "a101", "bim", "file", "bildirici"]

API_URL = "https://api.minimax.io/v1/chat/completions"
MODEL = "MiniMax-M3"

PROMPT = """Sen Türk market fişlerini okuyan bir asistansın. Sana verilen fişi analiz et ve SADECE aşağıdaki şemaya uyan geçerli bir JSON döndür. JSON dışında hiçbir açıklama, markdown, ``` bloğu yazma.

{
  "storeName": "mağaza adı (ör. Migros, A101, BİM, File, Bildirici, CarrefourSA)",
  "date": "YYYY-MM-DD",
  "totalAmount": 0.0,
  "items": [
    {"name": "ÜRÜN ADI", "quantity": 1, "unitPrice": 0.0, "totalPrice": 0.0}
  ]
}

Kurallar:
- items listesine SADECE satın alınan ürün/hizmet satırlarını koy. KDV satırları, TOPKDV, ara toplam, POS/banka satırları, kampanya mesajları, adres, vergi no gibi satırlar ürün DEĞİLDİR.
- totalAmount fişin ödenecek genel toplamıdır (ÖDENECEK / GENEL TOPLAM / TOPLAM).
- Türk fişlerinde fiyatlar "*18,00" veya "x120,00" gibi yazılabilir; virgül ondalık ayracıdır.
- Tartılı/adetli ürünlerde (ör. "0,455 kg x 89,90") quantity ve unitPrice'ı ayrıştır; totalPrice satırın toplam tutarıdır.
- Bir ürünün fiyatını fişte bulamıyorsan totalPrice değerini null yap.
- Ürün adına KDV oranını (%1, %01, %10, %20 gibi) DAHİL ETME; ad KDV işaretinden önce biter.
- storeName için şirket unvanını değil MARKA adını yaz (ör. "GİMSA PERAKENDE GIDA SANAYİ VE TİCARET A.Ş." → "GİMSA", "BIY BIRLESIK MAĞAZALAR A.Ş." → "BİM", "FILE MARKET MAĞAZACILIK A.Ş." → "File").
- Emin olamadığın alanları uydurma; null kullan."""


def load_env():
    env_file = HERE / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
    key = os.environ.get("MINIMAX_API_KEY")
    if not key:
        sys.exit("HATA: MINIMAX_API_KEY bulunamadı. m3-test/.env dosyasına MINIMAX_API_KEY=... yazın.")
    return key


def call_m3(api_key: str, user_content, retries: int = 3) -> str:
    body = {
        "model": MODEL,
        "temperature": 0.0,
        "messages": [
            {"role": "system", "content": PROMPT},
            {"role": "user", "content": user_content},
        ],
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read().decode())
            choice = data["choices"][0]["message"]
            return choice.get("content") or ""
        except (urllib.error.URLError, urllib.error.HTTPError, KeyError, TimeoutError) as e:
            last_err = e
            detail = ""
            if isinstance(e, urllib.error.HTTPError):
                try:
                    detail = e.read().decode()[:500]
                except Exception:
                    pass
            print(f"    ! API hatası (deneme {attempt+1}/{retries}): {e} {detail}")
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"API {retries} denemede başarısız: {last_err}")


def extract_json(text: str):
    """Model çıktısından JSON gövdesini çek (```json blokları / <think> vb. temizle)."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S)
    if m:
        text = m.group(1)
    else:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError(f"Çıktıda JSON bulunamadı: {text[:200]}")
        text = text[start : end + 1]
    return json.loads(text)


def norm_store(s):
    if not s:
        return ""
    s = str(s).upper().replace("İ", "I").replace("Ö", "O").replace("Ü", "U").replace("Ş", "S").replace("Ğ", "G").replace("Ç", "C")
    return re.sub(r"[^A-Z0-9]", "", s)


def name_sim(a, b):
    return difflib.SequenceMatcher(None, str(a).upper(), str(b).upper()).ratio()


def compare(expected: dict, got: dict) -> dict:
    """Alan-alan karşılaştırma. İsimlerde bulanık eşleme (OCR bozulmaları / vision düzeltmeleri için)."""
    r = {}
    r["storeName"] = {
        "ok": norm_store(got.get("storeName")) == norm_store(expected["storeName"])
        or norm_store(expected["storeName"]) in norm_store(got.get("storeName", "")),
        "expected": expected["storeName"], "got": got.get("storeName"),
    }
    r["date"] = {"ok": got.get("date") == expected["date"], "expected": expected["date"], "got": got.get("date")}
    try:
        got_total = round(float(got.get("totalAmount")), 2) if got.get("totalAmount") is not None else None
    except (TypeError, ValueError):
        got_total = None
    r["totalAmount"] = {"ok": got_total == round(float(expected["totalAmount"]), 2),
                        "expected": expected["totalAmount"], "got": got.get("totalAmount")}

    exp_items = list(expected["items"])
    got_items = list(got.get("items") or [])
    matches, unmatched_got = [], list(range(len(got_items)))
    for ei, e in enumerate(exp_items):
        best, best_score = None, 0.0
        for gi in unmatched_got:
            g = got_items[gi]
            s = name_sim(e["name"], g.get("name", ""))
            try:
                if e.get("totalPrice") is not None and g.get("totalPrice") is not None \
                   and abs(float(e["totalPrice"]) - float(g["totalPrice"])) < 0.01:
                    s += 0.5
            except (TypeError, ValueError):
                pass
            if s > best_score:
                best, best_score = gi, s
        if best is not None and best_score >= 0.55:
            g = got_items[best]
            unmatched_got.remove(best)
            try:
                price_ok = (e.get("totalPrice") is None and g.get("totalPrice") is None) or \
                           abs(float(e["totalPrice"]) - float(g["totalPrice"])) < 0.01
            except (TypeError, ValueError):
                price_ok = False
            matches.append({"expected": e["name"], "got": g.get("name"),
                            "name_sim": round(name_sim(e["name"], g.get("name", "")), 2),
                            "price_ok": price_ok,
                            "expected_price": e.get("totalPrice"), "got_price": g.get("totalPrice")})
        else:
            matches.append({"expected": e["name"], "got": None, "price_ok": False,
                            "expected_price": e.get("totalPrice"), "got_price": None})
    r["items"] = {
        "expected_count": len(exp_items), "got_count": len(got_items),
        "matched": sum(1 for m in matches if m["got"] is not None),
        "price_correct": sum(1 for m in matches if m["price_ok"]),
        "extra_items": [got_items[i].get("name") for i in unmatched_got],
        "detail": matches,
    }
    hdr_ok = sum(1 for k in ("storeName", "date", "totalAmount") if r[k]["ok"])
    r["score"] = f"başlık {hdr_ok}/3, ürün eşleşme {r['items']['matched']}/{len(exp_items)}, fiyat doğru {r['items']['price_correct']}/{len(exp_items)}, fazladan {len(unmatched_got)}"
    return r


def shrink_image(path: Path, max_edge: int = 1800):
    """Fotoğrafı uzun kenar max_edge px olacak şekilde küçült (JPEG %85).
    Telefon fotoğrafları 8-12 MB; küçültmek isteği 10 kat hızlandırır, fiş metni okunur kalır."""
    try:
        from PIL import Image, ImageOps
        img = Image.open(path)
        img = ImageOps.exif_transpose(img)  # telefon dönüklüğünü düzelt
        if img.mode != "RGB":
            img = img.convert("RGB")
        w, h = img.size
        if max(w, h) > max_edge:
            scale = max_edge / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue(), "image/jpeg"
    except ImportError:
        print("    ! Pillow yok — fotoğraf küçültülmeden gönderiliyor (yavaş olabilir)")
        mime = "image/png" if path.suffix == ".png" else "image/jpeg"
        return path.read_bytes(), mime


GROUND_TRUTH_DIR = HERE / "ground-truth"


def run_one(api_key, fixture, mode):
    if mode == "text":
        fx = json.loads((FIXTURES_DIR / f"{fixture}.json").read_text())
        expected = fx["expected"]
        user_content = "Aşağıda bir Türk market fişinin OCR ham metni var. Satır sırası fişteki görsel sırayla birebir aynı OLMAYABİLİR (sütunlar ayrı bloklar halinde okunmuş olabilir).\n\n" + fx["raw"]["fullText"]
    else:  # vision — beklenen sonuç ground-truth/ dizininden (fotoğraflar fixture'lardan FARKLI, yeni fişler)
        gt_path = GROUND_TRUTH_DIR / f"{fixture}.json"
        if not gt_path.exists():
            print(f"  [{fixture}/vision] ATLANDI — ground-truth/{fixture}.json yok")
            return None
        expected = json.loads(gt_path.read_text())
        photo = None
        for ext in (".jpg", ".jpeg", ".png", ".heic", ".webp"):
            p = PHOTOS_DIR / f"{fixture}{ext}"
            if p.exists():
                photo = p
                break
        if photo is None:
            print(f"  [{fixture}/vision] ATLANDI — photos/{fixture}.jpg yok")
            return None
        img_bytes, mime = shrink_image(photo)
        b64 = base64.b64encode(img_bytes).decode()
        user_content = [
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            {"type": "text", "text": "Bu fiş fotoğrafını analiz et ve şemaya uygun JSON döndür."},
        ]
    t0 = time.time()
    raw_out = call_m3(api_key, user_content)
    elapsed = round(time.time() - t0, 1)
    try:
        parsed = extract_json(raw_out)
        cmp_result = compare(expected, parsed)
        err = None
    except (ValueError, json.JSONDecodeError) as e:
        parsed, cmp_result, err = None, None, str(e)
    result = {"fixture": fixture, "mode": mode, "seconds": elapsed,
              "raw_output": raw_out, "parsed": parsed, "comparison": cmp_result, "error": err}
    RESULTS_DIR.mkdir(exist_ok=True)
    (RESULTS_DIR / f"{fixture}_{mode}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
    if err:
        print(f"  [{fixture}/{mode}] JSON HATASI ({elapsed}s): {err[:120]}")
    else:
        print(f"  [{fixture}/{mode}] {elapsed}s → {cmp_result['score']}")
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["text", "vision", "both"], default="both")
    ap.add_argument("--only")
    args = ap.parse_args()
    api_key = load_env()
    modes = ["vision", "text"] if args.mode == "both" else [args.mode]
    jobs = []
    for mode in modes:
        if mode == "vision":
            # vision: photos/ içinde ne varsa onu test et (gimsa dahil 6 fiş olabilir)
            names = sorted({p.stem for p in PHOTOS_DIR.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".heic", ".webp")})
        else:
            names = FIXTURES
        if args.only:
            names = [n for n in names if n == args.only]
        jobs += [(f, mode) for f in names]
    if not jobs:
        sys.exit("Çalıştırılacak iş yok (photos/ boş mu?)")
    print(f"Model: {MODEL} | {len(jobs)} çağrı PARALEL çalışıyor (fiş başı ~30-90 sn, toplam ≈ en yavaş çağrı kadar)\n")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(run_one, api_key, f, mode) for f, mode in jobs]
        for fut in futures:
            fut.result()
    print(f"\nToplam süre: {round(time.time() - t0, 1)} sn")
    print(f"Ayrıntılı sonuçlar: {RESULTS_DIR}/")


if __name__ == "__main__":
    main()
