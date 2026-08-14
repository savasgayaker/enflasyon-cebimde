-- =====================================================================
-- 0002 — Erişim kuralları (şema bölüm 8)
--
-- K5 gereği veritabanının TAMAMI kişisel veridir. Bu yüzden kurallar
-- uygulama koduna bırakılmıyor, veritabanının kendisinde zorlanıyor:
-- uygulamada bir hata olsa bile başkasının verisi okunamaz.
--
-- İki rol var:
--   anon          — hiç oturum açmamış istek. Bu şemada HİÇBİR ŞEYE erişemez.
--   authenticated — anonim giriş yapmış kullanıcı da buna dahildir.
--                   (Supabase'de anonim oturum da 'authenticated' rolüdür.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Önce her şeyi kapat. Bu noktada public şemasında yalnızca 0001'in
-- oluşturduğu nesneler var, dolayısıyla toplu revoke güvenli.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;

alter table public.users              enable row level security;
alter table public.receipts           enable row level security;
alter table public.receipt_items      enable row level security;
alter table public.categories         enable row level security;
alter table public.stores             enable row level security;
alter table public.store_aliases      enable row level security;
alter table public.canonical_products enable row level security;
alter table public.product_aliases    enable row level security;
alter table public.normalization_runs enable row level security;

-- ---------------------------------------------------------------------
-- users — sadece kendi satırı
-- ---------------------------------------------------------------------
grant select, update on public.users to authenticated;

create policy users_kendi_satirini_gorur on public.users
  for select to authenticated
  using (id = (select auth.uid()));

create policy users_kendi_satirini_gunceller on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- INSERT politikası bilinçli olarak YOK: profil satırını 0001'deki
-- tetikleyici oluşturur. DELETE politikası da yok: silme, deleted_at
-- işaretiyle yapılır (30 günlük geri alma penceresi, bölüm 9).

-- ---------------------------------------------------------------------
-- receipts / receipt_items — sadece kendi verisi
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.receipts      to authenticated;
grant select, insert, update, delete on public.receipt_items to authenticated;

create policy receipts_sadece_kendi on public.receipts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Kalemin sahibi, bağlı olduğu fişin sahibidir. user_id burada
-- tekrarlanmadı: tekrarlanan bilgi er ya da geç birbirini tutmaz ve
-- o an erişim kuralı da yanlış çalışır.
create policy receipt_items_sadece_kendi on public.receipt_items
  for all to authenticated
  using (exists (select 1 from public.receipts r
                  where r.id = receipt_items.receipt_id
                    and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.receipts r
                       where r.id = receipt_items.receipt_id
                         and r.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------
-- Referans tabloları — herkes okur, kimse yazmaz
-- ---------------------------------------------------------------------
-- Yazma hakkı hiçbir politikayla verilmiyor. Temizleme süreci bu
-- tablolara service_role ile yazar; service_role RLS'i atlar ve anahtarı
-- YALNIZCA sunucuda durur, uygulamada asla bulunmaz.
grant select on public.categories         to authenticated;
grant select on public.stores             to authenticated;
grant select on public.store_aliases      to authenticated;
grant select on public.canonical_products to authenticated;
grant select on public.product_aliases    to authenticated;

create policy categories_okunur on public.categories
  for select to authenticated using (true);
create policy stores_okunur on public.stores
  for select to authenticated using (true);
create policy store_aliases_okunur on public.store_aliases
  for select to authenticated using (true);
create policy canonical_products_okunur on public.canonical_products
  for select to authenticated using (true);
create policy product_aliases_okunur on public.product_aliases
  for select to authenticated using (true);

-- normalization_runs: kullanıcıya hiç açılmıyor. Politika yok, hak yok.

-- ---------------------------------------------------------------------
-- Bundan sonra eklenecek tablolar için varsayılan: kapalı
-- ---------------------------------------------------------------------
-- DİKKAT: bu satırlar yalnızca BUNDAN SONRA oluşturulacak nesneleri
-- kapsar. Her yeni tablo göçünde "enable row level security" ve gerekli
-- politikalar AYNI dosyada yazılacak — sonraya bırakılmayacak.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon, public;
