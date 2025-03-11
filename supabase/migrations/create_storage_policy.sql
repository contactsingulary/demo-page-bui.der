-- Create the storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('demo-pages', 'demo-pages', true)
on conflict (id) do nothing;

-- Allow public read access to files
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'demo-pages' );

-- Allow authenticated uploads
create policy "Allow Uploads"
on storage.objects for insert
with check ( bucket_id = 'demo-pages' );

-- Allow authenticated deletes
create policy "Allow Deletes"
on storage.objects for delete
using ( bucket_id = 'demo-pages' ); 