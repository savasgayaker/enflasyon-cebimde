-- =====================================================================
-- 0004 — Saklama süresi (şema bölüm 9)
--
-- Gizlilik metninde verilen söz burada kodla karşılanıyor:
--   "Hesabınızı sildiğinizde 30 gün içinde kalıcı olarak silinir.
--    24 ay boyunca hiç giriş yapılmayan hesaplar verileriyle birlikte
--    silinir — e-posta adresiniz varsa 30 gün önce sizi uyarırız."
--
-- Bu fonksiyonlar kullanıcıya AÇIK DEĞİLDİR; yalnızca sunucu tarafı
-- (service_role) veya zamanlanmış iş çağırabilir.
-- =====================================================================

create or replace function public.mark_dormant_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.users
     set deleted_at = now()
   where deleted_at is null
     and last_seen_at < now() - interval '24 months';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Uyarı listesi: 23. ayı geçmiş, henüz silinmemiş, e-postası bilinen
-- hesaplar. Anonim kullanıcıya gönderilecek adres yoktur; bu kural onlar
-- açısından uyarısız işler ve gizlilik metninde açıkça yazılıdır.
create or replace function public.dormant_warning_list()
returns table (user_id uuid, email text, last_seen_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, a.email, u.last_seen_at
  from public.users u
  join auth.users a on a.id = u.id
  where u.deleted_at is null
    and a.email is not null
    and u.last_seen_at < now() - interval '23 months'
    and u.last_seen_at >= now() - interval '24 months';
$$;

-- 30 günü dolmuş yumuşak silmeleri KALICI siler.
-- auth.users'tan silmek yeterlidir: public.users ondan, fişler ve
-- kalemler de ondan zincirleme silinir. Tek yerden silmek, "bir tabloda
-- kaldı" hatasını yapısal olarak imkânsız kılar.
create or replace function public.purge_deleted_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from auth.users a
   using public.users u
   where u.id = a.id
     and u.deleted_at is not null
     and u.deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.mark_dormant_accounts()  from public, anon, authenticated;
revoke execute on function public.dormant_warning_list()   from public, anon, authenticated;
revoke execute on function public.purge_deleted_accounts() from public, anon, authenticated;
grant  execute on function public.mark_dormant_accounts()  to service_role;
grant  execute on function public.dormant_warning_list()   to service_role;
grant  execute on function public.purge_deleted_accounts() to service_role;

-- AÇIK KALAN İŞ: bu üç fonksiyonu düzenli çağıracak zamanlama ve uyarı
-- e-postası henüz yok. İkisi de ilk kullanıcıdan 23 ay sonra gerekecek;
-- bugün kurulmamasının sebebi bu. Fonksiyonların BUGÜN yazılmasının
-- sebebi ise, sözün verildiği anda karşılığının şemada durması.
