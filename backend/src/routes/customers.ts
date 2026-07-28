import { Router } from 'express';
import pool from '../db/pool';
import { validate, asyncHandler } from '../middleware/validate';
import { CustomerSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { search, status } = req.query as Record<string, string>;
  let q = 'SELECT * FROM customers WHERE 1=1';
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    q += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`;
  }
  if (status) {
    params.push(status);
    q += ` AND status = $${params.length}`;
  }
  q += ' ORDER BY created_at DESC';

  const { rows } = await pool.query(q, params);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  if (!rows[0]) { res.status(404).json({ error: 'Customer not found' }); return; }

  const [invoices, followups, challans] = await Promise.all([
    pool.query('SELECT * FROM invoices WHERE customer_id = $1 ORDER BY created_at DESC', [req.params.id]),
    pool.query('SELECT * FROM crm_followups WHERE customer_id = $1 ORDER BY created_at DESC', [req.params.id]),
    pool.query('SELECT * FROM challans WHERE customer_id = $1 ORDER BY created_at DESC', [req.params.id]),
  ]);
  res.json({ ...rows[0], invoices: invoices.rows, followups: followups.rows, challans: challans.rows });
}));

router.post('/', validate(CustomerSchema), asyncHandler(async (req, res) => {
  const { name, email, phone, address, city, gstin, credit_limit } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO customers (name,email,phone,address,city,gstin,credit_limit) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [name, email, phone, address, city, gstin, credit_limit]
  );
  res.status(201).json({ id: rows[0].id, message: 'Customer created' });
}));

router.put('/:id', validate(CustomerSchema), asyncHandler(async (req, res) => {
  const { name, email, phone, address, city, gstin, credit_limit, status } = req.body;
  await pool.query(
    'UPDATE customers SET name=$1,email=$2,phone=$3,address=$4,city=$5,gstin=$6,credit_limit=$7,status=$8 WHERE id=$9',
    [name, email, phone, address, city, gstin, credit_limit, status, req.params.id]
  );
  res.json({ message: 'Customer updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await pool.query("UPDATE customers SET status='inactive' WHERE id=$1", [req.params.id]);
  res.json({ message: 'Customer deactivated' });
}));

export default router;
