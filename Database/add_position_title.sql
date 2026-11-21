USE pharma_inventory;

ALTER TABLE users
  ADD COLUMN position_title VARCHAR(100) NOT NULL DEFAULT '' AFTER full_name;
