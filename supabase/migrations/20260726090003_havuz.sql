-- =====================================================================
-- 0003 — Fiyat havuzu (şema bölüm 6, 7, 8)
--
-- Havuz ayrı bir tablo DEĞİL, aynı veri üzerinde bir sorgudur. Kopya
-- olmadığı için kullanıcının düzeltmesi ve silmesi havuza kendiliğinden
-- yansır.
--
-- Fonksiyon "security definer": erişim kuralları kullanıcının kendi
-- satırları dışını kapattığı için havuz ancak böyle hesaplanabilir.
-- Bunun bedeli, eşiğin fonksiyonun İÇİNDE olması zorunluluğudur —
-- ekranda gizlemek yeterli değildir, çünkü veriyi çeken tek yer ekran
-- değildir (bölüm 8).
-- =====================================================================

-- Eşik: her dönemde en az 5 gözlem VE en az 3 farklı kullanıcı.
-- Gerçek veriyle ayarlanacak; tek yerde durması için sabit fonksiyon.
create or replace function public.pool_min_observations() returns integer
  language sql immutable set search_path = '' as $$ select 5 $$;

create or replace function public.pool_min_users() returns integer
  language sql immutable set search_path = '' as $$ select 3 $$;

-- ---------------------------------------------------------------------
-- pool_prices — bir ürünün bir dönemdeki havuz fiyatı
-- ---------------------------------------------------------------------
-- İki kademeli ortanca:
--   1. kademe — her kullanıcının o dönemde o ürüne ödediği fiyatların
--      ortancası. Yanlış okunmuş TEK bir fiyatı (19.900 yerine 1.990)
--      etkisiz kılar.
--   2. kademe — kullanıcı ortancalarının ortancası. Çok fiş yükleyen
--      bir kullanıcının ortalamayı tek başına belirlemesini engeller.
--
-- p_city verilirse eşik O İLİN İÇİNDE aranır; tutmuyorsa satır hiç
-- dönmez ve çağıran taraf ülke geneline düşer.
create or replace function public.pool_prices(
  p_period_start date,
  p_period_end   date,                     -- hariç (>= start, < end)
  p_city         text   default null,
  p_product_ids  uuid[] default null
)
returns table (
  canonical_product_id uuid,
  period               date,
  city                 text,
  -- Ortancanın hangi birim için olduğu. Adım 1 Ek 9'un sonucu: birim
  -- ölçülmüş doğrulukla (~%85) modelden geliyor, dolayısıyla fiyatın
  -- anlamı birimden AYRI taşınamaz. "20 TL" değil, "adet başına 20 TL".
  unit                 text,
  price                numeric,
  user_count           integer,
  receipt_count        integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with kalem as (
    select
      ri.canonical_product_id                      as cp_id,
      date_trunc('month', r.purchased_at)::date    as period,
      r.user_id,
      r.id                                         as receipt_id,
      ri.unit                                      as birim,
      ri.unit_price
    from public.receipt_items ri
    join public.receipts r on r.id = ri.receipt_id
    join public.users    u on u.id = r.user_id
    where ri.deleted_at is null                 -- silinen veri hesaba katılmaz
      and r.deleted_at  is null
      and u.deleted_at  is null
      and u.consent_pool = true                 -- açık onay şart
      and r.confirmed_at is not null            -- onaylanmamış fiş girmez
      and r.needs_review = false                -- şüpheli okuma girmez
      and ri.needs_review = false
      and ri.unit_price is not null             -- uydurulmuş fiyat yok
      and ri.unit_price > 0
      and ri.canonical_product_id is not null   -- eşleşmemiş kalem girmez
      -- Adım 1 Ek 9: unit doğruluğu ~%85 ÖLÇÜLDÜ. unit_price'ın anlamı
      -- unit'e bağlıdır: aynı ürün için biri kilo fiyatı, biri adet fiyatı
      -- olan iki satır aynı ortancaya girerse havuz SESSİZCE bozulur ve
      -- kullanıcı bunu göremez. Çözüm bu satırları ATMAK değil, birimi
      -- gruplama anahtarına almak (aşağıda) — böylece "adet başına ortanca"
      -- ile "kilo başına ortanca" iki ayrı satır olur, hiç birleşmezler ve
      -- hiçbir veri de dışarıda kalmaz.
      -- Birimi BOŞ olan satır havuza girmez: boş birim, içinde kilo da adet
      -- de olabilen tek bir yığın demektir — yani kapatmaya çalıştığımız
      -- karışımın kendisi. BOŞ'u dışarıda bırakmak YANLIŞ'ı içeri almaktan
      -- iyidir; boş birim zaten needsReview ile yakalanabilir bir durumdur.
      and ri.unit is not null
      and r.purchased_at >= p_period_start
      and r.purchased_at <  p_period_end
      and (p_city is null or u.home_city = p_city)
      and (p_product_ids is null or ri.canonical_product_id = any (p_product_ids))
  ),
  kullanici_ortancasi as (                      -- 1. kademe
    select
      cp_id, period, birim, user_id,
      percentile_cont(0.5) within group (order by unit_price::double precision) as med,
      count(distinct receipt_id) as fis_sayisi
    from kalem
    group by cp_id, period, birim, user_id
  ),
  -- Eşik de birim başına aranıyor: 5 gözlemin beşi de aynı birimde olmak
  -- zorunda. Karışık birimli 5 gözlem, 5 gözlem değildir.
  esik as (
    select cp_id, period, birim,
           count(*)                as gozlem,
           count(distinct user_id) as kullanici_sayisi
    from kalem
    group by cp_id, period, birim
  )
  select
    k.cp_id,
    k.period,
    p_city,
    k.birim,
    round((percentile_cont(0.5) within group (order by k.med))::numeric, 4) as price,
    count(*)::integer               as user_count,
    sum(k.fis_sayisi)::integer      as receipt_count
  from kullanici_ortancasi k
  join esik e on e.cp_id = k.cp_id and e.period = k.period and e.birim = k.birim
  where e.gozlem           >= public.pool_min_observations()
    and e.kullanici_sayisi >= public.pool_min_users()
  group by k.cp_id, k.period, k.birim;
$$;

comment on function public.pool_prices is
  'Havuz fiyatı. Eşik (>=5 gözlem, >=3 kullanıcı) fonksiyonun İÇİNDE uygulanır; '
  'eşiği tutmayan hiçbir kırılım dönmez. Ham satır asla dönmez. '
  'Ortanca (ürün, dönem, BİRİM) üçlüsü başınadır: kilo fiyatı ile adet '
  'fiyatı asla aynı ortancada birleşmez. Çağıran taraf unit alanını '
  'yok sayamaz.';

-- ---------------------------------------------------------------------
-- pool_coverage — "34 kişinin 210 fişinden hesaplandı" satırı için
-- ---------------------------------------------------------------------
-- Ekranda az veri durumunda dürüst olmak için (bölüm 7). Aynı eşiğe tabi:
-- eşik tutmuyorsa hiç satır dönmez, yoksa "Van'da 1 kişi" gibi bir sayı
-- tek başına kimlik ele verir.
create or replace function public.pool_coverage(
  p_period_start date,
  p_period_end   date,
  p_city         text default null
)
returns table (
  user_count    integer,
  receipt_count integer,
  item_count    integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with kalem as (
    select r.user_id, r.id as receipt_id
    from public.receipt_items ri
    join public.receipts r on r.id = ri.receipt_id
    join public.users    u on u.id = r.user_id
    where ri.deleted_at is null
      and r.deleted_at  is null
      and u.deleted_at  is null
      and u.consent_pool = true
      and r.confirmed_at is not null
      and r.needs_review = false
      and ri.needs_review = false
      and ri.unit_price is not null
      and r.purchased_at >= p_period_start
      and r.purchased_at <  p_period_end
      and (p_city is null or u.home_city = p_city)
  )
  select count(distinct user_id)::integer,
         count(distinct receipt_id)::integer,
         count(*)::integer
  from kalem
  having count(distinct user_id) >= public.pool_min_users();
$$;

-- ---------------------------------------------------------------------
-- Kimin çağırabileceği
-- ---------------------------------------------------------------------
revoke execute on function public.pool_prices(date, date, text, uuid[])   from public, anon;
revoke execute on function public.pool_coverage(date, date, text)         from public, anon;
grant  execute on function public.pool_prices(date, date, text, uuid[])   to authenticated;
grant  execute on function public.pool_coverage(date, date, text)         to authenticated;
