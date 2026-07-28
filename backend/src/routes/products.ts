import { Router } from 'express';
import pool from '../db/pool';
import { validate, asyncHandler } from '../middleware/validate';
import { ProductSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { search, category, low_stock } = req.query as Record<string, string>;
  let q = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    q += ` AND (name ILIKE $${params.length} OR sku ILIKE $${params.length})`;
  }
  if (category) {
    params.push(category);
    q += ` AND category = $${params.length}`;
  }
  if (low_stock === 'true') {
    q += ' AND stock_qty <= min_stock';
  }
  q += ' ORDER BY name';

  const { rows } = await pool.query(q, params);
  res.json(rows);
}));

router.post('/', validate(ProductSchema), asyncHandler(async (req, res) => {
  const { sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO products (sku,name,category,unit,purchase_price,sale_price,tax_rate,stock_qty,min_stock) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock]
  );
  res.status(201).json({ id: rows[0].id, message: 'Product created' });
}));

router.put('/:id', validate(ProductSchema), asyncHandler(async (req, res) => {
  const { sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock } = req.body;
  await pool.query(
    'UPDATE products SET sku=$1,name=$2,category=$3,unit=$4,purchase_price=$5,sale_price=$6,tax_rate=$7,stock_qty=$8,min_stock=$9 WHERE id=$10',
    [sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock, req.params.id]
  );
  res.json({ message: 'Product updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ message: 'Product deleted' });
}));

export default router;
