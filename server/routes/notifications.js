import { Router } from "express";
import { pool } from "../db.js";
import { todayIST } from "./helpers.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const today = todayIST();
    const { rows: settingsRows } = await client.query(
      "SELECT name, low_stock_threshold_kg FROM business_settings WHERE id=1"
    );
    const businessName = settingsRows[0]?.name || "SabziSetu";
    const lowStockThreshold = Number(settingsRows[0]?.low_stock_threshold_kg ?? 50);
    const activeKeys = [];

    const { rows: dueRows } = await client.query(`
      SELECT c.id,c.name,c.phone,
        GREATEST(0,
          COALESCE((SELECT SUM(s.amount) FROM sales s
            WHERE lower(trim(s.customer))=lower(trim(c.name)) AND s.status='Due'),0)
          - COALESCE((SELECT SUM(cp.amount) FROM customer_payments cp
            WHERE cp.customer_id=c.id AND cp.source_sale_id IS NULL),0)
        ) AS due,
        (SELECT MIN(s.date) FROM sales s
          WHERE lower(trim(s.customer))=lower(trim(c.name)) AND s.status='Due') AS due_date
      FROM customers c
    `);

    for (const r of dueRows) {
      const due = Number(r.due || 0);
      const dueDate = r.due_date ? String(r.due_date).slice(0, 10) : null;
      if (due <= 0 || !dueDate || dueDate > today) continue;

      const overdue = dueDate < today;
      const amountText = due.toLocaleString("en-IN", { maximumFractionDigits: 0 });
      const text = overdue
        ? `${r.name} has an overdue payment of ₹${amountText}.`
        : `${r.name} has a payment of ₹${amountText} due today.`;
      const message = `Hello ${r.name}, your outstanding amount with ${businessName} is ₹${amountText}. Please make the payment at your earliest convenience. Thank you.`;
      const key = `due:${r.id}:${dueDate}:${due.toFixed(2)}`;
      activeKeys.push(key);

      // Do not depend on a UNIQUE index for notification upserts. Older databases
      // may not have the partial unique index yet; UPDATE-then-INSERT keeps the
      // application working while the startup migration repairs the index.
      const updated = await client.query(`
        UPDATE notifications
        SET text=$1, time=$2, action_type='whatsapp', action_value=$3,
            action_message=$4, active=true,
            read=CASE WHEN active=false THEN false ELSE read END
        WHERE notification_key=$5
        RETURNING id
      `, [text, overdue ? "Overdue" : "Due today", r.phone || "", message, key]);
      if (!updated.rowCount) {
        await client.query(`
          INSERT INTO notifications
            (text,time,read,action_type,action_value,action_message,created_at,notification_key,active)
          VALUES ($1,$2,false,'whatsapp',$3,$4,now(),$5,true)
        `, [text, overdue ? "Overdue" : "Due today", r.phone || "", message, key]);
      }
    }

    const { rows: stockRows } = await client.query(
      `SELECT id,item,qty FROM stock WHERE qty <= $1 ORDER BY item`,
      [lowStockThreshold]
    );
    for (const r of stockRows) {
      const key = `stock:${r.id}`;
      activeKeys.push(key);
      const text = `Stock of ${r.item} is low (${Number(r.qty || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 })} Kg left).`;
      const updated = await client.query(`
        UPDATE notifications
        SET text=$1, time='Stock alert', action_type='stock', action_value=$2,
            active=true, read=CASE WHEN active=false THEN false ELSE read END
        WHERE notification_key=$3
        RETURNING id
      `, [text, r.item, key]);
      if (!updated.rowCount) {
        await client.query(`
          INSERT INTO notifications
            (text,time,read,action_type,action_value,action_message,created_at,notification_key,active)
          VALUES ($1,'Stock alert',false,'stock',$2,NULL,now(),$3,true)
        `, [text, r.item, key]);
      }
    }

    // Alerts that are no longer true remain in history, but are resolved/read.
    await client.query(`
      UPDATE notifications
      SET active=false, read=true
      WHERE notification_key IS NOT NULL
        AND active=true
        AND (notification_key LIKE 'due:%' OR notification_key LIKE 'stock:%')
        AND NOT (notification_key = ANY($1::text[]))
    `, [activeKeys]);

    const { rows } = await client.query(`
      SELECT id,text,time,read,action_type,action_value,action_message,created_at,notification_key,active
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 100
    `);
    await client.query("COMMIT");
    res.json(rows);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "Failed to load notifications" });
  } finally {
    client.release();
  }
});

notificationsRouter.patch("/mark-all-read", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE notifications SET read=true WHERE read=false RETURNING id"
    );
    res.json({ updated: rows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

notificationsRouter.patch("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE notifications SET read=$1 WHERE id=$2 RETURNING *",
      [Boolean(req.body.read), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Notification not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Failed to update notification" });
  }
});
