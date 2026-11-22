USE pharma_inventory;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS position_title VARCHAR(100) NOT NULL DEFAULT '' AFTER full_name;
