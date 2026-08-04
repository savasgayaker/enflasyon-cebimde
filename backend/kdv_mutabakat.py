"""KDV bloğu mutabakatı — Ek 11 kararının kod karşılığı (Aşama 3.5).

Ek 9 karar 2 "blok ile kalem grupları uyuşmuyorsa needsReview" kurgusuydu.
Ek 11'in 6 çağrılık pilotu bunu ölçtü: ham kural 6 fişin 4'ünde tetikleniyor;
2'si yanlış alarm (a101 etiket takası, bildirici bloğun kendi toplamı yanlış),
1'i mevcut aritmetik kontrolün zaten yakaladığı durum (file), yalnız 1'i gerçek
yeni yakalama (gimsa). Bu asimetri yüzünden blok ALARM kaynağı değil ONARIM
kaynağı olarak kullanılır.

Sıra sabittir: Kapı A → Kapı B → Onarım 1 → Onarım 2 → (dar koşulda) bayrak.

Kapı A: blok değerlerinin toplamı totalAmount'a eşit değilse suçlu BLOKTUR;
        blok atılır, kalemlere dokunulmaz. (bildirici: 1310.80 ≠ 1311.00 iken
        kalemler tam 1311.00 veriyordu.)
Kapı B: blok değerleri kalem gruplarının bir permütasyonuysa bu bir etiket
        takasıdır; blok atılır — ne onarım ne bayrak. (a101: {20:1264.5, 1:900}
        yazılmış, doğrusu {20:900, 1:1264.5}; kalemler zaten kusursuzdu.)
Onarım 1 (oran ithafı): blokta tek bir "açık" grup kalmışsa, oranı okunamamış
        kalemler o gruba yazılır. (file: 19 kalem %1'e.)
Onarım 2 (tek çözümlü taşıma): tam olarak bir grup fazla, bir grup aynı miktar
        eksikse ve fazla gruptaki o tutara sahip TEK kalem varsa taşınır.
        (gimsa: 99.00'lık kalem %10'dan %1'e.) Birden çok aday varsa dokunulmaz.

Onarılan kalemlerin kaynağı 'kdv_blogu' olur — supabase şemasındaki
receipt_items.vat_rate_source için geçerli değerlerden biri (model / kdv_blogu /
kullanici / kural).

Ağır bağımlılık yok; tests/test_kdv_mutabakat.py bu dosyayı tek başına import
eder.
"""
import math

from receipt_fields import normalize_vat_rate

# Kuruş toleransı — server.py'deki aritmetik kontrolün toleransıyla aynı.
TOL = 0.01


def _para(v):
    """Model'den gelen tutarı 2 haneye yuvarlanmış float'a çevirir; olmazsa None."""
    if isinstance(v, bool):
        return None
    if isinstance(v, str):
        v = v.strip().replace("%", "").replace(",", ".")
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(f):
        return None
    return round(f, 2)


def blok_normalize(kdv_blok):
    """{"1": 125.0, "%20": "124,00"} → {1.0: 125.0, 20.0: 124.0}.

    Geçersiz oran/tutar sessizce atılır; hiçbir şey kalmazsa None döner
    (None = "blok yok", mekanizma hiç çalışmaz)."""
    if not isinstance(kdv_blok, dict):
        return None
    out = {}
    for k, v in kdv_blok.items():
        oran = normalize_vat_rate(k)
        tutar = _para(v)
        if oran is None or tutar is None:
            continue
        out[oran] = round(out.get(oran, 0.0) + tutar, 2)
    return out or None


def gruplar_hesapla(items):
    """Kalemleri KDV oranına göre toplar.

    Döner: (gruplar, oransiz_idx, fiyatsiz_var)
      gruplar      -> {oran: toplam}
      oransiz_idx  -> vatRate'i None ama fiyatı olan kalemlerin sıra numaraları
      fiyatsiz_var -> totalPrice'ı None olan kalem var mı (varsa toplamlar eksik)
    """
    gruplar = {}
    oransiz = []
    fiyatsiz = False
    for idx, it in enumerate(items):
        tutar = _para(it.get("totalPrice"))
        if tutar is None:
            fiyatsiz = True
            continue
        oran = it.get("vatRate")
        if oran is None:
            oransiz.append(idx)
            continue
        oran = float(oran)
        gruplar[oran] = round(gruplar.get(oran, 0.0) + tutar, 2)
    return gruplar, oransiz, fiyatsiz


def _tam_mi(blok, gruplar):
    oranlar = set(blok) | set(gruplar)
    return all(abs(gruplar.get(r, 0.0) - blok.get(r, 0.0)) <= TOL for r in oranlar)


def _permutasyon_mu(blok, gruplar):
    """Değerler aynı, dağılım farklı → etiket takası (Kapı B)."""
    if _tam_mi(blok, gruplar):
        return False
    if len(blok) != len(gruplar):
        return False
    a = sorted(blok.values())
    b = sorted(gruplar.values())
    return all(abs(x - y) <= TOL for x, y in zip(a, b))


