-- =====================================================================
-- 0001 — Şema
-- Kaynak: "Enflasyon Cebimde — Veri Şeması (Aşama 4)" taslak 2, bölüm 1-5.
-- Erişim kuralları 0002'de, havuz sorgusu 0003'te, saklama süresi 0004'te.
--
-- Kural: bu dosya tek doğruluk noktasıdır. Supabase panelinden elle
-- yapılan hiçbir değişiklik geçerli değildir; şema buradan yeniden
-- kurulabilir olmak zorunda.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Ortak yardımcılar
-- ---------------------------------------------------------------------

-- updated_at'i yazma anında tazeler. Senkron buna dayanacak, bu yüzden
-- uygulamanın hatırlamasına bırakılmıyor.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- auth.users'ın meta verisinden kullanıcının bağlı olduğu sağlayıcıyı okur.
-- linkIdentity() sonrası yeni sağlayıcı 'providers' dizisine EKLENIR;
-- 'anonymous' dizide kalmaya devam eder. Bu yüzden dizinin içine bakılır.
create or replace function public.provider_from_meta(meta jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when meta -> 'providers' ? 'apple'  then 'apple'
    when meta -> 'providers' ? 'google' then 'google'
    else 'anonymous'
  end;
$$;

-- ---------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------
-- id, auth.users.id ile AYNI değerdir. K2'nin şemadaki karşılığı budur:
-- anonim kullanıcı Google/Apple ile bağlandığında auth.users.id değişmez,
-- dolayısıyla buradaki id de değişmez ve fişler sahipsiz kalmaz (11.4).
create table public.users (
  id                uuid primary key references auth.users (id) on delete cascade,
  auth_provider     text        not null default 'anonymous'
                      check (auth_provider in ('anonymous', 'google', 'apple')),
  home_city         text        check (home_city is null
                                       or char_length(btrim(home_city)) between 2 and 40),
  consent_pool      boolean     not null default false,
  consent_pool_at   timestamptz,
  -- Atıl hesap kuralı bu alana dayanır. auth.users.last_sign_in_at
  -- kullanılamaz: anonim kullanıcı bir daha hiç "giriş yapmaz", oturumu
  -- sessizce yenilenir. Uygulama her açılışta burayı tazeler.
  last_seen_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

comment on column public.users.id is
  'auth.users.id ile aynı. Hesap bağlamada DEĞİŞMEZ — bkz. şema 11.4.';
comment on column public.users.home_city is
  'İl düzeyinde, isteğe bağlı. İlçe/mahalle asla sorulmaz.';

-- consent_pool ile consent_pool_at'in birbirini tutması uygulamaya
-- bırakılmıyor: onayın ne zaman verildiği hukuki kayıttır.
create or replace function public.sync_consent_pool_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.consent_pool is true
     and (tg_op = 'INSERT' or old.consent_pool is distinct from true) then
    new.consent_pool_at := now();
  elsif new.consent_pool is false then
    new.consent_pool_at := null;
  end if;
  return new;
end;
$$;

create trigger users_consent_pool_at
  before insert or update on public.users
  for each row execute function public.sync_consent_pool_at();

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Profil satırı auth kaydıyla birlikte doğar. Uygulamanın "profil oluştur"
-- çağrısını unutması ya da o çağrının başarısız olması, sahipsiz auth
-- kaydı bırakırdı.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, auth_provider)
  values (new.id, public.provider_from_meta(new.raw_app_meta_data))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- linkIdentity() sonrası sağlayıcı bilgisini eşitler. Bu tetikleyicinin
-- işi SADECE etiketi güncellemek; id'ye dokunmaz, dokunamaz.
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
     set auth_provider = public.provider_from_meta(new.raw_app_meta_data)
   where id = new.id
     and auth_provider is distinct from public.provider_from_meta(new.raw_app_meta_data);
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_auth_user_updated();

-- ---------------------------------------------------------------------
-- categories — sabit liste
-- ---------------------------------------------------------------------
-- id'ler elle ve sabit verildi: göç dosyası her koştuğunda aynı numaralar
-- çıksın diye. Kodlar frontend/src/constants/categories.ts ile birebir.
create table public.categories (
  id         smallint primary key,
  code       text     not null unique,
  name_tr    text     not null,
  created_at timestamptz not null default now()
);

insert into public.categories (id, code, name_tr) values
  (1,  'food',           'Gıda'),
  (2,  'beverages',      'İçecek'),
  (3,  'cleaning',       'Temizlik'),
  (4,  'personalCare',   'Kişisel Bakım'),
  (5,  'homeAndLiving',  'Ev & Yaşam'),
  (6,  'clothing',       'Giyim'),
  (7,  'transportation', 'Ulaşım'),
  (8,  'health',         'Sağlık'),
  (9,  'education',      'Eğitim'),
  (10, 'entertainment',  'Eğlence'),
  (11, 'other',          'Diğer');

-- ---------------------------------------------------------------------
-- stores, canonical_products, product_aliases, store_aliases
-- ---------------------------------------------------------------------
create table public.stores (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.canonical_products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  brand       text,
  category_id smallint references public.categories (id),
  -- "1 L süt" ile "2 L süt"un fiyatı doğrudan karşılaştırılamaz. Havuz
  -- sorgusu tek bir canonical ürün içinde çalıştığı için bölme yapmaz;
  -- bu iki alan ÜRÜNLER ARASI karşılaştırma için.
  base_unit   text check (base_unit is null
                          or base_unit in ('adet', 'kg', 'gr', 'lt', 'ml', 'paket')),
  base_size   numeric(12,3) check (base_size is null or base_size > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Eşleştirme katmanı (K4). Anahtar ham adın kendisi değil, mekanik olarak
-- sadeleştirilmiş hali: karar isim bazında verilir, kalem bazında değil.
create table public.product_aliases (
  raw_name_norm        text primary key,
  canonical_product_id uuid not null references public.canonical_products (id) on delete cascade,
  rule_version         integer not null default 1,
  confidence           numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  locked               boolean not null default false,
  decided_by           text not null default 'kural' check (decided_by in ('kural', 'elle')),
  decided_at           timestamptz not null default now()
);

comment on column public.product_aliases.locked is
  'Elle verilmiş karar. Yeniden koşumda ÜZERİNE YAZILMAZ — şema bölüm 5.';

create table public.store_aliases (
  store_raw_norm text primary key,
  store_id       uuid not null references public.stores (id) on delete cascade,
  rule_version   integer not null default 1,
  locked         boolean not null default false,
  decided_by     text not null default 'kural' check (decided_by in ('kural', 'elle')),
  decided_at     timestamptz not null default now()
);

create table public.normalization_runs (
  id             uuid primary key default gen_random_uuid(),
  rule_version   integer not null,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  items_seen     integer,
  items_matched  integer,
  items_changed  integer,
  note           text
);

-- ---------------------------------------------------------------------
-- 2. receipts
-- ---------------------------------------------------------------------
create table public.receipts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  -- Telefonda üretilir. (user_id, client_id) tekilliği, bağlantı koptuğunda
  -- yeniden gönderilen fişin ikinci kez kaydedilmesini ENGELLER. Çift kayıt,
  -- enflasyon hesabını sessizce bozan hata türüdür.
  client_id      uuid not null,
  purchased_at   timestamptz not null,
  store_raw      text not null,
  store_id       uuid references public.stores (id) on delete set null,
  total_amount   numeric(12,2),
  currency       char(3) not null default 'TRY',
  arithmetic_ok  boolean not null default false,
  cross_check_ok boolean,                       -- null = yapılamadı
  -- Fişin KDV döküm bloğu, ham haliyle. Adım 1 Ek 9 kararı 2: bu blok,
  -- kalem oranlarının çağrılardan BAĞIMSIZ aritmetik sağlamasıdır. İki
  -- çağrının aynı yanlışta anlaşması bu sağlamayı geçemez, çünkü kaynak
  -- çağrı değil fişin kendi bastığı rakamdır.
  vat_block_raw  jsonb,
  -- Oran gruplarının toplamı bloktaki rakamı tuttu mu.
  -- null = blok okunamadı, yani sağlama YAPILAMADI (yapıldı ve geçti değil).
  vat_block_ok   boolean,
  needs_review   boolean not null default true, -- havuza girmez
  confirmed_at   timestamptz,
  parser_version text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint receipts_client_id_uniq unique (user_id, client_id)
);

create trigger receipts_set_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

create index receipts_user_purchased_idx
  on public.receipts (user_id, purchased_at desc)
  where deleted_at is null;

create index receipts_pool_idx
  on public.receipts (purchased_at)
  where deleted_at is null and confirmed_at is not null and needs_review = false;

-- Senkron: "şu andan sonra değişenleri ver".
create index receipts_updated_idx on public.receipts (user_id, updated_at);

-- ---------------------------------------------------------------------
-- 3. receipt_items
-- ---------------------------------------------------------------------
create table public.receipt_items (
  id           uuid primary key default gen_random_uuid(),
  receipt_id   uuid not null references public.receipts (id) on delete cascade,
  line_no      integer not null,

  -- ASLA DEĞİŞMEZ (K4). Temizleme kodu bu alana dokunmaz.
  raw_name     text not null,

  -- Sadece mekanik sadeleştirme; anlamsal hiçbir karar içermez.
  -- Üretilmiş sütun olarak tanımlandı ki ham addan sapması İMKÂNSIZ olsun
  -- ve eşleştirme anahtarını Python ile SQL'in farklı hesaplama riski
  -- ortadan kalksın. Temizleme kodu bu değeri yeniden hesaplamaz, OKUR.
  -- translate(...,'İ','i') bilinçli: lower('İ') Türkçe olmayan sıralamada
  -- "i + ayrı nokta" üretir ve "PINAR"/"PİNAR" iki ayrı anahtara düşerdi.
  raw_name_norm text generated always as (
    regexp_replace(btrim(lower(translate(raw_name, 'İ', 'i'))), '\s+', ' ', 'g')
  ) stored,

  quantity     numeric(10,3),
  unit         text check (unit is null
                           or unit in ('adet', 'kg', 'gr', 'lt', 'ml', 'paket')),
  unit_price   numeric(12,4),   -- uydurulmaz; hesaplanamıyorsa boş
  total_price  numeric(12,2),
  vat_rate     numeric(4,2) check (vat_rate is null
                                   or vat_rate in (1, 8, 10, 18, 20)),

  -- Adım 1 Ek 9: unit ve vat_rate'in modelden gelen hali ÖLÇÜLDÜ.
  -- Gerçek doğruluk vat_rate'te ~%72-75, unit'te ~%85. Yani bu iki alan
  -- "doğrulanmış veri" DEĞİLDİR ve öyle muamele görmeyecek. Değerin
  -- nereden geldiği alanın kendisiyle birlikte tutulur; K4'ün ("ham sakla,
  -- sonra temizle") doğal devamı — modelin tahminini gerçek gibi kaydetme.
  --   'model'     = modelin çıkarımı, DOĞRULANMAMIŞ (varsayılan)
  --   'kdv_blogu' = fişin KDV döküm bloğuyla aritmetik olarak doğrulandı
  --   'kullanici' = kullanıcı elle onayladı/düzeltti
  --   'kural'     = deterministik kuraldan üretildi (ör. addaki "%20" eki)
  -- unit'te 'kdv_blogu' YOK: KDV bloğu birim hakkında hiçbir şey söylemez.
  -- Birimin tek doğrulama yolu kullanıcı onayı ya da deterministik kural.
  unit_source     text not null default 'model'
                    check (unit_source in ('model','kullanici','kural')),
  vat_rate_source text not null default 'model'
                    check (vat_rate_source in ('model','kdv_blogu','kullanici','kural')),

  category_id  smallint references public.categories (id),
  category_locked boolean not null default false,
  canonical_product_id uuid references public.canonical_products (id) on delete set null,

  needs_review boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint receipt_items_line_uniq unique (receipt_id, line_no)
);

create trigger receipt_items_set_updated_at
  before update on public.receipt_items
  for each row execute function public.set_updated_at();

comment on column public.receipt_items.vat_rate_source is
  'Adım 1 Ek 9. Ham model çıktısının vat_rate doğruluğu ~%72-75 ölçüldü. '
  'KDV/vergi içeren HİÇBİR hesap, kaynağı ''model'' olan satırı '
  'doğrulanmış kabul etmez.';
comment on column public.receipt_items.unit_source is
  'Adım 1 Ek 9. Ham model çıktısının unit doğruluğu ~%85 ölçüldü. '
  'Birim başına fiyat karşılaştırmaları bu alana bakmak zorundadır.';

create index receipt_items_receipt_idx on public.receipt_items (receipt_id);
create index receipt_items_norm_idx on public.receipt_items (raw_name_norm);
create index receipt_items_pool_idx
  on public.receipt_items (canonical_product_id)
  where deleted_at is null and needs_review = false and unit_price is not null;
