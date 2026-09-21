// node-postgres returns NUMERIC/DECIMAL columns as strings (to avoid
// silent float rounding). The frontend does plain JS arithmetic on
// these fields, so we convert the numeric ones back to numbers here,
// right at the edge, once, instead of scattering Number(...) calls
// throughout the React app.
export function toNum(row, fields) {
  const out = { ...row };
  fields.forEach((f) => {
    if (out[f] !== null && out[f] !== undefined) out[f] = Number(out[f]);
  });
  return out;
}


export function todayIST() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}


// Automatically register a newly entered vegetable/item in the master list.
// The English transaction name is the canonical key; Hindi can be added later
// from Master Settings without changing existing transaction records.
export async function ensureItemMaster(db, item, specification = null) {
  const name = String(item || '').trim();
  if (!name) return null;

  // An unknown item is created automatically. An existing inactive item is
  // deliberately NOT reactivated by a transaction: Deactivate means
  // "do not allow this item in new transactions". The administrator must
  // explicitly Activate it from Master Settings first.
  const existing = await db.query(
    `SELECT id, active FROM item_master
     WHERE lower(trim(name_en))=lower(trim($1))
     FOR UPDATE`,
    [name]
  );

  let itemId;
  if (existing.rows.length) {
    itemId = existing.rows[0].id;
    if (existing.rows[0].active === false) {
      throw new Error(`Item "${name}" is inactive. Activate it from Master Settings before using it in a new transaction.`);
    }
  } else {
    const created = await db.query(
      `INSERT INTO item_master(name_en, name_hi, active)
       VALUES($1, '', true)
       ON CONFLICT ((lower(trim(name_en)))) DO UPDATE SET name_en=EXCLUDED.name_en
       RETURNING id, active`,
      [name]
    );
    itemId = created.rows[0]?.id;
    if (created.rows[0]?.active === false) {
      throw new Error(`Item "${name}" is inactive. Activate it from Master Settings before using it in a new transaction.`);
    }
  }

  const spec = String(specification || '').trim();
  if (spec) {
    await db.query(
      `INSERT INTO item_specifications(item_id, name, active)
       VALUES($1, $2, true)
       ON CONFLICT (item_id, lower(trim(name)))
       DO UPDATE SET active=true`,
      [itemId, spec]
    );
  }

  return itemId;
}


export async function rebuildStock(db, item, specification = null) {
  const name = String(item || '').trim();
  if (!name) return null;
  const spec = String(specification || '').trim() || null;

  const movements = await db.query(`
    SELECT
      COALESCE(SUM(qty_change), 0) AS qty,
      COALESCE(SUM(CASE WHEN qty_change > 0 THEN qty_change * unit_cost ELSE 0 END), 0) AS inbound_cost,
      COALESCE(SUM(CASE WHEN qty_change > 0 THEN qty_change ELSE 0 END), 0) AS inbound_qty
    FROM stock_movements
    WHERE lower(trim(item))=lower(trim($1))
      AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,'')))
  `, [name, spec]);

  const qty = Number(movements.rows[0]?.qty || 0);
  const inboundQty = Number(movements.rows[0]?.inbound_qty || 0);
  const inboundCost = Number(movements.rows[0]?.inbound_cost || 0);

  const existing = await db.query(`
    SELECT id, selling_price, status
    FROM stock
    WHERE lower(trim(item))=lower(trim($1))
      AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,'')))
    FOR UPDATE
  `, [name, spec]);

  if (qty <= 0.0005) {
    if (existing.rows.length) {
      await db.query(`DELETE FROM stock WHERE id=$1`, [existing.rows[0].id]);
    }
    return null;
  }

  const avgCost = inboundQty > 0 ? Number((inboundCost / inboundQty).toFixed(2)) : 0;
  const sellingPrice = existing.rows.length ? Number(existing.rows[0].selling_price || 0) : 0;
  const status = existing.rows.length ? (existing.rows[0].status || 'Available') : 'Available';

  if (existing.rows.length) {
    const { rows } = await db.query(`
      UPDATE stock
      SET qty=$1, avg_cost=$2, selling_price=$3, status=$4, updated_at=now()
      WHERE id=$5 RETURNING *
    `, [Number(qty.toFixed(3)), avgCost, sellingPrice, status, existing.rows[0].id]);
    return rows[0];
  }

  const { rows } = await db.query(`
    INSERT INTO stock(item,specification,qty,avg_cost,selling_price,status)
    VALUES($1,$2,$3,$4,0,'Available') RETURNING *
  `, [name, spec, Number(qty.toFixed(3)), avgCost]);
  return rows[0];
}

