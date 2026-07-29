import bcrypt from 'bcryptjs';
import connectMongoDB, {
  UserModel,
  CustomerModel,
  ProductModel,
  SupplierModel,
  InvoiceModel,
  PurchaseOrderModel,
  ChallanModel,
  CRMFollowupModel,
  StockMovementModel
} from './mongo';

export async function seedMongoDB(): Promise<void> {
  await connectMongoDB();

  // 1. Users
  const hashedPassword = (plain: string) => bcrypt.hashSync(plain, 10);
  const demoUsers = [
    { name: 'Admin User', email: 'admin@syncerp.com', password: hashedPassword('admin123'), role: 'admin', status: 'active' },
    { name: 'Priya Sharma', email: 'sales@syncerp.com', password: hashedPassword('sales123'), role: 'sales', status: 'active' },
    { name: 'Rahul Verma', email: 'warehouse@syncerp.com', password: hashedPassword('warehouse123'), role: 'warehouse', status: 'active' },
    { name: 'Anjali Mehta', email: 'accounts@syncerp.com', password: hashedPassword('accounts123'), role: 'accounts', status: 'active' },
  ];

  for (const user of demoUsers) {
    await UserModel.updateOne({ email: user.email }, { $setOnInsert: user }, { upsert: true });
  }

  // 2. Customers
  const customerCount = await CustomerModel.countDocuments();
  if (customerCount === 0) {
    const customers = [
      { name: 'Rajesh Agarwal', mobileNumber: '9810001234', mobile_number: '9810001234', email: 'rajesh@agarwal.com', businessName: 'Agarwal Traders', business_name: 'Agarwal Traders', gstin: '07AABCU9603R1ZX', customerType: 'Wholesale', customer_type: 'Wholesale', address: '12, Industrial Area', city: 'Delhi', creditLimit: 200000, credit_limit: 200000, status: 'Active', notes: 'Key wholesale partner.' },
      { name: 'Vikram Mehta', mobileNumber: '9820005678', mobile_number: '9820005678', email: 'vikram@mehta.com', businessName: 'Mehta Enterprises', business_name: 'Mehta Enterprises', gstin: '27AAACM5897P1ZY', customerType: 'Distributor', customer_type: 'Distributor', address: '45, MG Road', city: 'Mumbai', creditLimit: 150000, credit_limit: 150000, status: 'Active', notes: 'Long-term distributor.' },
      { name: 'Sunita Sharma', mobileNumber: '9830009012', mobile_number: '9830009012', email: 'sunita@sharma.com', businessName: 'Sharma Wholesale', business_name: 'Sharma Wholesale', gstin: '08AAICS2095G1ZA', customerType: 'Wholesale', customer_type: 'Wholesale', address: '78, Ring Road', city: 'Jaipur', creditLimit: 100000, credit_limit: 100000, status: 'Active', notes: 'Showroom visit scheduled.' },
      { name: 'Dhruv Patel', mobileNumber: '9840003456', mobile_number: '9840003456', email: 'dhruv@patel.com', businessName: 'Patel Distributors', business_name: 'Patel Distributors', gstin: '24AAHCP8562R1ZB', customerType: 'Distributor', customer_type: 'Distributor', address: '23, GT Road', city: 'Ahmedabad', creditLimit: 300000, credit_limit: 300000, status: 'Active', notes: 'High-value account.' },
    ];
    await CustomerModel.insertMany(customers);
  }

  // 3. Products
  const productCount = await ProductModel.countDocuments();
  if (productCount === 0) {
    const products = [
      { sku: 'SKU-001', name: 'Industrial Bolt M10', category: 'Hardware', unit: 'pcs', purchasePrice: 5, purchase_price: 5, salePrice: 12, sale_price: 12, taxRate: 18, tax_rate: 18, stockQty: 500, stock_qty: 500, minStock: 50, min_stock: 50, location: 'Warehouse A' },
      { sku: 'SKU-002', name: 'Steel Pipe 2inch', category: 'Pipes & Fittings', unit: 'mtr', purchasePrice: 180, purchase_price: 180, salePrice: 350, sale_price: 350, taxRate: 18, tax_rate: 18, stockQty: 120, stock_qty: 120, minStock: 20, min_stock: 20, location: 'Warehouse B' },
      { sku: 'SKU-003', name: 'PVC Elbow 90°', category: 'Pipes & Fittings', unit: 'pcs', purchasePrice: 25, purchase_price: 25, salePrice: 55, sale_price: 55, taxRate: 18, tax_rate: 18, stockQty: 300, stock_qty: 300, minStock: 30, min_stock: 30, location: 'Warehouse B' },
      { sku: 'SKU-004', name: 'Copper Wire 6mm', category: 'Electrical', unit: 'mtr', purchasePrice: 90, purchase_price: 90, salePrice: 180, sale_price: 180, taxRate: 18, tax_rate: 18, stockQty: 80, stock_qty: 80, minStock: 15, min_stock: 15, location: 'Warehouse C' },
    ];
    await ProductModel.insertMany(products);
  }

  // 4. Suppliers
  const supplierCount = await SupplierModel.countDocuments();
  if (supplierCount === 0) {
    const suppliers = [
      { name: 'ABC Manufacturing', email: 'abc@mfg.com', phone: '9811112222', address: 'MIDC, Pune', gstin: '27AABCA1234B1ZZ' },
      { name: 'XYZ Imports Ltd', email: 'xyz@imports.com', phone: '9822223333', address: 'Jawaharlal Nehru Port, Mumbai', gstin: '27AABCX5678C1ZY' },
    ];
    await SupplierModel.insertMany(suppliers);
  }

  // 5. Invoices
  const invoiceCount = await InvoiceModel.countDocuments();
  if (invoiceCount === 0) {
    const customer = await CustomerModel.findOne();
    if (customer) {
      await InvoiceModel.create({
        invoiceNo: 'INV-2024-001',
        invoice_no: 'INV-2024-001',
        customerId: customer._id,
        customer_id: customer._id.toString(),
        customerName: customer.name,
        customer_name: customer.name,
        status: 'paid',
        invoiceDate: new Date(),
        invoice_date: new Date(),
        subtotal: 19800,
        taxAmount: 3564,
        tax_amount: 3564,
        discountAmount: 0,
        discount_amount: 0,
        totalAmount: 23364,
        total_amount: 23364,
        paidAmount: 23364,
        paid_amount: 23364,
        notes: 'Initial invoice'
      });
    }
  }

  console.log('✅ Seeded MongoDB Atlas successfully');
}

if (require.main === module) {
  seedMongoDB()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ MongoDB seed error:', err);
      process.exit(1);
    });
}
