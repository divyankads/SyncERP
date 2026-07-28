import { Router } from 'express';
import pool from '../db/pool';
import { validate, asyncHandler } from '../middleware/validate';
import { SupplierSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM suppliers ORDER BY name');
  res.json(rows);
}));

router.post('/', validate(SupplierSchema), asyncHandler(async (req, res) => {
  const { name, email, phone, address, gstin } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO suppliers (name,email,phone,address,gstin) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [name, email, phone, address, gstin]
  );
  res.status(201).json({ id: rows[0].id, message: 'Supplier created' });
}));

router.put('/:id', validate(SupplierSchema), asyncHandler(async (req, res) => {
  const { name, email, phone, address, gstin } = req.body;
  await pool.query(
    'UPDATE suppliers SET name=$1,email=$2,phone=$3,address=$4,gstin=$5 WHERE id=$6',
    [name, email, phone, address, gstin, req.params.id]
  );
  res.json({ message: 'Supplier updated' });
}));

export default router;
