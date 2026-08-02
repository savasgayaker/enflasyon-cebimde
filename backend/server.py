import base64
import difflib
import io
import json
import logging
import os
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import List

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

# Sunucu hangi klasörden başlatılırsa başlatılsın prompt import'u çalışsın.
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from receipt_prompt import RECEIPT_PROMPT
from receipt_fields import (
    strip_kdv_suffix, extract_kdv_rate, normalize_vat_rate,
    normalize_unit, reconcile_optional,
)
from auth import auth_modu, gecerli_kullanici

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB bağlantısı OPSİYONEL: /api/parse-receipt Mongo'suz da çalışmalı.
# MONGO_URL tanımlı değilse status endpoint'leri 503 döner, uygulama yine ayağa kalkar.
mongo_url = os.environ.get('MONGO_URL')
client = None
db = None
if mongo_url:
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'enflasyon')]

app = FastAPI()
api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB yapılandırılmamış (MONGO_URL yok)")
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB yapılandırılmamış (MONGO_URL yok)")
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# ---------------------------------------------------------------------------
# /api/parse-receipt — MiniMax M3 vision fiş ayrıştırma proxy'si
# ---------------------------------------------------------------------------
# Karar gerekçesi ve test kanıtı: m3-test/results/RAPOR.md
# API anahtarı yalnızca sunucuda tutulur (backend/.env → MINIMAX_API_KEY);
# istemciye asla gönderilmez.

MINIMAX_API_URL = "https://api.minimax.io/v1/chat/completions"
MINIMAX_MODEL = "MiniMax-M3"
MINIMAX_MAX_TOKENS = 24000  # reasoning payı yüksek; düşük değerde JSON yarım kalıyor

# Adaptif deneme planı: (max_edge px, timeout sn).
# thinking_off ile tek çağrı ~8 sn (RAPOR.md Ek 3-4) — 45 sn fazlasıyla
# yeter. Timeout/ağ hatasında 2. deneme görüntüyü 1000px'e küçültür.
MINIMAX_ATTEMPTS = [(1400, 45), (1000, 45)]

# Geçici sağlayıcı hataları: aynı boyutta tekrar denemeye değer (sorun bizde
# değil; küçültme çare olmaz). 429'da Retry-After başlığına uyulur.
TRANSIENT_HTTP_STATUSES = {429, 500, 502, 503, 504}
# Retry-After'a uyarken üst sınır — sync endpoint thread'ini dakikalarca
# askıda tutmamak için (FastAPI threadpool'u sınırlı).
RETRY_AFTER_CAP_S = 30.0


