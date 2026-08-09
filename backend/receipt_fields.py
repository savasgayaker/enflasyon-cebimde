"""receipt_items.unit ve receipt_items.vat_rate alanlarını üreten saf
fonksiyonlar. Ağır bağımlılık yok — tests/test_receipt_fields.py bu dosyayı
tek başına import eder."""
import math
import re

# Türkiye'de geçerli oranlar Temmuz 2023'ten beri 1 / 10 / 20. Öncesinde
# 8 ve 18 vardı; eski bir fiş taranabileceği için ikisi de kabul edilir.
# Listede olmayan her değer None olur — uydurulmuş oran, eksik orandan kötüdür.
VALID_VAT_RATES = {1, 8, 10, 18, 20}

# MEVCUT davranış: ad sonundaki KDV eki aynı şekilde kırpılır. DEĞİŞTİRME —
# kabul testinde ad karşılaştırması bozulmasın diye aynen korunuyor.
KDV_SUFFIX_RE = re.compile(r"\s*%\s*0?\d{1,2}\s*$")

# Kırpmadan ÖNCE oranı okumak için ayrı desen (yakalama gruplu).
# Sondaki noktalama toleransı bilinçli: "URUN %1 -" gibi adlarda kırpma deseni
# eşleşmiyor (ad "URUN %1" olarak kalıyor) ama oran yine de kurtarılabiliyor.
# Sadece YENİ alanı besler; ad kırpma davranışına dokunmaz.
KDV_SUFFIX_CAPTURE_RE = re.compile(r"\s*%\s*(0?\d{1,2})\s*[-.,;:]*\s*$")


def strip_kdv_suffix(name: str) -> str:
    """DEĞİŞMEDİ — server.py'den taşındı, davranışı birebir aynı."""
    cleaned = KDV_SUFFIX_RE.sub("", name)
    return cleaned.rstrip(" \t-.,;:").strip()


def extract_kdv_rate(name: str):
    """Ad sonundaki KDV oranını OKUR (kırpmaz). Geçerli oran değilse None.

    Prompt artık oranı ayrı alanda istiyor; bu fonksiyon model yine de adın
    sonuna yazarsa bilgiyi kurtarır. K1 gereği fiş görüntüsü saklanmadığı için
    burada atılan bilgi kalıcı olarak kaybolur.
    """
    m = KDV_SUFFIX_CAPTURE_RE.search(name or "")
    if not m:
        return None
    try:
        v = int(m.group(1))
    except ValueError:
        return None
    return float(v) if v in VALID_VAT_RATES else None


def normalize_vat_rate(v):
    """Model'in vatRate alanını sayıya çevirir; geçerli oran değilse None.
    Kabul edilen temsiller: 20, "20", "%20", "20,0", 0.20 (oran olarak)."""
    if isinstance(v, bool):          # True/1 karışmasın
        return None
    if isinstance(v, str):
        v = v.strip().replace("%", "").replace(",", ".")
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(f):
        return None
    if 0 < f < 1:                    # 0.20 gibi oran gelmişse yüzdeye çevir
        f = f * 100
    r = round(f)
    return float(r) if r in VALID_VAT_RATES else None


# quantity'nin fişte hangi birimde yazıldığı. Ambalaj boyutu DEĞİL:
# "SUT 1 L PINAR" bir adet karton süttür -> adet. "0,455 kg x 89,90" -> kg.
# gr ve ml sözlüğe bilinçli kondu: fişte basılıyorsa olduğu gibi saklanır;
# kg/lt'ye çevirme kararı temizleme katmanına ait.
UNIT_MAP = {
    "adet": "adet", "ad": "adet", "ade": "adet", "tane": "adet",
    "kg": "kg", "kilogram": "kg", "kilo": "kg",
    "gr": "gr", "g": "gr", "gram": "gr",
    "lt": "lt", "l": "lt", "litre": "lt", "lit": "lt",
    "ml": "ml", "mililitre": "ml",
    "paket": "paket", "pk": "paket", "pkt": "paket",
}
VALID_UNITS = {"adet", "kg", "gr", "lt", "ml", "paket"}


TUR_URUN = "urun"
TUR_INDIRIM = "indirim"


def normalize_satir_tipi(ham):
    """Kalem satir turunu normalize eder.

    M7-B3b. Bilinmeyen, bos veya eksik deger urun sayilir: bir kalemi
    yanlislikla indirim saymak, bir indirimi kacirmaktan daha
    zararlidir. Kacirilan indirim aritmetik kontrole takilir ve
    gorunur olur; urun sanilan indirim fiyat serisine sessizce yanlis
    veri yazar.
    """
    if not isinstance(ham, str):
        return TUR_URUN
    d = ham.strip().lower()
    if d == TUR_INDIRIM:
        return TUR_INDIRIM
    return TUR_URUN


def normalize_unit(v):
    """Model'in unit alanını sözlükteki değerlerden birine indirger.
    Sözlükte yoksa None — yanlış birim, eksik birimden kötüdür."""
    if not isinstance(v, str):
        return None
    s = v.strip().lower().strip(" .,;:/-")
    s = s.replace("i̇", "i")                  # birleşik nokta temizliği
    if not s or any(ch.isdigit() for ch in s):
        # Rakam içeriyorsa bu birim değil ambalaj boyutudur ("1 L", "500 gr").
        # Boyut ürünün kendisine ait, kalemin birimine değil.
        return None
    return UNIT_MAP.get(s)


def reconcile_optional(a, b):
    """İki bağımsız M3 çağrısının aynı alan için verdiği değerleri uzlaştırır.

    Kural (Ek 7'deki unitPrice kuralının aynısı):
      - ikisi de dolu ve AYNI   -> değer korunur
      - ikisi de dolu ve FARKLI -> None (çelişki uydurulmaz)
      - biri boş                -> dolu olan korunur (eksik okuma çelişki değildir)

    Bayrak ÇIKARMAZ: yanlış alarm oranı Ek 6-7'de zaten yapısal %30 tabanında;
    fiyatı bozmayan bir alan için o tabanı yükseltmek doğru takas değil.
    """
    if a is None:
        return b
    if b is None:
        return a
    return a if a == b else None
