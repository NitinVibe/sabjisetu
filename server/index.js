import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { rebuildStock } from "./routes/helpers.js";
import fs from "fs/promises";

import { mandiPurchasesRouter } from "./routes/mandiPurchases.js";
import { localPurchasesRouter } from "./routes/localPurchases.js";
import { stockRouter } from "./routes/stock.js";
import { salesRouter } from "./routes/sales.js";
import { customersRouter } from "./routes/customers.js";
import { expensesRouter } from "./routes/expenses.js";
import { labourRouter } from "./routes/labour.js";
import { whatsappBillsRouter } from "./routes/whatsappBills.js";
import { notificationsRouter } from "./routes/notifications.js";
import { settingsRouter } from "./routes/settings.js";
import { reportsRouter } from "./routes/reports.js";
import { paymentsRouter } from "./routes/payments.js";
import { mastersRouter } from "./routes/masters.js";
import { authRouter, requireAuth, ensureAdminAuthTables } from "./routes/auth.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    res.status(500).json({ ok: false, db: "unreachable", error: err.message });
  }
});













app.use("/api/auth", authRouter);

// Everything below this line is protected by the admin session.
app.use(requireAuth);
app.use("/api/mandi-purchases", mandiPurchasesRouter);
app.use("/api/local-purchases", localPurchasesRouter);
app.use("/api/stock", stockRouter);
app.use("/api/sales", salesRouter);
app.use("/api/customers", customersRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/labour", labourRouter);
app.use("/api/whatsapp-bills", whatsappBillsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/masters", mastersRouter);

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Ensure schema exists by running the bundled schema.sql once.
    try {
      const schemaSql = await fs.readFile(new URL("./schema.sql", import.meta.url), "utf8");
      // Execute schema; CREATE TABLE IF NOT EXISTS statements are safe to run repeatedly.
      await pool.query(schemaSql);
      console.log('[server] Applied schema.sql');
    } catch (e) {
      console.warn('[server] Could not apply schema.sql automatically:', e.message);
    }
    // Safe runtime migration for existing databases. This keeps the app usable
    // when an older stock table exists without the new user-entered status field.
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    for (const q of [
      `ALTER TABLE mandi_purchases ALTER COLUMN date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`,
      `ALTER TABLE local_purchases ALTER COLUMN date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`,
      `ALTER TABLE sales ALTER COLUMN date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`,
      `ALTER TABLE customer_payments ALTER COLUMN date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`,
      `ALTER TABLE expenses ALTER COLUMN date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`,
      `ALTER TABLE labour ALTER COLUMN date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`,
      `ALTER TABLE whatsapp_bills ALTER COLUMN date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`,
      `ALTER TABLE stock_movements ALTER COLUMN movement_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`
    ]) { try { await pool.query(q); } catch (e) { /* tables may not exist yet; later migrations provide them */ } }
    await pool.query(`ALTER TABLE stock ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Available'`);
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT`);
    await pool.query(`ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS whatsapp_send_all_enabled BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS low_stock_threshold_kg NUMERIC(14,3) NOT NULL DEFAULT 50`);
    await pool.query(
      `ALTER TABLE business_settings
      ADD COLUMN IF NOT EXISTS theme_color TEXT NOT NULL DEFAULT '#047857'`
    );
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), text TEXT NOT NULL, time TEXT, read BOOLEAN NOT NULL DEFAULT false, action_type TEXT, action_value TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), notification_key TEXT, active BOOLEAN NOT NULL DEFAULT true, action_message TEXT)`);
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_key TEXT`);
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_message TEXT`);
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`
      DELETE FROM notifications a
      USING notifications b
      WHERE a.notification_key IS NOT NULL
        AND a.notification_key = b.notification_key
        AND (a.created_at < b.created_at OR (a.created_at = b.created_at AND a.id::text < b.id::text))
    `);
    await pool.query(`DROP INDEX IF EXISTS notifications_key_unique_idx`);
    await pool.query(`CREATE UNIQUE INDEX notifications_key_unique_idx ON notifications(notification_key) WHERE notification_key IS NOT NULL`);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT`);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_proof TEXT`);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS transaction_id TEXT`);
    await pool.query(`ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'Cash'`);
    await pool.query(`ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS payment_proof TEXT`);
    await pool.query(`ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS transaction_id TEXT`);
    await pool.query(`ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS source_sale_id UUID`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS customer_payments_source_sale_unique_idx ON customer_payments(source_sale_id) WHERE source_sale_id IS NOT NULL`);
    await pool.query(`ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'Bill'`);
    await pool.query(`ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS message TEXT`);
    await pool.query(`ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS source_payment_id UUID`);
    await pool.query(`ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS source_sale_id UUID`);
    await pool.query(`ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS payment_method TEXT`);
    await pool.query(`ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS payment_proof TEXT`);
    await pool.query(`ALTER TABLE whatsapp_bills ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Opened'`);
    await pool.query(`ALTER TABLE whatsapp_bills ALTER COLUMN status SET DEFAULT 'Opened'`);
    await pool.query(`UPDATE whatsapp_bills SET status='Opened' WHERE lower(trim(status))='sent'`);
    // Payment events are also recorded in WhatsApp Bills so all financial
    // activity has one visible timeline. Existing databases may still have the
    // older Bill/Reminder-only CHECK constraint, so replace it safely.
    await pool.query(`ALTER TABLE whatsapp_bills DROP CONSTRAINT IF EXISTS whatsapp_bills_kind_check`);
    await pool.query(`ALTER TABLE whatsapp_bills ADD CONSTRAINT whatsapp_bills_kind_check CHECK (kind IN ('Bill','Reminder','Payment'))`);
    await pool.query(`DROP INDEX IF EXISTS whatsapp_bills_source_payment_unique_idx`);
    await pool.query(`DROP INDEX IF EXISTS whatsapp_bills_source_sale_unique_idx`);
    await pool.query(`CREATE UNIQUE INDEX whatsapp_bills_source_payment_unique_idx ON whatsapp_bills(source_payment_id) WHERE source_payment_id IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX whatsapp_bills_source_sale_unique_idx ON whatsapp_bills(source_sale_id) WHERE source_sale_id IS NOT NULL`);
    await pool.query(`CREATE TABLE IF NOT EXISTS customer_payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE, date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date), amount NUMERIC(14,2) NOT NULL CHECK (amount > 0), note TEXT, payment_method TEXT NOT NULL DEFAULT 'Cash', payment_proof TEXT, source_sale_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query(`ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE CASCADE`);
    await pool.query(`ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS payment_proof TEXT`);
    await pool.query(`ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS transaction_id TEXT`);
    await pool.query(`CREATE INDEX IF NOT EXISTS customer_payments_sale_id_idx ON customer_payments(sale_id)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS item_master (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name_en TEXT NOT NULL, name_hi TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS item_master_name_unique_idx ON item_master (lower(trim(name_en)))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS item_specifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), item_id UUID NOT NULL REFERENCES item_master(id) ON DELETE CASCADE, name TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS item_spec_unique_idx ON item_specifications (item_id, lower(trim(name)))`);
    for (const q of [
      `ALTER TABLE stock ADD COLUMN IF NOT EXISTS specification TEXT`,
      `ALTER TABLE mandi_purchases ADD COLUMN IF NOT EXISTS specification TEXT`, `ALTER TABLE mandi_purchases ADD COLUMN IF NOT EXISTS quantity_value NUMERIC(14,3)`, `ALTER TABLE mandi_purchases ADD COLUMN IF NOT EXISTS quantity_unit TEXT DEFAULT 'Kg'`,
      `ALTER TABLE local_purchases ADD COLUMN IF NOT EXISTS specification TEXT`, `ALTER TABLE local_purchases ADD COLUMN IF NOT EXISTS quantity_value NUMERIC(14,3)`, `ALTER TABLE local_purchases ADD COLUMN IF NOT EXISTS quantity_unit TEXT DEFAULT 'Kg'`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS specification TEXT`, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS quantity_value NUMERIC(14,3)`, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS quantity_unit TEXT DEFAULT 'Kg'`,
    ]) await pool.query(q);
    await pool.query(`CREATE TABLE IF NOT EXISTS stock_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item TEXT NOT NULL,
      specification TEXT,
      qty_change NUMERIC(14,3) NOT NULL,
      unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
      source_type TEXT NOT NULL CHECK (source_type IN ('purchase','sale','manual','opening')),
      source_id UUID,
      movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await pool.query(`ALTER TABLE stock_movements ALTER COLUMN movement_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS stock_movements_item_idx ON stock_movements (lower(trim(item)), lower(trim(coalesce(specification,''))), movement_date, created_at)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_source_unique_idx ON stock_movements (source_type, source_id) WHERE source_id IS NOT NULL AND source_type IN ('purchase','sale')`);
    // Backfill the ledger for existing data exactly once per transaction. The
    // opening movement preserves any pre-ledger/manual balance so migration does
    // not change today's stock. Future creates/deletes then have an auditable
    // movement to reverse.
    await pool.query(`
      INSERT INTO stock_movements(item,specification,qty_change,unit_cost,source_type,source_id,movement_date,created_at)
      SELECT item,specification,qty,rate,'purchase',id,date,created_at FROM mandi_purchases
      ON CONFLICT (source_type,source_id) WHERE source_id IS NOT NULL AND source_type IN ('purchase','sale') DO NOTHING
    `);
    await pool.query(`
      INSERT INTO stock_movements(item,specification,qty_change,unit_cost,source_type,source_id,movement_date,created_at)
      SELECT item,specification,qty,rate,'purchase',id,date,created_at FROM local_purchases
      ON CONFLICT (source_type,source_id) WHERE source_id IS NOT NULL AND source_type IN ('purchase','sale') DO NOTHING
    `);
    await pool.query(`
      INSERT INTO stock_movements(item,specification,qty_change,unit_cost,source_type,source_id,movement_date,created_at)
      SELECT item,specification,-qty,CASE WHEN qty=0 THEN 0 ELSE cogs/qty END,'sale',id,date,created_at FROM sales
      ON CONFLICT (source_type,source_id) WHERE source_id IS NOT NULL AND source_type IN ('purchase','sale') DO NOTHING
    `);
    await pool.query(`
      INSERT INTO stock_movements(item,specification,qty_change,unit_cost,source_type,source_id,movement_date,created_at)
      SELECT s.item,s.specification,
             GREATEST(0, s.qty - COALESCE(p.purchased_qty,0) + COALESCE(sa.sold_qty,0)),
             CASE
               WHEN GREATEST(0, s.qty - COALESCE(p.purchased_qty,0) + COALESCE(sa.sold_qty,0)) > 0
               THEN GREATEST(0, (s.avg_cost * (GREATEST(0, s.qty - COALESCE(p.purchased_qty,0) + COALESCE(sa.sold_qty,0)) + COALESCE(p.purchased_qty,0)) - COALESCE(p.purchase_cost,0)))
                    / GREATEST(0, s.qty - COALESCE(p.purchased_qty,0) + COALESCE(sa.sold_qty,0))
               ELSE 0
             END,
             'opening',NULL,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,now()
      FROM stock s
      LEFT JOIN (
        SELECT item,specification,SUM(qty) purchased_qty,SUM(qty*rate) purchase_cost
        FROM (SELECT item,specification,qty,rate FROM mandi_purchases UNION ALL SELECT item,specification,qty,rate FROM local_purchases) q
        GROUP BY item,specification
      ) p ON lower(trim(p.item))=lower(trim(s.item)) AND lower(trim(coalesce(p.specification,'')))=lower(trim(coalesce(s.specification,'')))
      LEFT JOIN (
        SELECT item,specification,SUM(qty) sold_qty FROM sales GROUP BY item,specification
      ) sa ON lower(trim(sa.item))=lower(trim(s.item)) AND lower(trim(coalesce(sa.specification,'')))=lower(trim(coalesce(s.specification,'')))
      WHERE NOT EXISTS (
        SELECT 1 FROM stock_movements m
        WHERE m.source_type='opening'
          AND lower(trim(m.item))=lower(trim(s.item))
          AND lower(trim(coalesce(m.specification,'')))=lower(trim(coalesce(s.specification,'')))
      )
    `);
    await pool.query(`CREATE TABLE IF NOT EXISTS unit_master (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, symbol TEXT NOT NULL, kg_multiplier NUMERIC(14,6) NOT NULL CHECK (kg_multiplier > 0), active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS unit_master_name_unique_idx ON unit_master (lower(trim(name)))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS vendor_master (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, vendor_type TEXT NOT NULL DEFAULT 'Both' CHECK (vendor_type IN ('Mandi','Local','Both')), active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS vendor_master_name_unique_idx ON vendor_master (lower(trim(name)))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS expense_category_master (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS expense_category_master_name_unique_idx ON expense_category_master (lower(trim(name)))`);
    // Reconcile every cached stock row from the ledger once the migration/backfill
    // is complete. This removes old zero-quantity rows and corrects stale average
    // costs without changing the underlying purchase/sale history.
    const inventoryKeys = await pool.query(`
      SELECT DISTINCT item, specification FROM stock
      UNION SELECT DISTINCT item, specification FROM mandi_purchases
      UNION SELECT DISTINCT item, specification FROM local_purchases
      UNION SELECT DISTINCT item, specification FROM sales
      UNION SELECT DISTINCT item, specification FROM stock_movements
    `);
    for (const r of inventoryKeys.rows) await rebuildStock(pool, r.item, r.specification);

    // Database-level safety net: any vegetable written to a transaction table is
    // automatically registered in Item Master. This is independent of frontend/backend code paths.
    await pool.query(`
      CREATE OR REPLACE FUNCTION sabzisetu_sync_item_master()
      RETURNS TRIGGER AS $$
      DECLARE v_item_id UUID;
      BEGIN
        IF trim(coalesce(NEW.item, '')) = '' THEN RETURN NEW; END IF;
        INSERT INTO item_master(name_en, name_hi, active)
        VALUES (trim(NEW.item), '', true)
        ON CONFLICT ((lower(trim(name_en)))) DO NOTHING;
        SELECT id INTO v_item_id FROM item_master WHERE lower(trim(name_en))=lower(trim(NEW.item));
        IF trim(coalesce(NEW.specification, '')) <> '' THEN
          INSERT INTO item_specifications(item_id, name, active)
          VALUES (v_item_id, trim(NEW.specification), true)
          ON CONFLICT DO NOTHING;
          UPDATE item_specifications s
          SET active=true
          WHERE s.item_id=v_item_id
            AND lower(trim(s.name))=lower(trim(NEW.specification));
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    for (const table of ['stock','mandi_purchases','local_purchases','sales']) {
      const trigger = `sabzisetu_${table}_master_sync`;
      await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON ${table}`);
      await pool.query(`CREATE TRIGGER ${trigger} AFTER INSERT OR UPDATE OF item, specification ON ${table} FOR EACH ROW EXECUTE FUNCTION sabzisetu_sync_item_master()`);
    }
    await pool.query(`DROP INDEX IF EXISTS stock_item_unique_idx`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS stock_item_spec_unique_idx ON stock (lower(trim(item)), lower(trim(coalesce(specification,''))))`);
    await pool.query(`INSERT INTO unit_master(name,symbol,kg_multiplier) VALUES ('Kilogram','Kg',1),('Quintal','Quintal',100),('Bag','Bag',50),('Carat','Carat',25) ON CONFLICT DO NOTHING`);
    await pool.query(`INSERT INTO expense_category_master(name) VALUES ('Transport'),('Loading / Unloading'),('Market Charges'),('Electricity'),('Other') ON CONFLICT DO NOTHING`);
    await pool.query(`INSERT INTO item_master(name_en) SELECT DISTINCT trim(item) FROM (SELECT item FROM stock UNION SELECT item FROM mandi_purchases UNION SELECT item FROM local_purchases UNION SELECT item FROM sales) x WHERE trim(item)<>'' ON CONFLICT ((lower(trim(name_en)))) DO NOTHING`);
    await pool.query(`INSERT INTO item_specifications(item_id,name) SELECT im.id, trim(x.specification) FROM item_master im JOIN (SELECT DISTINCT item,specification FROM stock UNION SELECT DISTINCT item,specification FROM mandi_purchases UNION SELECT DISTINCT item,specification FROM local_purchases UNION SELECT DISTINCT item,specification FROM sales) x ON lower(trim(x.item))=lower(trim(im.name_en)) WHERE trim(coalesce(x.specification,''))<>'' ON CONFLICT DO NOTHING`);
    await ensureAdminAuthTables();

    app.listen(PORT, () => {
      console.log(`[server] SabziSetu API running on http://localhost:${PORT}`);
      console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[server] Database migration failed:', err.message);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;