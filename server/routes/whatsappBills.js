import { Router } from "express";
import { createCrudRouter } from "./crud.js";
import { pool } from "../db.js";
import { toNum, recordWhatsAppEvent, todayIST } from "./helpers.js";

const router = createCrudRouter({
  table: "whatsapp_bills",
  columns: ["customer", "phone", "amount", "date", "status", "kind", "message"],
  orderBy: "date DESC, created_at DESC",
  mapOut: (row) => toNum(row, ["amount"]),
});

// Log a WhatsApp reminder opening. This is deliberately separate from actual
// bill sending: the browser only opens WhatsApp with a pre-filled message.
router.post("/reminder-opened", async (req, res) => {
  try {
    const customer = String(req.body.customer || "").trim();
    const phone = String(req.body.phone || "").trim();
    const amount = Number(req.body.amount);
    const message = String(req.body.message || "").trim();
    if (!customer || !phone || !Number.isFinite(amount) || amount < 0 || !message) {
      return res.status(400).json({ error: "Invalid WhatsApp reminder log" });
    }
    const row = await recordWhatsAppEvent(pool, { customer, phone, amount, kind: "Reminder", status: "Opened", message, date: todayIST() });
    res.status(201).json(toNum(row, ["amount"]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to log WhatsApp reminder" });
  }
});

// Payment events are shown in WhatsApp Bills as a separate type. They are not
// messages sent by WhatsApp; they are an audit entry that keeps the business
// timeline synchronized across Payments & Due, Sales and WhatsApp Bills.
router.post("/payment-recorded", async (req, res) => {
  try {
    const customer = String(req.body.customer || "").trim();
    const phone = String(req.body.phone || "").trim();
    const amount = Number(req.body.amount);
    const message = String(req.body.message || "").trim();
    const date = String(req.body.date || todayIST()).slice(0, 10);
    if (!customer || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid payment event" });
    }
    const row = await recordWhatsAppEvent(pool, { customer, phone, amount, kind: "Payment", status: "Recorded", message, date });
    res.status(201).json(toNum(row, ["amount"]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record payment event" });
  }
});

export const whatsappBillsRouter = router;
