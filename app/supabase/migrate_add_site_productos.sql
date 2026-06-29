-- migrate_add_site_productos.sql
-- Creates site-level master lists for Producto, Clase, and Category (Dato estadístico).
-- Populated by budget_sync_service.py from the Google Sheet Setup tab.
-- Drives the dropdowns in the Spending Plan UI.

CREATE TABLE IF NOT EXISTS site_productos (
  id          uuid primary key default uuid_generate_v4(),
  site_id     uuid not null references sites(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  UNIQUE (site_id, name)
);

CREATE TABLE IF NOT EXISTS site_clases (
  id          uuid primary key default uuid_generate_v4(),
  site_id     uuid not null references sites(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  UNIQUE (site_id, name)
);

CREATE TABLE IF NOT EXISTS site_categories (
  id          uuid primary key default uuid_generate_v4(),
  site_id     uuid not null references sites(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  UNIQUE (site_id, name)
);

ALTER TABLE site_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_productos_read" ON site_productos;
CREATE POLICY "site_productos_read" ON site_productos
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "site_productos_write" ON site_productos;
CREATE POLICY "site_productos_write" ON site_productos
  FOR ALL USING (current_user_role() IN ('admin', 'finance'));

DROP POLICY IF EXISTS "site_clases_read" ON site_clases;
CREATE POLICY "site_clases_read" ON site_clases
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "site_clases_write" ON site_clases;
CREATE POLICY "site_clases_write" ON site_clases
  FOR ALL USING (current_user_role() IN ('admin', 'finance'));

DROP POLICY IF EXISTS "site_categories_read" ON site_categories;
CREATE POLICY "site_categories_read" ON site_categories
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "site_categories_write" ON site_categories;
CREATE POLICY "site_categories_write" ON site_categories
  FOR ALL USING (current_user_role() IN ('admin', 'finance'));
