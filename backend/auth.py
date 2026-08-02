"""Supabase erişim jetonunun (JWT) sunucu tarafında doğrulanması.

Neden var: /api/parse-receipt her çağrıda MiniMax'e İKİ istek atar; yani her
çağrının bir bedeli vardır. Uç nokta tünelle internete açıldığı anda, kimlik
kontrolü olmadan bu bedeli isteyen herkes harcayabilir.

Ne yapar: istekteki `Authorization: Bearer <jeton>` başlığını Supabase'in
imzasına karşı doğrular ve kullanıcının kimliğini (users.id) döner.
Doğrulanamayan istek uç noktaya HİÇ ulaşmaz.
"""

import logging
import os
import threading
import time
from collections import deque
from typing import Deque, Dict, Optional

import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Yapılandırma — ortam değişkenleri İSTEK ANINDA okunur, içe aktarma anında
# DEĞİL.
# ---------------------------------------------------------------------------
# Sebep (gerçek bir tuzak): server.py, `load_dotenv()` çağrısını içe
# aktarmalardan SONRA yapıyor. Bu değerler modül düzeyinde sabit olarak
# okunsaydı, `from auth import ...` satırı .env henüz yüklenmemişken çalışır,
# SUPABASE_URL boş kalır ve sunucu HER isteğe 503 dönerdi. Tembel okuma bu
# sıralama tuzağını tamamen ortadan kaldırır: import satırı dosyanın neresinde
# olursa olsun doğru çalışır. Kapta (Docker) değerler zaten ortamdan geldiği
# için orada da aynı şekilde çalışır.
def _supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "").rstrip("/")


def _jwt_secret() -> str:
    """Yalnızca ESKİ (simetrik) projeler için. Yeni projede tanımsız bırakılır."""
    return os.environ.get("SUPABASE_JWT_SECRET", "").strip()


def _limitler() -> tuple:
    """Kullanıcı başına üst sınırlar (saatlik, günlük).

    Kimlik kontrolü yabancıyı durdurur; bu ikisi de kendi kullanıcımızın
    (veya çalınmış bir jetonun) faturayı tek başına şişirmesini durdurur.
    """
    return (
        int(os.environ.get("PARSE_LIMIT_HOUR", "60")),
        int(os.environ.get("PARSE_LIMIT_DAY", "200")),
    )


_ALG_ASYMMETRIC = ("ES256", "RS256")

_jwks_client: Optional[PyJWKClient] = None
_jwks_url: Optional[str] = None
_jwks_lock = threading.Lock()


def _jwks(url: str) -> PyJWKClient:
    """JWKS istemcisi — açık anahtarları Supabase'den çeker ve önbelleğe alır.

    Tek örnek tutulur; yoksa her istek ağa çıkar. `lifespan` süresi dolunca
    anahtarlar yenilenir, böylece Supabase anahtar döndürdüğünde sunucu
    yeniden başlatılmadan uyum sağlar. Adres değişirse (yalnızca testlerde
    olur) önbellek yenilenir.
    """
    global _jwks_client, _jwks_url
    if _jwks_client is None or _jwks_url != url:
        with _jwks_lock:
            if _jwks_client is None or _jwks_url != url:
                if not url:
                    raise RuntimeError("SUPABASE_URL tanımlı değil")
                _jwks_client = PyJWKClient(
                    f"{url}/auth/v1/.well-known/jwks.json",
                    cache_keys=True,
                    lifespan=600,
                )
                _jwks_url = url
    return _jwks_client


def auth_modu() -> str:
    """Hangi doğrulama modunun etkin olduğunu döner: 'hs256' | 'jwks'."""
    return "hs256" if _jwt_secret() else "jwks"


