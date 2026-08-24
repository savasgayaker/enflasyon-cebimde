-- A5-1: TUIK siniflandirma alanlari
--
-- Dordu de bos gecilebilir: tanimsiz BILINMIYOR demektir.
-- Eski kayitlara deger yazmak olgu uydurmak olurdu (S3 deseni).
--
-- Kaynak alani KISITLIDIR (Kapi E): serbest metin olursa K8'in
-- kullanici karari surumu yener kurali uygulanamaz.

alter table public.urunler
  add column if not exists tuik_madde_kodu text,
  add column if not exists tuik_sinif_kodu text,
  add column if not exists tuik_kaynak     text,
  add column if not exists tuik_surum      integer;

-- Kaynak yalniz uc degerden biri olabilir.
alter table public.urunler
  drop constraint if exists tuik_kaynak_gecerli;
alter table public.urunler
  add constraint tuik_kaynak_gecerli
  check (tuik_kaynak is null or tuik_kaynak in ('model', 'kural', 'kullanici'));

-- Sinif kodu maddenin ilk dort hanesidir; uzunluklar sabittir.
alter table public.urunler
  drop constraint if exists tuik_kod_uzunlugu;
alter table public.urunler
  add constraint tuik_kod_uzunlugu
  check (
    (tuik_madde_kodu is null or length(tuik_madde_kodu) = 7)
    and (tuik_sinif_kodu is null or length(tuik_sinif_kodu) = 4)
  );

-- Sinif bazli sorgu: enflasyon hesabi sinif uzerinden gruplayacak.
create index if not exists urunler_tuik_sinif_idx
  on public.urunler (kullanici, tuik_sinif_kodu);
