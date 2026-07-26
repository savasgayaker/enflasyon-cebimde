#!/usr/bin/env python3
"""KABUL TESTİ — çift-paralel thinking_off akışı.

6 fiş × 5 koşu, backend /api/parse-receipt üzerinden (gerçek üretim yolu).
Her koşu ground-truth ile karşılaştırılır ve üç sınıfa ayrılır:
  (a) tamamen doğru
  (b) hata VAR ve katmanlardan biri yakaladı (kalem/fiş needsReview)
  (c) hata VAR ve HİÇBİR bayrak yok — SESSİZ (kritik sütun)
Bonus: yanlış alarm (doğru ama bayraklı) ve ortalama uçtan uca süre.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

# Betik m3-test/ içinde yaşar; yollar konumuna göre çözülür (makineye özel
# mutlak yol commit'e girmesin diye — orijinalde /Users/... sabitti).
M3TEST = Path(__file__).parent
sys.path.insert(0, str(M3TEST))
from run_test import compare  # noqa: E402

URL = "http://127.0.0.1:8000/api/parse-receipt"
OUT = Path(__file__).parent / "acceptance_results.json"
FIXTURES = ["a101", "bildirici", "bim", "file", "gimsa", "migros"]
RUNS = 5


def post(photo: Path):
    t0 = time.monotonic()
    p = subprocess.run(
        ["curl", "-s", "-X", "POST", "-F", f"image=@{photo}", URL],
        capture_output=True, text=True, timeout=200,
    )
    elapsed = time.monotonic() - t0
    return elapsed, json.loads(p.stdout)


def main():
    results = []
    for fixture in FIXTURES:
        photo = None
        for ext in (".jpg", ".jpeg", ".png"):
            c = M3TEST / "photos" / f"{fixture}{ext}"
            if c.exists():
                photo = c
                break
        gt = json.loads((M3TEST / "ground-truth" / f"{fixture}.json").read_text())
        for run in range(1, RUNS + 1):
            rec = {"fixture": fixture, "run": run}
            try:
                elapsed, resp = post(photo)
            except Exception as e:
                rec.update(cls="ERR", seconds=None, error=str(e)[:120])
                results.append(rec)
                print(f"  {fixture} koşu {run}: İSTEK HATASI {rec['error']}", flush=True)
                continue
            rec["seconds"] = round(elapsed, 1)
            if "detail" in resp:
                # Backend hata döndürdü (502 vb.) — hata sunulmadı, sessiz değil.
                rec.update(cls="BACKEND_ERR", error=resp["detail"][:120])
                results.append(rec)
                print(f"  {fixture} koşu {run}: {rec['seconds']} sn BACKEND_ERR {rec['error']}", flush=True)
                OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2))
                time.sleep(2)
                continue
            cmp_r = compare(gt, resp)
            hdr_ok = all(cmp_r[k]["ok"] for k in ("storeName", "date", "totalAmount"))
            items_ok = (
                cmp_r["items"]["matched"] == cmp_r["items"]["expected_count"]
                and cmp_r["items"]["price_correct"] == cmp_r["items"]["expected_count"]
                and not cmp_r["items"]["extra_items"]
            )
            correct = hdr_ok and items_ok
            flagged = resp.get("needsReview") is True or any(
                i.get("needsReview") for i in resp.get("items", []))
            if correct:
                rec["cls"] = "A_dogru_bayrakli" if flagged else "A_dogru"
            elif flagged:
                rec["cls"] = "B_yakalandi"
            else:
                rec["cls"] = "C_SESSIZ"
            rec["score"] = cmp_r["score"]
            # Ek 8: unit/vatRate doluluk analizi için yanıt kalemleri de saklanır.
            rec["resp_items"] = [
                {"name": i.get("name"), "unit": i.get("unit"),
                 "vatRate": i.get("vatRate"), "needsReview": i.get("needsReview")}
                for i in resp.get("items", [])
            ]
            rec["receipt_flag"] = resp.get("needsReview")
            rec["flagged_items"] = sum(1 for i in resp.get("items", []) if i.get("needsReview"))
            wrong = [
                f'{m["expected"]}: {m["got_price"]} (doğru {m["expected_price"]})'
                for m in cmp_r["items"]["detail"] if not m["price_ok"]
            ]
            rec["wrong"] = wrong
            results.append(rec)
            print(f"  {fixture} koşu {run}: {rec['seconds']} sn → {rec['cls']}"
                  + (f" | yanlış: {'; '.join(wrong)}" if wrong else ""), flush=True)
            OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2))
            time.sleep(2)

    # Özet
    from collections import Counter
    counts = Counter(r["cls"] for r in results)
    times = [r["seconds"] for r in results if r.get("seconds")]
    print("\n=== ÖZET ===")
    for k in ("A_dogru", "A_dogru_bayrakli", "B_yakalandi", "C_SESSIZ", "BACKEND_ERR", "ERR"):
        if counts.get(k):
            print(f"  {k}: {counts[k]}")
    if times:
        print(f"  ortalama süre: {round(sum(times)/len(times), 1)} sn "
              f"(min {min(times)}, max {max(times)})")
    print("Bitti →", OUT, flush=True)


if __name__ == "__main__":
    main()
