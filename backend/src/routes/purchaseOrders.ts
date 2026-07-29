import { Router } from 'express';
import { PurchaseOrderModel, SupplierModel, ProductModel, StockMovementModel } from '../db/mongo';
import { validate, asyncHandler } from '../middleware/validate';
import { PurchaseOrderSchema, StatusSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const docs = await PurchaseOrderModel.find().sort({ createdAt: -1 }).lean();
  const rows = docs.map((d: any) => ({
    id: d._id.toString(),
    ...d,
    po_number: d.poNumber || d.po_number,
    supplier_name: d.supplierName || d.supplier_name || 'Supplier',
    total_amount: d.totalAmount ?? d.total_amount ?? 0,
    expected_date: d.expectedDate || d.expected_date,
    created_at: d.createdAt || d.created_at,
  }));
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const doc = await PurchaseOrderModel.findById(req.params.id).lean();
  if (!doc) { res.status(404).json({ error: 'Not found' }); return; }

  const formattedItems = (doc.items || []).map((i: any) => ({
    ...i,
    product_name: i.productName || i.product_name,
    unit_price: i.unitPrice ?? i.unit_price ?? 0,
  }));

  res.json({
    id: (doc as any)._id.toString(),
    ...doc,
    po_number: (doc as any).poNumber || (doc as any).po_number,
    supplier_name: (doc as any).supplierName || (doc as any).supplier_name || 'Supplier',
    items: formattedItems,
  });
}));

router.post('/', validate(PurchaseOrderSchema), asyncHandler(async (req, res) => {
  const { supplier_id, expected_date, notes, items } = req.body;
  const supplier = await SupplierModel.findById(supplier_id).lean();

  const count = await PurchaseOrderModel.countDocuments();
  const year = new Date().getFullYear();
  const po_number = `PO-${year}-${String(count + 1).padStart(3, '0')}`;

  const formattedItems = [];
  let total = 0;

  for (const item of items) {
    const p = await ProductModel.findById(item.product_id).lean();
    const itemTotal = item.qty * item.unit_price;
    total += itemTotal;
    formattedItems.push({
      productId: item.product_id,
      product_id: item.product_id,
      productName: p ? p.name : 'Product',
      product_name: p ? p.name : 'Product',
      sku: p ? p.sku : '',
      unit: p ? p.unit : 'pcs',
      qty: item.qty,
      unitPrice: item.unit_price,
      unit_price: item.unit_price,
      total: itemTotal,
    });
  }

  const newDoc = await PurchaseOrderModel.create({
    poNumber: po_number,
    po_number,
    supplierId: supplier_id,
    supplier_id,
    supplierName: supplier ? supplier.name : 'Supplier',
    supplier_name: supplier ? supplier.name : 'Supplier',
    status: 'draft',
    expectedDate: expected_date ? new Date(expected_date) : null,
    expected_date: expected_date ? new Date(expected_date) : null,
    totalAmount: total,
    total_amount: total,
    notes,
    items: formattedItems,
  });

  res.status(201).json({ id: newDoc._id.toString(), po_number, message: 'Purchase order created' });
}));

router.put('/:id/status', validate(StatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const po = await PurchaseOrderModel.findById(req.params.id);
  if (!po) { res.status(404).json({ error: 'Purchase order not found' }); return; }

  po.status = status;
  await po.save();

  if (status === 'received') {
    for (const item of po.items) {
      if (item.productId || item.product_id) {
        const pid = item.productId || item.product_id;
        await ProductModel.findByIdAndUpdate(pid, {
          $inc: { stockQty: item.qty, stock_qty: item.qty }
        });
        await StockMovementModel.create({
          productId: pid,
          product_id: pid,
          productName: item.productName || item.product_name,
          sku: item.sku,
          type: 'purchase',
          qty: item.qty,
          refType: 'purchase_order',
          ref_type: 'purchase_order',
          refId: req.params.id,
          ref_id: req.params.id,
          notes: 'PO received',
        });
      }
    }
  }

  res.json({ message: 'Status updated' });
}));

export default router;
