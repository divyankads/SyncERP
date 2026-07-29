import { Router } from 'express';
import { ProductModel, StockMovementModel } from '../db/mongo';
import { asyncHandler } from '../middleware/validate';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const [productDocs, movementDocs] = await Promise.all([
    ProductModel.find().sort({ stockQty: 1, stock_qty: 1 }).lean(),
    StockMovementModel.find().sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  const products = productDocs.map((d: any) => ({
    id: d._id.toString(),
    ...d,
    purchase_price: d.purchasePrice ?? d.purchase_price ?? 0,
    sale_price: d.salePrice ?? d.sale_price ?? 0,
    stock_qty: d.stockQty ?? d.stock_qty ?? 0,
    min_stock: d.minStock ?? d.min_stock ?? 10,
  }));

  const movements = movementDocs.map((d: any) => ({
    id: d._id.toString(),
    ...d,
    product_name: d.productName || d.product_name || 'Product',
    ref_type: d.refType || d.ref_type,
    ref_id: d.refId || d.ref_id,
    created_at: d.createdAt || d.created_at,
  }));

  res.json({ products, movements });
}));

export default router;
