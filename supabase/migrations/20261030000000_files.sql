-- Dosya ekleri.
-- Dosyanın kendisi Supabase Storage'daki özel `attachments` kovasında durur; yol her zaman
-- `<user_id>/<item_id>/<dosya_id>` biçimindedir. Öğenin üstünde yalnızca üst veri (`files`) tutulur:
-- [{"id","name","type","size","path"}]. Üst veri `items` RLS'iyle, dosya içeriği Storage RLS'iyle korunur.

alter table public.items
  add column files jsonb not null default '[]'::jsonb
    check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 20);

-- Kova özel (public = false), dosya başına 10 MB. İndirme yalnızca imzalı, kısa ömürlü bağlantıyla.
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

-- Herkes yalnızca kendi klasörüne (ilk yol parçası = kullanıcı kimliği) erişir.
create policy attachments_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy attachments_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy attachments_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
