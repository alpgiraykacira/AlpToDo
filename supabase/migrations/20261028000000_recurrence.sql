-- Tekrarlayan görevler.
-- Tamamlanan tekrarlayan görev "done" olmaz: istemci bitiş tarihini sonraki oluşuma kaydırır,
-- last_done_at'i günceller, trigger da bunu item_events'e 'recurred' olarak yazar.

alter table public.items
  add column recurrence    jsonb,
  add column last_done_at  timestamptz;

-- Kural biçimi: {"unit":"day|week|month|year","every":1..99,"weekdays":[0..6],"from":"due|done"}
-- Tekrarlayan görevin bitiş tarihi olmalı.
alter table public.items add constraint items_recurrence_valid check (
  recurrence is null or (
    jsonb_typeof(recurrence) = 'object'
    and recurrence ->> 'unit' in ('day', 'week', 'month', 'year')
    and recurrence ->> 'from' in ('due', 'done')
    and jsonb_typeof(recurrence -> 'weekdays') = 'array'
    and case when jsonb_typeof(recurrence -> 'every') = 'number'
             then (recurrence ->> 'every')::numeric between 1 and 99
             else false end
    and due_date is not null
  )
);

alter table public.item_events drop constraint item_events_kind_check;
alter table public.item_events add constraint item_events_kind_check check (kind in
  ('created', 'status', 'priority', 'due', 'label_added', 'label_removed', 'deleted', 'restored',
   'recurred', 'recurred_undone'));

-- completed_at gibi last_done_at'i de sunucu belirler: artıyorsa "şimdi" yazılır.
-- (Geri almada istemci eski, daha küçük değeri geri yükler; o olduğu gibi kalır.)
create or replace function public.items_before_write() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.last_done_at := null;
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
    if new.last_done_at is not null
       and new.last_done_at is distinct from old.last_done_at
       and (old.last_done_at is null or new.last_done_at > old.last_done_at) then
      new.last_done_at := now();
    end if;
    -- Satırın sahibi sonradan değiştirilemez.
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

create or replace function public.items_log_events() returns trigger
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
  if new.last_done_at is distinct from old.last_done_at then
    insert into public.item_events (user_id, item_id, kind, from_value, to_value)
    values (
      new.user_id, new.id,
      case when new.last_done_at is not null and (old.last_done_at is null or new.last_done_at > old.last_done_at)
           then 'recurred' else 'recurred_undone' end,
      old.due_date::text, new.due_date::text
    );
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
