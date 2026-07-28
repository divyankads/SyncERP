import { z } from 'zod';

// ─── Customers ────────────────────────────────────────────────────────────────
export const CustomerSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(255),
  email:        z.string().email().optional().or(z.literal('')),
  phone:        z.string().max(20).optional(),
  address:      z.string().optional(),
  city:         z.string().max(100).optional(),
  gstin:        z.string().max(20).optional(),
  credit_limit: z.coerce.number().min(0).default(0),
  status:       z.enum(['active', 'inactive']).default('active'),
});

// ─── Products ─────────────────────────────────────────────────────────────────
export const ProductSchema = z.object({
  sku:            z.string().min(1).max(50),
  name:           z.string().min(1).max(255),
  category:       z.string().max(100).optional(),
  unit:           z.string().max(20).default('pcs'),
  purchase_price: z.coerce.number().min(0),
  sale_price:     z.coerce.number().min(0),
  tax_rate:       z.coerce.number().min(0).max(100).default(18),
  stock_qty:      z.coerce.number().default(0),
  min_stock:      z.coerce.number().min(0).default(10),
});

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const SupplierSchema = z.object({
  name:    z.string().min(1).max(255),
  email:   z.string().email().optional().or(z.literal('')),
  phone:   z.string().max(20).optional(),
  address: z.string().optional(),
  gstin:   z.string().max(20).optional(),
});

// ─── PO Items ─────────────────────────────────────────────────────────────────
export const POItemSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  qty:        z.coerce.number().positive(),
  unit_price: z.coerce.number().positive(),
});

export const PurchaseOrderSchema = z.object({
  supplier_id:   z.coerce.number().int().positive(),
  expected_date: z.string().optional(),
  notes:         z.string().optional(),
  items:         z.array(POItemSchema).min(1, 'At least one item required'),
});

// ─── Challan Items ────────────────────────────────────────────────────────────
export const ChallanItemSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  qty:        z.coerce.number().positive(),
  unit_price: z.coerce.number().positive(),
  discount:   z.coerce.number().min(0).max(100).default(0),
});

export const ChallanSchema = z.object({
  customer_id:      z.coerce.number().int().positive(),
  delivery_address: z.string().optional(),
  notes:            z.string().optional(),
  items:            z.array(ChallanItemSchema).min(1),
});

// ─── Invoice ──────────────────────────────────────────────────────────────────
export const InvoiceSchema = z.object({
  challan_id:      z.coerce.number().int().positive().optional(),
  customer_id:     z.coerce.number().int().positive(),
  due_date:        z.string().optional(),
  notes:           z.string().optional(),
  discount_amount: z.coerce.number().min(0).default(0),
  items:           z.array(z.object({
    total:    z.number(),
    tax_rate: z.number().optional(),
  })).min(1),
});

export const PaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be positive'),
});

// ─── CRM ──────────────────────────────────────────────────────────────────────
export const CRMSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  type:        z.enum(['call', 'email', 'visit', 'whatsapp']),
  notes:       z.string().optional(),
  status:      z.enum(['pending', 'done', 'cancelled']).default('pending'),
  follow_date: z.string(),
});

// ─── Status update ────────────────────────────────────────────────────────────
export const StatusSchema = z.object({
  status: z.string().min(1),
});
