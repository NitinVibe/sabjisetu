-- SabziSetu production schema
-- Run once against PostgreSQL. This schema intentionally contains no demo/seed transactions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS business_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'SabziSetu',
  owner TEXT NOT NULL DEFAULT 'Owner',
  tagline TEXT NOT NULL DEFAULT 'Smart Trading, Higher Earning',
  currency TEXT NOT NULL DEFAULT '₹',
  whatsapp_send_all_enabled BOOLEAN NOT NULL DEFAULT true,
  low_stock_threshold_kg NUMERIC(14,3) NOT NULL DEFAULT 50 CHECK (low_stock_threshold_kg >= 0),
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (qty >= 0),
  avg_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (avg_cost >= 0),
  selling_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  status TEXT NOT NULL DEFAULT 'Available',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_item_unique_idx ON stock (lower(trim(item)));

CREATE TABLE IF NOT EXISTS mandi_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date),
  vendor TEXT NOT NULL,
  item TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL CHECK (qty > 0),
  rate NUMERIC(14,2) NOT NULL CHECK (rate >= 0),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS local_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date),
  vendor TEXT NOT NULL,
  item TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL CHECK (qty > 0),
  rate NUMERIC(14,2) NOT NULL CHECK (rate >= 0),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  due NUMERIC(14,2) NOT NULL DEFAULT 0,
  business NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_name_unique_idx ON customers (lower(trim(name)));

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date),
  customer TEXT NOT NULL,
  item TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL CHECK (qty > 0),
  rate NUMERIC(14,2) NOT NULL CHECK (rate >= 0),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'Due' CHECK (status IN ('Due','Paid')),
  payment_method TEXT CHECK (payment_method IN ('Cash','UPI','Bank')),
  payment_proof TEXT,
  transaction_id TEXT,
  cogs NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cogs >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash','UPI','Bank')),
  payment_proof TEXT,
  transaction_id TEXT,
  source_sale_id UUID UNIQUE REFERENCES sales(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date),
  category TEXT NOT NULL,
  note TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date),
  name TEXT NOT NULL,
  work_type TEXT NOT NULL,
  workers INT NOT NULL DEFAULT 1 CHECK (workers > 0),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer TEXT NOT NULL,
  phone TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date),
  status TEXT NOT NULL DEFAULT 'Opened',
  kind TEXT NOT NULL DEFAULT 'Bill' CHECK (kind IN ('Bill','Reminder','Payment')),
  message TEXT,
  source_payment_id UUID,
  source_sale_id UUID,
  payment_method TEXT,
  payment_proof TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  time TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  action_type TEXT,
  action_value TEXT,
  action_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notification_key TEXT,
  active BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_key_unique_idx ON notifications(notification_key) WHERE notification_key IS NOT NULL;

INSERT INTO business_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Safe upgrades for databases created with the previous demo schema.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cogs NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_proof TEXT;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'Cash';
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS payment_proof TEXT;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS source_sale_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS customer_payments_source_sale_unique_idx ON customer_payments(source_sale_id) WHERE source_sale_id IS NOT NULL;
ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'Bill';
ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS source_payment_id UUID;
ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS source_sale_id UUID;
ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS payment_proof TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_bills_source_payment_unique_idx ON whatsapp_bills(source_payment_id) WHERE source_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_bills_source_sale_unique_idx ON whatsapp_bills(source_sale_id) WHERE source_sale_id IS NOT NULL;
ALTER TABLE whatsapp_bills DROP CONSTRAINT IF EXISTS whatsapp_bills_kind_check;
ALTER TABLE whatsapp_bills ADD CONSTRAINT whatsapp_bills_kind_check CHECK (kind IN ('Bill','Reminder','Payment'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_value TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_key TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_key_unique_idx ON notifications(notification_key) WHERE notification_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stock_item_unique_idx ON stock (lower(trim(item)));
CREATE UNIQUE INDEX IF NOT EXISTS customers_name_unique_idx ON customers (lower(trim(name)));

-- Safe upgrade for customer contact numbers.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Available';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS whatsapp_send_all_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS low_stock_threshold_kg NUMERIC(14,3) NOT NULL DEFAULT 50;


-- Master data used by the UI. Masters keep item names, specifications, units,
-- vendors and expense categories consistent instead of relying on hardcoded values.
CREATE TABLE IF NOT EXISTS item_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_hi TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS item_master_name_unique_idx ON item_master (lower(trim(name_en)));

CREATE TABLE IF NOT EXISTS item_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES item_master(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS item_spec_unique_idx ON item_specifications (item_id, lower(trim(name)));

CREATE TABLE IF NOT EXISTS unit_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  kg_multiplier NUMERIC(14,6) NOT NULL CHECK (kg_multiplier > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS unit_master_name_unique_idx ON unit_master (lower(trim(name)));

CREATE TABLE IF NOT EXISTS vendor_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vendor_type TEXT NOT NULL DEFAULT 'Both' CHECK (vendor_type IN ('Mandi','Local','Both')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vendor_master_name_unique_idx ON vendor_master (lower(trim(name)));

CREATE TABLE IF NOT EXISTS expense_category_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS expense_category_master_name_unique_idx ON expense_category_master (lower(trim(name)));

-- Optional specification + original quantity unit/value. qty remains the
-- normalized kilogram quantity used for all stock calculations.
ALTER TABLE stock ADD COLUMN IF NOT EXISTS specification TEXT;
ALTER TABLE mandi_purchases ADD COLUMN IF NOT EXISTS specification TEXT;
ALTER TABLE mandi_purchases ADD COLUMN IF NOT EXISTS quantity_value NUMERIC(14,3);
ALTER TABLE mandi_purchases ADD COLUMN IF NOT EXISTS quantity_unit TEXT DEFAULT 'Kg';
ALTER TABLE local_purchases ADD COLUMN IF NOT EXISTS specification TEXT;
ALTER TABLE local_purchases ADD COLUMN IF NOT EXISTS quantity_value NUMERIC(14,3);
ALTER TABLE local_purchases ADD COLUMN IF NOT EXISTS quantity_unit TEXT DEFAULT 'Kg';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS specification TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS quantity_value NUMERIC(14,3);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS quantity_unit TEXT DEFAULT 'Kg';

DROP INDEX IF EXISTS stock_item_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS stock_item_spec_unique_idx
  ON stock (lower(trim(item)), lower(trim(coalesce(specification,''))));


-- Inventory ledger. Stock is a cached/current balance; every purchase, sale,
-- and manual opening/adjustment is represented here so deletes can reverse the
-- exact transaction instead of leaving stale stock rows or stale average cost.
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT NOT NULL,
  specification TEXT,
  qty_change NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL CHECK (source_type IN ('purchase','sale','manual','opening')),
  source_id UUID,
  movement_date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movements_item_idx
  ON stock_movements (lower(trim(item)), lower(trim(coalesce(specification,''))), movement_date, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_source_unique_idx
  ON stock_movements (source_type, source_id)
  WHERE source_id IS NOT NULL AND source_type IN ('purchase','sale');

-- Safe defaults. Existing databases get these only if they do not already exist.
INSERT INTO unit_master(name,symbol,kg_multiplier) VALUES
  ('Kilogram','Kg',1),
  ('Quintal','Quintal',100),
  ('Bag','Bag',50),
  ('Carat','Carat',25)
ON CONFLICT DO NOTHING;

INSERT INTO expense_category_master(name) VALUES
  ('Transport'),('Loading / Unloading'),('Market Charges'),('Electricity'),('Other')
ON CONFLICT DO NOTHING;