export async function assertInventoryTimelineNonNegative(db, item, specification = null) {
  const rows = await db.query(`
    SELECT movement_date, created_at, qty_change
    FROM stock_movements
    WHERE lower(trim(item))=lower(trim($1))
      AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,'')))
    ORDER BY movement_date ASC, created_at ASC, id ASC
  `, [String(item || '').trim(), String(specification || '').trim() || null]);
  let balance = 0;
  for (const row of rows.rows) {
    balance += Number(row.qty_change || 0);
    if (balance < -0.0005) {
      const day = String(row.movement_date).slice(0,10);
      throw new Error(`Inventory history would become negative on ${day} (${balance.toFixed(3)} Kg). The transaction cannot be deleted.`);
    }
  }
  return balance;
}

export async function assertNonNegativeStock(db, item, specification = null) {
  const result = await db.query(`
    SELECT COALESCE(SUM(qty_change),0) AS qty
    FROM stock_movements
    WHERE lower(trim(item))=lower(trim($1))
      AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,'')))
  `, [String(item || '').trim(), String(specification || '').trim() || null]);
  const qty = Number(result.rows[0]?.qty || 0);
  if (qty < -0.0005) throw new Error(`Stock would become negative (${qty.toFixed(3)} Kg). The transaction cannot be reversed.`);
  return qty;
}


// Record a cross-module WhatsApp event. This keeps WhatsApp Bills in sync with
// reminders and payment events without pretending that browser-opened WhatsApp
// messages were actually sent by the API.
export async function recordWhatsAppEvent(db, { customer, phone, amount = 0, kind = "Reminder", status = "Opened", message = "", date = null, sourcePaymentId = null, sourceSaleId = null, paymentMethod = null, paymentProof = null }) {
  const allowedKinds = new Set(["Bill", "Reminder", "Payment"]);
  const safeKind = allowedKinds.has(kind) ? kind : "Reminder";
  const safeStatus = String(status || "Opened").trim() || "Opened";
  const safeDate = date || todayIST();
  const values = [String(customer || "").trim(), String(phone || "").trim() || null, Number(amount || 0), safeDate, safeStatus, safeKind, String(message || "").trim() || null, sourcePaymentId, sourceSaleId, paymentMethod, paymentProof];
  let result;
  if (sourcePaymentId) {
    result = await db.query(
      `INSERT INTO whatsapp_bills(customer,phone,amount,date,status,kind,message,source_payment_id,source_sale_id,payment_method,payment_proof)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (source_payment_id) WHERE source_payment_id IS NOT NULL DO UPDATE SET
         customer=EXCLUDED.customer,phone=EXCLUDED.phone,amount=EXCLUDED.amount,date=EXCLUDED.date,status=EXCLUDED.status,kind=EXCLUDED.kind,message=EXCLUDED.message,payment_method=EXCLUDED.payment_method,payment_proof=EXCLUDED.payment_proof
       RETURNING *`, values);
  } else if (sourceSaleId) {
    result = await db.query(
      `INSERT INTO whatsapp_bills(customer,phone,amount,date,status,kind,message,source_payment_id,source_sale_id,payment_method,payment_proof)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (source_sale_id) WHERE source_sale_id IS NOT NULL DO UPDATE SET
         customer=EXCLUDED.customer,phone=EXCLUDED.phone,amount=EXCLUDED.amount,date=EXCLUDED.date,status=EXCLUDED.status,kind=EXCLUDED.kind,message=EXCLUDED.message,payment_method=EXCLUDED.payment_method,payment_proof=EXCLUDED.payment_proof
       RETURNING *`, values);
  } else {
    result = await db.query(
      `INSERT INTO whatsapp_bills(customer,phone,amount,date,status,kind,message,source_payment_id,source_sale_id,payment_method,payment_proof)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, values);
  }
  return result.rows[0];
}
