import { Router } from 'express';
import { InvoiceModel, CustomerModel, ChallanModel } from '../db/mongo';
import { validate, asyncHandler } from '../middleware/validate';
import { InvoiceSchema, PaymentSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { status, customer_id } = req.query as Record<string, string>;
  const filter: any = {};
  if (status) filter.status = status;
  if (customer_id) filter.$or = [{ customerId: customer_id }, { customer_id: customer_id }];

  const docs = await InvoiceModel.find(filter).sort({ createdAt: -1 }).lean();
  const rows = docs.map((d: any) => ({
    id: d._id.toString(),
    ...d,
    invoice_no: d.invoiceNo || d.invoice_no,
    customer_name: d.customerName || d.customer_name || 'Customer',
    total_amount: d.totalAmount ?? d.total_amount ?? 0,
    paid_amount: d.paidAmount ?? d.paid_amount ?? 0,
    due_date: d.dueDate || d.due_date,
    created_at: d.createdAt || d.created_at,
  }));
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const doc = await InvoiceModel.findById(req.params.id).lean();
  if (!doc) { res.status(404).json({ error: 'Not found' }); return; }

  const customer = (doc as any).customerId ? await CustomerModel.findById((doc as any).customerId).lean() : null;

  let items = doc.items || [];
  if ((!items || items.length === 0) && (doc as any).challanId) {
    const challan = await ChallanModel.findById((doc as any).challanId).lean();
    if (challan && challan.items) {
      items = challan.items;
    }
  }

  const formattedItems = (items || []).map((i: any) => ({
    ...i,
    product_name: i.productName || i.product_name,
    product_sku: i.sku || i.product_sku,
    product_unit: i.unit || i.product_unit,
    unit_price: i.unitPrice ?? i.unit_price ?? 0,
  }));

  res.json({
    id: (doc as any)._id.toString(),
    ...doc,
    invoice_no: (doc as any).invoiceNo || (doc as any).invoice_no,
    customer_name: (doc as any).customerName || (doc as any).customer_name || (customer ? (customer as any).name : 'Customer'),
    address: customer ? (customer as any).address : '',
    gstin: customer ? (customer as any).gstin : '',
    phone: customer ? (customer as any).mobileNumber || (customer as any).phone : '',
    email: customer ? (customer as any).email : '',
    items: formattedItems,
  });
}));

router.post('/', validate(InvoiceSchema), asyncHandler(async (req, res) => {
  const { challan_id, customer_id, due_date, notes, items, discount_amount } = req.body;
  const customer = await CustomerModel.findById(customer_id).lean();

  const count = await InvoiceModel.countDocuments();
  const year = new Date().getFullYear();
  const invoice_no = `INV-${year}-${String(count + 1).padStart(3, '0')}`;

  const subtotal = (items || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
  const tax_amount = (items || []).reduce((s: number, i: any) => s + ((i.total || 0) * (((i.tax_rate ?? i.taxRate) || 18) / 100)), 0);
  const total_amount = subtotal + tax_amount - (discount_amount || 0);

  const newDoc = await InvoiceModel.create({
    invoiceNo: invoice_no,
    invoice_no,
    challanId: challan_id || null,
    challan_id: challan_id || null,
    customerId: customer_id,
    customer_id,
    customerName: customer ? customer.name : 'Customer',
    customer_name: customer ? customer.name : 'Customer',
    status: 'unpaid',
    dueDate: due_date ? new Date(due_date) : null,
    due_date: due_date ? new Date(due_date) : null,
    subtotal,
    taxAmount: tax_amount,
    tax_amount,
    discountAmount: discount_amount || 0,
    discount_amount: discount_amount || 0,
    totalAmount: total_amount,
    total_amount,
    paidAmount: 0,
    paid_amount: 0,
    notes,
    items,
  });

  res.status(201).json({ id: newDoc._id.toString(), invoice_no, message: 'Invoice created' });
}));

router.put('/:id/payment', validate(PaymentSchema), asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const inv = await InvoiceModel.findById(req.params.id);
  if (!inv) { res.status(404).json({ error: 'Not found' }); return; }

  const currentPaid = inv.paidAmount || inv.paid_amount || 0;
  const totalAmt = inv.totalAmount || inv.total_amount || 0;

  const newPaid = Number(currentPaid) + Number(amount);
  const newStatus = newPaid >= Number(totalAmt) ? 'paid' : 'partial';

  inv.paidAmount = newPaid;
  inv.paid_amount = newPaid;
  inv.status = newStatus;
  await inv.save();

  res.json({ message: 'Payment recorded', status: newStatus });
}));

export default router;