def _tek_cozumlu_tasima(items, blok, gruplar):
    """Tek bir kalemin taşınması grupları tam uzlaştırıyorsa o kalemi bulur.

    Döner: (kalem_idx, kaynak_oran, hedef_oran, tutar) veya None.
    Belirsizlik (birden çok aday, birden çok fazla/eksik grup) → None."""
    oranlar = set(blok) | set(gruplar)
    fazla = [r for r in oranlar if gruplar.get(r, 0.0) - blok.get(r, 0.0) > TOL]
    eksik = [r for r in oranlar if blok.get(r, 0.0) - gruplar.get(r, 0.0) > TOL]
    if len(fazla) != 1 or len(eksik) != 1:
        return None
    kaynak, hedef = fazla[0], eksik[0]
    d = round(gruplar.get(kaynak, 0.0) - blok.get(kaynak, 0.0), 2)
    if abs(d - round(blok.get(hedef, 0.0) - gruplar.get(hedef, 0.0), 2)) > TOL:
        return None
    adaylar = [
        i for i, it in enumerate(items)
        if it.get("vatRate") is not None
        and float(it["vatRate"]) == kaynak
        and _para(it.get("totalPrice")) is not None
        and abs(_para(it.get("totalPrice")) - d) <= TOL
    ]
    if len(adaylar) != 1:
        return None
    return adaylar[0], kaynak, hedef, d


def kdv_mutabakati(items, kdv_blok, total_amount, aritmetik_tamam):
    """Blok ile kalem gruplarını uzlaştırır; items'ı YERİNDE onarır.

    items: validate_and_flag'in ürettiği kalem sözlükleri (vatRate/totalPrice/
           vatRateSource alanları okunur ve gerekirse yazılır).
    aritmetik_tamam: sum(items.totalPrice) == totalAmount mı. False ise fiş
           zaten bayraklıdır; blok kaynaklı YENİ bayrak çıkarılmaz (sapma
           beklenen sapmadır), ama onarım yine de yapılır.

    Döner: rapor sözlüğü. 'uyusmazlik' True ise fiş needsReview olmalıdır.
    Durumlar: blok_yok / kapi_a / kapi_b / fiyat_eksik / belirsiz_oransiz /
              tamam / onarildi / uyusmazlik / aritmetik_bozuk
    """
    rapor = {"durum": "blok_yok", "onarimlar": [], "uyusmazlik": False,
             "blok": None, "gruplar": None}

    blok = blok_normalize(kdv_blok)
    if blok is None:
        return rapor
    rapor["blok"] = dict(blok)

    # --- Kapı A: blok kendi içinde toplamı tutturuyor mu ---
    toplam = _para(total_amount)
    if toplam is None or abs(round(sum(blok.values()), 2) - toplam) > TOL:
        rapor["durum"] = "kapi_a"
        return rapor

    gruplar, oransiz, fiyatsiz = gruplar_hesapla(items)
    rapor["gruplar"] = dict(gruplar)

    # Fiyatı okunamamış kalem varsa grup toplamları eksiktir; bu eksiklikten
    # ne onarım ne bayrak çıkarılabilir. (Fiş zaten kalem seviyesinde bayraklı.)
    if fiyatsiz:
        rapor["durum"] = "fiyat_eksik"
        return rapor

    # --- Kapı B: etiket takası mı ---
    if not oransiz and _permutasyon_mu(blok, gruplar):
        rapor["durum"] = "kapi_b"
        return rapor

    # --- Onarım 1: oran ithafı ---
    if oransiz:
        kapali = [r for r in blok if r in gruplar and abs(gruplar[r] - blok[r]) <= TOL]
        acik = [r for r in blok if r not in kapali]
        if len(acik) != 1:
            # Oransız kalem var ve gidebileceği tek bir grup yok → karşılaştırma
            # anlamsız. Ne onarım ne bayrak.
            rapor["durum"] = "belirsiz_oransiz"
            return rapor
        hedef = acik[0]
        for idx in oransiz:
            items[idx]["vatRate"] = hedef
            items[idx]["vatRateSource"] = "kdv_blogu"
            gruplar[hedef] = round(gruplar.get(hedef, 0.0) + _para(items[idx]["totalPrice"]), 2)
        rapor["onarimlar"].append(
            {"tur": "oran_ithafi", "oran": hedef, "kalem_sayisi": len(oransiz)}
        )
        rapor["gruplar"] = dict(gruplar)

    # --- Onarım 2: tek çözümlü taşıma ---
    if not _tam_mi(blok, gruplar):
        tasima = _tek_cozumlu_tasima(items, blok, gruplar)
        if tasima is not None:
            idx, kaynak, hedef, tutar = tasima
            items[idx]["vatRate"] = hedef
            items[idx]["vatRateSource"] = "kdv_blogu"
            gruplar[kaynak] = round(gruplar.get(kaynak, 0.0) - tutar, 2)
            gruplar[hedef] = round(gruplar.get(hedef, 0.0) + tutar, 2)
            rapor["onarimlar"].append({
                "tur": "tek_cozumlu_tasima", "kalem": idx,
                "kaynak": kaynak, "hedef": hedef, "tutar": tutar,
            })
            rapor["gruplar"] = dict(gruplar)

    # --- Sonuç ---
    if _tam_mi(blok, gruplar):
        rapor["durum"] = "onarildi" if rapor["onarimlar"] else "tamam"
        return rapor

    if not aritmetik_tamam:
        # Kalem toplamı zaten totalAmount'u tutturmuyor; blok sapması bunun
        # sonucudur, bağımsız bir sinyal değildir. Fiş hâlihazırda bayraklı.
        rapor["durum"] = "aritmetik_bozuk"
        return rapor

    # DAR KOŞUL: blok iki kapıdan da geçti, kalemler toplamı tutturuyor, buna
    # rağmen gruplar uzlaşmıyor ve tek çözümlü bir taşıma yok → gerçek şüphe.
    rapor["durum"] = "uyusmazlik"
    rapor["uyusmazlik"] = True
    return rapor
