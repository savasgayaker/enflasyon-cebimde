-- A4-2 temizlik sonrasi dogrulama
-- Listeler ARSIVDEN URETILDI; elle yazilmadi.
-- Bir sayac kendi listesini sayar - onceki sorgu bir tabloyu
-- hic sormamisti.

select 'YENI_TABLO' as ne, table_name as ad, '' as ek
from information_schema.tables
where table_schema='public'
  and table_name in ('fisler','urunler','fiyat_kayitlari','kullanici_ayarlari')
union all
select 'ESKI_TABLO_KALDI', table_name, ''
from information_schema.tables
where table_schema='public' and table_name in ('canonical_products', 'categories', 'normalization_runs', 'product_aliases', 'receipt_items', 'receipts', 'store_aliases', 'stores', 'users')
union all
select 'ESKI_FONKSIYON_KALDI', p.proname, ''
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('dormant_warning_list', 'handle_auth_user_updated', 'handle_new_auth_user', 'mark_dormant_accounts', 'pool_coverage', 'pool_min_observations', 'pool_min_users', 'pool_prices', 'provider_from_meta', 'purge_deleted_accounts', 'set_updated_at', 'sync_consent_pool_at')
union all
select 'ESKI_TETIKLEYICI_KALDI', trigger_name, event_object_table
from information_schema.triggers
where trigger_name in ('on_auth_user_created', 'on_auth_user_updated', 'receipt_items_set_updated_at', 'receipts_set_updated_at', 'users_consent_pool_at', 'users_set_updated_at')
union all
select 'POLITIKA', tablename || '.' || policyname,
       (qual is not null)::text || '/' || (with_check is not null)::text
from pg_policies where schemaname='public'
union all
select 'RLS', tablename, rowsecurity::text
from pg_tables where schemaname='public'
order by 1, 2;
