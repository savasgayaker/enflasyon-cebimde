# Enflasyon Cebimde — backend
#
# Neden kap: Mac mini'de kurulu Python sürümü değişse, bir kütüphane
# güncellense veya makine bir gün değiştirilse bile sunucunun İÇİ aynı kalır.
# Çalışan şeyin bir daha bozulmaması için en ucuz yol.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Önce yalnızca bağımlılık dosyası kopyalanır: kod değiştiğinde bu katman
# önbellekten gelir ve kurulum baştan yapılmaz.
COPY requirements-runtime.txt .
RUN pip install --no-cache-dir -r requirements-runtime.txt

# BEŞ dosyanın BEŞİ de gerekli. server.py; receipt_prompt, receipt_fields,
# auth ve kdv_mutabakat modüllerini içe aktarıyor — biri eksik kalırsa kap sorunsuz DERLENİR,
# sonra ilk çalıştırmada ModuleNotFoundError ile ölür. Yeni bir .py dosyası
# eklenirse bu satıra da eklenmeli.
COPY auth.py kdv_mutabakat.py receipt_fields.py receipt_prompt.py server.py ./

# Derleme anında duman testi: yukarıdaki listede eksik bir modül varsa BUILD
# BURADA PATLAR. Aksi halde hata, kap çalıştırıldığında ortaya çıkardı — yani
# "derlendi, demek ki tamam" yanılgısıyla. Ortam değişkeni gerektirmez: server
# modülü MINIMAX_API_KEY'i istek anında okuyor, Mongo bağlantısı da opsiyonel.
RUN python -c "import server; print('KAP ICE AKTARMA TESTI TAMAM')"

# Kök olmayan kullanıcı: kapta bir açık bulunsa bile makinede kök yetkisi yok.
RUN useradd --create-home --uid 10001 uygulama && chown -R uygulama /app
USER uygulama

EXPOSE 8000

# --workers 1 BİLİNÇLİ: hız sınırı sayacı bellekte tutuluyor; birden çok işçi
# her biri kendi sayacını tutar ve sınır fiilen katlanır. Tek işçi, fiş başına
# ~7 saniyelik iş için fazlasıyla yeterli — FastAPI eşzamanlı istekleri
# thread havuzunda karşılıyor.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