def dogrula_jeton(token: str) -> dict:
    """Jetonu doğrular ve iddiaları (claims) döner. Geçersizse ValueError.

    GÜVENLİK — algoritma seçimi jetonun BAŞLIĞINDAN değil, YAPILANDIRMADAN
    okunur. Saldırgan başlığa `alg` yazabildiği için, "başlıkta ne yazıyorsa
    onu kullan" davranışı klasik bir açıktır: asimetrik imzalı bir projede
    saldırgan, herkese açık doğrulama anahtarını HS256 sırrı gibi kullanarak
    kendi jetonunu imzalayabilir. Bu yüzden burada AYNI ANDA tek bir mod
    etkindir: SUPABASE_JWT_SECRET tanımlıysa yalnızca HS256, değilse yalnızca
    JWKS (ES256/RS256).
    """
    url = _supabase_url()
    if not url:
        raise RuntimeError("SUPABASE_URL tanımlı değil")

    sir = _jwt_secret()
    if sir:
        algorithms = ["HS256"]
        key = sir
    else:
        algorithms = list(_ALG_ASYMMETRIC)
        try:
            key = _jwks(url).get_signing_key_from_jwt(token).key
        except Exception as exc:  # anahtar bulunamadı / ağ hatası
            raise ValueError(f"imza anahtarı alınamadı: {exc}") from exc

    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience="authenticated",
            issuer=f"{url}/auth/v1",
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
    except jwt.PyJWTError as exc:
        raise ValueError(str(exc)) from exc

    # `role` iddiası, veritabanındaki erişim kurallarının dayandığı roldür.
    # 'authenticated' dışındaki bir rol (ör. service_role) buradan geçmemeli.
    if claims.get("role") != "authenticated":
        raise ValueError(f"beklenmeyen rol: {claims.get('role')!r}")

    return claims


# ---------------------------------------------------------------------------
# Kullanıcı başına hız sınırı
# ---------------------------------------------------------------------------
# Bilerek bellekte: tek süreçte (uvicorn --workers 1) doğru çalışır, sunucu
# yeniden başlarsa sayaç sıfırlanır. Amacı kaçak kullanımı engellemek değil,
# tek bir jetonun faturayı katlamasını engellemek. Kalıcı ve süreçler arası
# bir sınır gerekirse Redis'e taşınır — bugün gerek yok.
_hits: Dict[str, Deque[float]] = {}
_hits_lock = threading.Lock()


def _limit_kontrol(user_id: str, now: Optional[float] = None) -> None:
    now = time.time() if now is None else now
    saat_siniri, gun_siniri = _limitler()
    with _hits_lock:
        d = _hits.setdefault(user_id, deque())
        while d and now - d[0] > 86400:
            d.popleft()
        gun = len(d)
        saat = sum(1 for t in d if now - t <= 3600)
        if saat >= saat_siniri or gun >= gun_siniri:
            raise HTTPException(
                status_code=429,
                detail="Çok fazla fiş gönderildi. Lütfen bir süre sonra tekrar deneyin.",
            )
        d.append(now)


def limit_sifirla() -> None:
    """Yalnızca testler için."""
    with _hits_lock:
        _hits.clear()


# ---------------------------------------------------------------------------
# FastAPI bağımlılığı
# ---------------------------------------------------------------------------
async def gecerli_kullanici(request: Request) -> dict:
    """Uç noktaya eklenince: jetonu olmayan istek 401 ile geri döner.

    Döndürdüğü sözlük `{"id": ..., "is_anonymous": ...}` — `id`, veritabanındaki
    public.users.id ile AYNI değerdir (ikisi de auth.users.id'dir).
    """
    header = request.headers.get("authorization") or ""
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Oturum bulunamadı.")
    token = header[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Oturum bulunamadı.")

    try:
        claims = dogrula_jeton(token)
    except ValueError as exc:
        # Sebep yalnızca sunucu günlüğüne yazılır; istemciye ayrıntı verilmez.
        logger.warning("jeton reddedildi: %s", exc)
        raise HTTPException(status_code=401, detail="Oturum geçersiz veya süresi dolmuş.")
    except RuntimeError as exc:
        logger.error("kimlik doğrulama yapılandırılmamış: %s", exc)
        raise HTTPException(status_code=503, detail="Sunucu yapılandırması eksik.")

    user_id = str(claims["sub"])
    _limit_kontrol(user_id)
    return {"id": user_id, "is_anonymous": bool(claims.get("is_anonymous", False))}