def shrink_image(data: bytes, max_edge: int = 1400, quality: int = 80) -> bytes:
    """Fotoğrafı uzun kenar max_edge px / JPEG %quality'e küçültür.
    EXIF yön bilgisini uygular (telefon fotoğrafları yan gelmesin)."""
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    if max(w, h) > max_edge:
        scale = max_edge / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def extract_json(text: str) -> dict:
    """Model çıktısından JSON gövdesini çeker (m3-test/run_test.py portu):
    <think> bloklarını at, ```json çitlerini soy, ilk { son } arasını parse et."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S)
    if m:
        text = m.group(1)
    else:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError(f"Çıktıda JSON bulunamadı: {text[:200]}")
        text = text[start:end + 1]
    return json.loads(text)


def validate_and_flag(parsed: dict) -> dict:
    """Şemayı doğrular, aritmetik çapraz-kontrolü uygular.

    - Zorunlu alan eksikse ValueError (üst katman 502'ye çevirir).
    - Her ürüne needsReview alanı eklenir: totalPrice null ise true.
    - sum(items.totalPrice) ile totalAmount farkı > 0.01 ise fiş seviyesinde
      needsReview: true (RAPOR.md: 5 vision hatasının 5'i de bu kontrole takılıyor).
    """
    for key in ("storeName", "date", "totalAmount", "items"):
        if key not in parsed:
            raise ValueError(f"Model yanıtında zorunlu alan eksik: {key}")
    if not isinstance(parsed["items"], list):
        raise ValueError("items bir liste değil")

    items = []
    price_sum = 0.0
    any_null = False
    for it in parsed["items"]:
        if not isinstance(it, dict) or "name" not in it:
            raise ValueError(f"Geçersiz ürün kaydı: {it!r}")
        total_price = it.get("totalPrice")
        if total_price is not None:
            try:
                total_price = round(float(total_price), 2)
                price_sum += total_price
            except (TypeError, ValueError):
                total_price = None
        if total_price is None:
            any_null = True
        raw_name = str(it["name"])
        # vatRate: önce modelin ayrı alanı, olmazsa adın sonundan kurtarma.
        # K1 gereği fiş görüntüsü saklanmıyor — burada atılan bilgi kalıcı kaybolur.
        vat = normalize_vat_rate(it.get("vatRate"))
        if vat is None:
            vat = extract_kdv_rate(raw_name)
        items.append({
            "name": strip_kdv_suffix(raw_name),
            "quantity": it.get("quantity") if isinstance(it.get("quantity"), (int, float)) else 1,
            "unit": normalize_unit(it.get("unit")),
            "unitPrice": it.get("unitPrice"),
            "totalPrice": total_price,
            "vatRate": vat,
            "needsReview": total_price is None,
        })

    try:
        total_amount = round(float(parsed["totalAmount"]), 2)
    except (TypeError, ValueError):
        raise ValueError(f"totalAmount sayı değil: {parsed['totalAmount']!r}")

    arithmetic_ok = not any_null and abs(price_sum - total_amount) <= 0.01
    return {
        "storeName": str(parsed["storeName"] or ""),
        "date": str(parsed["date"] or ""),
        "totalAmount": total_amount,
        "items": items,
        "needsReview": not arithmetic_ok,
    }


def call_minimax(raw_image: bytes) -> dict:
    """MiniMax M3'e adaptif vision çağrısı; ayrıştırılmış JSON dict döner.

    Retry politikası (dört kova, hepsi ≤ 2 deneme bütçesini PAYLAŞIR):

    1. Timeout / ağ hatası      → bir SONRAKİ (daha küçük) boyutla tekrar dene.
    2. HTTP 429/500/502/503/504 → AYNI boyutta tekrar dene (2 sn bekle;
       429'da Retry-After başlığı varsa ona uy, RETRY_AFTER_CAP_S ile sınırlı).
       Sorun sağlayıcıda — küçültme çare değil.
    3. HTTP 400/401/403         → hemen vazgeç; kalıcı hata (bozuk istek veya
       geçersiz anahtar). Listede olmayan diğer statüler de retry edilmez.
    4. Kullanılamayan yanıt     → AYNI boyutta tekrar dene:
       finish_reason == "length" (token tavanına çarpıp kırpılmış — JSON
       parse'ı beklemeye gerek yok) veya JSON ayrıştırma hatası. Ölçüm
       kanıtı: aynı görüntüde yeni koşu kısa reasoning'le bitirebiliyor
       (completion_tokens 3 955 – 24 000 arası savruluyor).

    Toplam deneme her koşulda en fazla 2 — sonsuz döngü riski yok.
    """
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Sunucu yapılandırma hatası: MINIMAX_API_KEY tanımlı değil (backend/.env)",
        )
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    last_err = None
    max_edge, timeout_s = MINIMAX_ATTEMPTS[0]
    for attempt_no in (1, 2):
        jpeg = shrink_image(raw_image, max_edge=max_edge)
        b64 = base64.b64encode(jpeg).decode()
        body = {
            "model": MINIMAX_MODEL,
            "temperature": 0.0,
            "max_tokens": MINIMAX_MAX_TOKENS,
            # thinking kapalı: 10-20x hız (8 sn), token 727-780 bandında
            # deterministik. Doğruluk açığı çift-paralel çağrı + çapraz
            # kontrolle kapatılıyor (karar: RAPOR.md Ek 4-5).
            "thinking": {"type": "disabled"},
            "messages": [
                {"role": "system", "content": RECEIPT_PROMPT},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    {"type": "text", "text": "Bu fiş fotoğrafını analiz et ve şemaya uygun JSON döndür."},
                ]},
            ],
        }
        t0 = time.monotonic()
        try:
            resp = requests.post(
                MINIMAX_API_URL, json=body, headers=headers, timeout=timeout_s,
            )
            resp.raise_for_status()
            data = resp.json()
            elapsed = time.monotonic() - t0
            choice = data["choices"][0]
            finish_reason = choice.get("finish_reason")
            content = choice["message"].get("content") or ""

            # Kova 4a: token tavanına çarpmış → yanıt kırpık, parse denemeye gerek yok
            if finish_reason == "length":
                last_err = ValueError("finish_reason=length (yanıt token tavanında kırpıldı)")
                logger.warning(
                    "parse-receipt deneme %d KIRPIK (finish_reason=length): %dpx, %.1f sn — "
                    "AYNI boyutta tekrar",
                    attempt_no, max_edge, elapsed,
                )
                continue

            # Kova 4b: JSON ayrıştırma hatası → yeni koşu şansı
            try:
                parsed = extract_json(content)
            except (ValueError, json.JSONDecodeError) as e:
                last_err = e
                logger.warning(
                    "parse-receipt deneme %d JSON HATASI: %dpx, %.1f sn — %s | ilk 200: %s — "
                    "AYNI boyutta tekrar",
                    attempt_no, max_edge, elapsed, e, content[:200],
                )
                continue

            logger.info(
                "parse-receipt deneme %d BAŞARILI: %dpx, %.1f sn (timeout %d sn, finish=%s)",
                attempt_no, max_edge, elapsed, timeout_s, finish_reason,
            )
            return parsed
        except requests.HTTPError as e:
            elapsed = time.monotonic() - t0
            status = e.response.status_code if e.response is not None else None
            last_err = e
            if status in (401, 403):
                logger.error(
                    "parse-receipt HTTP %s: MINIMAX_API_KEY geçersiz veya süresi dolmuş olabilir "
                    "(backend/.env kontrol edin) — retry edilmiyor",
                    status,
                )
                break
            if status in TRANSIENT_HTTP_STATUSES and attempt_no == 1:
                wait = 2.0
                if status == 429 and e.response is not None:
                    retry_after = e.response.headers.get("Retry-After")
                    if retry_after:
                        try:
                            wait = min(float(retry_after), RETRY_AFTER_CAP_S)
                        except ValueError:
                            pass
                logger.warning(
                    "parse-receipt deneme %d HTTP %s (geçici sağlayıcı hatası): "
                    "%dpx, %.1f sn — %.1f sn bekleyip AYNI boyutta tekrar",
                    attempt_no, status, max_edge, elapsed, wait,
                )
                time.sleep(wait)
                continue  # boyut ve timeout aynı kalır
            logger.error(
                "parse-receipt deneme %d HTTP %s: %dpx, %.1f sn — kalıcı hata, retry edilmiyor",
                attempt_no, status, max_edge, elapsed,
            )
            break
        except (requests.RequestException, KeyError, IndexError, ValueError) as e:
            elapsed = time.monotonic() - t0
            logger.warning(
                "parse-receipt deneme %d başarısız (timeout/ağ): %dpx, %.1f sn (timeout %d sn) — %s",
                attempt_no, max_edge, elapsed, timeout_s, e,
            )
            last_err = e
            max_edge, timeout_s = MINIMAX_ATTEMPTS[1]  # küçük boyutla devam
    raise HTTPException(
        status_code=502,
        detail="Fiş okunamadı. Fişi düz bir zemine koyup çerçeveyi dolduracak şekilde tekrar çekmeyi deneyin.",
    ) from last_err


# ---------------------------------------------------------------------------
# Çift-paralel çağrı çapraz kontrolü (karar: RAPOR.md Ek 4-5)
# thinking_off'un kayma hataları koşular arası DEĞİŞKEN → iki bağımsız
# çağrının uyuşmayan kalemleri işaretlemesi büyük hataları yakalar.
# Bilinen kör nokta: ±1 TL sınıfı tutarlı okuma hataları iki çağrıda da
# aynı gelir (teknik borçta kayıtlı).
# ---------------------------------------------------------------------------

def _norm_name(s: str) -> str:
    s = (s or "").upper()
    for a, b in (("İ", "I"), ("Ö", "O"), ("Ü", "U"), ("Ş", "S"), ("Ğ", "G"), ("Ç", "C")):
        s = s.replace(a, b)
    return re.sub(r"[^A-Z0-9]", "", s)


def _name_sim(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, _norm_name(a), _norm_name(b)).ratio()


NAME_SIM_THRESHOLD = 0.55  # run_test.py bulanık eşleştiricisiyle aynı eşik


def _prices_differ(a, b) -> bool:
    if a is None and b is None:
        return False
    if a is None or b is None:
        return True
    return abs(float(a) - float(b)) > 0.01


def _pair_items(items_a: list, items_b: list):
    """(a_index → b_index | None) eşlemesi. Önce sıraya göre; ad benzerliği
    her indekste eşiği geçmiyorsa bulanık eşleştiriciye düşer (sıra değişebilir)."""
    if len(items_a) == len(items_b) and all(
        _name_sim(x["name"], y["name"]) >= NAME_SIM_THRESHOLD
        for x, y in zip(items_a, items_b)
    ):
        return {i: i for i in range(len(items_a))}

    # Bulanık: run_test.py mantığı — ad benzerliği + fiyat eşleşme bonusu
    mapping = {}
    unmatched_b = list(range(len(items_b)))
    for ai, a in enumerate(items_a):
        best, best_score = None, 0.0
        for bi in unmatched_b:
            b = items_b[bi]
            score = _name_sim(a["name"], b["name"])
            if not _prices_differ(a.get("totalPrice"), b.get("totalPrice")):
                score += 0.5
            if score > best_score:
                best, best_score = bi, score
        if best is not None and best_score >= NAME_SIM_THRESHOLD:
            mapping[ai] = best
            unmatched_b.remove(best)
        else:
            mapping[ai] = None
    return mapping


def _effective_unit_price(item: dict):
    """Etkin birim fiyat: unitPrice varsa o; yoksa geçerli quantity (> 0)
    ile totalPrice/quantity; o da yoksa None. İki çağrının unitPrice
    TEMSİLİ farklı olabiliyor (biri null, öteki dolu) — karşılaştırma
    temsile değil değere yapılmalı (RAPOR.md Ek 6: A101 4'lü sahte bayrak)."""
    up = item.get("unitPrice")
    if isinstance(up, (int, float)):
        return round(float(up), 2)
    tp = item.get("totalPrice")
    q = item.get("quantity")
    if isinstance(tp, (int, float)) and isinstance(q, (int, float)) and q > 0:
        return round(float(tp) / float(q), 2)
    return None


_TURKISH_CHARS = set("ÇĞİÖŞÜçğıöşü")


def _pick_better_name(a: str, b: str) -> str:
    """İki ad adayından daha iyisini seçer: Türkçe karakter içeren tercih
    edilir (M3'ün ASCII'leştirdiği K*P*K yerine KÖPÜK); ikisi de eşitse
    uzun olan; o da eşitse ilki (chosen'ınki)."""
    a_tr = any(c in _TURKISH_CHARS for c in a)
    b_tr = any(c in _TURKISH_CHARS for c in b)
    if a_tr != b_tr:
        return a if a_tr else b
    if len(b) > len(a):
        return b
    return a


def cross_check(chosen: dict, other: dict) -> None:
    """Seçilen yanıtın kalemlerini diğer yanıtla karşılaştırıp bayraklar.
    chosen'ı yerinde işaretler (item.needsReview / fiş needsReview).

    Bayrak kuralı (RAPOR.md Ek 6 ayarı): quantity/totalPrice/unitPrice
    uyuşmazlığı kalemi bayraklar; SADECE ad farklıysa bayrak YOK — iki
    addan iyisi seçilir (yanlış alarmın ana kaynağı ad nondeterminizmiydi)."""
    ca, cb = chosen["items"], other["items"]

    if len(ca) != len(cb):
        chosen["needsReview"] = True
        logger.info("çapraz kontrol: kalem sayısı uyuşmuyor (%d vs %d) — fiş needsReview", len(ca), len(cb))
    if _prices_differ(chosen.get("totalAmount"), other.get("totalAmount")):
        chosen["needsReview"] = True
        logger.info(
            "çapraz kontrol: totalAmount uyuşmuyor (%s vs %s) — fiş needsReview",
            chosen.get("totalAmount"), other.get("totalAmount"),
        )

    mapping = _pair_items(ca, cb)
    flagged = 0
    for ai, bi in mapping.items():
        if bi is None:
            ca[ai]["needsReview"] = True
            flagged += 1
            continue
        b = cb[bi]
        a = ca[ai]
        # unit/vatRate: iki çağrı çelişirse alan BOŞALTILIR, bayrak çıkmaz.
        # Yanlış alarm Ek 6-7'de zaten yapısal ~%30 tabanında; fiyatı bozmayan
        # bir alan için o tabanı yükseltmek doğru takas değil (Ek 7 kuralının aynısı).
        for _field in ("unit", "vatRate"):
            _av, _bv = a.get(_field), b.get(_field)
            _merged = reconcile_optional(_av, _bv)
            if _av is not None and _bv is not None and _merged is None:
                # Yalnız ölçüm logu (Ek 8: "çelişkiden boşalan alan" sayacı).
                logger.info("çapraz kontrol: %s çelişkisi (%r vs %r) — alan boşaltıldı", _field, _av, _bv)
            a[_field] = _merged
        qty_differ = abs(float(a.get("quantity") or 0) - float(b.get("quantity") or 0)) > 0.001
        # unitPrice: temsil değil DEĞER karşılaştırılır; iki taraftan biri
        # hesaplanamıyorsa bu alandan bayrak çıkmaz (totalPrice zaten ayrıca
        # karşılaştırılıyor).
        ua, ub = _effective_unit_price(a), _effective_unit_price(b)
        unit_differ = ua is not None and ub is not None and abs(ua - ub) > 0.01
        if (
            qty_differ
            or _prices_differ(a.get("totalPrice"), b.get("totalPrice"))
            or unit_differ
        ):
            a["needsReview"] = True
            flagged += 1
        elif a["name"] != b["name"]:
            # Miktar ve fiyatların hepsi aynı, yalnız ad farklı → bayrak yok;
            # daha iyi adı seç (Türkçe karakterli / uzun olan) ve logla.
            better = _pick_better_name(a["name"], b["name"])
            if better != a["name"]:
                logger.info("çapraz kontrol: ad seçimi %r → %r", a["name"], better)
                a["name"] = better
            else:
                logger.info("çapraz kontrol: ad farkı bayraksız — %r korundu (aday: %r)", a["name"], b["name"])
    if flagged:
        logger.info("çapraz kontrol: %d kalem uyuşmadı, needsReview işaretlendi", flagged)


@api_router.post("/parse-receipt")
def parse_receipt(
    image: UploadFile = File(...),
    kullanici: dict = Depends(gecerli_kullanici),
):
    """Fiş fotoğrafını İKİ paralel MiniMax M3 (thinking_off) çağrısıyla okur,
    yanıtları çapraz kontrol eder, ParsedReceipt JSON'u döner.

    Sunulacak yanıt: ürün toplamı totalAmount'a uyan; ikisi de uyuyorsa
    veya ikisi de uymuyorsa İLK TAMAMLANAN. Aritmetik kontrol seçilen yanıt
    üzerinde aynen çalışır. Çağrılardan biri düşerse diğeri kullanılır ama
    çapraz kontrol yapılamadığı için fiş needsReview işaretlenir.

    Sync def bilinçli: requests bloklar; FastAPI sync endpoint'i threadpool'da
    çalıştırdığı için event loop tıkanmaz.
    """
    logger.info("parse-receipt istek: kullanici=%s anonim=%s", kullanici["id"], kullanici["is_anonymous"])
    raw_bytes = image.file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Boş görüntü dosyası")
    try:
        # Format doğrulaması — shrink'ler call_minimax içinde deneme başına yapılır.
        Image.open(io.BytesIO(raw_bytes)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Görüntü okunamadı (bozuk veya desteklenmeyen format)")

    # İki bağımsız çağrı EŞZAMANLI — süre tek çağrı süresinde kalır.
    validated = []  # tamamlanma sırasına göre başarılı + şeması geçerli yanıtlar
    errors = []
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(call_minimax, raw_bytes) for _ in range(2)]
        for fut in as_completed(futures):
            try:
                validated.append(validate_and_flag(fut.result()))
            except HTTPException as e:
                errors.append(e)
            except ValueError as e:
                logger.error("Model yanıtı şema doğrulamasından geçemedi: %s", e)
                errors.append(HTTPException(
                    status_code=502,
                    detail="Fiş okunamadı: model geçerli bir sonuç döndürmedi, lütfen tekrar deneyin.",
                ))

    if not validated:
        raise errors[0]

    if len(validated) == 1:
        # Zarif bozulma: tek yanıt var, çapraz kontrol yapılamadı.
        logger.warning(
            "çapraz kontrol YAPILAMADI: iki çağrıdan biri düştü (%s) — fiş needsReview",
            errors[0].detail if errors else "bilinmeyen hata",
        )
        result = validated[0]
        result["needsReview"] = True
        return result

    first, second = validated[0], validated[1]
    # validate_and_flag semantiği: needsReview == aritmetik tutmuyor
    first_ok, second_ok = not first["needsReview"], not second["needsReview"]
    if second_ok and not first_ok:
        chosen, other = second, first
    else:
        # ikisi de uyuyor / ikisi de uymuyor / yalnız ilk uyuyor → ilk gelen
        chosen, other = first, second

    cross_check(chosen, other)
    return chosen


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/saglik")
def saglik():
    """Tunelin ve kabin ayakta oldugunu gormek icin. Sir icermez."""
    return {"durum": "ok", "auth": auth_modu()}

@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()
