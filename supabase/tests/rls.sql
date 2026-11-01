-- Migration'ın güvenlik ve trigger davranışını doğrular.
-- Çalıştırma: supabase/tests/run.sh (geçici bir Postgres kurar, Supabase'in auth şemasını taklit eder).
\set ON_ERROR_STOP on

-- Supabase'in sağladığı parçaların minimal taklidi.
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon nologin;
create role authenticated nologin;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- Supabase Storage'ın minimal taklidi (yalnızca migration'ın kullandığı parçalar).
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1] $$;
grant usage on schema storage to anon, authenticated;
grant select, insert, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;

\i supabase/migrations/20261027000000_init.sql
\i supabase/migrations/20261028000000_recurrence.sql
\i supabase/migrations/20261030000000_files.sql

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002');

-- ---- Kullanıcı A ----------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);

insert into public.items (id, title, labels) values
  ('11111111-1111-1111-1111-111111111111', 'A görevi', '{analiz}');

do $$
begin
  assert (select user_id from public.items) = 'aaaaaaaa-0000-0000-0000-000000000001',
    'user_id varsayılanı auth.uid() olmalı';
  assert (select count(*) from public.item_events where kind = 'created') = 1,
    'insert bir created olayı yazmalı';
end $$;

-- completed_at sunucuda belirlenir; istemci gönderse de yok sayılır.
update public.items set status = 'doing' where id = '11111111-1111-1111-1111-111111111111';
update public.items set status = 'done', completed_at = '2000-01-01'
  where id = '11111111-1111-1111-1111-111111111111';
do $$
begin
  assert (select completed_at from public.items) > now() - interval '1 minute',
    'done olunca completed_at şimdi olmalı, istemci değeri değil';
end $$;
update public.items set status = 'todo' where id = '11111111-1111-1111-1111-111111111111';
do $$
begin
  assert (select completed_at from public.items) is null, 'done dışına çıkınca completed_at null olmalı';
  assert (select count(*) from public.item_events where kind = 'status') = 3,
    'her durum değişimi için bir olay olmalı (null→doing, doing→done, done→todo)';
end $$;

-- Etiket, öncelik, tarih olayları
update public.items set labels = '{analiz,sunum}', priority = 2, due_date = '2026-11-01'
  where id = '11111111-1111-1111-1111-111111111111';
update public.items set labels = '{sunum}' where id = '11111111-1111-1111-1111-111111111111';
do $$
begin
  assert (select count(*) from public.item_events where kind = 'label_added' and to_value = 'sunum') = 1;
  assert (select count(*) from public.item_events where kind = 'label_removed' and from_value = 'analiz') = 1;
  assert (select count(*) from public.item_events where kind = 'priority') = 1;
  assert (select count(*) from public.item_events where kind = 'due') = 1;
end $$;

-- Yumuşak silme / geri alma
update public.items set deleted_at = now() where id = '11111111-1111-1111-1111-111111111111';
update public.items set deleted_at = null  where id = '11111111-1111-1111-1111-111111111111';
do $$
begin
  assert (select count(*) from public.item_events where kind = 'deleted') = 1;
  assert (select count(*) from public.item_events where kind = 'restored') = 1;
end $$;

-- Sahiplik başka kullanıcıya devredilemez
update public.items set user_id = 'bbbbbbbb-0000-0000-0000-000000000002'
  where id = '11111111-1111-1111-1111-111111111111';
do $$
begin
  assert (select user_id from public.items) = 'aaaaaaaa-0000-0000-0000-000000000001',
    'user_id güncellemeyle değiştirilememeli';
end $$;

-- Kısıtlar
do $$
begin
  begin insert into public.items (title, priority) values ('x', 9); assert false, 'priority 9 reddedilmeli';
  exception when check_violation then null; end;
  begin insert into public.items (title) values (''); assert false, 'boş başlık reddedilmeli';
  exception when check_violation then null; end;
  begin insert into public.items (title, status) values ('x', 'bogus'); assert false, 'geçersiz status reddedilmeli';
  exception when check_violation then null; end;
end $$;

-- Tekrarlayan görev -----------------------------------------------------------
-- Kural bitiş tarihi olmadan kabul edilmez ve biçimi doğrulanır.
do $$
begin
  begin
    insert into public.items (title, status, recurrence)
      values ('x', 'todo', '{"unit":"week","every":1,"weekdays":[],"from":"due"}');
    assert false, 'bitiş tarihsiz tekrar reddedilmeli';
  exception when check_violation then null; end;
  begin
    insert into public.items (title, status, due_date, recurrence)
      values ('x', 'todo', '2026-11-03', '{"unit":"fortnight","every":1,"weekdays":[],"from":"due"}');
    assert false, 'geçersiz unit reddedilmeli';
  exception when check_violation then null; end;
  begin
    insert into public.items (title, status, due_date, recurrence)
      values ('x', 'todo', '2026-11-03', '{"unit":"week","every":0,"weekdays":[],"from":"due"}');
    assert false, 'every 0 reddedilmeli';
  exception when check_violation then null; end;
  begin
    insert into public.items (title, status, due_date, recurrence)
      values ('x', 'todo', '2026-11-03', '{"unit":"week","every":"2","weekdays":[],"from":"due"}');
    assert false, 'sayı olmayan every reddedilmeli';
  exception when check_violation then null; end;
end $$;

insert into public.items (id, title, status, due_date, recurrence, last_done_at) values
  ('22222222-2222-2222-2222-222222222222', 'Haftalık görev', 'todo', '2026-10-27',
   '{"unit":"week","every":1,"weekdays":[],"from":"due"}', '2000-01-01');

