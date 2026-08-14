# Arsiv - gecersiz kilinmis sema taslagi

Bu klasordeki dosyalar **26 Temmuz 2026 tarihli bir taslaktir ve
gecerli degildir.** Hicbiri uygulanmamistir.

Gecerli sema:

    tasarim  docs/asama4-sema-2026-08-14.md
    SQL      supabase/migrations/ altindaki guncel dosya

## Neden gecersiz

Taslak, A4-1'de verilen kararlarla celisiyor:

    kategori tablosu        A4-1: kod sabiti, tablo yok
    canonical_products      K4 kural 2: tekillestirme saklanmaz
    product_aliases         ayni gerekce
    normalization_runs      ayni gerekce
    stores ve store_aliases A4-1: magaza yalniz metin alani
    havuz ayri tablo        A4-1: havuz goruntu, tablo degil

## Neden silinmedi

Bir dusunce kaydidir. Temmuz'da nasil dusunuldugunu ve K4'un
tekillestirmeyi neden **sonraya** biraktigini gosterir.

Goc klasorunden cikarildi cunku orada durmalari araca verilmis bir
emirdir: toplu uygulama sirasinda sozluksel sirayla calisir ve
guncel semanin ustune yazarlardi.

**Bu klasordeki hicbir dosya calistirilmamalidir.**
