alter table public.profiles
  add column if not exists auto_categorize boolean not null default true;

alter table public.categories
  add column if not exists is_uncategorized boolean not null default false;

create unique index if not exists categories_one_uncategorized_per_user
  on public.categories (user_id)
  where is_uncategorized;

insert into public.categories (
  user_id, name, type, icon, color_bg, color_fg, notes, sort_order, is_uncategorized
)
select
  p.user_id,
  'Uncategorized',
  'expense',
  'help-circle-outline',
  '#F3F4F6',
  '#6B7280',
  'Receipts with no clear category',
  999,
  true
from public.profiles p
where not exists (
  select 1
  from public.categories c
  where c.user_id = p.user_id
    and c.is_uncategorized
);