do $$
begin
  assert (select last_done_at from public.items where id = '22222222-2222-2222-2222-222222222222') is null,
    'insert sırasında istemcinin last_done_at değeri yok sayılmalı';
end $$;

-- Tamamlama: tarih kayar, durum todo kalır, istemcinin gönderdiği last_done_at yerine "şimdi" yazılır.
update public.items
  set due_date = '2026-11-03', last_done_at = '2000-01-01'
  where id = '22222222-2222-2222-2222-222222222222';
do $$
begin
  assert (select last_done_at from public.items where id = '22222222-2222-2222-2222-222222222222')
         > now() - interval '1 minute', 'last_done_at sunucuda şimdi olmalı';
  assert (select completed_at from public.items where id = '22222222-2222-2222-2222-222222222222') is null,
    'tekrarlayan görevde completed_at dolmamalı';
  assert (select count(*) from public.item_events
            where item_id = '22222222-2222-2222-2222-222222222222' and kind = 'recurred'
              and from_value = '2026-10-27' and to_value = '2026-11-03') = 1,
    'bir recurred olayı (eski ve yeni tarihle) yazılmalı';
  assert (select count(*) from public.item_events
            where item_id = '22222222-2222-2222-2222-222222222222' and kind = 'status') = 0,
    'durum değişmediği için status olayı olmamalı';
end $$;

-- Geri alma: istemci eski değerleri yükler (last_done_at null'a döner).
update public.items
  set due_date = '2026-10-27', last_done_at = null
  where id = '22222222-2222-2222-2222-222222222222';
do $$
begin
  assert (select last_done_at from public.items where id = '22222222-2222-2222-2222-222222222222') is null;
  assert (select count(*) from public.item_events
            where item_id = '22222222-2222-2222-2222-222222222222' and kind = 'recurred_undone') = 1,
    'geri alma recurred_undone olarak kaydedilmeli';
end $$;

-- Kuralı kaldırınca tarih kalır; tarihi silmek için önce kural kalkmalı.
do $$
begin
  begin
    update public.items set due_date = null where id = '22222222-2222-2222-2222-222222222222';
    assert false, 'kural varken due_date null yapılamaz';
  exception when check_violation then null; end;
end $$;
update public.items set due_date = null, recurrence = null where id = '22222222-2222-2222-2222-222222222222';

-- İstemci olay tablosuna yazamaz
do $$
begin
  begin
    insert into public.item_events (user_id, item_id, kind)
      values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'created');
    assert false, 'item_events insert reddedilmeli';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.item_events;
    assert false, 'item_events delete reddedilmeli';
  exception when insufficient_privilege then null; end;
end $$;

-- Dosya ekleri: kova özel, üst veri dizi olmalı ve en fazla 20 olmalı.
do $$
begin
  assert (select public from storage.buckets where id = 'attachments') = false, 'attachments kovası özel olmalı';
  begin
    update public.items set files = '{}'::jsonb where id = '11111111-1111-1111-1111-111111111111';
    assert false, 'files dizi olmalı';
  exception when check_violation then null; end;
  begin
    update public.items set files = (select jsonb_agg('{}'::jsonb) from generate_series(1, 21))
      where id = '11111111-1111-1111-1111-111111111111';
    assert false, 'files en fazla 20 öğe olmalı';
  exception when check_violation then null; end;
end $$;

-- Storage: A yalnızca kendi klasörüne yazabilir.
insert into storage.objects (bucket_id, name)
  values ('attachments', 'aaaaaaaa-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111/f1');
do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
      values ('attachments', 'bbbbbbbb-0000-0000-0000-000000000002/x/f2');
    assert false, 'A, B''nin klasörüne yazamamalı';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('attachments', 'f3');
    assert false, 'A, kök dizine yazamamalı';
  exception when insufficient_privilege then null; end;
end $$;

-- ---- Kullanıcı B: A'nın verisini görmemeli ---------------------------------
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);

do $$
declare n int;
begin
  assert (select count(*) from public.items) = 0, 'B, A''nın item''larını görmemeli';
  assert (select count(*) from public.item_events) = 0, 'B, A''nın olaylarını görmemeli';

  update public.items set title = 'ele geçirildi' where id = '11111111-1111-1111-1111-111111111111';
  get diagnostics n = row_count;
  assert n = 0, 'B, A''nın item''ını güncelleyememeli';

  delete from public.items where id = '11111111-1111-1111-1111-111111111111';
  get diagnostics n = row_count;
  assert n = 0, 'B, A''nın item''ını silememeli';

  assert (select count(*) from storage.objects) = 0, 'B, A''nın dosyalarını görmemeli';
  delete from storage.objects;
  get diagnostics n = row_count;
  assert n = 0, 'B, A''nın dosyalarını silememeli';

  begin
    insert into public.items (user_id, title) values ('aaaaaaaa-0000-0000-0000-000000000001', 'sahte');
    assert false, 'B, A adına satır ekleyememeli';
  exception when insufficient_privilege then null; end;
end $$;

-- ---- Giriş yapmamış (anon) ---------------------------------------------------
reset role;
set role anon;
do $$
begin
  begin perform 1 from public.items; assert false, 'anon items okuyamamalı';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.item_events; assert false, 'anon item_events okuyamamalı';
  exception when insufficient_privilege then null; end;
  begin perform 1 from storage.objects; assert false, 'anon dosyaları okuyamamalı';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
\echo 'TUM TESTLER GECTI'
