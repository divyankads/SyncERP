import mongoose, { Schema, Document } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI ;

// ─── Connection Manager ───────────────────────────────────────────────────────
export async function connectMongoDB(): Promise<typeof mongoose> {
  try {
    if (mongoose.connection.readyState >= 1) {
      return mongoose;
    }
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`✅ MongoDB Atlas connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection error:', error);
    throw error;
  }
}

// ─── User Schema & Model ──────────────────────────────────────────────────────
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'sales' | 'warehouse' | 'accounts';
  status: 'active' | 'inactive';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'sales', 'warehouse', 'accounts'], default: 'sales' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// ─── Customer Schema & Model ──────────────────────────────────────────────────
export interface ICustomer extends Document {
  name: string;
  mobileNumber?: string;
  mobile_number?: string;
  email?: string;
  businessName?: string;
  business_name?: string;
  gstin?: string;
  customerType?: string;
  customer_type?: string;
  address?: string;
  city?: string;
  creditLimit: number;
  credit_limit?: number;
  status: string;
  followUpDate?: Date;
  follow_up_date?: Date;
  notes?: string;
  createdAt: Date;
  created_at?: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  name: { type: String, required: true },
  mobileNumber: { type: String },
  mobile_number: { type: String },
  email: { type: String },
  businessName: { type: String },
  business_name: { type: String },
  gstin: { type: String },
  customerType: { type: String, default: 'Retail' },
  customer_type: { type: String, default: 'Retail' },
  address: { type: String },
  city: { type: String },
  creditLimit: { type: Number, default: 0 },
  credit_limit: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  followUpDate: { type: Date },
  follow_up_date: { type: Date },
  notes: { type: String },
}, { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } });

CustomerSchema.virtual('id').get(function() { return this._id.toHexString(); });

export const CustomerModel = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

// ─── Product Schema & Model ───────────────────────────────────────────────────
export interface IProduct extends Document {
  sku: string;
  name: string;
  category?: string;
  unit: string;
  purchasePrice: number;
  purchase_price?: number;
  salePrice: number;
  sale_price?: number;
  taxRate: number;
  tax_rate?: number;
  stockQty: number;
  stock_qty?: number;
  minStock: number;
  min_stock?: number;
  location?: string;
  createdAt: Date;
  created_at?: Date;
}

const ProductSchema = new Schema<IProduct>({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String },
  unit: { type: String, default: 'pcs' },
  purchasePrice: { type: Number, default: 0 },
  purchase_price: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  sale_price: { type: Number, default: 0 },
  taxRate: { type: Number, default: 18 },
  tax_rate: { type: Number, default: 18 },
  stockQty: { type: Number, default: 0 },
  stock_qty: { type: Number, default: 0 },
  minStock: { type: Number, default: 10 },
  min_stock: { type: Number, default: 10 },
  location: { type: String, default: 'Warehouse A' },
}, { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } });

ProductSchema.virtual('id').get(function() { return this._id.toHexString(); });

export const ProductModel = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

// ─── Supplier Schema & Model ──────────────────────────────────────────────────
export interface ISupplier extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  createdAt: Date;
  created_at?: Date;
}

const SupplierSchema = new Schema<ISupplier>({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  gstin: { type: String },
}, { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } });

SupplierSchema.virtual('id').get(function() { return this._id.toHexString(); });

export const SupplierModel = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);

// ─── Purchase Order Schema & Model ───────────────────────────────────────────
export interface IPurchaseOrderItem {
  productId?: string;
  product_id?: string;
  productName?: string;
  product_name?: string;
  sku?: string;
  unit?: string;
  qty: number;
  unitPrice: number;
  unit_price?: number;
  total: number;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  po_number?: string;
  supplierId?: string;
  supplier_id?: string;
  supplierName?: string;
  supplier_name?: string;
  status: string;
  orderDate?: Date;
  order_date?: Date;
  expectedDate?: Date;
  expected_date?: Date;
  totalAmount: number;
  total_amount?: number;
  notes?: string;
  items: IPurchaseOrderItem[];
  createdAt: Date;
  created_at?: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>({
  poNumber: { type: String, required: true, unique: true },
  po_number: { type: String },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  supplier_id: { type: String },
  supplierName: { type: String },
  supplier_name: { type: String },
  status: { type: String, default: 'draft' },
  orderDate: { type: Date, default: Date.now },
  order_date: { type: Date, default: Date.now },
  expectedDate: { type: Date },
  expected_date: { type: Date },
  totalAmount: { type: Number, default: 0 },
  total_amount: { type: Number, default: 0 },
  notes: { type: String },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    product_id: { type: String },
    productName: { type: String },
    product_name: { type: String },
    sku: { type: String },
    unit: { type: String },
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    unit_price: { type: Number },
    total: { type: Number, required: true },
  }],
}, { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } });

PurchaseOrderSchema.virtual('id').get(function() { return this._id.toHexString(); });

export const PurchaseOrderModel = mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);

// ─── Challan Schema & Model ───────────────────────────────────────────────────
export interface IChallanItem {
  productId?: string;
  product_id?: string;
  productName?: string;
  product_name?: string;
  sku?: string;
  product_sku?: string;
  unit?: string;
  product_unit?: string;
  qty: number;
  unitPrice: number;
  unit_price?: number;
  discount: number;
  total: number;
}

export interface IChallan extends Document {
  challanNo: string;
  challan_no?: string;
  customerId?: string;
  customer_id?: string;
  customerName?: string;
  customer_name?: string;
  status: string;
  challanDate?: Date;
  challan_date?: Date;
  deliveryAddress?: string;
  delivery_address?: string;
  notes?: string;
  totalQty: number;
  total_qty?: number;
  items: IChallanItem[];
  createdAt: Date;
  created_at?: Date;
}

const ChallanSchema = new Schema<IChallan>({
  challanNo: { type: String, required: true, unique: true },
  challan_no: { type: String },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customer_id: { type: String },
  customerName: { type: String },
  customer_name: { type: String },
  status: { type: String, default: 'Draft' },
  challanDate: { type: Date, default: Date.now },
  challan_date: { type: Date, default: Date.now },
  deliveryAddress: { type: String },
  delivery_address: { type: String },
  notes: { type: String },
  totalQty: { type: Number, default: 0 },
  total_qty: { type: Number, default: 0 },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    product_id: { type: String },
    productName: { type: String },
    product_name: { type: String },
    sku: { type: String },
    product_sku: { type: String },
    unit: { type: String },
    product_unit: { type: String },
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    unit_price: { type: Number },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
  }],
}, { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } });

ChallanSchema.virtual('id').get(function() { return this._id.toHexString(); });

export const ChallanModel = mongoose.models.Challan || mongoose.model<IChallan>('Challan', ChallanSchema);

// ─── Invoice Schema & Model ───────────────────────────────────────────────────
export interface IInvoice extends Document {
  invoiceNo: string;
  invoice_no?: string;
  challanId?: string;
  challan_id?: string;
  customerId?: string;
  customer_id?: string;
  customerName?: string;
  customer_name?: string;
  status: 'unpaid' | 'paid' | 'partial' | 'cancelled';
  invoiceDate: Date;
  invoice_date?: Date;
  dueDate?: Date;
  due_date?: Date;
  subtotal: number;
  taxAmount: number;
  tax_amount?: number;
  discountAmount: number;
  discount_amount?: number;
  totalAmount: number;
  total_amount?: number;
  paidAmount: number;
  paid_amount?: number;
  notes?: string;
  items?: IChallanItem[];
  createdAt: Date;
  created_at?: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNo: { type: String, required: true, unique: true },
  invoice_no: { type: String },
  challanId: { type: Schema.Types.ObjectId, ref: 'Challan' },
  challan_id: { type: String },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customer_id: { type: String },
  customerName: { type: String },
  customer_name: { type: String },
  status: { type: String, enum: ['unpaid', 'paid', 'partial', 'cancelled'], default: 'unpaid' },
  invoiceDate: { type: Date, default: Date.now },
  invoice_date: { type: Date, default: Date.now },
  dueDate: { type: Date },
  due_date: { type: Date },
  subtotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  total_amount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  paid_amount: { type: Number, default: 0 },
  notes: { type: String },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    product_id: { type: String },
    productName: { type: String },
    product_name: { type: String },
    sku: { type: String },
    product_sku: { type: String },
    unit: { type: String },
    product_unit: { type: String },
    qty: { type: Number },
    unitPrice: { type: Number },
    unit_price: { type: Number },
    discount: { type: Number, default: 0 },
    total: { type: Number },
  }],
}, { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } });

InvoiceSchema.virtual('id').get(function() { return this._id.toHexString(); });

export const InvoiceModel = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

// ─── CRM Follow-up Schema & Model ─────────────────────────────────────────────
export interface ICRMFollowup extends Document {
  customerId?: string;
  customer_id?: string;
  customerName?: string;
  customer_name?: string;
  type: string;
  notes?: string;
  status: string;
  followDate?: Date;
  follow_date?: Date;
  createdAt: Date;
  created_at?: Date;
}

const CRMFollowupSchema = new Schema<ICRMFollowup>({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customer_id: { type: String },
  customerName: { type: String },
  customer_name: { type: String },
  type: { type: String, default: 'call' },
  notes: { type: String },
  status: { type: String, default: 'pending' },
  followDate: { type: Date, default: Date.now },
  follow_date: { type: Date, default: Date.now },
}, { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } });

CRMFollowupSchema.virtual('id').get(function() { return this._id.toHexString(); });

export const CRMFollowupModel = mongoose.models.CRMFollowup || mongoose.model<ICRMFollowup>('CRMFollowup', CRMFollowupSchema);

// ─── Stock Movement Schema & Model ────────────────────────────────────────────
export interface IStockMovement extends Document {
  productId?: string;
  product_id?: string;
  productName?: string;
  product_name?: string;
  sku?: string;
  type: string;
  qty: number;
  refType?: string;
  ref_type?: string;
  refId?: string;
  ref_id?: string;
  notes?: string;
  createdAt: Date;
  created_at?: Date;
}

const StockMovementSchema = new Schema<IStockMovement>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_id: { type: String },
  productName: { type: String },
  product_name: { type: String },
  sku: { type: String },
  type: { type: String, required: true },
  qty: { type: Number, required: true },
  refType: { type: String },
  ref_type: { type: String },
  refId: { type: String },
  ref_id: { type: String },
  notes: { type: String },
}, { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } });

StockMovementSchema.virtual('id').get(function() { return this._id.toHexString(); });

export const StockMovementModel = mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);

export default connectMongoDB;
