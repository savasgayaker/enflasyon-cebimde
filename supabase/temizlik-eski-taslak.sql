-- A4-2 / S2: Temmuz taslaginin dusurulmesi
--
-- Bu dosya ARSIVDEN URETILDI; adlar elle yazilmadi.
--
-- Fonksiyonlar PARANTEZSIZ dusurulur. Imza uretmek yorum
-- icindeki parantezlere ve varsayilan degerlere takiliyordu ve
-- bozuk imza sozdizimi hatasi verip betigi ORTASINDA durdurur;
-- kismi temizlik en kotu sonuctur. Postgres on ve sonrasi
-- parantezsiz bicimi tek tanimli adlarda kabul eder ve arsivdeki
-- adlarin hepsi tek tanimlidir - olculdu.
--
-- SIRA ONEMLI: once tetikleyiciler, sonra fonksiyonlar, en son
-- tablolar. Tablo once dusurulurse auth tetikleyicisi hedefsiz
-- kalir ve YENI KULLANICI KAYDI KIRILIR.

-- ============ 1. TETIKLEYICILER ============
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;
drop trigger if exists receipt_items_set_updated_at on public.receipt_items;
drop trigger if exists receipts_set_updated_at on public.receipts;
drop trigger if exists users_consent_pool_at on public.users;
drop trigger if exists users_set_updated_at on public.users;

-- ============ 2. FONKSIYONLAR ============
drop function if exists public.dormant_warning_list cascade;
drop function if exists public.handle_auth_user_updated cascade;
drop function if exists public.handle_new_auth_user cascade;
drop function if exists public.mark_dormant_accounts cascade;
drop function if exists public.pool_coverage cascade;
drop function if exists public.pool_min_observations cascade;
drop function if exists public.pool_min_users cascade;
drop function if exists public.pool_prices cascade;
drop function if exists public.provider_from_meta cascade;
drop function if exists public.purge_deleted_accounts cascade;
drop function if exists public.set_updated_at cascade;
drop function if exists public.sync_consent_pool_at cascade;

-- ============ 3. TABLOLAR ============
-- CASCADE bagimlilik sirasini kendiliginden cozer.
drop table if exists public.canonical_products cascade;
drop table if exists public.categories cascade;
drop table if exists public.normalization_runs cascade;
drop table if exists public.product_aliases cascade;
drop table if exists public.receipt_items cascade;
drop table if exists public.receipts cascade;
drop table if exists public.store_aliases cascade;
drop table if exists public.stores cascade;
drop table if exists public.users cascade;
