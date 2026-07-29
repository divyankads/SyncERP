import { Router } from 'express';
import { SupplierModel } from '../db/mongo';
import { validate, asyncHandler } from '../middleware/validate';
import { SupplierSchema } from '../types/schemas';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const docs = await SupplierModel.find().sort({ name: 1 }).lean();
  const rows = docs.map((d: any) => ({
    id: d._id.toString(),
    ...d,
  }));
  res.json(rows);
}));

router.post('/', validate(SupplierSchema), asyncHandler(async (req, res) => {
  const { name, email, phone, address, gstin } = req.body;
  const newDoc = await SupplierModel.create({ name, email, phone, address, gstin });
  res.status(201).json({ id: newDoc._id.toString(), message: 'Supplier created' });
}));

router.put('/:id', validate(SupplierSchema), asyncHandler(async (req, res) => {
  const { name, email, phone, address, gstin } = req.body;
  await SupplierModel.findByIdAndUpdate(req.params.id, { name, email, phone, address, gstin });
  res.json({ message: 'Supplier updated' });
}));

export default router;
