-- migrate_add_budget.sql
-- Run this in the Supabase SQL Editor to add budget support to an existing database.
-- Safe to run on a database that already has schema.sql applied.

-- 1. New enum type for request type (idempotent)
do $$ begin
  create type request_type as enum ('budget', 'inout');
exception when duplicate_object then null; end $$;

-- 2. New budget_lines table (idempotent)
create table if not exists budget_lines (
  id                     uuid primary key default uuid_generate_v4(),
  program_id             uuid not null references programs(id) on delete cascade,
  year                   integer not null,
  month                  integer not null check (month between 1 and 12),
  local_amount           numeric(14,2) not null,
  budgeted_exchange_rate numeric(12,4),
  entered_by             uuid references auth.users(id),
  entered_at             timestamptz not null default now(),
  unique (program_id, year, month)
);

-- 3. Add request_type column to existing transfer_requests table (idempotent)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'transfer_requests' and column_name = 'request_type'
  ) then
    alter table transfer_requests
      add column request_type request_type not null default 'budget';
  end if;
end $$;

-- 4. Enable RLS on budget_lines (idempotent)
alter table budget_lines enable row level security;

-- 5. RLS policies for budget_lines (idempotent)
drop policy if exists "budget_lines_read" on budget_lines;
create policy "budget_lines_read" on budget_lines
  for select using (auth.role() = 'authenticated');

drop policy if exists "budget_lines_write" on budget_lines;
create policy "budget_lines_write" on budget_lines
  for all using (current_user_role() in ('admin', 'finance'));

-- 6. Index (idempotent)
create index if not exists budget_lines_program_year_month on budget_lines (program_id, year, month);

-- 7. spending_plan_items table (idempotent)
create table if not exists spending_plan_items (
  id           uuid primary key default uuid_generate_v4(),
  site_id      uuid not null references sites(id) on delete cascade,
  program_id   uuid not null references programs(id) on delete cascade,
  year         integer not null,
  month        integer not null check (month between 1 and 12),
  category     text not null,
  local_amount numeric(14,2) not null default 0,
  notes        text,
  entered_by   uuid references auth.users(id),
  entered_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (program_id, year, month, category)
);

alter table spending_plan_items enable row level security;

drop policy if exists "spending_plan_read" on spending_plan_items;
create policy "spending_plan_read" on spending_plan_items
  for select using (
    auth.role() = 'authenticated' and (
      current_user_role() in ('admin', 'finance')
      or site_id = current_user_site()
    )
  );

drop policy if exists "spending_plan_write" on spending_plan_items;
create policy "spending_plan_write" on spending_plan_items
  for all using (
    current_user_role() in ('admin', 'finance', 'site_staff')
    and (
      current_user_role() in ('admin', 'finance')
      or site_id = current_user_site()
    )
  );

create index if not exists spending_plan_site_year_month on spending_plan_items (site_id, year, month);

-- 8. budget_line_items table — individual expense categories per program (from Google Sheets)
create table if not exists budget_line_items (
  id                     uuid primary key default uuid_generate_v4(),
  program_id             uuid not null references programs(id) on delete cascade,
  year                   integer not null,
  month                  integer not null check (month between 1 and 12),
  category               text not null,  -- US Netsuite Category column
  description            text,           -- Description column
  local_amount           numeric(14,2) not null default 0,
  usd_amount             numeric(14,2),
  budgeted_exchange_rate numeric(12,4),
  synced_at              timestamptz not null default now(),
  unique (program_id, year, month, category)
);

alter table budget_line_items enable row level security;

drop policy if exists "budget_line_items_read" on budget_line_items;
create policy "budget_line_items_read" on budget_line_items
  for select using (auth.role() = 'authenticated');

drop policy if exists "budget_line_items_write" on budget_line_items;
create policy "budget_line_items_write" on budget_line_items
  for all using (current_user_role() in ('admin', 'finance'));

create index if not exists budget_line_items_program_year_month on budget_line_items (program_id, year, month);
