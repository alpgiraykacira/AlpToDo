-- AlpToDo: ilk şema.
-- Güvenlik modeli: her satır bir kullanıcıya ait (user_id) ve Row Level Security
-- ile veritabanı seviyesinde izole edilir. Uygulama kodunda bir hata olsa bile
-- bir kullanıcı başkasının satırını okuyamaz ya da yazamaz.

-- ---------------------------------------------------------------------------
-- items: not ve görev aynı tablo. status null ise düz not, doluysa görev.
-- Etiketler text[] olarak tutulur ve kullanımdan türetilir (ayrı etiket tablosu yok).
-- ---------------------------------------------------------------------------
create table public.items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 500),
  body         text not null default '' check (char_length(body) <= 100000),
  status       text check (status in ('todo', 'doing', 'waiting', 'done')),
  priority     smallint not null default 0 check (priority between 0 and 4),
  due_date     date,
  labels       text[] not null default '{}' check (cardinality(labels) <= 20),
  pinned       boolean not null default false,
  inbox        boolean not null default false,
  secret       boolean not null default false,
  checklist    jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at   timestamptz
);

create index items_user_status_idx on public.items (user_id, status) where deleted_at is null;
create index items_user_due_idx    on public.items (user_id, due_date) where deleted_at is null;
create index items_labels_idx      on public.items using gin (labels);

-- ---------------------------------------------------------------------------
-- item_events: analiz için değişiklik geçmişi. Sadece trigger yazar, istemci okur.
-- "Bu iş kaç gün Sürüyor'da kaldı", "haftalık tamamlama" gibi sorular buradan gelir.
-- ---------------------------------------------------------------------------
create table public.item_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  item_id    uuid not null references public.items (id) on delete cascade,
  kind       text not null check (kind in
               ('created', 'status', 'priority', 'due', 'label_added', 'label_removed', 'deleted', 'restored')),
  from_value text,
  to_value   text,
  at         timestamptz not null default now()
);

create index item_events_user_at_idx on public.item_events (user_id, at desc);
create index item_events_item_idx    on public.item_events (item_id, at);

-- ---------------------------------------------------------------------------
-- Trigger: yazmadan önce updated_at ve completed_at'i sunucu belirler.
-- ---------------------------------------------------------------------------
create function public.items_before_write() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'done' and new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.updated_at := now();
    if new.status is distinct from old.status then
      new.completed_at := case when new.status = 'done' then now() else null end;
    else
      new.completed_at := old.completed_at;
    end if;
    -- Satırın sahibi sonradan değiştirilemez.
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

create trigger items_before_write
  before insert or update on public.items
  for each row execute function public.items_before_write();

-- ---------------------------------------------------------------------------
-- Trigger: yazdıktan sonra olay kaydı. security definer, çünkü istemcinin
-- item_events'e yazma yetkisi yok.
-- ---------------------------------------------------------------------------
create function public.items_log_events() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lbl text;
begin
  if tg_op = 'INSERT' then
    insert into public.item_events (user_id, item_id, kind, to_value)
    values (new.user_id, new.id, 'created', new.status);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.item_events (user_id, item_id, kind, from_value, to_value)
    values (new.user_id, new.id, 'status', old.status, new.status);
  end if;
  if new.priority is distinct from old.priority then
    insert into public.item_events (user_id, item_id, kind, from_value, to_value)
    values (new.user_id, new.id, 'priority', old.priority::text, new.priority::text);
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.item_events (user_id, item_id, kind, from_value, to_value)
    values (new.user_id, new.id, 'due', old.due_date::text, new.due_date::text);
  end if;
  for lbl in select unnest(new.labels) except select unnest(old.labels) loop
    insert into public.item_events (user_id, item_id, kind, to_value)
    values (new.user_id, new.id, 'label_added', lbl);
  end loop;
  for lbl in select unnest(old.labels) except select unnest(new.labels) loop
    insert into public.item_events (user_id, item_id, kind, from_value)
    values (new.user_id, new.id, 'label_removed', lbl);
  end loop;
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.item_events (user_id, item_id, kind) values (new.user_id, new.id, 'deleted');
  elsif old.deleted_at is not null and new.deleted_at is null then
    insert into public.item_events (user_id, item_id, kind) values (new.user_id, new.id, 'restored');
  end if;
  return new;
end;
$$;

create trigger items_log_events
  after insert or update on public.items
  for each row execute function public.items_log_events();

-- ---------------------------------------------------------------------------
-- Yetkiler ve Row Level Security
-- ---------------------------------------------------------------------------
alter table public.items       enable row level security;
alter table public.item_events enable row level security;

revoke all on public.items       from anon, authenticated;
revoke all on public.item_events from anon, authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select                          on public.item_events to authenticated;

create policy items_select on public.items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy items_insert on public.items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy items_update on public.items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy items_delete on public.items for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy item_events_select on public.item_events for select to authenticated
  using ((select auth.uid()) = user_id);
