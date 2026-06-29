-- deduplicate_budget_line_items.sql
-- Remove subtotal rows from budget_line_items where category = a program name
-- These are sheet subtotal rows that were incorrectly imported as line items

DELETE FROM budget_line_items
WHERE LOWER(TRIM(category)) IN (
  SELECT LOWER(TRIM(name)) FROM programs
);
