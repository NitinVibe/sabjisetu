import { Router } from "express";
import { pool } from "../db.js";
import { toNum, ensureItemMaster, rebuildStock } from "./helpers.js";

export const stockRouter = Router();

const mapOut = (row) => {
  const r = toNum(row, ["qty", "avg_cost", "selling_price"]);
  return { id: r.id, item: r.item, specification: r.specification || "", qty: r.qty, avgCost: r.avg_cost, sellingPrice: r.selling_price, status: r.status || "Available" };
};

stockRouter.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM stock ORDER BY item ASC");
    res.json(rows.map(mapOut));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load stock" });
  }
});

// Manual opening/adjustment stock. Normal stock changes should come from purchases/sales.
stockRouter.post("/", async (req, res) => {
  const item = String(req.body.item || "").trim();
  const avgCost = Number(req.body.avgCost || 0);
  const sellingPrice = Number(req.body.sellingPrice || 0);
  const specification = String(req.body.specification || "").trim() || null;
  const quantityUnit = String(req.body.quantityUnit || "Kg").trim();
  const quantityValue = Number(req.body.quantityValue ?? req.body.qty);
  const status = String(req.body.status || "Available").trim() || "Available";
  if (!item || !Number.isFinite(quantityValue) || quantityValue <= 0 || !Number.isFinite(avgCost) || avgCost < 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) return res.status(400).json({ error: "Invalid stock values" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureItemMaster(client, item, specification);
    const unitResult = await client.query("SELECT kg_multiplier FROM unit_master WHERE lower(trim(name))=lower(trim($1)) OR lower(trim(symbol))=lower(trim($1)) LIMIT 1", [quantityUnit]);
    if (!unitResult.rows.length) throw new Error(`Unknown quantity unit: ${quantityUnit}`);
    const normalizedQty = Number((quantityValue * Number(unitResult.rows[0].kg_multiplier)).toFixed(3));
    const existing = await client.query(`SELECT id FROM stock WHERE lower(trim(item))=lower(trim($1)) AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,''))) FOR UPDATE`, [item, specification]);
    let stockId = existing.rows[0]?.id;
    if (!stockId) {
      const created = await client.query(`INSERT INTO stock(item,specification,qty,avg_cost,selling_price,status) VALUES($1,$2,0,0,$3,$4) RETURNING id`, [item, specification, sellingPrice, status]);
      stockId = created.rows[0].id;
    } else {
      await client.query(`UPDATE stock SET selling_price=CASE WHEN $1>0 THEN $1 ELSE selling_price END, status=$2, updated_at=now() WHERE id=$3`, [sellingPrice, status, stockId]);
    }
    await client.query(`INSERT INTO stock_movements(item,specification,qty_change,unit_cost,source_type,source_id,movement_date) VALUES($1,$2,$3,$4,'manual',$5,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`, [item, specification, normalizedQty, avgCost, stockId]);
    const rebuilt = await rebuildStock(client, item, specification);
    await client.query("COMMIT");
    res.status(201).json(mapOut(rebuilt));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ error: err.message || "Failed to save stock" });
  } finally { client.release(); }
});

stockRouter.patch("/:id", async (req, res) => {
  const status = req.body.status !== undefined ? String(req.body.status).trim() : undefined;
  const sellingPrice = req.body.sellingPrice !== undefined ? Number(req.body.sellingPrice) : undefined;
  if (status === undefined && sellingPrice === undefined) return res.status(400).json({ error: "Nothing to update" });
  if (sellingPrice !== undefined && (!Number.isFinite(sellingPrice) || sellingPrice < 0)) return res.status(400).json({ error: "Invalid selling price" });
  try {
    const { rows } = await pool.query(
      `UPDATE stock SET
         status = COALESCE($1, status),
         selling_price = COALESCE($2, selling_price),
         updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [status === undefined ? null : (status || "Available"), sellingPrice === undefined ? null : sellingPrice, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(mapOut(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to update stock" });
  }
});

stockRouter.get("/check-delete/:id", async (req,res)=>{
  try {
    const {rows}=await pool.query(`SELECT id,item,specification,qty FROM stock WHERE id=$1`,[req.params.id]);
    if(!rows.length) return res.status(404).json({error:"Stock record not found"});
    const s=rows[0];
    const {rows: linked}=await pool.query(
      `SELECT source_type, COUNT(*)::int AS count
       FROM stock_movements
       WHERE lower(trim(item))=lower(trim($1))
         AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,'')))
       GROUP BY source_type
       ORDER BY source_type`,
      [s.item,s.specification]
    );
    const protectedRows=linked.filter(r=>['purchase','sale','opening'].includes(r.source_type));
    const history=Object.fromEntries(linked.map(r=>[r.source_type,Number(r.count)]));
    const canDelete=protectedRows.length===0;
    res.json({
      canDelete,
      item:s.item,
      specification:s.specification||"",
      qty:Number(s.qty||0),
      history,
      reason: canDelete
        ? "This stock record has no purchase, sale, or opening-balance history and can be deleted safely."
        : "This stock record is linked to transaction history. Reverse or correct the original transaction instead of deleting the inventory record."
    });
  } catch(err){
    console.error(err);
    res.status(500).json({error:"Failed to check stock deletion"});
  }
});

stockRouter.delete("/:id", async (req,res)=>{
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {rows}=await client.query(`SELECT * FROM stock WHERE id=$1 FOR UPDATE`,[req.params.id]);
    if(!rows.length){await client.query("ROLLBACK");return res.status(404).json({error:"Not found"});}
    const s=rows[0];
    const linked=await client.query(`SELECT source_type, COUNT(*)::int count FROM stock_movements WHERE lower(trim(item))=lower(trim($1)) AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,''))) GROUP BY source_type`,[s.item,s.specification]);
    const protectedTypes=new Set(linked.rows.filter(r=>['purchase','sale','opening'].includes(r.source_type)).map(r=>r.source_type));
    if(protectedTypes.size) throw new Error("This stock balance is linked to purchases/sales or opening data. Reverse those transactions instead of deleting the inventory record.");
    await client.query(`DELETE FROM stock_movements WHERE lower(trim(item))=lower(trim($1)) AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,'')))`,[s.item,s.specification]);
    await client.query(`DELETE FROM stock WHERE id=$1`,[req.params.id]);
    await client.query("COMMIT");res.status(204).end();
  } catch(err){await client.query("ROLLBACK");console.error(err);res.status(400).json({error:err.message||"Failed to delete stock"});}
  finally{client.release();}
});
