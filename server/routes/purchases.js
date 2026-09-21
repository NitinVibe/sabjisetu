import { Router } from "express";
import { pool } from "../db.js";
import { toNum, ensureItemMaster, rebuildStock, assertNonNegativeStock, assertInventoryTimelineNonNegative } from "./helpers.js";

export function createPurchaseRouter(table) {
  const router = Router();
  const mapOut = (row) => {
    const r = toNum(row, ["qty","rate","amount","quantity_value"]);
    return {...r, specification:r.specification || "", quantityUnit:r.quantity_unit || "Kg", quantityValue:r.quantity_value ?? r.qty};
  };

  router.get("/", async (_req,res)=>{
    try { const {rows}=await pool.query(`SELECT * FROM ${table} ORDER BY date DESC, created_at DESC`); res.json(rows.map(mapOut)); }
    catch(err){console.error(err);res.status(500).json({error:`Failed to load ${table}`})}
  });

  router.post("/", async(req,res)=>{
    // Supports both the legacy single-line payload and a multi-line purchase.
    const lines = Array.isArray(req.body.items) ? req.body.items : [req.body];
    const date=req.body.date||null, vendor=String(req.body.vendor||"").trim();
    if(!date||!vendor||!lines.length) return res.status(400).json({error:"Date, vendor and at least one purchase item are required"});
    for(const line of lines){
      const item=String(line.item||"").trim();
      const quantityValue=Number(line.quantityValue ?? line.qty);
      const quantityUnit=String(line.quantityUnit||"Kg").trim();
      const rate=Number(line.rate);
      if(!item||!Number.isFinite(quantityValue)||quantityValue<=0||!Number.isFinite(rate)||rate<0) return res.status(400).json({error:"Each purchase item needs a valid item, quantity and rate"});
    }
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      const created=[];
      const touched=new Map();
      for(const line of lines){
        const item=String(line.item||"").trim();
        const specification=String(line.specification||"").trim() || null;
        const quantityValue=Number(line.quantityValue ?? line.qty);
        const quantityUnit=String(line.quantityUnit||"Kg").trim();
        const rate=Number(line.rate);
        await ensureItemMaster(client, item, specification);
        const unit=await client.query("SELECT kg_multiplier FROM unit_master WHERE lower(trim(name))=lower(trim($1)) OR lower(trim(symbol))=lower(trim($1)) LIMIT 1",[quantityUnit]);
        if(!unit.rows.length) throw new Error(`Unknown quantity unit: ${quantityUnit}. Add it in Master Settings.`);
        const multiplier=Number(unit.rows[0].kg_multiplier), qty=Number((quantityValue*multiplier).toFixed(3)), amount=Number((qty*rate).toFixed(2));
        const inserted=await client.query(`INSERT INTO ${table}(date,vendor,item,specification,qty,quantity_value,quantity_unit,rate,amount) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[date,vendor,item,specification,qty,quantityValue,quantityUnit,rate,amount]);
        await client.query(`INSERT INTO stock_movements(item,specification,qty_change,unit_cost,source_type,source_id,movement_date,created_at) VALUES($1,$2,$3,$4,'purchase',$5,$6,$7) ON CONFLICT DO NOTHING`,[item,specification,qty,rate,inserted.rows[0].id,date,inserted.rows[0].created_at]);
        touched.set(`${item.toLowerCase()}|${String(specification||'').toLowerCase()}`,{item,specification});
        created.push(mapOut(inserted.rows[0]));
      }
      for(const {item,specification} of touched.values()) await rebuildStock(client,item,specification);
      await client.query("COMMIT");
      const totalAmount=created.reduce((s,r)=>s+Number(r.amount||0),0), totalQty=created.reduce((s,r)=>s+Number(r.qty||0),0);
      res.status(201).json(Array.isArray(req.body.items) ? {items:created,totalAmount,totalQty} : created[0]);
    }catch(err){await client.query("ROLLBACK");console.error(err);res.status(400).json({error:err.message||"Purchase could not be saved"})}finally{client.release()}
  });

  router.patch("/:id", async (req,res)=>{
    const date=req.body.date||null, vendor=String(req.body.vendor||"").trim(), item=String(req.body.item||"").trim();
    const specification=String(req.body.specification||"").trim() || null;
    const quantityValue=Number(req.body.quantityValue ?? req.body.qty);
    const quantityUnit=String(req.body.quantityUnit||"Kg").trim();
    const rate=Number(req.body.rate);
    if(!date||!vendor||!item||!Number.isFinite(quantityValue)||quantityValue<=0||!Number.isFinite(rate)||rate<0) return res.status(400).json({error:"Invalid purchase values"});
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      const found=await client.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,[req.params.id]);
      if(!found.rows.length) throw new Error("Purchase not found");
      const old=found.rows[0];
      await ensureItemMaster(client,item,specification);
      const unit=await client.query("SELECT kg_multiplier FROM unit_master WHERE lower(trim(name))=lower(trim($1)) OR lower(trim(symbol))=lower(trim($1)) LIMIT 1",[quantityUnit]);
      if(!unit.rows.length) throw new Error(`Unknown quantity unit: ${quantityUnit}. Add it in Master Settings.`);
      const multiplier=Number(unit.rows[0].kg_multiplier);
      const qty=Number((quantityValue*multiplier).toFixed(3));
      const amount=Number((qty*rate).toFixed(2));

      const movement=await client.query(`SELECT id FROM stock_movements WHERE source_type='purchase' AND source_id=$1 FOR UPDATE`,[old.id]);
      if(!movement.rows.length) throw new Error("Inventory ledger entry for this purchase is missing. Delete/re-enter the purchase instead of editing it.");

      await client.query(`UPDATE ${table} SET date=$1,vendor=$2,item=$3,specification=$4,qty=$5,quantity_value=$6,quantity_unit=$7,rate=$8,amount=$9 WHERE id=$10`,[date,vendor,item,specification,qty,quantityValue,quantityUnit,rate,amount,old.id]);
      await client.query(`UPDATE stock_movements SET item=$1,specification=$2,qty_change=$3,unit_cost=$4,movement_date=$5 WHERE id=$6`,[item,specification,qty,rate,date,movement.rows[0].id]);

      await assertNonNegativeStock(client,old.item,old.specification);
      await assertInventoryTimelineNonNegative(client,old.item,old.specification);
      await assertNonNegativeStock(client,item,specification);
      await assertInventoryTimelineNonNegative(client,item,specification);
      await rebuildStock(client,old.item,old.specification);
      if (String(old.item).trim().toLowerCase() !== item.trim().toLowerCase() || String(old.specification||'').trim().toLowerCase() !== String(specification||'').trim().toLowerCase()) {
        await rebuildStock(client,item,specification);
      }
      const updated=await client.query(`SELECT * FROM ${table} WHERE id=$1`,[old.id]);
      await client.query("COMMIT");
      res.json(mapOut(updated.rows[0]));
    } catch(err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(400).json({error:err.message||"Purchase could not be updated"});
    } finally { client.release(); }
  });

  router.get("/check-delete/:id", async (req,res)=>{
    const client=await pool.connect();
    try {
      const found=await client.query(`SELECT * FROM ${table} WHERE id=$1`,[req.params.id]);
      if(!found.rows.length) return res.status(404).json({error:"Purchase not found"});
      const p=found.rows[0];
      const movement=await client.query(`SELECT id FROM stock_movements WHERE source_type='purchase' AND source_id=$1`,[p.id]);
      if(!movement.rows.length) return res.json({canDelete:false,purchaseQty:Number(p.qty||0),currentStock:0,remainingAfterDelete:null,reason:"This purchase has no inventory ledger entry. Keep the record and repair the ledger instead of deleting it."});
      const item=String(p.item||'').trim(), spec=String(p.specification||'').trim() || null;
      const current=await client.query(`SELECT COALESCE(SUM(qty_change),0) qty FROM stock_movements WHERE lower(trim(item))=lower(trim($1)) AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,'')))`,[item,spec]);
      const currentStock=Number(current.rows[0]?.qty||0);
      const remainingAfterDelete=Number((currentStock-Number(p.qty||0)).toFixed(3));
      const timeline=await client.query(`SELECT movement_date,created_at,qty_change FROM stock_movements WHERE lower(trim(item))=lower(trim($1)) AND lower(trim(coalesce(specification,'')))=lower(trim(coalesce($2,''))) AND id<>$3 ORDER BY movement_date ASC,created_at ASC,id ASC`,[item,spec,movement.rows[0].id]);
      let balance=0, firstNegative=null;
      for(const r of timeline.rows){ balance+=Number(r.qty_change||0); if(balance < -0.0005){ firstNegative={date:String(r.movement_date).slice(0,10),balance:Number(balance.toFixed(3))}; break; } }
      const canDelete=remainingAfterDelete>=-0.0005 && !firstNegative;
      let reason=null;
      if(!canDelete) reason=firstNegative ? `Deleting this purchase would make inventory negative on ${firstNegative.date} (${firstNegative.balance.toFixed(3)} Kg).` : `Deleting this purchase would leave ${Math.abs(remainingAfterDelete).toFixed(3)} Kg of negative stock.`;
      res.json({canDelete,purchaseQty:Number(Number(p.qty||0).toFixed(3)),currentStock:Number(currentStock.toFixed(3)),remainingAfterDelete,reason});
    } catch(err){ console.error(err); res.status(500).json({error:"Could not check inventory impact"}); } finally { client.release(); }
  });

  router.delete("/:id",async(req,res)=>{
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      const found=await client.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,[req.params.id]);
      if(!found.rows.length){await client.query("ROLLBACK");return res.status(404).json({error:"Not found"})}
      const p=found.rows[0];
      const movement=await client.query(`SELECT id FROM stock_movements WHERE source_type='purchase' AND source_id=$1 FOR UPDATE`,[p.id]);
      // Older databases may have purchases that predate the inventory ledger.
      // Recreate the exact movement inside this transaction before reversing it.
      if (!movement.rows.length) {
        const backfilled = await client.query(`
          INSERT INTO stock_movements(item,specification,qty_change,unit_cost,source_type,source_id,movement_date,created_at)
          VALUES($1,$2,$3,$4,'purchase',$5,$6,$7)
          ON CONFLICT DO NOTHING RETURNING id
        `,[p.item,p.specification,p.qty,p.rate,p.id,p.date,p.created_at]);
        movement.rows.push(...backfilled.rows);
      }
      if (!movement.rows.length) throw new Error("Could not locate or create the inventory ledger entry for this purchase.");
      await client.query(`DELETE FROM stock_movements WHERE id=$1`,[movement.rows[0].id]);
      await assertNonNegativeStock(client,p.item,p.specification);
      await assertInventoryTimelineNonNegative(client,p.item,p.specification);
      await client.query(`DELETE FROM ${table} WHERE id=$1`,[req.params.id]);
      await rebuildStock(client,p.item,p.specification);
      await client.query("COMMIT");res.status(204).end();
    }catch(err){
      await client.query("ROLLBACK");
      console.error(err);
      res.status(409).json({code:"PURCHASE_REVERSAL_BLOCKED",error:String(err?.message||"Purchase could not be deleted")});
    }finally{client.release()}
  });
  return router;
}
