import { Router } from "express";
import { pool } from "../db.js";
import { todayIST, toNum, recordWhatsAppEvent } from "./helpers.js";

export const paymentsRouter = Router();
const PAYMENT_METHODS = new Set(["Cash", "UPI", "Bank"]);
const normalizeMethod = (value) => PAYMENT_METHODS.has(value) ? value : "Cash";

async function syncCustomer(client, customerId) {
  const summary = await client.query(`
    SELECT
      GREATEST(0,
        COALESCE((SELECT SUM(amount) FROM sales WHERE lower(trim(customer))=lower(trim(c.name)) AND status='Due'),0)
        - COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id=c.id AND source_sale_id IS NULL),0)
      ) AS due,
      (SELECT MIN(date) FROM sales WHERE lower(trim(customer))=lower(trim(c.name)) AND status='Due') AS due_date
    FROM customers c WHERE c.id=$1`, [customerId]);
  if (!summary.rows.length) throw new Error("Customer not found.");
  const due = Number(summary.rows[0].due || 0);
  const dueDate = summary.rows[0].due_date ? String(summary.rows[0].due_date).slice(0,10) : null;
  const today = todayIST();
  const status = due <= 0 ? "Upcoming" : dueDate < today ? "Overdue" : dueDate === today ? "Due Today" : "Upcoming";
  await client.query("UPDATE customers SET due=$1,due_date=$2,status=$3 WHERE id=$4", [due, dueDate, status, customerId]);
  return { due, dueDate, status };
}

paymentsRouter.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, c.name AS customer,
             s.item AS sale_item, s.specification AS sale_specification,
             s.date AS sale_date, s.amount AS sale_amount, s.status AS sale_status
      FROM customer_payments p
      JOIN customers c ON c.id=p.customer_id
      LEFT JOIN sales s ON s.id=COALESCE(p.sale_id,p.source_sale_id)
      ORDER BY p.date DESC, p.created_at DESC
    `);
    res.json(rows.map(r => toNum(r, ["amount","sale_amount"])));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load payments" });
  }
});

paymentsRouter.post("/", async (req, res) => {
  const customerId = req.body.customerId;
  const saleId = req.body.saleId || null;
  const date = req.body.date || null;
  const amount = Number(req.body.amount);
  const note = String(req.body.note || "").trim();
  const paymentMethod = normalizeMethod(req.body.paymentMethod);
  const paymentProof = req.body.paymentProof ? String(req.body.paymentProof) : null;
  const transactionId = req.body.transactionId ? String(req.body.transactionId).trim() : null;

  if (!customerId || !date || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid payment" });
  }
  if (paymentProof && !paymentProof.startsWith("data:image/")) return res.status(400).json({ error: "Payment proof must be an image." });
  if (paymentProof && paymentProof.length > 6 * 1024 * 1024) return res.status(400).json({ error: "Payment proof is too large. Please use a smaller screenshot." });
  if (paymentMethod !== "UPI" && paymentProof) return res.status(400).json({ error: "Payment screenshot can only be attached to a UPI payment." });
  if (paymentMethod === "Bank" && !transactionId) return res.status(400).json({ error: "Transaction ID is required for Bank payments." });
  if (paymentMethod !== "Bank" && transactionId) return res.status(400).json({ error: "Transaction ID can only be saved for Bank payments." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const customer = await client.query("SELECT * FROM customers WHERE id=$1 FOR UPDATE", [customerId]);
    if (!customer.rows.length) throw new Error("Customer not found.");

    if (saleId) {
      const saleResult = await client.query(
        "SELECT * FROM sales WHERE id=$1 AND lower(trim(customer))=lower(trim($2)) FOR UPDATE",
        [saleId, customer.rows[0].name]
      );
      if (!saleResult.rows.length) throw new Error("Selected sale was not found for this customer.");
      const sale = saleResult.rows[0];
      if (sale.status !== "Due") throw new Error("This sale is already paid.");

      const paidResult = await client.query(
        "SELECT COALESCE(SUM(amount),0) AS paid FROM customer_payments WHERE sale_id=$1 AND source_sale_id IS NULL",
        [saleId]
      );
      const paid = Number(paidResult.rows[0]?.paid || 0);
      const remaining = Math.max(0, Number(sale.amount || 0) - paid);
      if (amount > remaining + 0.005) throw new Error(`Payment exceeds this sale's remaining due of ₹${remaining.toLocaleString('en-IN')}`);
      const customerDueResult = await client.query(`
        SELECT GREATEST(0,
          COALESCE((SELECT SUM(amount) FROM sales WHERE lower(trim(customer))=lower(trim(c.name)) AND status='Due'),0)
          - COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id=c.id AND source_sale_id IS NULL),0)
        ) AS due FROM customers c WHERE c.id=$1`, [customerId]);
      const customerDue = Number(customerDueResult.rows[0]?.due || 0);
      if (amount > customerDue + 0.005) throw new Error(`Payment exceeds current customer due of ₹${customerDue.toLocaleString('en-IN')}`);

      const { rows } = await client.query(
        `INSERT INTO customer_payments(customer_id,date,amount,note,payment_method,payment_proof,transaction_id,sale_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [customerId, date, amount, note || `Payment for ${sale.item}${sale.specification ? ` (${sale.specification})` : ""}`, paymentMethod, paymentProof, transactionId, saleId]
      );

      const newPaid = paid + amount;
      const fullyPaid = newPaid >= Number(sale.amount || 0) - 0.005;
      if (fullyPaid) {
        await client.query(
          "UPDATE sales SET status='Paid',payment_method=$1,payment_proof=$2,transaction_id=$3 WHERE id=$4",
          [paymentMethod, paymentProof, transactionId, saleId]
        );
      }

      const customerPhone = customer.rows[0].phone || "";
      const paymentMessage = `Payment of ₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} received from ${customer.rows[0].name} for ${sale.item}${sale.specification ? ` (${sale.specification})` : ""} via ${paymentMethod}.`;
      await recordWhatsAppEvent(client, {
        customer: customer.rows[0].name, phone: customerPhone, amount,
        kind: "Payment", status: "Recorded", message: paymentMessage, date,
        sourceSaleId: fullyPaid ? saleId : null, paymentMethod, paymentProof
      });

      await syncCustomer(client, customerId);
      await client.query("COMMIT");
      return res.status(201).json(toNum({ ...rows[0], sale_item: sale.item, sale_specification: sale.specification, sale_amount: sale.amount, sale_status: fullyPaid ? "Paid" : "Due" }, ["amount","sale_amount"]));
    }

    const dueResult = await client.query(`
      SELECT GREATEST(0,
        COALESCE((SELECT SUM(amount) FROM sales WHERE lower(trim(customer))=lower(trim(c.name)) AND status='Due'),0)
        - COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id=c.id AND source_sale_id IS NULL),0)
      ) AS due FROM customers c WHERE c.id=$1`, [customerId]);
    const currentDue = Number(dueResult.rows[0]?.due || 0);
    if (amount > currentDue + 0.005) throw new Error(`Payment exceeds current due of ₹${currentDue.toLocaleString('en-IN')}`);

    const { rows } = await client.query(
      `INSERT INTO customer_payments(customer_id,date,amount,note,payment_method,payment_proof,transaction_id)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [customerId, date, amount, note, paymentMethod, paymentProof, transactionId]
    );

    const customerName = customer.rows[0].name;
    const customerPhone = customer.rows[0].phone || "";
    const paymentMessage = `Payment of ₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} received from ${customerName} via ${paymentMethod}.`;
    await recordWhatsAppEvent(client, {
      customer: customerName, phone: customerPhone, amount,
      kind: "Payment", status: "Recorded", message: paymentMessage, date,
      sourcePaymentId: rows[0].id, paymentMethod, paymentProof
    });

    await syncCustomer(client, customerId);
    await client.query("COMMIT");
    res.status(201).json(toNum(rows[0], ["amount"]));
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(400).json({ error: e.message });
  } finally { client.release(); }
});

