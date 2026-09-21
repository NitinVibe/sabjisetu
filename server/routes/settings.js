import { Router } from "express";
import { pool } from "../db.js";

export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM business_settings WHERE id = 1");
    const row = rows[0] || { name: "SabziSetu", owner: "Owner", tagline: "", currency: "₹", whatsapp_send_all_enabled: true, low_stock_threshold_kg: 50 };
    res.json({ ...row, whatsappSendAllEnabled: row.whatsapp_send_all_enabled === true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

settingsRouter.put("/whatsapp-send-all", async (req, res) => {
  const enabled = req.body?.enabled === true;
  try {
    const { rows } = await pool.query(
      `INSERT INTO business_settings (id, name, owner, tagline, currency, whatsapp_send_all_enabled, low_stock_threshold_kg)
       VALUES (1, 'SabziSetu', 'Owner', '', '₹', $1, 50)
       ON CONFLICT (id) DO UPDATE SET whatsapp_send_all_enabled = $1
       RETURNING *`,
      [enabled]
    );
    const row = rows[0];
    res.json({ ...row, whatsappSendAllEnabled: row.whatsapp_send_all_enabled === true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update WhatsApp Send to All setting" });
  }
});

settingsRouter.put("/", async (req, res) => {
  const { name, owner, tagline, currency, whatsappSendAllEnabled, lowStockThresholdKg } = req.body;
  const threshold = Number(lowStockThresholdKg);
  if (!Number.isFinite(threshold) || threshold < 0) return res.status(400).json({ error: "Low stock threshold must be a non-negative number." });
  try {
    const { rows } = await pool.query(
      `INSERT INTO business_settings (id, name, owner, tagline, currency, whatsapp_send_all_enabled, low_stock_threshold_kg)
       VALUES (1, $1, $2, $3, $4, COALESCE($5, true), COALESCE($6, 50))
       ON CONFLICT (id) DO UPDATE SET name = $1, owner = $2, tagline = $3, currency = $4, whatsapp_send_all_enabled = COALESCE($5, business_settings.whatsapp_send_all_enabled), low_stock_threshold_kg = COALESCE($6, business_settings.low_stock_threshold_kg)
       RETURNING *`,
      [name, owner, tagline, currency, whatsappSendAllEnabled, threshold]
    );
    const row = rows[0];
    res.json({ ...row, whatsappSendAllEnabled: row.whatsapp_send_all_enabled === true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});
