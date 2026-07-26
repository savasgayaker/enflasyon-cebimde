import base64
import io
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

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
# 1. deneme 1400px/120sn; timeout veya ağ hatasında 2. deneme görüntüyü
# 1000px'e küçültüp 90 sn dener (küçük görüntü → daha hızlı yanıt).
# Ölçüm kanıtı: 2000px kalabalık fişlerde süreyi patlattı (File 23 ürün,
# üretim 60 sn timeout'undan hiç geçemiyordu) — m3-test koşusu, 26 Tem 2026.
MINIMAX_ATTEMPTS = [(1400, 120), (1000, 90)]

# Geçici sağlayıcı hataları: aynı boyutta tekrar denemeye değer (sorun bizde
# değil; küçültme çare olmaz). 429'da Retry-After başlığına uyulur.
TRANSIENT_HTTP_STATUSES = {429, 500, 502, 503, 504}
# Retry-After'a uyarken üst sınır — sync endpoint thread'ini dakikalarca
# askıda tutmamak için (FastAPI threadpool'u sınırlı).
RETRY_AFTER_CAP_S = 30.0

# m3-test/run_test.py'deki PROMPT sabitiyle birebir aynı — test edilen davranış budur.
RECEIPT_PROMPT = """Sen Türk market fişlerini okuyan bir asistansın. Sana verilen fişi analiz et ve SADECE aşağıdaki şemaya uyan geçerli bir JSON döndür. JSON dışında hiçbir açıklama, markdown, ``` bloğu yazma.

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


KDV_SUFFIX_RE = re.compile(r"\s*%\s*0?\d{1,2}\s*$")

def strip_kdv_suffix(name: str) -> str:
    """Ürün adının SONUNDAKİ KDV oranını kırpar ("PEYNİR 250G %1" → "PEYNİR 250G").
    Adın ortasındaki % işaretine dokunmaz ("DURU 4*150GR" güvende).
    Prompt kuralına rağmen model KDV eklerse savunmacı temizlik."""
    cleaned = KDV_SUFFIX_RE.sub("", name)
    # artakalan kuyruk boşluğu/noktalama (ör. "ÜRÜN -" veya "ÜRÜN ,")
    return cleaned.rstrip(" \t-.,;:").strip()


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
        items.append({
            "name": strip_kdv_suffix(str(it["name"])),
            "quantity": it.get("quantity") if isinstance(it.get("quantity"), (int, float)) else 1,
            "unitPrice": it.get("unitPrice"),
            "totalPrice": total_price,
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


def call_minimax(raw_image: bytes) -> str:
    """MiniMax M3'e adaptif vision çağrısı. Üç kovalı retry politikası:

    1. Timeout / ağ hatası      → bir SONRAKİ (daha küçük) boyutla tekrar dene.
    2. HTTP 429/500/502/503/504 → AYNI boyutta tekrar dene (2 sn bekle;
       429'da Retry-After başlığı varsa ona uy, RETRY_AFTER_CAP_S ile sınırlı).
       Sorun sağlayıcıda — küçültme çare değil.
    3. HTTP 400/401/403         → hemen vazgeç; kalıcı hata (bozuk istek veya
       geçersiz anahtar). Listede olmayan diğer statüler de retry edilmez.

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
            logger.info(
                "parse-receipt deneme %d BAŞARILI: %dpx, %.1f sn (timeout %d sn)",
                attempt_no, max_edge, elapsed, timeout_s,
            )
            return data["choices"][0]["message"].get("content") or ""
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


@api_router.post("/parse-receipt")
def parse_receipt(image: UploadFile = File(...)):
    """Fiş fotoğrafını MiniMax M3 vision ile ParsedReceipt JSON'una çevirir.

    Sync def bilinçli: requests bloklar; FastAPI sync endpoint'i threadpool'da
    çalıştırdığı için event loop tıkanmaz.
    """
    raw_bytes = image.file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Boş görüntü dosyası")
    try:
        # Format doğrulaması — shrink'ler call_minimax içinde deneme başına yapılır.
        Image.open(io.BytesIO(raw_bytes)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Görüntü okunamadı (bozuk veya desteklenmeyen format)")

    raw_out = call_minimax(raw_bytes)
    try:
        parsed = extract_json(raw_out)
        return validate_and_flag(parsed)
    except (ValueError, json.JSONDecodeError) as e:
        logger.error("Model yanıtı ayrıştırılamadı: %s | ilk 300 karakter: %s", e, raw_out[:300])
        raise HTTPException(
            status_code=502,
            detail="Fiş okunamadı: model geçerli bir sonuç döndürmedi, lütfen tekrar deneyin.",
        )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()
