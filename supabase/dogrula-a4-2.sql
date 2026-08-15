-- A4-2 dogrulama: tablolar, RLS ve politikalar
-- Panelde SQL Editor'da calistirilir, sonuc buraya getirilir.

-- 1. Dort tablo olustu mu
select 'TABLOLAR' as kontrol, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('fisler','urunler','fiyat_kayitlari','kullanici_ayarlari')
order by table_name;

-- 2. Satir duzeyi guvenlik acik mi (dordu de true olmali)
select 'RLS' as kontrol, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('fisler','urunler','fiyat_kayitlari','kullanici_ayarlari')
order by tablename;

-- 3. Politikalar - her tabloda bir tane, hem using hem with check
select 'POLITIKA' as kontrol, tablename, policyname, cmd,
       qual is not null as using_var,
       with_check is not null as with_check_var
from pg_policies
where schemaname = 'public'
order by tablename;

-- 4. Para tipleri dogru mu
select 'TIP' as kontrol, table_name, column_name, data_type,
       numeric_precision, numeric_scale
from information_schema.columns
where table_schema = 'public'
  and table_name in ('fisler','fiyat_kayitlari')
  and data_type = 'numeric'
order by table_name, column_name;

-- 5. K1: goruntu yolu alani var mi (BOS DONMELI)
select 'K1_IHLALI' as kontrol, table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (column_name ilike '%image%' or column_name ilike '%goruntu%');

-- 6. Eski taslak tablolari sizmis mi (BOS DONMELI)
select 'ESKI_TASLAK' as kontrol, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('canonical_products','product_aliases',
                     'normalization_runs','stores','store_aliases',
                     'categories','receipts','receipt_items');

-- 7. Birincil anahtarlar kullanici arti kimlik mi
select 'ANAHTAR' as kontrol, tc.table_name,
       string_agg(kcu.column_name, ' + ' order by kcu.ordinal_position) as anahtar
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
where tc.table_schema = 'public'
  and tc.constraint_type = 'PRIMARY KEY'
  and tc.table_name in ('fisler','urunler','fiyat_kayitlari','kullanici_ayarlari')
group by tc.table_name
order by tc.table_name;
