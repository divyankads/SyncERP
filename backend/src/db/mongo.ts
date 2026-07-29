import mongoose, { Schema, Document } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://divi:qwe123@ver1.izmmvap.mongodb.net/syncerp?retryWrites=true&w=majority';

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
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// ─── Customer Schema & Model ──────────────────────────────────────────────────
export interface ICustomer extends Document {
  name: string;
  mobileNumber?: string;
  email?: string;
  businessName?: string;
  gstin?: string;
  customerType?: string;
  address?: string;
  city?: string;
  creditLimit: number;
  status: string;
  followUpDate?: Date;
  notes?: string;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  name: { type: String, required: true },
  mobileNumber: { type: String },
  email: { type: String },
  businessName: { type: String },
  gstin: { type: String },
  customerType: { type: String, default: 'Retail' },
  address: { type: String },
  city: { type: String },
  creditLimit: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  followUpDate: { type: Date },
  notes: { type: String },
}, { timestamps: true });

export const CustomerModel = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

// ─── Product Schema & Model ───────────────────────────────────────────────────
export interface IProduct extends Document {
  sku: string;
  name: string;
  category?: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  taxRate: number;
  stockQty: number;
  minStock: number;
  location?: string;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String },
  unit: { type: String, default: 'pcs' },
  purchasePrice: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  taxRate: { type: Number, default: 18 },
  stockQty: { type: Number, default: 0 },
  minStock: { type: Number, default: 10 },
  location: { type: String, default: 'Warehouse A' },
}, { timestamps: true });

export const ProductModel = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

// ─── Supplier Schema & Model ──────────────────────────────────────────────────
export interface ISupplier extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  createdAt: Date;
}

const SupplierSchema = new Schema<ISupplier>({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  gstin: { type: String },
}, { timestamps: true });

export const SupplierModel = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);

// ─── Invoice Schema & Model ───────────────────────────────────────────────────
export interface IInvoice extends Document {
  invoiceNo: string;
  challanId?: string;
  customerId?: string;
  status: 'unpaid' | 'paid' | 'partial' | 'cancelled';
  invoiceDate: Date;
  dueDate?: Date;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  createdAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNo: { type: String, required: true, unique: true },
  challanId: { type: Schema.Types.ObjectId, ref: 'Challan' },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  status: { type: String, enum: ['unpaid', 'paid', 'partial', 'cancelled'], default: 'unpaid' },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  subtotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  notes: { type: String },
}, { timestamps: true });

export const InvoiceModel = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default connectMongoDB;
