"""auth.py için izole sınama.

Gerçek Supabase'e bağlanmaz: yerelde bir EC anahtarı üretip kendi JWKS
uç noktasını ayağa kaldırır, jetonları o anahtarla imzalar. Böylece
doğrulama mantığı internet ve proje olmadan kanıtlanabilir.

Koşum:  cd backend && python3 -m pytest tests/test_auth.py -q
"""

import base64
import hashlib
import hmac
import importlib
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ---------------------------------------------------------------------------
# Sahte Supabase JWKS sunucusu
# ---------------------------------------------------------------------------
PRIV = ec.generate_private_key(ec.SECP256R1())
PUB = PRIV.public_key()
KID = "test-anahtar-1"

# Yetkisiz ikinci anahtar: JWKS'te YOK. Bununla imzalanan jeton geçmemeli.
YABANCI_PRIV = ec.generate_private_key(ec.SECP256R1())

PRIV_PEM = PRIV.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()
YABANCI_PEM = YABANCI_PRIV.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()
PUB_PEM = PUB.public_bytes(
    serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
).decode()


def _b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


nums = PUB.public_numbers()
JWKS = {
    "keys": [
        {
            "kty": "EC",
            "crv": "P-256",
            "alg": "ES256",
            "use": "sig",
            "kid": KID,
            "x": _b64u(nums.x.to_bytes(32, "big")),
            "y": _b64u(nums.y.to_bytes(32, "big")),
        }
    ]
}


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/auth/v1/.well-known/jwks.json":
            body = json.dumps(JWKS).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *a):
        pass


_srv = HTTPServer(("127.0.0.1", 0), _Handler)
PORT = _srv.server_address[1]
threading.Thread(target=_srv.serve_forever, daemon=True).start()

BASE = f"http://127.0.0.1:{PORT}"
ISS = f"{BASE}/auth/v1"

GIZLI = "cok-gizli-eski-sir-en-az-otuz-iki-bayt-olmali"


def _yukle(jwt_secret: str = ""):
    """auth modülünü istenen ortam değişkenleriyle taze yükler."""
    os.environ["SUPABASE_URL"] = BASE
    os.environ["PARSE_LIMIT_HOUR"] = "5"
    os.environ["PARSE_LIMIT_DAY"] = "8"
    if jwt_secret:
        os.environ["SUPABASE_JWT_SECRET"] = jwt_secret
    else:
        os.environ.pop("SUPABASE_JWT_SECRET", None)
    import auth as _auth

    importlib.reload(_auth)
    return _auth


def _iddialar(**over):
    now = int(time.time())
    d = {
        "sub": "11111111-1111-1111-1111-111111111111",
        "aud": "authenticated",
        "role": "authenticated",
        "iss": ISS,
        "iat": now,
        "exp": now + 3600,
        "is_anonymous": True,
    }
    d.update(over)
    return d


def _jeton(claims=None, key=PRIV_PEM, alg="ES256", kid=KID):
    headers = {"kid": kid} if kid else None
    return jwt.encode(claims or _iddialar(), key, algorithm=alg, headers=headers)


# ---------------------------------------------------------------------------
# JWKS (asimetrik) modu
# ---------------------------------------------------------------------------
def test_gecerli_jeton_kabul_edilir():
    a = _yukle()
    c = a.dogrula_jeton(_jeton())
    assert c["sub"] == "11111111-1111-1111-1111-111111111111"
    assert c["is_anonymous"] is True


def test_suresi_dolmus_jeton_reddedilir():
    a = _yukle()
    now = int(time.time())
    t = _jeton(_iddialar(iat=now - 7200, exp=now - 3600))
    with pytest.raises(ValueError):
        a.dogrula_jeton(t)


def test_yanlis_veren_reddedilir():
    a = _yukle()
    with pytest.raises(ValueError):
        a.dogrula_jeton(_jeton(_iddialar(iss="https://baskasi.supabase.co/auth/v1")))


def test_yanlis_hedef_kitle_reddedilir():
    a = _yukle()
    with pytest.raises(ValueError):
        a.dogrula_jeton(_jeton(_iddialar(aud="baska")))


