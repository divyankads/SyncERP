import { Router } from 'express';
import { CRMFollowupModel, CustomerModel } from '../db/mongo';
import { validate, asyncHandler } from '../middleware/validate';
import { CRMSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { status, customer_id } = req.query as Record<string, string>;
  const filter: any = {};
  if (status) filter.status = status;
  if (customer_id) filter.$or = [{ customerId: customer_id }, { customer_id: customer_id }];

  const docs = await CRMFollowupModel.find(filter).sort({ followDate: -1, createdAt: -1 }).lean();
  const rows = docs.map((d: any) => ({
    id: d._id.toString(),
    ...d,
    customer_name: d.customerName || d.customer_name || 'Customer',
    follow_date: d.followDate || d.follow_date,
    created_at: d.createdAt || d.created_at,
  }));
  res.json(rows);
}));

router.post('/', validate(CRMSchema), asyncHandler(async (req, res) => {
  const { customer_id, type, notes, status, follow_date } = req.body;
  const customer = await CustomerModel.findById(customer_id).lean();

  const newDoc = await CRMFollowupModel.create({
    customerId: customer_id,
    customer_id,
    customerName: customer ? customer.name : 'Customer',
    customer_name: customer ? customer.name : 'Customer',
    type,
    notes: notes || null,
    status: status || 'pending',
    followDate: follow_date ? new Date(follow_date) : new Date(),
    follow_date: follow_date ? new Date(follow_date) : new Date(),
  });

  res.status(201).json({ id: newDoc._id.toString(), message: 'Follow-up created' });
}));

router.put('/:id', validate(CRMSchema), asyncHandler(async (req, res) => {
  const { type, notes, status, follow_date } = req.body;
  await CRMFollowupModel.findByIdAndUpdate(req.params.id, {
    type,
    notes: notes || null,
    status,
    followDate: follow_date ? new Date(follow_date) : new Date(),
    follow_date: follow_date ? new Date(follow_date) : new Date(),
  });
  res.json({ message: 'Follow-up updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await CRMFollowupModel.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

export default router;
