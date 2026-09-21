import { Router } from "express";
import { pool } from "../db.js";

export const mastersRouter = Router();

mastersRouter.get("/", async (_req, res) => {
  try {
    // Self-heal the master list from every transaction source. This is important
    // for vegetables that were already entered before the auto-sync feature was added.
    // It also guarantees that the Sales/Purchase autocomplete always has every
    // real item present in the database.
    await pool.query(`
      INSERT INTO item_master(name_en, name_hi, active)
      SELECT DISTINCT trim(item), '', true
      FROM (
        SELECT item FROM stock
        UNION ALL SELECT item FROM mandi_purchases
        UNION ALL SELECT item FROM local_purchases
        UNION ALL SELECT item FROM sales
      ) x
      WHERE trim(coalesce(item, '')) <> ''
      ON CONFLICT ((lower(trim(name_en))))
      DO NOTHING
    `);

    await pool.query(`
      INSERT INTO item_specifications(item_id, name, active)
      SELECT im.id, trim(x.specification), true
      FROM item_master im
      JOIN (
        SELECT DISTINCT item, specification FROM stock
        UNION ALL SELECT DISTINCT item, specification FROM mandi_purchases
        UNION ALL SELECT DISTINCT item, specification FROM local_purchases
        UNION ALL SELECT DISTINCT item, specification FROM sales
      ) x ON lower(trim(x.item)) = lower(trim(im.name_en))
      WHERE trim(coalesce(x.specification, '')) <> ''
      ON CONFLICT DO NOTHING
    `);

    // Backfill master suggestions from existing transaction history without
    // reactivating an administrator-deactivated vendor/category.
    await pool.query(`
      INSERT INTO vendor_master(name, vendor_type, active)
      SELECT trim(vendor),
             CASE WHEN MAX(src) = MIN(src) THEN CASE MAX(src) WHEN 'Mandi' THEN 'Mandi' ELSE 'Local' END ELSE 'Both' END,
             true
      FROM (
        SELECT vendor, 'Mandi'::text AS src FROM mandi_purchases
        UNION ALL SELECT vendor, 'Local'::text AS src FROM local_purchases
      ) x
      WHERE trim(coalesce(vendor,'')) <> ''
      GROUP BY lower(trim(vendor)), trim(vendor)
      ON CONFLICT ((lower(trim(name)))) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO expense_category_master(name, active)
      SELECT DISTINCT trim(category), true
      FROM expenses
      WHERE trim(coalesce(category,'')) <> ''
      ON CONFLICT ((lower(trim(name)))) DO NOTHING
    `);

    const [items, specs, units, vendors, expenses] = await Promise.all([
      pool.query(`
        SELECT im.*,
          (EXISTS(SELECT 1 FROM stock st WHERE lower(trim(st.item))=lower(trim(im.name_en)))
           OR EXISTS(SELECT 1 FROM mandi_purchases mp WHERE lower(trim(mp.item))=lower(trim(im.name_en)))
           OR EXISTS(SELECT 1 FROM local_purchases lp WHERE lower(trim(lp.item))=lower(trim(im.name_en)))
           OR EXISTS(SELECT 1 FROM sales sa WHERE lower(trim(sa.item))=lower(trim(im.name_en)))
           OR EXISTS(SELECT 1 FROM stock_movements sm WHERE lower(trim(sm.item))=lower(trim(im.name_en)))) AS has_history
        FROM item_master im
        ORDER BY im.active DESC, im.name_en
      `),
      pool.query("SELECT s.*, i.name_en AS item_name FROM item_specifications s JOIN item_master i ON i.id=s.item_id WHERE s.active=true ORDER BY i.name_en,s.name"),
      pool.query("SELECT * FROM unit_master WHERE active=true ORDER BY id"),
      pool.query("SELECT * FROM vendor_master WHERE active=true ORDER BY name"),
      pool.query("SELECT * FROM expense_category_master WHERE active=true ORDER BY name"),
    ]);
    const specMap = {};
    for (const s of specs.rows) (specMap[s.item_id] ||= []).push({ id:s.id, name:s.name });
    res.json({
      items: items.rows.map(i => ({ id:i.id, nameEn:i.name_en, nameHi:i.name_hi, active:i.active, hasHistory:i.has_history === true, specifications:specMap[i.id] || [] })),
      units: units.rows.map(u => ({ id:u.id, name:u.name, symbol:u.symbol, kgMultiplier:Number(u.kg_multiplier) })),
      vendors: vendors.rows.map(v => ({ id:v.id, name:v.name, type:v.vendor_type })),
      expenseCategories: expenses.rows.map(e => ({ id:e.id, name:e.name })),
    });
  } catch (e) { console.error(e); res.status(500).json({ error:"Failed to load masters" }); }
});