def test_service_role_jetonu_reddedilir():
    """service_role bütün erişim kurallarını atlar; uç noktadan geçmemeli."""
    a = _yukle()
    with pytest.raises(ValueError) as e:
        a.dogrula_jeton(_jeton(_iddialar(role="service_role")))
    assert "rol" in str(e.value)


def test_yabanci_anahtarla_imzali_jeton_reddedilir():
    a = _yukle()
    with pytest.raises(ValueError):
        a.dogrula_jeton(_jeton(key=YABANCI_PEM))


def test_bilinmeyen_kid_reddedilir():
    a = _yukle()
    with pytest.raises(ValueError):
        a.dogrula_jeton(_jeton(kid="olmayan-anahtar"))


def test_alg_none_reddedilir():
    """İmzasız jeton — en eski JWT tuzağı."""
    a = _yukle()
    head = _b64u(json.dumps({"alg": "none", "typ": "JWT"}).encode())
    body = _b64u(json.dumps(_iddialar()).encode())
    with pytest.raises(ValueError):
        a.dogrula_jeton(f"{head}.{body}.")


def test_algoritma_karistirma_saldirisi_reddedilir():
    """Saldırgan, HERKESE AÇIK doğrulama anahtarını HS256 sırrı gibi kullanıp
    kendi jetonunu imzalar. Algoritma başlıktan okunsaydı bu geçerdi."""
    a = _yukle()
    # PyJWT açık anahtarla HS256 İMZALAMAYI reddediyor (kütüphane düzeyinde iyi
    # bir savunma), bu yüzden saldırganın jetonu elle üretiliyor: gerçek bir
    # saldırgan bu kısıtı olmayan bir araç kullanır.
    head = _b64u(json.dumps({"alg": "HS256", "typ": "JWT", "kid": KID}).encode())
    body = _b64u(json.dumps(_iddialar()).encode())
    imza = _b64u(
        hmac.new(PUB_PEM.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest()
    )
    with pytest.raises(ValueError):
        a.dogrula_jeton(f"{head}.{body}.{imza}")


def test_zorunlu_iddia_eksikse_reddedilir():
    a = _yukle()
    c = _iddialar()
    c.pop("exp")
    with pytest.raises(ValueError):
        a.dogrula_jeton(jwt.encode(c, PRIV_PEM, algorithm="ES256", headers={"kid": KID}))


# ---------------------------------------------------------------------------
# HS256 (eski, simetrik) modu
# ---------------------------------------------------------------------------
def test_hs256_modunda_gecerli_jeton():
    a = _yukle(jwt_secret=GIZLI)
    assert a.auth_modu() == "hs256"
    t = jwt.encode(_iddialar(), GIZLI, algorithm="HS256")
    assert a.dogrula_jeton(t)["role"] == "authenticated"


def test_hs256_modunda_asimetrik_jeton_reddedilir():
    """Mod tek: HS256 açıkken ES256 jetonu kabul edilmez."""
    a = _yukle(jwt_secret=GIZLI)
    with pytest.raises(ValueError):
        a.dogrula_jeton(_jeton())
    _yukle()  # modu geri al


def test_jwks_modunda_dogru_mod_raporlanir():
    assert _yukle().auth_modu() == "jwks"


# ---------------------------------------------------------------------------
# Uçtan uca: FastAPI uç noktası
# ---------------------------------------------------------------------------
def _uygulama(a):
    from fastapi import Depends, FastAPI

    app = FastAPI()

    @app.post("/api/parse-receipt")
    def sahte(kullanici: dict = Depends(a.gecerli_kullanici)):
        return {"user_id": kullanici["id"], "anon": kullanici["is_anonymous"]}

    return app


def _istemci(a):
    from fastapi.testclient import TestClient

    return TestClient(_uygulama(a))


def test_jetonsuz_istek_401():
    a = _yukle()
    r = _istemci(a).post("/api/parse-receipt")
    assert r.status_code == 401
    assert "Oturum" in r.json()["detail"]


def test_bozuk_baslik_401():
    a = _yukle()
    c = _istemci(a)
    assert c.post("/api/parse-receipt", headers={"Authorization": "Basic abc"}).status_code == 401
    assert c.post("/api/parse-receipt", headers={"Authorization": "Bearer "}).status_code == 401
    assert c.post("/api/parse-receipt", headers={"Authorization": "Bearer cop"}).status_code == 401


def test_gecerli_jetonla_gecer_ve_kimlik_dogru():
    a = _yukle()
    a.limit_sifirla()
    r = _istemci(a).post(
        "/api/parse-receipt", headers={"Authorization": f"Bearer {_jeton()}"}
    )
    assert r.status_code == 200
    assert r.json() == {"user_id": "11111111-1111-1111-1111-111111111111", "anon": True}


def test_hata_ayrintisi_istemciye_sizmaz():
    """401 gövdesi 'signature verification failed' gibi iç ayrıntı içermemeli."""
    a = _yukle()
    r = _istemci(a).post(
        "/api/parse-receipt", headers={"Authorization": f"Bearer {_jeton(key=YABANCI_PEM)}"}
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "Oturum geçersiz veya süresi dolmuş."


def test_saatlik_sinir_429_verir():
    a = _yukle()
    a.limit_sifirla()
    c = _istemci(a)
    h = {"Authorization": f"Bearer {_jeton()}"}
    kodlar = [c.post("/api/parse-receipt", headers=h).status_code for _ in range(7)]
    assert kodlar[:5] == [200] * 5  # PARSE_LIMIT_HOUR = 5
    assert kodlar[5:] == [429, 429]


def test_sinir_kullanici_basina_ayri():
    a = _yukle()
    a.limit_sifirla()
    c = _istemci(a)
    h1 = {"Authorization": f"Bearer {_jeton()}"}
    h2 = {
        "Authorization": "Bearer "
        + _jeton(_iddialar(sub="22222222-2222-2222-2222-222222222222"))
    }
    for _ in range(5):
        assert c.post("/api/parse-receipt", headers=h1).status_code == 200
    assert c.post("/api/parse-receipt", headers=h1).status_code == 429
    assert c.post("/api/parse-receipt", headers=h2).status_code == 200


def test_supabase_url_yoksa_503():
    os.environ["SUPABASE_URL"] = ""
    os.environ.pop("SUPABASE_JWT_SECRET", None)
    import auth as _auth

    importlib.reload(_auth)
    r = _istemci(_auth).post(
        "/api/parse-receipt", headers={"Authorization": f"Bearer {_jeton()}"}
    )
    assert r.status_code == 503
    _yukle()


def test_ortam_ice_aktarmadan_SONRA_yuklenirse_de_calisir():
    """server.py `load_dotenv()`'i içe aktarmalardan SONRA çağırıyor.

    Bu yüzden auth.py ortam değişkenlerini modül düzeyinde SABİT olarak
    okumamalı: okusaydı `from auth import ...` satırı .env henüz yüklenmemişken
    çalışır, SUPABASE_URL boş kalır ve sunucu HER isteğe 503 dönerdi. Bu test o
    hatanın geri gelmesini engeller — modül BOŞ ortamla yüklenir, değişkenler
    SONRA doldurulur ve arada `reload` YAPILMAZ.
    """
    os.environ.pop("SUPABASE_URL", None)
    os.environ.pop("SUPABASE_JWT_SECRET", None)
    import auth as _auth

    importlib.reload(_auth)  # "ortam boşken içe aktarıldı" anı

    os.environ["SUPABASE_URL"] = BASE  # load_dotenv burada çalışıyor
    os.environ["PARSE_LIMIT_HOUR"] = "5"
    os.environ["PARSE_LIMIT_DAY"] = "8"
    _auth.limit_sifirla()

    r = _istemci(_auth).post(
        "/api/parse-receipt", headers={"Authorization": f"Bearer {_jeton()}"}
    )
    assert r.status_code == 200, f"503 dönüyorsa ortam içe aktarma anında okunuyor: {r.text}"
    assert _auth.auth_modu() == "jwks"
    _yukle()
