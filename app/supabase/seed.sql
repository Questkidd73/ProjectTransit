-- Project Transit — Seed Data
-- Run this AFTER schema.sql in the Supabase SQL Editor.
-- Exchange rates are approximate — update via Admin > Exchange Rates page.

-- ─── SITES ────────────────────────────────────────────────────────────────────

insert into sites (code, name, country, currency, exchange_rate) values
  ('CUN', 'Cancun',             'Mexico',             'MXN', 17.28),
  ('CUL', 'Culiacan',           'Mexico',             'MXN', 17.28),
  ('LIN', 'Linares',            'Mexico',             'MXN', 17.28),
  ('MTY', 'Monterrey',          'Mexico',             'MXN', 17.28),
  ('MZT', 'Mazatlan',           'Mexico',             'MXN', 17.28),
  ('MXA', 'MX Admin',           'Mexico',             'MXN', 17.28),
  ('IND', 'India',              'India',              'INR', 83.00),
  ('NIG', 'Nigeria',            'Nigeria',            'NGN', 1580.00),
  ('HTI', 'Haiti',              'Haiti',              'USD', 1.00),
  ('DOM', 'Dominican Republic', 'Dominican Republic', 'USD', 1.00),
  ('CIN', 'Cincinnati',         'United States',      'USD', 1.00)
on conflict (code) do update set
  name        = excluded.name,
  country     = excluded.country,
  currency    = excluded.currency,
  exchange_rate = excluded.exchange_rate;

-- ─── PROGRAMS — All field sites ──────────────────────────────────────────────
-- Every field site (except MXA and CIN) shares the same standard program
-- structure, auto-named from each site's name/code. CUN also gets Reggio Emilia.
-- MXA has no programs. CIN has a separate US HQ set below.

with field_sites as (
  select id, name, code from sites where code not in ('MXA', 'CIN', 'ZAL')
),
site_programs as (
  select id as site_id, 'Hope Program '           || name  as name from field_sites
  union all
  select id,            'International Operations'                  from field_sites
  union all
  select id,            'Ministry Partnerships '  || name           from field_sites
  union all
  select id,            'Mission Trips'                             from field_sites
  union all
  select id,            'Projects & Improvements ' || code          from field_sites
  union all
  select id,            'Strong Families '        || name           from field_sites
  union all
  select id,            'Transition Program '     || name           from field_sites
  union all
  select id,            'All Programs '           || name           from field_sites
  union all
  select id,            'Reggio Emilia'           from field_sites where code = 'CUN'
)
insert into programs (site_id, name)
select site_id, name from site_programs
on conflict (site_id, name) do nothing;

-- ─── PROGRAMS — Cincinnati (CIN) — US HQ ─────────────────────────────────────

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

