-- A5-1 dogrulama: dort sutun, iki kisit, bir dizin
--
-- BEKLENEN SONUC (semadan olculdu, elle yazilmadi):
--
--   SUTUN       dort satir, hepsinde bos gecilebilir YES
--                 tuik_madde_kodu, tuik_sinif_kodu,
--                 tuik_kaynak, tuik_surum
--   KISIT       iki satir
--                 tuik_kaynak_gecerli, tuik_kod_uzunlugu
--   DIZIN       bir satir
--                 urunler_tuik_sinif_idx
--   ESKI_SUTUN  6 satir; degerleri DEGISMEMIS olmali:
--     ad -> NO
--     barkod -> YES
--     kategori -> YES
--     kimlik -> NO
--     kullanici -> NO
--     olusturuldu -> NO
--
-- Son kol bir bozulma kapisidir: alter table mevcut sutunlara
-- dokunmamalidir. Sifir satir beklenmiyor - bu sutunlar zaten
-- var; beklenen sey degerlerin AYNI kalmasidir.

select 'SUTUN' as ne, column_name as ad,
       data_type || ' / bos gecilebilir: ' || is_nullable as ayrinti
from information_schema.columns
where table_schema = 'public' and table_name = 'urunler'
  and column_name like 'tuik%'
union all
select 'KISIT', conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.urunler'::regclass and conname like 'tuik%'
union all
select 'DIZIN', indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'urunler'
  and indexname like '%tuik%'
union all
select 'ESKI_SUTUN', column_name, 'bos gecilebilir: ' || is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'urunler'
  and column_name not like 'tuik%'
order by 1, 2;
