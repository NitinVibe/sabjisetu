import { Router } from "express";
import { pool } from "../db.js";

export const settingsRouter = Router();

const DEFAULT_THEME_COLOR = "#047857";

function normalizeThemeColor(value) {
  const color = String(value || "").trim();

  if (!color) return DEFAULT_THEME_COLOR;

  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new Error("Theme color must be a valid 6-digit hex color.");
  }

  return color.toUpperCase();
}

function formatSettings(row) {
  return {
    ...row,
    themeColor: row.theme_color || DEFAULT_THEME_COLOR,
    whatsappSendAllEnabled: row.whatsapp_send_all_enabled === true,
  };
}

settingsRouter.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM business_settings WHERE id = 1"
    );

    const row =
      rows[0] || {
        name: "SabziSetu",
        owner: "Owner",
        tagline: "",
        currency: "₹",
        theme_color: DEFAULT_THEME_COLOR,
        whatsapp_send_all_enabled: true,
        low_stock_threshold_kg: 50,
      };

    res.json(formatSettings(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

settingsRouter.put("/whatsapp-send-all", async (req, res) => {
  const enabled = req.body?.enabled === true;

  try {
    const { rows } = await pool.query(
      `INSERT INTO business_settings
        (id, name, owner, tagline, currency, theme_color,
         whatsapp_send_all_enabled, low_stock_threshold_kg)
       VALUES
        (1, 'SabziSetu', 'Owner', '', '₹', $1, $2, 50)
       ON CONFLICT (id)
       DO UPDATE SET whatsapp_send_all_enabled = $2
       RETURNING *`,
      [DEFAULT_THEME_COLOR, enabled]
    );

    res.json(formatSettings(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update WhatsApp Send to All setting",
    });
  }
});

settingsRouter.put("/", async (req, res) => {
  const {
    name,
    owner,
    tagline,
    currency,
    themeColor,
    whatsappSendAllEnabled,
    lowStockThresholdKg,
  } = req.body;

  const threshold = Number(lowStockThresholdKg);

  if (
    !Number.isFinite(threshold) ||
    threshold < 0
  ) {
    return res.status(400).json({
      error: "Low stock threshold must be a non-negative number.",
    });
  }

  let normalizedThemeColor;

  try {
    normalizedThemeColor = normalizeThemeColor(themeColor);
  } catch (err) {
    return res.status(400).json({
      error: err.message,
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO business_settings
        (
          id,
          name,
          owner,
          tagline,
          currency,
          theme_color,
          whatsapp_send_all_enabled,
          low_stock_threshold_kg
        )
       VALUES
        (
          1,
          $1,
          $2,
          $3,
          $4,
          $5,
          COALESCE($6, true),
          COALESCE($7, 50)
        )
       ON CONFLICT (id)
       DO UPDATE SET
          name = $1,
          owner = $2,
          tagline = $3,
          currency = $4,
          theme_color = $5,
          whatsapp_send_all_enabled =
            COALESCE($6, business_settings.whatsapp_send_all_enabled),
          low_stock_threshold_kg =
            COALESCE($7, business_settings.low_stock_threshold_kg)
       RETURNING *`,
      [
        name,
        owner,
        tagline,
        currency,
        normalizedThemeColor,
        whatsappSendAllEnabled,
        threshold,
      ]
    );

    res.json(formatSettings(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to save settings",
    });
  }
});