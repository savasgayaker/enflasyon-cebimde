"""M3 fiş okuma prompt'u — tek kaynak.

Hem backend/server.py hem m3-test/run_test.py buradan okur. Daha önce metin
iki dosyada kopyaydı; kopyayı kaldırmanın sebebi, test edilen prompt ile
yayındaki prompt'un sessizce ayrılabilmesiydi.

kdvBlok alanı Aşama 3.5'te eklendi. Metin, Ek 11 pilotunda ÖLÇÜLEN metnin
aynısıdır: sha256(RECEIPT_PROMPT) == ba68058fd59d9c612288563b362e7124892594ff4a8efbb25279c155de8baf08
(m3-test/results/ek11-kdv-pilot-2026-08-04.json içindeki prompt_sha256).
Metni değiştirirsen bu eşitlik bozulur — ölçüm de geçersizleşir.
"""

RECEIPT_PROMPT = """Sen Türk market fişlerini okuyan bir asistansın. Sana verilen fişi analiz et ve SADECE aşağıdaki şemaya uyan geçerli bir JSON döndür. JSON dışında hiçbir açıklama, markdown, ``` bloğu yazma.

{
  "storeName": "mağaza adı (ör. Migros, A101, BİM, File, Bildirici, CarrefourSA)",
  "date": "YYYY-MM-DD",
  "totalAmount": 0.0,
  "kdvBlok": {"1": 0.0, "10": 0.0, "20": 0.0},
  "items": [
    {"name": "ÜRÜN ADI", "quantity": 1, "unit": "adet", "unitPrice": 0.0, "totalPrice": 0.0, "vatRate": 20}
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
- unit, quantity'nin fişte hangi birimde yazıldığıdır. SADECE şunlardan biri olabilir: "adet", "kg", "gr", "lt", "ml", "paket". Ambalaj boyutu DEĞİLDİR: "SUT 1 L PINAR" bir adet karton süttür → "adet" (litre bilgisi ürünün adında kalır). Tartılı satırda ("0,455 kg x 89,90") → "kg". Emin değilsen null.
- vatRate, o satırın KDV oranıdır; sayı olarak yaz (%1 → 1, %10 → 10, %20 → 20). Ürün adının sonundaki KDV işaretinden okunur. Fişte oran yoksa null.
- kdvBlok, fişin altındaki KDV döküm tablosudur (KDV DAHİL / DAHİL TUTAR / KDVLİ TOPLAM sütunu). Anahtar KDV oranıdır (1, 10, 20), değer o oran için fişte BASILI KDV DAHİL tutardır.
- Tabloda MATRAH ve KDV TUTARI sütunları da varsa onları yazma; yalnız KDV DAHİL sütununu yaz. Fişte KDV DAHİL sütunu basılı değilse kendin toplama/hesaplama yapma, kdvBlok değerini null bırak.
- kdvBlok'a yalnız fişte basılı oranları koy; basılı olmayan oranı ekleme. Bloklardaki tutarların toplamı totalAmount'a eşit çıkmasa bile değerleri DÜZELTME — fişte ne yazıyorsa onu yaz.
- Emin olamadığın alanları uydurma; null kullan."""
