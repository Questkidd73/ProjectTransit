-- Project Transit — Supabase Database Schema
-- Safe to run on a fresh OR existing database (fully idempotent).

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── ENUM TYPES ───────────────────────────────────────────────────────────────

do $$ begin
  create type user_role as enum ('site_staff', 'finance', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum (
    'draft', 'submitted', 'changes_requested', 'approved', 'sent', 'received'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_type as enum ('budget', 'inout');
exception when duplicate_object then null; end $$;

-- ─── SITES ────────────────────────────────────────────────────────────────────

create table if not exists sites (
  id                        uuid primary key default uuid_generate_v4(),
  code                      text not null unique,
  name                      text not null,
  country                   text,
  currency                  text not null default 'USD',
  exchange_rate             numeric(12,4) not null default 1,
  exchange_rate_updated_at  timestamptz,
  exchange_rate_updated_by  uuid references auth.users(id),
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now()
);

-- ─── PROGRAMS ─────────────────────────────────────────────────────────────────

create table if not exists programs (
  id         uuid primary key default uuid_generate_v4(),
  site_id    uuid not null references sites(id) on delete cascade,
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (site_id, name)
);

-- ─── BUDGET LINES ─────────────────────────────────────────────────────────────

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

-- ─── USER PROFILES ────────────────────────────────────────────────────────────

create table if not exists user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       user_role not null default 'site_staff',
  site_id    uuid references sites(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── TRANSFER REQUESTS ────────────────────────────────────────────────────────

create table if not exists transfer_requests (
  id                    uuid primary key default uuid_generate_v4(),
  site_id               uuid not null references sites(id),
  month                 text not null,
  year                  integer not null,
  status                request_status not null default 'draft',
  submitted_by          uuid references auth.users(id),
  submitted_at          timestamptz,
  approved_by           uuid references auth.users(id),
  approved_at           timestamptz,
  finance_notes         text,
  site_notes            text,
  exchange_rate_at_submit numeric(12,4),
  request_type          request_type not null default 'budget',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Add request_type to existing databases that predate this column
do $$ begin
  alter table transfer_requests add column request_type request_type not null default 'budget';
exception when duplicate_column then null; end $$;

-- ─── REQUEST LINE ITEMS ───────────────────────────────────────────────────────

create table if not exists request_line_items (
  id            uuid primary key default uuid_generate_v4(),
  request_id    uuid not null references transfer_requests(id) on delete cascade,
  program_id    uuid references programs(id),
  program_name  text not null,
  description   text not null default '',
  local_amount  numeric(14,2) not null,
  currency      text not null,
  usd_equivalent numeric(14,2),
  exchange_rate  numeric(12,4),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ─── DISBURSEMENTS ────────────────────────────────────────────────────────────

create table if not exists disbursements (
  id                        uuid primary key default uuid_generate_v4(),
  request_id                uuid not null references transfer_requests(id) on delete cascade unique,
  usd_sent                  numeric(14,2),
  sent_date                 date,
  method                    text,
  reference_number          text,
  finance_notes             text,
  local_received            numeric(14,2),
  received_date             date,
  exchange_rate_at_transfer numeric(12,4),
  site_notes                text,
  recorded_by               uuid references auth.users(id),
  recorded_at               timestamptz,
  confirmed_by              uuid references auth.users(id),
  confirmed_at              timestamptz
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

alter table sites              enable row level security;
alter table programs           enable row level security;
alter table budget_lines       enable row level security;
alter table user_profiles      enable row level security;
alter table transfer_requests  enable row level security;
alter table request_line_items enable row level security;
alter table disbursements      enable row level security;

-- Helper: get current user role
create or replace function current_user_role()
returns user_role as $$
  select role from public.user_profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper: get current user site
create or replace function current_user_site()
returns uuid as $$
  select site_id from public.user_profiles where id = auth.uid();
$$ language sql security definer stable;

-- Drop all policies before recreating (idempotent)
drop policy if exists "sites_read"                  on sites;
drop policy if exists "sites_admin_write"            on sites;
drop policy if exists "programs_read"                on programs;
drop policy if exists "programs_admin_write"         on programs;
drop policy if exists "budget_lines_read"            on budget_lines;
drop policy if exists "budget_lines_write"           on budget_lines;
drop policy if exists "profiles_own"                 on user_profiles;
drop policy if exists "profiles_admin"               on user_profiles;
drop policy if exists "profiles_update_own"          on user_profiles;
drop policy if exists "requests_site_staff"          on transfer_requests;
drop policy if exists "requests_site_staff_insert"   on transfer_requests;
drop policy if exists "requests_site_staff_update"   on transfer_requests;
drop policy if exists "line_items_select"            on request_line_items;
drop policy if exists "line_items_insert"            on request_line_items;
drop policy if exists "line_items_delete"            on request_line_items;
drop policy if exists "disbursements_finance"        on disbursements;
drop policy if exists "disbursements_site_read"      on disbursements;
drop policy if exists "disbursements_site_confirm"   on disbursements;

-- Sites: all authenticated users can read; only admin can write
create policy "sites_read" on sites for select using (auth.role() = 'authenticated');
create policy "sites_admin_write" on sites for all using (current_user_role() = 'admin');

-- Programs: all read; admin write
create policy "programs_read" on programs for select using (auth.role() = 'authenticated');
create policy "programs_admin_write" on programs for all using (current_user_role() = 'admin');

-- Budget lines: all authenticated read; finance and admin write
create policy "budget_lines_read" on budget_lines for select using (auth.role() = 'authenticated');
create policy "budget_lines_write" on budget_lines for all using (current_user_role() in ('admin', 'finance'));

-- User profiles: users see own; admin sees all
create policy "profiles_own" on user_profiles for select using (id = auth.uid());
create policy "profiles_admin" on user_profiles for all using (current_user_role() = 'admin');
create policy "profiles_update_own" on user_profiles for update using (id = auth.uid());

-- Transfer requests: site_staff see own site; finance/admin see all
create policy "requests_site_staff" on transfer_requests for select
  using (
    current_user_role() = 'site_staff' and site_id = current_user_site()
    or current_user_role() in ('finance', 'admin')
  );
create policy "requests_site_staff_insert" on transfer_requests for insert
  with check (current_user_role() = 'site_staff' and site_id = current_user_site());
create policy "requests_site_staff_update" on transfer_requests for update
  using (
    (current_user_role() = 'site_staff' and site_id = current_user_site() and status in ('draft', 'changes_requested'))
    or current_user_role() in ('finance', 'admin')
  );

create policy "requests_site_staff_delete" on transfer_requests for delete
  using (
    (current_user_role() = 'site_staff' and site_id = current_user_site() and status in ('draft', 'changes_requested'))
    or current_user_role() in ('admin')
  );

-- Line items: same access as parent request
create policy "line_items_select" on request_line_items for select
  using (
    exists (
      select 1 from transfer_requests r
      where r.id = request_id
        and (r.site_id = current_user_site() or current_user_role() in ('finance', 'admin'))
    )
  );
create policy "line_items_insert" on request_line_items for insert
  with check (
    exists (
      select 1 from transfer_requests r
      where r.id = request_id
        and (
          (r.site_id = current_user_site() and current_user_role() = 'site_staff')
          or current_user_role() in ('finance', 'admin')
        )
    )
  );
create policy "line_items_delete" on request_line_items for delete
  using (
    exists (
      select 1 from transfer_requests r
      where r.id = request_id and r.site_id = current_user_site()
        and r.status in ('draft', 'changes_requested')
        and current_user_role() = 'site_staff'
    )
  );

-- Disbursements: finance/admin write; site_staff read own
create policy "disbursements_finance" on disbursements for all
  using (current_user_role() in ('finance', 'admin'));
create policy "disbursements_site_read" on disbursements for select
  using (
    exists (
      select 1 from transfer_requests r
      where r.id = request_id and r.site_id = current_user_site()
    )
  );
create policy "disbursements_site_confirm" on disbursements for update
  using (
    exists (
      select 1 from transfer_requests r
      where r.id = request_id and r.site_id = current_user_site()
        and r.status = 'sent'
    )
  );

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

create index if not exists idx_transfer_requests_site_id     on transfer_requests (site_id);
create index if not exists idx_transfer_requests_status       on transfer_requests (status);
create index if not exists idx_transfer_requests_submitted_at on transfer_requests (submitted_at desc);
create index if not exists idx_request_line_items_request_id  on request_line_items (request_id);
create index if not exists idx_programs_site_id               on programs (site_id);
create index if not exists idx_budget_lines_program_year_month on budget_lines (program_id, year, month);