mastersRouter.post("/items", async (req,res)=>{
  const nameEn=String(req.body.nameEn||"").trim(), nameHi=String(req.body.nameHi||"").trim();
  const specifications=Array.isArray(req.body.specifications)?req.body.specifications.map(x=>String(x).trim()).filter(Boolean):[];
  if(!nameEn) return res.status(400).json({error:"English item name is required"});
  const client=await pool.connect();
  try{await client.query("BEGIN");
    const {rows}=await client.query(`INSERT INTO item_master(name_en,name_hi) VALUES($1,$2) ON CONFLICT ((lower(trim(name_en)))) DO UPDATE SET name_hi=EXCLUDED.name_hi,active=true RETURNING *`,[nameEn,nameHi]);
    const seenSpecs = new Set();
    for (const spec of specifications) {
      const key = spec.toLowerCase();
      if (seenSpecs.has(key)) continue;
      seenSpecs.add(key);
      await client.query(`INSERT INTO item_specifications(item_id,name) VALUES($1,$2) ON CONFLICT DO NOTHING`,[rows[0].id, spec]);
    }
    await client.query("COMMIT"); res.status(201).json(rows[0]);
  }catch(e){await client.query("ROLLBACK");console.error(e);res.status(400).json({error:"Failed to save item master"})}finally{client.release()}
});

mastersRouter.patch("/items/:id", async(req,res)=>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const found=await client.query("SELECT * FROM item_master WHERE id=$1 FOR UPDATE",[req.params.id]);
    if(!found.rows.length){await client.query("ROLLBACK");return res.status(404).json({error:"Item not found"});}
    const current=found.rows[0];
    const nextName=req.body.nameEn!==undefined?String(req.body.nameEn).trim():current.name_en;
    if(!nextName) throw new Error("English item name is required");
    if(req.body.nameEn!==undefined && nextName.toLowerCase()!==String(current.name_en).trim().toLowerCase()){
      const linked=await client.query(`SELECT EXISTS(SELECT 1 FROM stock WHERE lower(trim(item))=lower(trim($1))) OR EXISTS(SELECT 1 FROM mandi_purchases WHERE lower(trim(item))=lower(trim($1))) OR EXISTS(SELECT 1 FROM local_purchases WHERE lower(trim(item))=lower(trim($1))) OR EXISTS(SELECT 1 FROM sales WHERE lower(trim(item))=lower(trim($1)))
        OR EXISTS(SELECT 1 FROM stock_movements WHERE lower(trim(item))=lower(trim($1))) AS linked`,[current.name_en]);
      if(linked.rows[0].linked) throw new Error("This item already has transaction history. Rename is blocked to keep stock and reports connected; create a new item instead.");
    }
    const fields=[]; const vals=[];
    if(req.body.nameEn!==undefined){fields.push(`name_en=$${vals.length+1}`);vals.push(nextName);}
    if(req.body.nameHi!==undefined){fields.push(`name_hi=$${vals.length+1}`);vals.push(String(req.body.nameHi).trim());}
    if(req.body.active!==undefined){fields.push(`active=$${vals.length+1}`);vals.push(Boolean(req.body.active));}
    if(!fields.length) throw new Error("Nothing to update");
    vals.push(req.params.id);
    const {rows}=await client.query(`UPDATE item_master SET ${fields.join(',')} WHERE id=$${vals.length} RETURNING *`,vals);
    await client.query("COMMIT");res.json(rows[0]);
  }catch(e){await client.query("ROLLBACK");res.status(400).json({error:e.message||"Failed to update item master"});}
  finally{client.release();}
});


