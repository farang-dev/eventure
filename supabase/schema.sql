-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clean up old tables if they exist
drop table if exists public.rsvps cascade;
drop table if exists public.payments cascade;
drop table if exists public.events cascade;
drop table if exists public.users cascade;

-- MUSIC EVENTS TABLE
create table public.music_events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  image_url text,
  genre text not null default 'other',
  artists text[] default '{}',
  
  venue_name text not null,
  venue_address text,
  city text not null,
  lat double precision not null,
  lng double precision not null,
  
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  
  price text,
  ticket_url text,
  source_url text, -- To track where we scraped this from
  source_id text unique, -- Unique identifier from the source (e.g., RA ID) to prevent duplicates
  is_featured boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES
alter table public.music_events enable row level security;

-- Everyone can read events
create policy "Music events are viewable by everyone." 
  on public.music_events for select 
  using (true);

-- Only authenticated admins or service roles can insert/update/delete
-- Since this is an automated scraper architecture, inserts come via Service Role Key (which bypasses RLS)
create policy "Only authenticated users can insert events (or service role)." 
  on public.music_events for insert 
  with check (auth.role() = 'authenticated');

create policy "Only authenticated users can update events." 
  on public.music_events for update 
  using (auth.role() = 'authenticated');

-- Trigger to automatically update 'updated_at'
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_music_events_updated
  before update on public.music_events
  for each row execute procedure public.handle_updated_at();

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('events', 'events', true) on conflict do nothing;

create policy "Event images are publicly accessible." 
  on storage.objects for select 
  using (bucket_id = 'events');

create policy "Authenticated users can upload event images." 
  on storage.objects for insert 
  with check (bucket_id = 'events' and auth.role() = 'authenticated');
