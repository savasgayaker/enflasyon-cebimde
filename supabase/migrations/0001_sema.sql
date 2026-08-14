-- A4-2: dort tablo ve satir duzeyi guvenlik
-- Tasarim: docs/asama4-sema-2026-08-14.md
--
-- Kararlar:
--   kimlikler metin, sunucu UUID uretmez
--   birincil anahtar kullanici arti kimlik (catisma imkansiz)
--   para numeric(12,2), miktar numeric(12,3)
--   goruntu yolu semaya GIRMEZ (K1)
--   urunler kullaniciya ait, paylasilmaz (K4)

-- ============ fisler ============
create table if not exists public.fisler (
  kullanici    uuid not null references auth.users(id) on delete cascade,
  kimlik       text not null,
  magaza       text not null,
  tarih        date not null,
  toplam       numeric(12,2),
  olusturuldu  timestamptz not null default now(),
  primary key (kullanici, kimlik)
);

-- ============ urunler ============
create table if not exists public.urunler (
  kullanici    uuid not null references auth.users(id) on delete cascade,
  kimlik       text not null,
  ad           text not null,
  kategori     text,
  barkod       text,
  olusturuldu  timestamptz not null default now(),
  primary key (kullanici, kimlik)
);

-- ============ fiyat_kayitlari ============
create table if not exists public.fiyat_kayitlari (
  kullanici     uuid not null references auth.users(id) on delete cascade,
  kimlik        text not null,
  urun_kimligi  text,
  fis_kimligi   text not null,
  urun_adi      text,
  birim_fiyat   numeric(12,2),
  miktar        numeric(12,3),
  toplam_fiyat  numeric(12,2),
  tarih         date not null,
  birim         text,
  kdv_orani     integer,
  satir_tipi    text not null default 'urun',
  ham_etiket    text,
  olusturuldu   timestamptz not null default now(),
  primary key (kullanici, kimlik),
  constraint satir_tipi_gecerli check (satir_tipi in ('urun', 'indirim'))
);

-- Sorgu hizi: kullanicinin urun bazli fiyat gecmisi ve tarih araligi
create index if not exists fiyat_kayitlari_urun_idx
  on public.fiyat_kayitlari (kullanici, urun_kimligi, tarih);
create index if not exists fiyat_kayitlari_fis_idx
  on public.fiyat_kayitlari (kullanici, fis_kimligi);

-- ============ kullanici_ayarlari ============
create table if not exists public.kullanici_ayarlari (
  kullanici    uuid primary key references auth.users(id) on delete cascade,
  ayarlar      jsonb not null default '{}'::jsonb,
  guncellendi  timestamptz not null default now()
);

-- ============ SATIR DUZEYI GUVENLIK ============
-- Kural: bir kullanici YALNIZCA kendi satirlarini gorur ve yazar.
-- Bu pazarliga kapalidir (on kayit Kapi C).

alter table public.fisler             enable row level security;
alter table public.urunler            enable row level security;
alter table public.fiyat_kayitlari    enable row level security;
alter table public.kullanici_ayarlari enable row level security;

-- fisler
drop policy if exists fisler_kendi on public.fisler;
create policy fisler_kendi on public.fisler
  for all
  using (auth.uid() = kullanici)
  with check (auth.uid() = kullanici);

-- urunler
drop policy if exists urunler_kendi on public.urunler;
create policy urunler_kendi on public.urunler
  for all
  using (auth.uid() = kullanici)
  with check (auth.uid() = kullanici);

-- fiyat_kayitlari
drop policy if exists fiyat_kayitlari_kendi on public.fiyat_kayitlari;
create policy fiyat_kayitlari_kendi on public.fiyat_kayitlari
  for all
  using (auth.uid() = kullanici)
  with check (auth.uid() = kullanici);

-- kullanici_ayarlari
drop policy if exists ayarlar_kendi on public.kullanici_ayarlari;
create policy ayarlar_kendi on public.kullanici_ayarlari
  for all
  using (auth.uid() = kullanici)
  with check (auth.uid() = kullanici);
