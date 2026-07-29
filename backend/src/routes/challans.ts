import { Router } from 'express';
import { ChallanModel, CustomerModel, ProductModel, StockMovementModel } from '../db/mongo';
import { validate, asyncHandler } from '../middleware/validate';
import { ChallanSchema, StatusSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { status, customer_id } = req.query as Record<string, string>;
  const filter: any = {};
  if (status) filter.status = { $regex: `^${status}$`, $options: 'i' };
  if (customer_id) filter.$or = [{ customerId: customer_id }, { customer_id: customer_id }];

  const docs = await ChallanModel.find(filter).sort({ createdAt: -1 }).lean();
  const rows = docs.map((d: any) => ({
    id: d._id.toString(),
    ...d,
    challan_no: d.challanNo || d.challan_no,
    customer_name: d.customerName || d.customer_name || 'Customer',
    total_qty: d.totalQty ?? d.total_qty ?? 0,
    created_at: d.createdAt || d.created_at,
  }));
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const doc = await ChallanModel.findById(req.params.id).lean();
  if (!doc) { res.status(404).json({ error: 'Not found' }); return; }

  const customer = (doc as any).customerId ? await CustomerModel.findById((doc as any).customerId).lean() : null;

  const formattedItems = (doc.items || []).map((i: any) => ({
    ...i,
    product_name: i.productName || i.product_name,
    product_sku: i.sku || i.product_sku,
    product_unit: i.unit || i.product_unit,
    unit_price: i.unitPrice ?? i.unit_price ?? 0,
  }));

  res.json({
    id: (doc as any)._id.toString(),
    ...doc,
    challan_no: (doc as any).challanNo || (doc as any).challan_no,
    customer_name: (doc as any).customerName || (doc as any).customer_name || (customer ? (customer as any).name : 'Customer'),
    address: customer ? (customer as any).address : '',
    gstin: customer ? (customer as any).gstin : '',
    items: formattedItems,
  });
}));

router.post('/', validate(ChallanSchema), asyncHandler(async (req, res) => {
  const { customer_id, delivery_address, notes, items } = req.body;
  const customer = await CustomerModel.findById(customer_id).lean();

  const count = await ChallanModel.countDocuments();
  const year = new Date().getFullYear();
  const challan_no = `CH-${year}-${String(count + 1).padStart(3, '0')}`;

  const formattedItems = [];
  let totalQty = 0;

  for (const item of items) {
    const p = await ProductModel.findById(item.product_id).lean();
    const itemTotal = item.qty * item.unit_price * (1 - (item.discount || 0) / 100);
    totalQty += item.qty;
    formattedItems.push({
      productId: item.product_id,
      product_id: item.product_id,
      productName: p ? p.name : 'Product',
      product_name: p ? p.name : 'Product',
      sku: p ? p.sku : '',
      product_sku: p ? p.sku : '',
      unit: p ? p.unit : 'pcs',
      product_unit: p ? p.unit : 'pcs',
      qty: item.qty,
      unitPrice: item.unit_price,
      unit_price: item.unit_price,
      discount: item.discount || 0,
      total: itemTotal,
    });
  }

  const newDoc = await ChallanModel.create({
    challanNo: challan_no,
    challan_no,
    customerId: customer_id,
    customer_id,
    customerName: customer ? customer.name : 'Customer',
    customer_name: customer ? customer.name : 'Customer',
    status: 'Draft',
    deliveryAddress: delivery_address || (customer ? customer.address : ''),
    delivery_address: delivery_address || (customer ? customer.address : ''),
    notes,
    totalQty,
    total_qty: totalQty,
    items: formattedItems,
  });

  res.status(201).json({ id: newDoc._id.toString(), challan_no, message: 'Challan created' });
}));

router.put('/:id/status', validate(StatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const challan = await ChallanModel.findById(req.params.id);
  if (!challan) { res.status(404).json({ error: 'Challan not found' }); return; }

  challan.status = status;
  await challan.save();

  if (status === 'dispatched') {
    for (const item of challan.items) {
      if (item.productId || item.product_id) {
        const pid = item.productId || item.product_id;
        await ProductModel.findByIdAndUpdate(pid, {
          $inc: { stockQty: -item.qty, stock_qty: -item.qty }
        });
        await StockMovementModel.create({
          productId: pid,
          product_id: pid,
          productName: item.productName || item.product_name,
          sku: item.sku || item.product_sku,
          type: 'sale',
          qty: -item.qty,
          refType: 'challan',
          ref_type: 'challan',
          refId: req.params.id,
          ref_id: req.params.id,
          notes: 'Challan dispatched',
        });
      }
    }
  }

  res.json({ message: 'Status updated' });
}));

export default router;
