-- Toplantı notları.
-- `meetings`: düzenli yapılan toplantı (ad + etiketler). `meeting_notes`: toplantının tarihli notları;
-- her toplantı toplantı tarihiyle üst üste notlar biriktirir. Not ve görev tablosu (`items`) karışmaz.
-- İkisi de kullanıcıya ait ve RLS ile izole. Silme: toplantı yumuşak (deleted_at), not kalıcı.

create table public.meetings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),
  labels     text[] not null default '{}' check (cardinality(labels) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index meetings_user_idx on public.meetings (user_id) where deleted_at is null;

create table public.meeting_notes (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note_date  date not null,
  body       text not null default '' check (char_length(body) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meeting_notes_meeting_idx on public.meeting_notes (meeting_id, note_date desc);

-- updated_at'i sunucu belirler; satırın sahibi (ve notun toplantısı) sonradan değiştirilemez.
create function public.meetings_before_write() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.user_id := old.user_id;
    if tg_table_name = 'meeting_notes' then
      new.meeting_id := old.meeting_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger meetings_before_write
  before insert or update on public.meetings
  for each row execute function public.meetings_before_write();
create trigger meeting_notes_before_write
  before insert or update on public.meeting_notes
  for each row execute function public.meetings_before_write();

alter table public.meetings      enable row level security;
alter table public.meeting_notes enable row level security;

revoke all on public.meetings      from anon, authenticated;
revoke all on public.meeting_notes from anon, authenticated;
grant select, insert, update, delete on public.meetings      to authenticated;
grant select, insert, update, delete on public.meeting_notes to authenticated;

create policy meetings_select on public.meetings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy meetings_insert on public.meetings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy meetings_update on public.meetings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy meetings_delete on public.meetings for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Not yalnızca kendi toplantısına eklenebilir (yabancı anahtar RLS'i atladığı için ayrıca denetlenir).
create policy meeting_notes_select on public.meeting_notes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy meeting_notes_insert on public.meeting_notes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.meetings m where m.id = meeting_id and m.user_id = (select auth.uid()))
  );
create policy meeting_notes_update on public.meeting_notes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy meeting_notes_delete on public.meeting_notes for delete to authenticated
  using ((select auth.uid()) = user_id);
