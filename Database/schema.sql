CREATE DATABASE IF NOT EXISTS pharma_inventory
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pharma_inventory;

CREATE TABLE IF NOT EXISTS roles (
  role_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL,
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_roles_role_name (role_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles (role_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_types (
  stock_type_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (stock_type_id),
  UNIQUE KEY uq_stock_types_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  category_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  PRIMARY KEY (supplier_id),
  KEY idx_suppliers_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS items (
  item_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  stock_type_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  stock_no VARCHAR(80) NULL,
  unit_of_measure VARCHAR(50) NOT NULL,
  reorder_point INT UNSIGNED NOT NULL DEFAULT 0,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  dpri_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  other_category VARCHAR(100) NULL,
  PRIMARY KEY (item_id),
  UNIQUE KEY uq_items_stock_no (stock_no),
  KEY idx_items_stock_type (stock_type_id),
  KEY idx_items_category (category_id),
  CONSTRAINT fk_items_stock_type
    FOREIGN KEY (stock_type_id) REFERENCES stock_types (stock_type_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_items_category
    FOREIGN KEY (category_id) REFERENCES categories (category_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_card_entries (
  entry_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  recorded_by INT UNSIGNED NOT NULL,
  entry_date DATE NOT NULL,
  reference VARCHAR(100) NULL,
  movement_type VARCHAR(30) NOT NULL,
  receipt_qty INT UNSIGNED NOT NULL DEFAULT 0,
  issue_qty INT UNSIGNED NOT NULL DEFAULT 0,
  office VARCHAR(150) NULL,
  days_to_consume VARCHAR(50) NULL,
  balance_qty INT NOT NULL DEFAULT 0,
  PRIMARY KEY (entry_id),
  KEY idx_stock_card_item_date (item_id, entry_date, entry_id),
  KEY idx_stock_card_recorded_by (recorded_by),
  CONSTRAINT fk_stock_card_item
    FOREIGN KEY (item_id) REFERENCES items (item_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_card_user
    FOREIGN KEY (recorded_by) REFERENCES users (user_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS deliveries (
  entry_id INT UNSIGNED NOT NULL,
  supplier_id INT UNSIGNED NULL,
  lot_number VARCHAR(100) NULL,
  expiry_date DATE NULL,
  PRIMARY KEY (entry_id),
  KEY idx_deliveries_supplier (supplier_id),
  CONSTRAINT fk_deliveries_stock_card_entry
    FOREIGN KEY (entry_id) REFERENCES stock_card_entries (entry_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_deliveries_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS monthly_balances (
  item_id INT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  beginning_balance INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, year, month),
  CONSTRAINT fk_monthly_balances_item
    FOREIGN KEY (item_id) REFERENCES items (item_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS physical_counts (
  count_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  stock_type_id INT UNSIGNED NOT NULL,
  counted_by INT UNSIGNED NOT NULL,
  count_date DATE NOT NULL,
  accountable_officer VARCHAR(150) NULL,
  PRIMARY KEY (count_id),
  KEY idx_physical_counts_stock_type (stock_type_id),
  KEY idx_physical_counts_counted_by (counted_by),
  CONSTRAINT fk_physical_counts_stock_type
    FOREIGN KEY (stock_type_id) REFERENCES stock_types (stock_type_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_physical_counts_user
    FOREIGN KEY (counted_by) REFERENCES users (user_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS physical_count_items (
  count_item_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  count_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  balance_per_card INT UNSIGNED NOT NULL,
  on_hand_per_count INT UNSIGNED NOT NULL,
  remarks TEXT NULL,
  PRIMARY KEY (count_item_id),
  UNIQUE KEY uq_physical_count_item (count_id, item_id),
  KEY idx_physical_count_items_item (item_id),
  CONSTRAINT fk_physical_count_items_count
    FOREIGN KEY (count_id) REFERENCES physical_counts (count_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_physical_count_items_item
    FOREIGN KEY (item_id) REFERENCES items (item_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(64) NOT NULL,
  record_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  KEY idx_audit_logs_user (user_id),
  KEY idx_audit_logs_created_at (created_at),
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO roles (role_name)
VALUES ('admin'), ('pharmacist')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);
