import { Router } from "express";
import { pool } from "../db.js";
import { toNum, todayIST, ensureItemMaster, rebuildStock, assertNonNegativeStock, recordWhatsAppEvent } from "./helpers.js";

export const salesRouter = Router();
const mapOut = (row) => { const r=toNum(row,["qty","rate","amount","cogs","quantity_value"]); return {...r, specification:r.specification||"", quantityUnit:r.quantity_unit||"Kg", quantityValue:r.quantity_value ?? r.qty}; };

salesRouter.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM sales ORDER BY date DESC, created_at DESC");
    res.json(rows.map(mapOut));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sales" });
  }
});

salesRouter.post("/", async (req, res) => {
  // Supports both the legacy single-line payload and a multi-line sale.
  const lines = Array.isArray(req.body.items) ? req.body.items : [req.body];
  const date = req.body.date || null;
  const customer = String(req.body.customer || "").trim();
  const status = req.body.status === "Paid" ? "Paid" : "Due";
  const phone = String(req.body.phone || "").trim();
  const paymentMethod = ["Cash","UPI","Bank"].includes(req.body.paymentMethod) ? req.body.paymentMethod : (status === "Paid" ? "Cash" : null);
  const paymentProof = req.body.paymentProof ? String(req.body.paymentProof) : null;
  const transactionId = req.body.transactionId ? String(req.body.transactionId).trim() : null;

  if (!date || !customer || !lines.length) return res.status(400).json({ error: "Date, customer and at least one sale item are required" });
  for (const line of lines) {
    const item = String(line.item || "").trim();
    const quantityValue = Number(line.quantityValue ?? line.qty);
    const rate = Number(line.rate);
    if (!item || !Number.isFinite(quantityValue) || quantityValue <= 0 || !Number.isFinite(rate) || rate < 0) {
      return res.status(400).json({ error: "Each sale item needs a valid item, quantity and rate" });
    }
  }
  if (paymentProof && !paymentProof.startsWith("data:image/")) return res.status(400).json({ error: "Payment proof must be an image." });
  if (paymentProof && paymentProof.length > 6 * 1024 * 1024) return res.status(400).json({ error: "Payment proof is too large. Please use a smaller screenshot." });
  if (status !== "Paid" && (paymentMethod || paymentProof)) return res.status(400).json({ error: "Payment method/proof can only be saved for a paid sale." });
  if (paymentProof && paymentMethod !== "UPI") return res.status(400).json({ error: "Payment screenshot can only be attached to a UPI payment." });
  if (status === "Paid" && paymentMethod === "Bank" && !transactionId) return res.status(400).json({ error: "Transaction ID is required for Bank payments." });
  if (transactionId && paymentMethod !== "Bank") return res.status(400).json({ error: "Transaction ID can only be saved for a Bank payment." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created = [];
    const touched = new Map();

    for (const line of lines) {
      const item = String(line.item || "").trim();
      const specification = String(line.specification || "").trim() || null;
      const quantityValue = Number(line.quantityValue ?? line.qty);
      const quantityUnit = String(line.quantityUnit || "Kg").trim();
      const rate = Number(line.rate);
      await ensureItemMaster(client, item, specification);
      const unit = await client.query("SELECT kg_multiplier FROM unit_master WHERE lower(trim(name))=lower(trim($1)) OR lower(trim(symbol))=lower(trim($1)) LIMIT 1", [quantityUnit]);
      if (!unit.rows.length) throw new Error(`Unknown quantity unit: ${quantityUnit}. Add it in Master Settings.`);
      const qty = Number((quantityValue * Number(unit.rows[0].kg_multiplier)).toFixed(3));
      const amount = Number((qty * rate).toFixed(2));

      const stock = await client.query(
        "SELECT * FROM stock WHERE lower(trim(item))=lower(trim($1)) AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,''))) FOR UPDATE",
        [item, specification]
      );
      if (!stock.rows.length) throw new Error(`No stock exists for ${item}${specification ? ` (${specification})` : ""}. Add a purchase/opening stock first.`);
      const available = Number(stock.rows[0].qty);
      if (available < qty) throw new Error(`Insufficient ${item}${specification ? ` (${specification})` : ""} stock. Available: ${available} Kg.`);
      const cogs = Number((qty * Number(stock.rows[0].avg_cost)).toFixed(2));
      const inserted = await client.query(
        `INSERT INTO sales (date,customer,item,specification,qty,quantity_value,quantity_unit,rate,amount,status,payment_method,payment_proof,transaction_id,cogs)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [date, customer, item, specification, qty, quantityValue, quantityUnit, rate, amount, status, paymentMethod, paymentProof, transactionId, cogs]
      );
      await client.query(
        `INSERT INTO stock_movements(item,specification,qty_change,unit_cost,source_type,source_id,movement_date,created_at)
         VALUES($1,$2,$3,$4,'sale',$5,$6,$7) ON CONFLICT DO NOTHING`,
        [item, specification, -qty, Number((cogs / qty).toFixed(2)), inserted.rows[0].id, date, inserted.rows[0].created_at]
      );
      touched.set(`${item.toLowerCase()}|${String(specification || '').toLowerCase()}`, {item, specification});
      created.push(mapOut(inserted.rows[0]));
    }

    for (const {item, specification} of touched.values()) await rebuildStock(client, item, specification);

    const cust = await client.query("SELECT * FROM customers WHERE lower(trim(name))=lower(trim($1)) FOR UPDATE", [customer]);
    const totalAmount = created.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    if (cust.rows.length) {
      await client.query(
        `UPDATE customers SET phone=CASE WHEN $2<>'' THEN $2 ELSE phone END, business=business+$1 WHERE id=$3`,
        [totalAmount, phone, cust.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO customers(name,phone,due,business,due_date,status) VALUES($1,$2,$3,$4,$5,$6)`,
        [customer, phone, status === "Due" ? totalAmount : 0, totalAmount, status === "Due" ? date : null, status === "Due" ? (date < todayIST() ? "Overdue" : date === todayIST() ? "Due Today" : "Upcoming") : "Upcoming"]
      );
    }

    const linkedCustomer = await client.query("SELECT id FROM customers WHERE lower(trim(name))=lower(trim($1)) FOR UPDATE", [customer]);
    if (!linkedCustomer.rows.length) throw new Error("Customer could not be created for the sale.");

    if (status === "Paid") {
      for (const row of created) {
        await client.query(
          `INSERT INTO customer_payments(customer_id,date,amount,note,payment_method,payment_proof,transaction_id,source_sale_id)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (source_sale_id) WHERE source_sale_id IS NOT NULL DO UPDATE SET
             customer_id=EXCLUDED.customer_id,date=EXCLUDED.date,amount=EXCLUDED.amount,
             note=EXCLUDED.note,payment_method=EXCLUDED.payment_method,payment_proof=EXCLUDED.payment_proof,transaction_id=EXCLUDED.transaction_id`,
          [linkedCustomer.rows[0].id, date, row.amount, `Sale payment — ${row.item}${row.specification ? ` (${row.specification})` : ""}`, paymentMethod, paymentProof, transactionId, row.id]
        );
        await recordWhatsAppEvent(client, {
          customer, phone, amount: Number(row.amount || 0), kind: "Payment", status: "Recorded",
          message: `Payment of ₹${Number(row.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} received from ${customer} for ${row.item}${row.specification ? ` (${row.specification})` : ""} via ${paymentMethod}.`,
          date, sourceSaleId: row.id, paymentMethod, paymentProof
        });
      }
    }

    const summary = await client.query(`
      SELECT GREATEST(0,
        COALESCE((SELECT SUM(amount) FROM sales WHERE lower(trim(customer))=lower(trim($1)) AND status='Due'),0)
        - COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id=$2 AND source_sale_id IS NULL),0)
      ) AS due,
      (SELECT TO_CHAR(MIN(date), 'YYYY-MM-DD') FROM sales WHERE lower(trim(customer))=lower(trim($1)) AND status='Due') AS due_date
      FROM customers c WHERE c.id=$2`, [customer, linkedCustomer.rows[0].id]);
    const due = Number(summary.rows[0]?.due || 0), dueDate = summary.rows[0]?.due_date || null, today = todayIST();
    const customerStatus = due <= 0 ? 'Upcoming' : dueDate < today ? 'Overdue' : dueDate === today ? 'Due Today' : 'Upcoming';
    await client.query('UPDATE customers SET due=$1,due_date=$2,status=$3 WHERE id=$4', [due, dueDate, customerStatus, linkedCustomer.rows[0].id]);

    await client.query("COMMIT");
    res.status(201).json(Array.isArray(req.body.items) ? {items:created,totalAmount,totalQty:created.reduce((sum,row)=>sum+Number(row.qty||0),0)} : created[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Edit only fields that are safe to change after a sale has been recorded.
// Changing payment status is transactional so customer due remains accurate.
salesRouter.patch("/:id", async (req, res) => {
  const requestedStatus = req.body.status;
  const requestedPhone = req.body.phone !== undefined ? String(req.body.phone || "").trim() : null;
  const requestedMethod = req.body.paymentMethod !== undefined ? req.body.paymentMethod : undefined;
  const requestedProof = req.body.paymentProof !== undefined ? (req.body.paymentProof ? String(req.body.paymentProof) : null) : undefined;
  const requestedTransactionId = req.body.transactionId !== undefined ? (req.body.transactionId ? String(req.body.transactionId).trim() : null) : undefined;
  if (!['Due', 'Paid'].includes(requestedStatus)) {
    return res.status(400).json({ error: "Only payment status can be changed here (Due/Paid)." });
  }
  if (requestedMethod !== undefined && !["Cash","UPI","Bank"].includes(requestedMethod)) return res.status(400).json({ error: "Invalid payment method." });
  if (requestedProof && !requestedProof.startsWith("data:image/")) return res.status(400).json({ error: "Payment proof must be an image." });
  if (requestedProof && requestedProof.length > 6 * 1024 * 1024) return res.status(400).json({ error: "Payment proof is too large. Please use a smaller screenshot." });
  if (requestedStatus !== "Paid" && (requestedMethod || requestedProof)) return res.status(400).json({ error: "Payment method/proof can only be saved for a paid sale." });
  if (requestedProof && requestedMethod !== "UPI") return res.status(400).json({ error: "Payment screenshot can only be attached to a UPI payment." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const found = await client.query(
      "SELECT * FROM sales WHERE id=$1 FOR UPDATE",
      [req.params.id]
    );
    if (!found.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sale not found" });
    }

    const sale = found.rows[0];

    // A payment can only exist against a customer's outstanding due. If a
    // sale is being changed back to Due, it increases the customer's due.
    // If changed to Paid, it removes this sale's amount from outstanding due.
    const cust = await client.query(
      "SELECT * FROM customers WHERE lower(trim(name))=lower(trim($1)) FOR UPDATE",
      [sale.customer]
    );
    if (!cust.rows.length) throw new Error("Customer linked to this sale was not found.");

    if (sale.status !== requestedStatus) {
      await client.query("UPDATE sales SET status=$1 WHERE id=$2", [requestedStatus, sale.id]);
    }
    if (requestedPhone !== null) {
      await client.query("UPDATE customers SET phone=$1 WHERE id=$2", [requestedPhone, cust.rows[0].id]);
    }
    if (requestedStatus === "Paid") {
      const method = requestedMethod !== undefined ? requestedMethod : (sale.payment_method || "Cash");
      const proof = requestedProof !== undefined ? requestedProof : (sale.payment_proof || null);
      const txn = requestedTransactionId !== undefined ? requestedTransactionId : (sale.transaction_id || null);
      if (proof && method !== "UPI") throw new Error("Payment screenshot can only be attached to a UPI payment.");
      if (method === "Bank" && !txn) throw new Error("Transaction ID is required for Bank payments.");
      if (txn && method !== "Bank") throw new Error("Transaction ID can only be saved for a Bank payment.");

      const saleCollections = await client.query(
        "SELECT COALESCE(SUM(amount),0) AS paid FROM customer_payments WHERE sale_id=$1 AND source_sale_id IS NULL",
        [sale.id]
      );
      const collectedForSale = Number(saleCollections.rows[0]?.paid || 0);
      if (collectedForSale > 0 && collectedForSale < Number(sale.amount || 0) - 0.005) {
        throw new Error(`This sale has only ₹${collectedForSale.toLocaleString('en-IN')} collected out of ₹${Number(sale.amount || 0).toLocaleString('en-IN')}. Collect the remaining amount before marking it Paid.`);
      }

      await client.query("UPDATE sales SET payment_method=$1,payment_proof=$2,transaction_id=$3 WHERE id=$4", [method, proof, txn, sale.id]);
      if (collectedForSale <= 0) {
        await client.query(
          `INSERT INTO customer_payments(customer_id,date,amount,note,payment_method,payment_proof,transaction_id,source_sale_id)
           VALUES($1,$2,$3,'Sale payment',$4,$5,$6,$7)
           ON CONFLICT (source_sale_id) WHERE source_sale_id IS NOT NULL DO UPDATE SET
             customer_id=EXCLUDED.customer_id,date=EXCLUDED.date,amount=EXCLUDED.amount,
             note=EXCLUDED.note,payment_method=EXCLUDED.payment_method,payment_proof=EXCLUDED.payment_proof,transaction_id=EXCLUDED.transaction_id`,
          [cust.rows[0].id, sale.date, sale.amount, method, proof, txn, sale.id]
        );
      }
      if (sale.status !== "Paid") {
        const customerPhone = requestedPhone !== null ? requestedPhone : (cust.rows[0].phone || "");
        const salePaymentMessage = `Payment of ₹${Number(sale.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} received from ${sale.customer} for sale via ${method}.`;
        await recordWhatsAppEvent(client, {
          customer: sale.customer, phone: customerPhone, amount: Number(sale.amount || 0),
          kind: "Payment", status: "Recorded", message: salePaymentMessage, date: sale.date, sourceSaleId: sale.id, paymentMethod: method, paymentProof: proof
        });
      }
    } else {
      await client.query("UPDATE whatsapp_bills SET status='Reversed' WHERE source_sale_id=$1 AND kind='Payment'", [sale.id]);
      await client.query("UPDATE sales SET payment_method=NULL,payment_proof=NULL,transaction_id=NULL WHERE id=$1", [sale.id]);
      await client.query("DELETE FROM customer_payments WHERE source_sale_id=$1", [sale.id]);
    }

    const newDue = await client.query(
      `SELECT GREATEST(
         0,
         COALESCE((SELECT SUM(amount) FROM sales WHERE lower(trim(customer))=lower(trim($1)) AND status='Due'),0)
         - COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id=$2 AND source_sale_id IS NULL),0)
       ) AS due`,
      [sale.customer, cust.rows[0].id]
    );
    const due = Number(newDue.rows[0].due || 0);

    const latestDue = await client.query(
      `SELECT TO_CHAR(MIN(date), 'YYYY-MM-DD') AS due_date
       FROM sales
       WHERE lower(trim(customer))=lower(trim($1)) AND status='Due'`,
      [sale.customer]
    );
    const dueDate = latestDue.rows[0].due_date;
    const status = due <= 0 ? "Upcoming" : (dueDate < todayIST() ? "Overdue" : dueDate === todayIST() ? "Due Today" : "Upcoming");

    await client.query(
      `UPDATE customers SET due=$1, due_date=$2, status=$3 WHERE id=$4`,
      [due, dueDate || null, status, cust.rows[0].id]
    );

    const updated = await client.query("SELECT * FROM sales WHERE id=$1", [sale.id]);
    await client.query("COMMIT");
    res.json(mapOut(updated.rows[0]));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

salesRouter.delete("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT * FROM sales WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!found.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }

    const sale = found.rows[0];
    const customerPayments = await client.query(`SELECT 1 FROM customer_payments p JOIN customers c ON c.id=p.customer_id WHERE lower(trim(c.name))=lower(trim($1)) AND p.source_sale_id IS NULL LIMIT 1`, [sale.customer]);
    if (customerPayments.rows.length) throw new Error("This sale cannot be deleted while the customer has recorded payments. Delete/reconcile the payment records first so the customer ledger stays accurate.");
    const movement=await client.query(`SELECT id FROM stock_movements WHERE source_type='sale' AND source_id=$1 FOR UPDATE`,[sale.id]);
    // Backfill a missing legacy ledger row from the immutable sale record so
    // deleting the sale still reverses exactly its stock effect.
    if (!movement.rows.length) {
      const backfilled = await client.query(`
        INSERT INTO stock_movements(item,specification,qty_change,unit_cost,source_type,source_id,movement_date,created_at)
        VALUES($1,$2,$3,$4,'sale',$5,$6,$7)
        ON CONFLICT DO NOTHING RETURNING id
      `,[sale.item,sale.specification,-sale.qty,sale.qty ? Number((sale.cogs/sale.qty).toFixed(2)) : 0,sale.id,sale.date,sale.created_at]);
      movement.rows.push(...backfilled.rows);
    }
    if (!movement.rows.length) throw new Error("Could not locate or create the inventory ledger entry for this sale.");
    await client.query(`DELETE FROM stock_movements WHERE id=$1`,[movement.rows[0].id]);
    await client.query("UPDATE whatsapp_bills SET status='Reversed' WHERE source_sale_id=$1 AND kind='Payment'", [req.params.id]);
    await client.query(`DELETE FROM customer_payments WHERE source_sale_id=$1`, [req.params.id]);
    await client.query(`DELETE FROM sales WHERE id=$1`, [req.params.id]);
    await rebuildStock(client,sale.item,sale.specification);

    const cust = await client.query(
      "SELECT id FROM customers WHERE lower(trim(name))=lower(trim($1)) FOR UPDATE",
      [sale.customer]
    );

    if (cust.rows.length) {
      const dueResult = await client.query(
        `SELECT GREATEST(
           0,
           COALESCE((SELECT SUM(amount) FROM sales WHERE lower(trim(customer))=lower(trim($1)) AND status='Due'),0)
           - COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id=$2 AND source_sale_id IS NULL),0)
         ) due`,
        [sale.customer, cust.rows[0].id]
      );
      const due = Number(dueResult.rows[0].due || 0);
      const latest = await client.query(
        `SELECT TO_CHAR(MIN(date), 'YYYY-MM-DD') AS due_date FROM sales WHERE lower(trim(customer))=lower(trim($1)) AND status='Due'`,
        [sale.customer]
      );
      const dueDate = latest.rows[0].due_date;
      const today = todayIST();
      const status = due <= 0 ? "Upcoming" : dueDate < today ? "Overdue" : dueDate === today ? "Due Today" : "Upcoming";
      await client.query("UPDATE customers SET business=GREATEST(0,business-$1),due=$2,due_date=$3,status=$4 WHERE id=$5", [sale.amount,due,dueDate||null,status,cust.rows[0].id]);
    }

    await client.query("COMMIT");
    res.status(204).end();
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});
