-- Cup Atlas shared collection schema
create table if not exists public.cups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  country char(2) not null,
  city text not null default '' check (char_length(city) <= 60),
  series text not null default 'Other' check (char_length(series) <= 40),
  date date,
  notes text not null default '' check (char_length(notes) <= 500),
  photo_path text,
  created_at timestamptz not null default now()
);

alter table public.cups enable row level security;

-- Everyone may read; ALL writes go through the PIN-checked edge function (service role).
drop policy if exists "public read" on public.cups;
create policy "public read" on public.cups for select using (true);

-- Public-read storage bucket for cup photos (writes via service role only).
insert into storage.buckets (id, name, public)
values ('cups', 'cups', true)
on conflict (id) do nothing;
