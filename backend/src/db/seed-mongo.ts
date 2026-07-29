import bcrypt from 'bcryptjs';
import connectMongoDB, { UserModel, CustomerModel, ProductModel, SupplierModel, InvoiceModel } from './mongo';

export async function seedMongoDB(): Promise<void> {
  await connectMongoDB();

  const userCount = await UserModel.countDocuments();
  if (userCount > 0) {
    console.log('ℹ️ MongoDB Atlas already has user data. Syncing/ensuring default demo accounts...');
  }

  const hashedPassword = (plain: string) => bcrypt.hashSync(plain, 10);

  const demoUsers = [
    { name: 'Admin User', email: 'admin@syncerp.com', password: hashedPassword('admin123'), role: 'admin', status: 'active' },
    { name: 'Priya Sharma', email: 'sales@syncerp.com', password: hashedPassword('sales123'), role: 'sales', status: 'active' },
    { name: 'Rahul Verma', email: 'warehouse@syncerp.com', password: hashedPassword('warehouse123'), role: 'warehouse', status: 'active' },
    { name: 'Anjali Mehta', email: 'accounts@syncerp.com', password: hashedPassword('accounts123'), role: 'accounts', status: 'active' },
  ];

  for (const user of demoUsers) {
    await UserModel.updateOne(
      { email: user.email },
      { $setOnInsert: user },
      { upsert: true }
    );
  }
  console.log('✅ Demo accounts seeded to MongoDB Atlas successfully:');
  console.log('   - Admin: admin@syncerp.com / admin123');
  console.log('   - Sales: sales@syncerp.com / sales123');
  console.log('   - Warehouse: warehouse@syncerp.com / warehouse123');
  console.log('   - Accounts: accounts@syncerp.com / accounts123');

  // Seed sample products if empty
  const productCount = await ProductModel.countDocuments();
  if (productCount === 0) {
    const products = [
      { sku: 'SKU-001', name: 'Industrial Bolt M10', category: 'Hardware', unit: 'pcs', purchasePrice: 5, salePrice: 12, taxRate: 18, stockQty: 500, minStock: 50, location: 'Warehouse A' },
      { sku: 'SKU-002', name: 'Steel Pipe 2inch', category: 'Pipes & Fittings', unit: 'mtr', purchasePrice: 180, salePrice: 350, taxRate: 18, stockQty: 120, minStock: 20, location: 'Warehouse B' },
      { sku: 'SKU-003', name: 'PVC Elbow 90°', category: 'Pipes & Fittings', unit: 'pcs', purchasePrice: 25, salePrice: 55, taxRate: 18, stockQty: 300, minStock: 30, location: 'Warehouse B' },
      { sku: 'SKU-004', name: 'Copper Wire 6mm', category: 'Electrical', unit: 'mtr', purchasePrice: 90, salePrice: 180, taxRate: 18, stockQty: 80, minStock: 15, location: 'Warehouse C' },
    ];
    await ProductModel.insertMany(products);
    console.log('✅ Demo products seeded to MongoDB Atlas');
  }

  // Seed sample customers if empty
  const customerCount = await CustomerModel.countDocuments();
  if (customerCount === 0) {
    const customers = [
      { name: 'Rajesh Agarwal', mobileNumber: '9810001234', email: 'rajesh@agarwal.com', businessName: 'Agarwal Traders', gstin: '07AABCU9603R1ZX', customerType: 'Wholesale', address: '12, Industrial Area', city: 'Delhi', creditLimit: 200000, status: 'Active' },
      { name: 'Vikram Mehta', mobileNumber: '9820005678', email: 'vikram@mehta.com', businessName: 'Mehta Enterprises', gstin: '27AAACM5897P1ZY', customerType: 'Distributor', address: '45, MG Road', city: 'Mumbai', creditLimit: 150000, status: 'Active' },
    ];
    await CustomerModel.insertMany(customers);
    console.log('✅ Demo customers seeded to MongoDB Atlas');
  }
}

if (require.main === module) {
  seedMongoDB()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ MongoDB seed error:', err);
      process.exit(1);
    });
}
