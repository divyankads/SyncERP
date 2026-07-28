const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
app.get('/api/dashboard', (req, res) => {
  try {
    const totalCustomers   = db.prepare("SELECT COUNT(*) as c FROM customers WHERE status='active'").get().c;
    const totalProducts    = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    const lowStockCount    = db.prepare('SELECT COUNT(*) as c FROM products WHERE stock_qty <= min_stock').get().c;
    const totalRevenue     = db.prepare('SELECT COALESCE(SUM(total_amount),0) as r FROM invoices').get().r;
    const pendingAmount    = db.prepare("SELECT COALESCE(SUM(total_amount - paid_amount),0) as p FROM invoices WHERE status != 'paid'").get().p;
    const openPOs          = db.prepare("SELECT COUNT(*) as c FROM purchase_orders WHERE status IN ('draft','confirmed')").get().c;
    const pendingFollowups = db.prepare("SELECT COUNT(*) as c FROM crm_followups WHERE status='pending'").get().c;
    const recentInvoices   = db.prepare(`
      SELECT i.*, c.name as customer_name
      FROM invoices i JOIN customers c ON i.customer_id = c.id
      ORDER BY i.created_at DESC LIMIT 5
    `).all();
    const topProducts = db.prepare(`
      SELECT p.name, p.sku, SUM(ci.qty) as total_sold, SUM(ci.total) as revenue
      FROM challan_items ci JOIN products p ON ci.product_id = p.id
      JOIN challans ch ON ci.challan_id = ch.id
      WHERE ch.status IN ('delivered','dispatched')
      GROUP BY p.id ORDER BY total_sold DESC LIMIT 5
    `).all();
    const monthlySales = db.prepare(`
      SELECT strftime('%Y-%m', invoice_date) as month, SUM(total_amount) as total
      FROM invoices GROUP BY month ORDER BY month DESC LIMIT 6
    `).all().reverse();

    res.json({ totalCustomers, totalProducts, lowStockCount, totalRevenue, pendingAmount, openPOs, pendingFollowups, recentInvoices, topProducts, monthlySales });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CUSTOMERS ─────────────────────────────────────────────────────────────
app.get('/api/customers', (req, res) => {
  const { search, status } = req.query;
  let q = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  if (search) { q += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { q += ' AND status = ?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...params));
});

app.get('/api/customers/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });
  const invoices = db.prepare('SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
  const followups = db.prepare('SELECT * FROM crm_followups WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
  const challans = db.prepare('SELECT * FROM challans WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...customer, invoices, followups, challans });
});

app.post('/api/customers', (req, res) => {
  const { name, email, phone, address, city, gstin, credit_limit } = req.body;
  const r = db.prepare('INSERT INTO customers (name,email,phone,address,city,gstin,credit_limit) VALUES (?,?,?,?,?,?,?)').run(name, email, phone, address, city, gstin, credit_limit || 0);
  res.json({ id: r.lastInsertRowid, message: 'Customer created' });
});

app.put('/api/customers/:id', (req, res) => {
  const { name, email, phone, address, city, gstin, credit_limit, status } = req.body;
  db.prepare('UPDATE customers SET name=?,email=?,phone=?,address=?,city=?,gstin=?,credit_limit=?,status=? WHERE id=?').run(name, email, phone, address, city, gstin, credit_limit, status, req.params.id);
  res.json({ message: 'Updated' });
});

app.delete('/api/customers/:id', (req, res) => {
  db.prepare("UPDATE customers SET status='inactive' WHERE id=?").run(req.params.id);
  res.json({ message: 'Deactivated' });
});

// ─── PRODUCTS ──────────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { search, category, low_stock } = req.query;
  let q = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (search) { q += ' AND (name LIKE ? OR sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { q += ' AND category = ?'; params.push(category); }
  if (low_stock === 'true') { q += ' AND stock_qty <= min_stock'; }
  q += ' ORDER BY name';
  res.json(db.prepare(q).all(...params));
});

app.get('/api/products/categories', (req, res) => {
  const cats = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all();
  res.json(cats.map(c => c.category));
});

app.post('/api/products', (req, res) => {
  const { sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock } = req.body;
  const r = db.prepare('INSERT INTO products (sku,name,category,unit,purchase_price,sale_price,tax_rate,stock_qty,min_stock) VALUES (?,?,?,?,?,?,?,?,?)').run(sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty || 0, min_stock || 10);
  res.json({ id: r.lastInsertRowid, message: 'Product created' });
});

app.put('/api/products/:id', (req, res) => {
  const { sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock } = req.body;
  db.prepare('UPDATE products SET sku=?,name=?,category=?,unit=?,purchase_price=?,sale_price=?,tax_rate=?,stock_qty=?,min_stock=? WHERE id=?').run(sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock, req.params.id);
  res.json({ message: 'Updated' });
});

app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ─── SUPPLIERS ─────────────────────────────────────────────────────────────
app.get('/api/suppliers', (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY name').all());
});

app.post('/api/suppliers', (req, res) => {
  const { name, email, phone, address, gstin } = req.body;
  const r = db.prepare('INSERT INTO suppliers (name,email,phone,address,gstin) VALUES (?,?,?,?,?)').run(name, email, phone, address, gstin);
  res.json({ id: r.lastInsertRowid, message: 'Supplier created' });
});

app.put('/api/suppliers/:id', (req, res) => {
  const { name, email, phone, address, gstin } = req.body;
  db.prepare('UPDATE suppliers SET name=?,email=?,phone=?,address=?,gstin=? WHERE id=?').run(name, email, phone, address, gstin, req.params.id);
  res.json({ message: 'Updated' });
});

// ─── PURCHASE ORDERS ────────────────────────────────────────────────────────
app.get('/api/purchase-orders', (req, res) => {
  const pos = db.prepare(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY po.created_at DESC
  `).all();
  res.json(pos);
});

app.get('/api/purchase-orders/:id', (req, res) => {
  const po = db.prepare(`SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id=?`).get(req.params.id);
  if (!po) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare(`SELECT pi.*, p.name as product_name, p.sku, p.unit FROM po_items pi JOIN products p ON pi.product_id = p.id WHERE pi.po_id=?`).all(req.params.id);
  res.json({ ...po, items });
});

app.post('/api/purchase-orders', (req, res) => {
  const { supplier_id, expected_date, notes, items } = req.body;
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as c FROM purchase_orders').get().c;
  const po_number = `PO-${year}-${String(count + 1).padStart(3, '0')}`;
  const total = items.reduce((sum, i) => sum + i.qty * i.unit_price, 0);
  const insertPO = db.transaction(() => {
    const r = db.prepare('INSERT INTO purchase_orders (po_number,supplier_id,expected_date,total_amount,notes) VALUES (?,?,?,?,?)').run(po_number, supplier_id, expected_date, total, notes);
    const poId = r.lastInsertRowid;
    items.forEach(item => db.prepare('INSERT INTO po_items (po_id,product_id,qty,unit_price) VALUES (?,?,?,?)').run(poId, item.product_id, item.qty, item.unit_price));
    return poId;
  });
  const poId = insertPO();
  res.json({ id: poId, po_number, message: 'Purchase order created' });
});

app.put('/api/purchase-orders/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE purchase_orders SET status=? WHERE id=?').run(status, req.params.id);
  if (status === 'received') {
    const items = db.prepare('SELECT * FROM po_items WHERE po_id=?').all(req.params.id);
    const updateStock = db.transaction(() => {
      items.forEach(item => {
        db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id=?').run(item.qty, item.product_id);
        db.prepare('INSERT INTO stock_movements (product_id,type,qty,ref_type,ref_id,notes) VALUES (?,?,?,?,?,?)').run(item.product_id, 'purchase', item.qty, 'purchase_order', req.params.id, `PO received`);
      });
    });
    updateStock();
  }
  res.json({ message: 'Status updated' });
});

// ─── CHALLANS ──────────────────────────────────────────────────────────────
app.get('/api/challans', (req, res) => {
  const { status, customer_id } = req.query;
  let q = `SELECT ch.*, c.name as customer_name FROM challans ch JOIN customers c ON ch.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND ch.status=?'; params.push(status); }
  if (customer_id) { q += ' AND ch.customer_id=?'; params.push(customer_id); }
  q += ' ORDER BY ch.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

app.get('/api/challans/:id', (req, res) => {
  const ch = db.prepare(`SELECT ch.*, c.name as customer_name, c.address, c.gstin FROM challans ch JOIN customers c ON ch.customer_id = c.id WHERE ch.id=?`).get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare(`SELECT ci.*, p.name as product_name, p.sku, p.unit, p.tax_rate FROM challan_items ci JOIN products p ON ci.product_id = p.id WHERE ci.challan_id=?`).all(req.params.id);
  res.json({ ...ch, items });
});

app.post('/api/challans', (req, res) => {
  const { customer_id, delivery_address, notes, items } = req.body;
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as c FROM challans').get().c;
  const challan_no = `CH-${year}-${String(count + 1).padStart(3, '0')}`;
  const insertChallan = db.transaction(() => {
    const r = db.prepare('INSERT INTO challans (challan_no,customer_id,delivery_address,notes) VALUES (?,?,?,?)').run(challan_no, customer_id, delivery_address, notes);
    const challanId = r.lastInsertRowid;
    items.forEach(item => db.prepare('INSERT INTO challan_items (challan_id,product_id,qty,unit_price,discount) VALUES (?,?,?,?,?)').run(challanId, item.product_id, item.qty, item.unit_price, item.discount || 0));
    return challanId;
  });
  const challanId = insertChallan();
  res.json({ id: challanId, challan_no, message: 'Challan created' });
});

app.put('/api/challans/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE challans SET status=? WHERE id=?').run(status, req.params.id);
  if (status === 'dispatched') {
    const items = db.prepare('SELECT * FROM challan_items WHERE challan_id=?').all(req.params.id);
    const updateStock = db.transaction(() => {
      items.forEach(item => {
        db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id=?').run(item.qty, item.product_id);
        db.prepare('INSERT INTO stock_movements (product_id,type,qty,ref_type,ref_id,notes) VALUES (?,?,?,?,?,?)').run(item.product_id, 'sale', -item.qty, 'challan', req.params.id, `Challan dispatched`);
      });
    });
    updateStock();
  }
  res.json({ message: 'Status updated' });
});

// ─── INVOICES ──────────────────────────────────────────────────────────────
app.get('/api/invoices', (req, res) => {
  const { status, customer_id } = req.query;
  let q = `SELECT i.*, c.name as customer_name FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND i.status=?'; params.push(status); }
  if (customer_id) { q += ' AND i.customer_id=?'; params.push(customer_id); }
  q += ' ORDER BY i.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

app.get('/api/invoices/:id', (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, c.name as customer_name, c.address, c.gstin, c.phone, c.email
    FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id=?
  `).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  if (inv.challan_id) {
    const items = db.prepare(`SELECT ci.*, p.name as product_name, p.sku, p.unit, p.tax_rate FROM challan_items ci JOIN products p ON ci.product_id = p.id WHERE ci.challan_id=?`).all(inv.challan_id);
    inv.items = items;
  }
  res.json(inv);
});

app.post('/api/invoices', (req, res) => {
  const { challan_id, customer_id, due_date, notes, items, discount_amount } = req.body;
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
  const invoice_no = `INV-${year}-${String(count + 1).padStart(3, '0')}`;
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const tax_amount = items.reduce((sum, i) => sum + (i.total * (i.tax_rate || 18) / 100), 0);
  const total_amount = subtotal + tax_amount - (discount_amount || 0);
  const r = db.prepare('INSERT INTO invoices (invoice_no,challan_id,customer_id,due_date,subtotal,tax_amount,discount_amount,total_amount,notes) VALUES (?,?,?,?,?,?,?,?,?)').run(invoice_no, challan_id || null, customer_id, due_date, subtotal, tax_amount, discount_amount || 0, total_amount, notes);
  res.json({ id: r.lastInsertRowid, invoice_no, message: 'Invoice created' });
});

app.put('/api/invoices/:id/payment', (req, res) => {
  const { amount } = req.body;
  const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(req.params.id);
  const new_paid = (inv.paid_amount || 0) + amount;
  const status = new_paid >= inv.total_amount ? 'paid' : 'partial';
  db.prepare('UPDATE invoices SET paid_amount=?, status=? WHERE id=?').run(new_paid, status, req.params.id);
  res.json({ message: 'Payment recorded', status });
});

// ─── CRM FOLLOW-UPS ─────────────────────────────────────────────────────────
app.get('/api/crm', (req, res) => {
  const { status, customer_id } = req.query;
  let q = `SELECT f.*, c.name as customer_name FROM crm_followups f JOIN customers c ON f.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND f.status=?'; params.push(status); }
  if (customer_id) { q += ' AND f.customer_id=?'; params.push(customer_id); }
  q += ' ORDER BY f.follow_date DESC';
  res.json(db.prepare(q).all(...params));
});

app.post('/api/crm', (req, res) => {
  const { customer_id, type, notes, status, follow_date } = req.body;
  const r = db.prepare('INSERT INTO crm_followups (customer_id,type,notes,status,follow_date) VALUES (?,?,?,?,?)').run(customer_id, type, notes, status || 'pending', follow_date);
  res.json({ id: r.lastInsertRowid, message: 'Follow-up created' });
});

app.put('/api/crm/:id', (req, res) => {
  const { type, notes, status, follow_date } = req.body;
  db.prepare('UPDATE crm_followups SET type=?,notes=?,status=?,follow_date=? WHERE id=?').run(type, notes, status, follow_date, req.params.id);
  res.json({ message: 'Updated' });
});

app.delete('/api/crm/:id', (req, res) => {
  db.prepare('DELETE FROM crm_followups WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ─── STOCK ─────────────────────────────────────────────────────────────────
app.get('/api/stock', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY stock_qty ASC').all();
  const movements = db.prepare(`
    SELECT sm.*, p.name as product_name, p.sku
    FROM stock_movements sm JOIN products p ON sm.product_id = p.id
    ORDER BY sm.created_at DESC LIMIT 20
  `).all();
  res.json({ products, movements });
});

// ─── START ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 SyncERP API running on http://localhost:${PORT}`));
