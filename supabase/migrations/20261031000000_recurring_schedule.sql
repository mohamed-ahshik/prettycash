alter table public.profiles
  add column if not exists timezone text not null default 'UTC',
  add column if not exists timezone_updated_at timestamptz;

alter table public.recurring_items
  add column if not exists category_id uuid references public.categories(id) on delete set null;

update public.recurring_items ri
set category_id = c.id
from public.categories c
where ri.category_id is null
  and c.user_id = ri.user_id
  and c.type = ri.type
  and c.name = ri.category_name
  and not exists (
    select 1
    from public.categories duplicate
    where duplicate.user_id = ri.user_id
      and duplicate.type = ri.type
      and duplicate.name = ri.category_name
      and duplicate.id <> c.id
  );

create index if not exists recurring_items_category_id_idx
  on public.recurring_items(category_id);

create table if not exists public.recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_item_id uuid not null references public.recurring_items(id) on delete cascade,
  occurrence_date date not null,
  status text not null default 'pending' check (status in ('pending', 'posted', 'skipped')),
  transaction_id uuid references public.transactions(id) on delete set null,
  notification_sent_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recurring_item_id, occurrence_date)
);

create index if not exists recurring_occurrences_pending_idx
  on public.recurring_occurrences(user_id, status, occurrence_date);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx
  on public.push_tokens(user_id);

alter table public.recurring_occurrences enable row level security;
alter table public.push_tokens enable row level security;

drop policy if exists "own recurring occurrences" on public.recurring_occurrences;
create policy "own recurring occurrences" on public.recurring_occurrences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own push tokens" on public.push_tokens;
create policy "own push tokens" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
