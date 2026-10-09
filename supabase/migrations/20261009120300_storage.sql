-- =====================================================================
-- Pratuca — armazenamento de imagens (logos e fotos de produtos)
--   * bucket público para LEITURA (imagens aparecem no cardápio público);
--   * limite de 2 MB e apenas JPEG, PNG ou WebP (validado pelo Storage);
--   * escrita restrita a membros da loja, na pasta "<store_id>/...".
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-media', 'store-media', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy store_media_member_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] in (select id::text from private.my_store_ids() as t(id))
  );

create policy store_media_member_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] in (select id::text from private.my_store_ids() as t(id))
  );

create policy store_media_member_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] in (select id::text from private.my_store_ids() as t(id))
  )
  with check (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] in (select id::text from private.my_store_ids() as t(id))
  );

create policy store_media_member_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] in (select id::text from private.my_store_ids() as t(id))
  );
