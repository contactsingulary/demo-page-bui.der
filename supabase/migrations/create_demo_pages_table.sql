-- Drop existing objects if they exist
drop table if exists demo_pages cascade;
drop function if exists handle_updated_at cascade;

-- Create demo_pages table
create table demo_pages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  image_url text not null,
  script_tag text not null,
  user_id uuid references auth.users not null default auth.uid()
);

-- Enable Row Level Security (RLS)
alter table demo_pages enable row level security;

-- Create policy to allow public read access
create policy "Allow public read access"
  on demo_pages for select
  using (true);

-- Create policy to allow authenticated insert
create policy "Allow authenticated insert"
  on demo_pages for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

-- Create policy to allow authenticated delete
create policy "Allow authenticated delete"
  on demo_pages for delete
  using (auth.role() = 'authenticated' and auth.uid() = user_id);

-- Create updated_at trigger
create function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger handle_demo_pages_updated_at
  before update on demo_pages
  for each row
  execute function handle_updated_at(); 