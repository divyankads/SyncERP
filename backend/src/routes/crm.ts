import { Router } from 'express';
import pool from '../db/pool';
import { validate, asyncHandler } from '../middleware/validate';
import { CRMSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { status, customer_id } = req.query as Record<string, string>;
  let q = 'SELECT f.*, c.name as customer_name FROM crm_followups f JOIN customers c ON f.customer_id = c.id WHERE 1=1';
  const params: any[] = [];
  if (status)      { params.push(status);      q += ` AND f.status = $${params.length}`; }
  if (customer_id) { params.push(customer_id); q += ` AND f.customer_id = $${params.length}`; }
  q += ' ORDER BY f.follow_date DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
}));

router.post('/', validate(CRMSchema), asyncHandler(async (req, res) => {
  const { customer_id, type, notes, status, follow_date } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO crm_followups (customer_id,type,notes,status,follow_date) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [customer_id, type, notes || null, status, follow_date]
  );
  res.status(201).json({ id: rows[0].id, message: 'Follow-up created' });
}));

router.put('/:id', validate(CRMSchema), asyncHandler(async (req, res) => {
  const { type, notes, status, follow_date } = req.body;
  await pool.query(
    'UPDATE crm_followups SET type=$1,notes=$2,status=$3,follow_date=$4 WHERE id=$5',
    [type, notes || null, status, follow_date, req.params.id]
  );
  res.json({ message: 'Follow-up updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM crm_followups WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
}));

export default router;
