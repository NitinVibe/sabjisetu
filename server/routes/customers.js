import { Router } from "express";
import { pool } from "../db.js";
import { todayIST } from "./helpers.js";

export const customersRouter = Router();

const today = () => todayIST();

async function refreshCustomer(client, id) {
  const { rows } = await client.query(`
    SELECT c.id, c.name, c.phone,
      COALESCE((SELECT SUM(s.amount) FROM sales s WHERE lower(trim(s.customer))=lower(trim(c.name))),0) AS business,
      GREATEST(0,
        COALESCE((SELECT SUM(s.amount) FROM sales s WHERE lower(trim(s.customer))=lower(trim(c.name)) AND s.status='Due'),0)
        - COALESCE((SELECT SUM(p.amount) FROM customer_payments p WHERE p.customer_id=c.id AND p.source_sale_id IS NULL),0)
      ) AS due,
      (SELECT TO_CHAR(MIN(s.date), 'YYYY-MM-DD') FROM sales s WHERE lower(trim(s.customer))=lower(trim(c.name)) AND s.status='Due') AS due_date
    FROM customers c WHERE c.id=$1
  `, [id]);
  if (!rows.length) return null;
  const r=rows[0], due=Number(r.due||0), d=r.due_date ? String(r.due_date).slice(0,10) : null;
  const status=due<=0 ? 'Upcoming' : d<today() ? 'Overdue' : d===today() ? 'Due Today' : 'Upcoming';
  await client.query('UPDATE customers SET due=$1,business=$2,due_date=$3,status=$4 WHERE id=$5',[due,Number(r.business||0),d,status,id]);
  return {...r,business:Number(r.business||0),due,dueDate:d,status};
}

customersRouter.get('/', async (_req,res)=>{
  try {
    const {rows}=await pool.query('SELECT id,name,phone,created_at FROM customers ORDER BY created_at DESC');
    const out=[];
    for (const r of rows) { const c=await refreshCustomer(pool,r.id); out.push(c); }
    res.json(out);
  } catch(err) { console.error(err); res.status(500).json({error:'Failed to load customers'}); }
});

customersRouter.post('/', async(req,res)=>{
  const name=String(req.body.name||'').trim(), phone=String(req.body.phone||'').trim();
  if(!name) return res.status(400).json({error:'Customer name is required'});
  try {
    const {rows}=await pool.query('INSERT INTO customers(name,phone) VALUES($1,$2) RETURNING *',[name,phone]);
    res.status(201).json({...rows[0],due:0,business:0,dueDate:null,status:'Upcoming'});
  } catch(err) { res.status(400).json({error:err.code==='23505'?'Customer already exists':'Failed to create customer'}); }
});

customersRouter.patch('/:id', async(req,res)=>{
  const name=req.body.name!==undefined?String(req.body.name).trim():undefined;
  const phone=req.body.phone!==undefined?String(req.body.phone).trim():undefined;
  if(name===undefined&&phone===undefined) return res.status(400).json({error:'Nothing to update'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT id,name,phone FROM customers WHERE id=$1 FOR UPDATE',[req.params.id]);
    if (!current.rows.length) throw new Error('Customer not found');
    if (name!==undefined && name.toLowerCase() !== String(current.rows[0].name).trim().toLowerCase()) {
      const linked = await client.query(`
        SELECT EXISTS(SELECT 1 FROM sales WHERE lower(trim(customer))=lower(trim($1))) AS sales,
               EXISTS(SELECT 1 FROM customer_payments WHERE customer_id=$2) AS payments
      `,[current.rows[0].name,req.params.id]);
      if (linked.rows[0].sales || linked.rows[0].payments) {
        throw new Error('Customer name cannot be changed after sales or payments exist. Change only the mobile number to keep the customer ledger connected.');
      }
    }
    const fields=[],vals=[];
    if(name!==undefined){fields.push(`name=$${vals.length+1}`);vals.push(name);}
    if(phone!==undefined){fields.push(`phone=$${vals.length+1}`);vals.push(phone);}
    vals.push(req.params.id);
    const {rows}=await client.query(`UPDATE customers SET ${fields.join(',')} WHERE id=$${vals.length} RETURNING id`,vals);
    if(!rows.length) throw new Error('Customer not found');
    const out=await refreshCustomer(client,req.params.id);
    await client.query('COMMIT');
    res.json(out);
  } catch(err) { await client.query('ROLLBACK'); console.error(err); res.status(400).json({error:err.message||'Failed to update customer'}); }
  finally { client.release(); }
});

customersRouter.delete('/:id',async(req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const found=await client.query('SELECT id,name FROM customers WHERE id=$1 FOR UPDATE',[req.params.id]);
    if(!found.rows.length){await client.query('ROLLBACK');return res.status(404).json({error:'Customer not found'});}
    const linked=await client.query(`SELECT EXISTS(SELECT 1 FROM sales WHERE lower(trim(customer))=lower(trim($1))) AS sales, EXISTS(SELECT 1 FROM customer_payments WHERE customer_id=$2) AS payments`,[found.rows[0].name,req.params.id]);
    if(linked.rows[0].sales||linked.rows[0].payments) throw new Error('Customer is linked to sales or payments and cannot be deleted. Keep the ledger history intact.');
    await client.query('DELETE FROM customers WHERE id=$1',[req.params.id]);
    await client.query('COMMIT');res.status(204).end();
  }catch(err){await client.query('ROLLBACK');res.status(409).json({error:err.message||'Cannot delete customer'});}finally{client.release();}
});
