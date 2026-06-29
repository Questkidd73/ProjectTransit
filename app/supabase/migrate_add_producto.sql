-- migrate_add_producto.sql
-- Adds producto, clase, description, additional_desc dimensions to budget_line_items
-- and spending_plan_items so that rows with the same category but different
-- descriptions are stored as separate line items (not collapsed/summed).

-- ============================================================
-- budget_line_items
-- ============================================================
ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS producto        TEXT;
ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS clase           TEXT;
ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS additional_desc TEXT;

-- Drop old constraints (any name variant that may exist)
ALTER TABLE budget_line_items DROP CONSTRAINT IF EXISTS budget_line_items_program_id_year_month_category_key;
ALTER TABLE budget_line_items DROP CONSTRAINT IF EXISTS budget_line_items_unique;

-- New constraint: same category+description under same producto/clase = unique row;
-- different descriptions = separate rows
ALTER TABLE budget_line_items ADD CONSTRAINT budget_line_items_unique
  UNIQUE NULLS NOT DISTINCT (program_id, year, month, producto, clase, category, description);

-- ============================================================
-- spending_plan_items
-- ============================================================
ALTER TABLE spending_plan_items ADD COLUMN IF NOT EXISTS producto        TEXT;
ALTER TABLE spending_plan_items ADD COLUMN IF NOT EXISTS clase           TEXT;
ALTER TABLE spending_plan_items ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE spending_plan_items ADD COLUMN IF NOT EXISTS additional_desc TEXT;

ALTER TABLE spending_plan_items DROP CONSTRAINT IF EXISTS spending_plan_items_program_id_year_month_category_clase_key;
ALTER TABLE spending_plan_items DROP CONSTRAINT IF EXISTS spending_plan_items_unique;

ALTER TABLE spending_plan_items ADD CONSTRAINT spending_plan_items_unique
  UNIQUE NULLS NOT DISTINCT (program_id, year, month, producto, clase, category, description);
