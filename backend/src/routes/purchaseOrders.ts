import { Router } from 'express';
import pool from '../db/pool';
import { validate, asyncHandler } from '../middleware/validate';
import { PurchaseOrderSchema, StatusSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY po.created_at DESC
  `);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = $1
  `, [req.params.id]);
  if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }

  const items = await pool.query(`
    SELECT pi.*, p.name as product_name, p.sku, p.unit
    FROM po_items pi JOIN products p ON pi.product_id = p.id
    WHERE pi.po_id = $1
  `, [req.params.id]);
  res.json({ ...rows[0], items: items.rows });
}));

router.post('/', validate(PurchaseOrderSchema), asyncHandler(async (req, res) => {
  const { supplier_id, expected_date, notes, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const countRes = await client.query('SELECT COUNT(*) as c FROM purchase_orders');
    const year = new Date().getFullYear();
    const po_number = `PO-${year}-${String(Number(countRes.rows[0].c) + 1).padStart(3, '0')}`;
    const total = items.reduce((s: number, i: any) => s + i.qty * i.unit_price, 0);

    const poRes = await client.query(
      'INSERT INTO purchase_orders (po_number,supplier_id,expected_date,total_amount,notes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [po_number, supplier_id, expected_date || null, total, notes || null]
    );
    const poId = poRes.rows[0].id;

    for (const item of items) {
      await client.query(
        'INSERT INTO po_items (po_id,product_id,qty,unit_price) VALUES ($1,$2,$3,$4)',
        [poId, item.product_id, item.qty, item.unit_price]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id: poId, po_number, message: 'Purchase order created' });
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
    await client.query('UPDATE purchase_orders SET status=$1 WHERE id=$2', [status, req.params.id]);

    if (status === 'received') {
      const items = await client.query('SELECT * FROM po_items WHERE po_id=$1', [req.params.id]);
      for (const item of items.rows) {
        await client.query('UPDATE products SET stock_qty = stock_qty + $1 WHERE id=$2', [item.qty, item.product_id]);
        await client.query(
          "INSERT INTO stock_movements (product_id,type,qty,ref_type,ref_id,notes) VALUES ($1,'purchase',$2,'purchase_order',$3,'PO received')",
          [item.product_id, item.qty, req.params.id]
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