mastersRouter.delete("/items/:id", async (req,res)=>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const found=await client.query("SELECT * FROM item_master WHERE id=$1 FOR UPDATE",[req.params.id]);
    if(!found.rows.length){ await client.query("ROLLBACK"); return res.status(404).json({error:"Item not found"}); }
    const item=found.rows[0];
    const linked=await client.query(`
      SELECT EXISTS(SELECT 1 FROM stock WHERE lower(trim(item))=lower(trim($1))) AS stock,
             EXISTS(SELECT 1 FROM mandi_purchases WHERE lower(trim(item))=lower(trim($1))) AS mandi,
             EXISTS(SELECT 1 FROM local_purchases WHERE lower(trim(item))=lower(trim($1))) AS local,
             EXISTS(SELECT 1 FROM sales WHERE lower(trim(item))=lower(trim($1))) AS sales,
             EXISTS(SELECT 1 FROM stock_movements WHERE lower(trim(item))=lower(trim($1))) AS movements
    `,[item.name_en]);
    const l=linked.rows[0];
    if(l.stock||l.mandi||l.local||l.sales||l.movements){
      throw new Error("This item is linked to business transactions and cannot be permanently deleted. Deactivate it instead to remove it from new transaction suggestions.");
    }
    await client.query("DELETE FROM item_master WHERE id=$1",[req.params.id]);
    await client.query("COMMIT");res.status(204).end();
  }catch(e){await client.query("ROLLBACK");res.status(409).json({error:e.message||"Failed to delete item master"});}
  finally{client.release();}
});

mastersRouter.post("/items/:id/specifications", async(req,res)=>{const name=String(req.body.name||"").trim();if(!name)return res.status(400).json({error:"Specification is required"});try{const {rows}=await pool.query(`INSERT INTO item_specifications(item_id,name) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING *`,[req.params.id,name]);res.status(201).json(rows[0]||{name})}catch(e){res.status(400).json({error:"Failed to save specification"})}});
mastersRouter.delete("/specifications/:id",async(req,res)=>{try{await pool.query("UPDATE item_specifications SET active=false WHERE id=$1",[req.params.id]);res.status(204).end()}catch(e){res.status(400).json({error:"Failed to delete specification"})}});

async function simpleMaster(req,res,table,fields){
  const name=String(req.body.name||"").trim(); if(!name)return res.status(400).json({error:"Name is required"});
  try{const extra=table==='unit_master'?[String(req.body.symbol||name).trim(),Number(req.body.kgMultiplier)]:table==='vendor_master'?[String(req.body.type||'Both')]:[];
    if(table==='unit_master' && (!Number.isFinite(extra[1])||extra[1]<=0)) return res.status(400).json({error:"Invalid kg conversion"});
    let q,vals;
    if(table==='unit_master'){
      const duplicate = await pool.query(`SELECT id,name FROM unit_master WHERE lower(trim(symbol))=lower(trim($1)) AND lower(trim(name))<>lower(trim($2)) LIMIT 1`, [extra[0], name]);
      if (duplicate.rows.length) return res.status(409).json({error:`Unit symbol "${extra[0]}" is already used by "${duplicate.rows[0].name}". Use a unique symbol.`});
      q=`INSERT INTO unit_master(name,symbol,kg_multiplier) VALUES($1,$2,$3) ON CONFLICT ((lower(trim(name)))) DO UPDATE SET symbol=EXCLUDED.symbol,kg_multiplier=EXCLUDED.kg_multiplier,active=true RETURNING *`;vals=[name,...extra]
    }
    else if(table==='vendor_master'){q=`INSERT INTO vendor_master(name,vendor_type) VALUES($1,$2) ON CONFLICT ((lower(trim(name)))) DO UPDATE SET vendor_type=EXCLUDED.vendor_type,active=true RETURNING *`;vals=[name,...extra]}
    else {q=`INSERT INTO expense_category_master(name) VALUES($1) ON CONFLICT ((lower(trim(name)))) DO UPDATE SET active=true RETURNING *`;vals=[name]}
    const {rows}=await pool.query(q,vals);res.status(201).json(rows[0]);
  }catch(e){console.error(e);res.status(400).json({error:"Failed to save master"})}
}
mastersRouter.post("/units",(req,res)=>simpleMaster(req,res,"unit_master"));
mastersRouter.post("/vendors",(req,res)=>simpleMaster(req,res,"vendor_master"));
mastersRouter.post("/expense-categories",(req,res)=>simpleMaster(req,res,"expense_category_master"));
