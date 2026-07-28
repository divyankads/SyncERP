import { Router } from 'express';
import pool from '../db/pool';
import { validate, asyncHandler } from '../middleware/validate';
import { ChallanSchema, StatusSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { status, customer_id } = req.query as Record<string, string>;
  let q = 'SELECT ch.*, c.name as customer_name FROM challans ch JOIN customers c ON ch.customer_id = c.id WHERE 1=1';
  const params: any[] = [];
  if (status)      { params.push(status);      q += ` AND ch.status = $${params.length}`; }
  if (customer_id) { params.push(customer_id); q += ` AND ch.customer_id = $${params.length}`; }
  q += ' ORDER BY ch.created_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT ch.*, c.name as customer_name, c.address, c.gstin
    FROM challans ch JOIN customers c ON ch.customer_id = c.id
    WHERE ch.id = $1
  `, [req.params.id]);
  if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }

  const items = await pool.query(`
    SELECT ci.*, p.name as product_name, p.sku, p.unit, p.tax_rate
    FROM challan_items ci JOIN products p ON ci.product_id = p.id
    WHERE ci.challan_id = $1
  `, [req.params.id]);
  res.json({ ...rows[0], items: items.rows });
}));

router.post('/', validate(ChallanSchema), asyncHandler(async (req, res) => {
  const { customer_id, delivery_address, notes, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const countRes = await client.query('SELECT COUNT(*) as c FROM challans');
    const year = new Date().getFullYear();
    const challan_no = `CH-${year}-${String(Number(countRes.rows[0].c) + 1).padStart(3, '0')}`;

    const chRes = await client.query(
      'INSERT INTO challans (challan_no,customer_id,delivery_address,notes) VALUES ($1,$2,$3,$4) RETURNING id',
      [challan_no, customer_id, delivery_address || null, notes || null]
    );
    const challanId = chRes.rows[0].id;

    for (const item of items) {
      await client.query(
        'INSERT INTO challan_items (challan_id,product_id,qty,unit_price,discount) VALUES ($1,$2,$3,$4,$5)',
        [challanId, item.product_id, item.qty, item.unit_price, item.discount ?? 0]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id: challanId, challan_no, message: 'Challan created' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

router.put('/:id/status', validate(StatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE challans SET status=$1 WHERE id=$2', [status, req.params.id]);

    if (status === 'dispatched') {
      const items = await client.query('SELECT * FROM challan_items WHERE challan_id=$1', [req.params.id]);
      for (const item of items.rows) {
        await client.query('UPDATE products SET stock_qty = stock_qty - $1 WHERE id=$2', [item.qty, item.product_id]);
        await client.query(
          "INSERT INTO stock_movements (product_id,type,qty,ref_type,ref_id,notes) VALUES ($1,'sale',$2,'challan',$3,'Challan dispatched')",
          [item.product_id, -item.qty, req.params.id]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Status updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

export default router;
