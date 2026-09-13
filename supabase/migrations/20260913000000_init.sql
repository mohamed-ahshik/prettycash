create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null default auth.uid() references auth.users(id) on delete cascade,
  name text,
  email text,
  currency text not null default 'USD ($)',
  notifications_enabled boolean not null default true,
  haptics_enabled boolean not null default true,
  member_since text,
  seeded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense','income')),
  icon text,
  color_bg text,
  color_fg text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  date date not null,
  time text,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('expense','income')),
  amount numeric(12,2) not null,
  icon text,
  note text,
  receipt_path text,
  created_at timestamptz not null default now()
);

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  name text not null,
  quantity numeric,
  price numeric(12,2) not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense','income')),
  amount numeric(12,2) not null,
  category_name text,
  icon text,
  color_bg text,
  color_fg text,
  day_of_month integer check (day_of_month between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.recurring_items enable row level security;

create policy "own profiles" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transaction items" on public.transaction_items
  for all using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

create policy "own recurring items" on public.recurring_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

create policy "own receipt read" on storage.objects
  for select using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own receipt write" on storage.objects
  for insert with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own receipt update" on storage.objects
  for update
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own receipt delete" on storage.objects
  for delete using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
