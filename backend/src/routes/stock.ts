import { Router } from 'express';
import pool from '../db/pool';
import { asyncHandler } from '../middleware/validate';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const [products, movements] = await Promise.all([
    pool.query('SELECT * FROM products ORDER BY stock_qty ASC'),
    pool.query(`
      SELECT sm.*, p.name as product_name, p.sku
      FROM stock_movements sm JOIN products p ON sm.product_id = p.id
      ORDER BY sm.created_at DESC LIMIT 20
    `),
  ]);
  res.json({ products: products.rows, movements: movements.rows });
}));

export default router;