paymentsRouter.delete("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT * FROM customer_payments WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!found.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Payment not found" }); }
    const payment = found.rows[0];
    if (payment.source_sale_id) throw new Error("This payment belongs to a Paid sale. Change the sale back to Due instead of deleting the payment directly.");

    let sale = null;
    if (payment.sale_id) {
      const saleResult = await client.query("SELECT * FROM sales WHERE id=$1 FOR UPDATE", [payment.sale_id]);
      sale = saleResult.rows[0] || null;
    }
    await client.query("UPDATE whatsapp_bills SET status='Reversed' WHERE source_payment_id=$1 AND kind='Payment'", [payment.id]);
    await client.query("DELETE FROM customer_payments WHERE id=$1", [payment.id]);

    if (sale) {
      const remainingResult = await client.query(
        "SELECT COALESCE(SUM(amount),0) AS paid FROM customer_payments WHERE sale_id=$1 AND source_sale_id IS NULL",
        [sale.id]
      );
      const paidAfterDelete = Number(remainingResult.rows[0]?.paid || 0);
      if (paidAfterDelete >= Number(sale.amount || 0) - 0.005) {
        const latest = await client.query(
          "SELECT payment_method,payment_proof,transaction_id FROM customer_payments WHERE sale_id=$1 AND source_sale_id IS NULL ORDER BY date DESC,created_at DESC LIMIT 1",
          [sale.id]
        );
        const latestPayment = latest.rows[0];
        await client.query(
          "UPDATE sales SET status='Paid',payment_method=$1,payment_proof=$2,transaction_id=$3 WHERE id=$4",
          [latestPayment?.payment_method || sale.payment_method || "Cash", latestPayment?.payment_proof || sale.payment_proof || null, latestPayment?.transaction_id || sale.transaction_id || null, sale.id]
        );
      } else {
        await client.query("UPDATE sales SET status='Due',payment_method=NULL,payment_proof=NULL,transaction_id=NULL WHERE id=$1", [sale.id]);
      }
    }
    await syncCustomer(client, payment.customer_id);
    await client.query("COMMIT");
    res.status(204).end();
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(400).json({ error: "Failed to delete payment: " + e.message });
  } finally { client.release(); }
});
