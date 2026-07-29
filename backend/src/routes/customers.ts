import { Router } from 'express';
import { CustomerModel, InvoiceModel, CRMFollowupModel, ChallanModel } from '../db/mongo';
import { validate, asyncHandler } from '../middleware/validate';
import { CustomerSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { search, status, customer_type } = req.query as Record<string, string>;
  const filter: any = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobileNumber: { $regex: search, $options: 'i' } },
      { mobile_number: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) {
    filter.$or = [
      { status: { $regex: `^${status}$`, $options: 'i' } }
    ];
  }
  if (customer_type) {
    filter.customerType = { $regex: `^${customer_type}$`, $options: 'i' };
  }

  const docs = await CustomerModel.find(filter).sort({ createdAt: -1 }).lean();
  const rows = docs.map((d: any) => ({
    id: d._id.toString(),
    ...d,
    mobile_number: d.mobileNumber || d.mobile_number,
    business_name: d.businessName || d.business_name,
    customer_type: d.customerType || d.customer_type,
    credit_limit: d.creditLimit ?? d.credit_limit ?? 0,
    follow_up_date: d.followUpDate || d.follow_up_date,
    created_at: d.createdAt || d.created_at,
  }));
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const customer = await CustomerModel.findById(req.params.id).lean();
  if (!customer) { res.status(404).json({ error: 'Customer not found' }); return; }

  const [invoices, followups, challans] = await Promise.all([
    InvoiceModel.find({ customerId: req.params.id }).sort({ createdAt: -1 }).lean(),
    CRMFollowupModel.find({ customerId: req.params.id }).sort({ createdAt: -1 }).lean(),
    ChallanModel.find({ customerId: req.params.id }).sort({ createdAt: -1 }).lean(),
  ]);

  res.json({
    id: (customer as any)._id.toString(),
    ...customer,
    mobile_number: (customer as any).mobileNumber || (customer as any).mobile_number,
    business_name: (customer as any).businessName || (customer as any).business_name,
    customer_type: (customer as any).customerType || (customer as any).customer_type,
    credit_limit: (customer as any).creditLimit ?? (customer as any).credit_limit ?? 0,
    invoices,
    followups,
    challans,
  });
}));

router.post('/', validate(CustomerSchema), asyncHandler(async (req, res) => {
  const { name, email, phone, mobile_number, address, city, gstin, credit_limit, customer_type, business_name, status, notes } = req.body;
  const newDoc = await CustomerModel.create({
    name,
    email,
    mobileNumber: phone || mobile_number,
    mobile_number: phone || mobile_number,
    businessName: business_name,
    business_name,
    address,
    city,
    gstin,
    creditLimit: credit_limit || 0,
    credit_limit: credit_limit || 0,
    customerType: customer_type || 'Retail',
    customer_type: customer_type || 'Retail',
    status: status || 'Active',
    notes,
  });
  res.status(201).json({ id: newDoc._id.toString(), message: 'Customer created' });
}));

router.put('/:id', validate(CustomerSchema), asyncHandler(async (req, res) => {
  const { name, email, phone, mobile_number, address, city, gstin, credit_limit, customer_type, business_name, status, notes } = req.body;
  await CustomerModel.findByIdAndUpdate(req.params.id, {
    name,
    email,
    mobileNumber: phone || mobile_number,
    mobile_number: phone || mobile_number,
    businessName: business_name,
    business_name,
    address,
    city,
    gstin,
    creditLimit: credit_limit || 0,
    credit_limit: credit_limit || 0,
    customerType: customer_type || 'Retail',
    customer_type: customer_type || 'Retail',
    status: status || 'Active',
    notes,
  });
  res.json({ message: 'Customer updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await CustomerModel.findByIdAndUpdate(req.params.id, { status: 'Inactive' });
  res.json({ message: 'Customer deactivated' });
}));

export default router;
