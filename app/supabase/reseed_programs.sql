-- reseed_programs.sql
-- Run this in the Supabase SQL Editor to reset and re-seed all programs.
-- Safe to re-run at any time.

-- Step 1: Clear existing programs (must happen before adding unique constraint)
truncate table programs restart identity cascade;

-- Step 2: Add unique constraint (skip if already exists)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'programs_site_id_name_key'
      and table_name = 'programs'
  ) then
    alter table programs add constraint programs_site_id_name_key unique (site_id, name);
  end if;
end $$;

-- Step 3: Insert standard programs for all field sites
-- Each site (except MXA and CIN) gets the same 8 programs, named per site.
-- CUN also gets Reggio Emilia.

with field_sites as (
  select id, name, code from sites where code not in ('MXA', 'CIN')
),
site_programs as (
  select id as site_id, 'Hope Program '            || name as name from field_sites
  union all
  select id,            'International Operations'                   from field_sites
  union all
  select id,            'Ministry Partnerships '   || name           from field_sites
  union all
  select id,            'Mission Trips'                              from field_sites
  union all
  select id,            'Projects & Improvements ' || code           from field_sites
  union all
  select id,            'Strong Families '         || name           from field_sites
  union all
  select id,            'Transition Program '      || name           from field_sites
  union all
  select id,            'All Programs '            || name           from field_sites
  union all
  select id,            'Reggio Emilia'            from field_sites where code = 'CUN'
)
insert into programs (site_id, name)
select site_id, name from site_programs
on conflict (site_id, name) do nothing;

-- Step 4: Insert Cincinnati (US HQ) programs

insert into programs (site_id, name)
select id, unnest(array[
  'Foster Care Fund',
  'US Paid International Expenses',
  'US Paid Meals',
  'US Paid Meals: ECT',
  'US Paid Meals: Ops Dir',
  'US Paid Meals: US Site Dir',
  'US Paid Program',
  'US Paid Program: Marketing',
  'US Paid Travel',
  'US Paid Travel: ECT',
  'US Paid Travel: Ops Dir',
  'US Paid Travel: US Site Dir'
])
from sites where code = 'CIN'
on conflict (site_id, name) do nothing;
