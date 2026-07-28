import { Router } from 'express';
import pool from '../db/pool';
import { validate, asyncHandler } from '../middleware/validate';
import { InvoiceSchema, PaymentSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { status, customer_id } = req.query as Record<string, string>;
  let q = 'SELECT i.*, c.name as customer_name FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE 1=1';
  const params: any[] = [];
  if (status)      { params.push(status);      q += ` AND i.status = $${params.length}`; }
  if (customer_id) { params.push(customer_id); q += ` AND i.customer_id = $${params.length}`; }
  q += ' ORDER BY i.created_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT i.*, c.name as customer_name, c.address, c.gstin, c.phone, c.email
    FROM invoices i JOIN customers c ON i.customer_id = c.id
    WHERE i.id = $1
  `, [req.params.id]);
  if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }

  if (rows[0].challan_id) {
    const items = await pool.query(`
      SELECT ci.*, p.name as product_name, p.sku, p.unit, p.tax_rate
      FROM challan_items ci JOIN products p ON ci.product_id = p.id
      WHERE ci.challan_id = $1
    `, [rows[0].challan_id]);
    rows[0].items = items.rows;
  }
  res.json(rows[0]);
}));

router.post('/', validate(InvoiceSchema), asyncHandler(async (req, res) => {
  const { challan_id, customer_id, due_date, notes, items, discount_amount } = req.body;
  const countRes = await pool.query('SELECT COUNT(*) as c FROM invoices');
  const year = new Date().getFullYear();
  const invoice_no = `INV-${year}-${String(Number(countRes.rows[0].c) + 1).padStart(3, '0')}`;
  const subtotal     = items.reduce((s: number, i: any) => s + i.total, 0);
  const tax_amount   = items.reduce((s: number, i: any) => s + (i.total * ((i.tax_rate ?? 18) / 100)), 0);
  const total_amount = subtotal + tax_amount - (discount_amount || 0);

  const { rows } = await pool.query(
    'INSERT INTO invoices (invoice_no,challan_id,customer_id,due_date,subtotal,tax_amount,discount_amount,total_amount,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [invoice_no, challan_id || null, customer_id, due_date || null, subtotal, tax_amount, discount_amount || 0, total_amount, notes || null]
  );
  res.status(201).json({ id: rows[0].id, invoice_no, message: 'Invoice created' });
}));

router.put('/:id/payment', validate(PaymentSchema), asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const { rows } = await pool.query('SELECT * FROM invoices WHERE id=$1', [req.params.id]);
  if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }

  const new_paid = Number(rows[0].paid_amount) + amount;
  const status   = new_paid >= Number(rows[0].total_amount) ? 'paid' : 'partial';
  await pool.query('UPDATE invoices SET paid_amount=$1, status=$2 WHERE id=$3', [new_paid, status, req.params.id]);
  res.json({ message: 'Payment recorded', status });
}));

export default router;
