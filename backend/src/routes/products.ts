import { Router } from 'express';
import { ProductModel } from '../db/mongo';
import { validate, asyncHandler } from '../middleware/validate';
import { ProductSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { search, category, low_stock } = req.query as Record<string, string>;
  const filter: any = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) {
    filter.category = category;
  }
  if (low_stock === 'true') {
    filter.$expr = { $lte: ['$stockQty', '$minStock'] };
  }

  const docs = await ProductModel.find(filter).sort({ name: 1 }).lean();
  const rows = docs.map((d: any) => ({
    id: d._id.toString(),
    ...d,
    purchase_price: d.purchasePrice ?? d.purchase_price ?? 0,
    sale_price: d.salePrice ?? d.sale_price ?? 0,
    tax_rate: d.taxRate ?? d.tax_rate ?? 18,
    stock_qty: d.stockQty ?? d.stock_qty ?? 0,
    min_stock: d.minStock ?? d.min_stock ?? 10,
  }));
  res.json(rows);
}));

router.post('/', validate(ProductSchema), asyncHandler(async (req, res) => {
  const { sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock, location } = req.body;
  const newDoc = await ProductModel.create({
    sku,
    name,
    category,
    unit: unit || 'pcs',
    purchasePrice: purchase_price || 0,
    purchase_price: purchase_price || 0,
    salePrice: sale_price || 0,
    sale_price: sale_price || 0,
    taxRate: tax_rate || 18,
    tax_rate: tax_rate || 18,
    stockQty: stock_qty || 0,
    stock_qty: stock_qty || 0,
    minStock: min_stock || 10,
    min_stock: min_stock || 10,
    location: location || 'Warehouse A',
  });
  res.status(201).json({ id: newDoc._id.toString(), message: 'Product created' });
}));

router.put('/:id', validate(ProductSchema), asyncHandler(async (req, res) => {
  const { sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock, location } = req.body;
  await ProductModel.findByIdAndUpdate(req.params.id, {
    sku,
    name,
    category,
    unit,
    purchasePrice: purchase_price,
    purchase_price,
    salePrice: sale_price,
    sale_price,
    taxRate: tax_rate,
    tax_rate,
    stockQty: stock_qty,
    stock_qty,
    minStock: min_stock,
    min_stock,
    location,
  });
  res.json({ message: 'Product updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await ProductModel.findByIdAndDelete(req.params.id);
  res.json({ message: 'Product deleted' });
}));

export default router;
