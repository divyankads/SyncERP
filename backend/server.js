const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'syncerp_secret_2024_change_in_production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// ─── Role Permissions ───────────────────────────────────────────────────────
const PERMISSIONS = {
  admin: ['*'],
  sales: ['customers', 'crm', 'challans', 'invoices', 'dashboard'],
  warehouse: ['products', 'stock', 'purchase-orders', 'challans', 'dashboard'],
  accounts: ['invoices', 'customers', 'dashboard'],
};

// ─── Auth Middleware ─────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — no token provided' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: `Forbidden — requires role: ${roles.join(' or ')}` });
  };
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES  (public)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND status = ?').get(email.trim().toLowerCase(), 'active');
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  res.json({
    token,
    user: payload,
    permissions: PERMISSIONS[user.role] || [],
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, permissions: PERMISSIONS[user.role] || [] });
});

// ── Apply auth to everything below ──────────────────────────────────────────
app.use('/api', authMiddleware);

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard', (req, res) => {
  try {
    const totalCustomers = db.prepare("SELECT COUNT(*) as c FROM customers WHERE status IN ('Active','Lead')").get().c;
    const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    const lowStockCount = db.prepare('SELECT COUNT(*) as c FROM products WHERE stock_qty <= min_stock').get().c;
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_amount),0) as r FROM invoices').get().r;
    const pendingAmount = db.prepare("SELECT COALESCE(SUM(total_amount - paid_amount),0) as p FROM invoices WHERE status != 'paid'").get().p;
    const openPOs = db.prepare("SELECT COUNT(*) as c FROM purchase_orders WHERE status IN ('draft','confirmed')").get().c;
    const pendingFollowups = db.prepare("SELECT COUNT(*) as c FROM crm_followups WHERE status = 'pending'").get().c;
    const leadCount = db.prepare("SELECT COUNT(*) as c FROM customers WHERE status = 'Lead'").get().c;

    const recentInvoices = db.prepare(`
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

    const recentFollowups = db.prepare(`
      SELECT f.*, c.name as customer_name
      FROM crm_followups f JOIN customers c ON f.customer_id = c.id
      WHERE f.status = 'pending'
      ORDER BY f.follow_date ASC LIMIT 5
    `).all();

    res.json({ totalCustomers, totalProducts, lowStockCount, totalRevenue, pendingAmount, openPOs, pendingFollowups, leadCount, recentInvoices, topProducts, monthlySales, recentFollowups });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS  (sales, admin, accounts can access)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/customers', requireRole('sales', 'accounts'), (req, res) => {
  const { search, status, customer_type } = req.query;
  let q = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    q += ` AND (name LIKE ${'?'} OR mobile_number LIKE ${'?'} OR email LIKE ${'?'} OR business_name LIKE ${'?'})`.replace(/\?/g, () => '?');
    // push 3 more copies
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) { params.push(status); q += ` AND status = ?`; }
  if (customer_type) { params.push(customer_type); q += ` AND customer_type = ?`; }
  q += ' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...params));
});

app.get('/api/customers/:id', requireRole('sales', 'accounts'), (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const invoices = db.prepare('SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
  const challans = db.prepare('SELECT * FROM challans WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
  const followups = db.prepare(`
    SELECT f.*, u.name as created_by_name
    FROM crm_followups f
    LEFT JOIN users u ON f.created_by = u.id
    WHERE f.customer_id = ?
    ORDER BY f.created_at DESC
  `).all(req.params.id);

  res.json({ ...customer, invoices, challans, followups });
});

app.post('/api/customers', requireRole('sales'), (req, res) => {
  const { name, mobile_number, email, business_name, gstin, customer_type, address, city, credit_limit, status, follow_up_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Customer name is required' });

  const r = db.prepare(`
    INSERT INTO customers (name, mobile_number, email, business_name, gstin, customer_type, address, city, credit_limit, status, follow_up_date, notes, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(name, mobile_number, email, business_name, gstin, customer_type || 'Retail', address, city, credit_limit || 0, status || 'Lead', follow_up_date || null, notes || null, req.user.id);

  res.status(201).json({ id: r.lastInsertRowid, message: 'Customer created' });
});

app.put('/api/customers/:id', requireRole('sales', 'accounts'), (req, res) => {
  const { name, mobile_number, email, business_name, gstin, customer_type, address, city, credit_limit, status, follow_up_date, notes } = req.body;
  db.prepare(`
    UPDATE customers SET name=?, mobile_number=?, email=?, business_name=?, gstin=?, customer_type=?, address=?, city=?, credit_limit=?, status=?, follow_up_date=?, notes=?
    WHERE id=?
  `).run(name, mobile_number, email, business_name, gstin, customer_type, address, city, credit_limit, status, follow_up_date || null, notes || null, req.params.id);
  res.json({ message: 'Customer updated' });
});

app.delete('/api/customers/:id', requireRole('admin'), (req, res) => {
  db.prepare("UPDATE customers SET status='Inactive' WHERE id=?").run(req.params.id);
  res.json({ message: 'Customer deactivated' });
});

// ── Customer Follow-ups ─────────────────────────────────────────────────────
app.post('/api/customers/:id/followups', requireRole('sales'), (req, res) => {
  const { type, notes, status, follow_date } = req.body;
  if (!notes) return res.status(400).json({ error: 'Notes are required' });

  const r = db.prepare(`
    INSERT INTO crm_followups (customer_id, type, notes, status, follow_date, created_by)
    VALUES (?,?,?,?,?,?)
  `).run(req.params.id, type || 'call', notes, status || 'done', follow_date || new Date().toISOString().split('T')[0], req.user.id);

  // Update customer's follow_up_date if given
  if (follow_date) {
    db.prepare('UPDATE customers SET follow_up_date = ? WHERE id = ?').run(follow_date, req.params.id);
  }

  res.status(201).json({ id: r.lastInsertRowid, message: 'Follow-up added' });
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS  (warehouse, admin)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/products', (req, res) => {
  const { search, low_stock, category } = req.query;
  let q = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (search) { params.push(`%${search}%`, `%${search}%`); q += ' AND (name LIKE ? OR sku LIKE ?)'; }
  if (low_stock === 'true') { q += ' AND stock_qty <= min_stock'; }
  if (category) { params.push(category); q += ' AND category = ?'; }
  q += ' ORDER BY name';
  res.json(db.prepare(q).all(...params));
});

app.post('/api/products', requireRole('warehouse'), (req, res) => {
  const { sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock, location } = req.body;
  if (!sku || !name) return res.status(400).json({ error: 'SKU and Product Name are required' });
  try {
    const r = db.prepare('INSERT INTO products (sku,name,category,unit,purchase_price,sale_price,tax_rate,stock_qty,min_stock,location) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
      sku, name, category || null, unit || 'pcs', purchase_price || 0, sale_price || 0, tax_rate || 18, stock_qty || 0, min_stock || 10, location || 'Warehouse A'
    );
    res.status(201).json({ id: r.lastInsertRowid, message: 'Product created' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: `SKU '${sku}' already exists` });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/products/:id', requireRole('warehouse'), (req, res) => {
  const { sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock, location } = req.body;
  if (!sku || !name) return res.status(400).json({ error: 'SKU and Product Name are required' });
  db.prepare('UPDATE products SET sku=?,name=?,category=?,unit=?,purchase_price=?,sale_price=?,tax_rate=?,stock_qty=?,min_stock=?,location=? WHERE id=?').run(
    sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock, location || 'Warehouse A', req.params.id
  );
  res.json({ message: 'Product updated' });
});

app.delete('/api/products/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ message: 'Product deleted' });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/suppliers', (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY name').all());
});

app.post('/api/suppliers', requireRole('warehouse'), (req, res) => {
  const { name, email, phone, address, gstin } = req.body;
  const r = db.prepare('INSERT INTO suppliers (name,email,phone,address,gstin) VALUES (?,?,?,?,?)').run(name, email, phone, address, gstin);
  res.status(201).json({ id: r.lastInsertRowid });
});

app.put('/api/suppliers/:id', requireRole('warehouse'), (req, res) => {
  const { name, email, phone, address, gstin } = req.body;
  db.prepare('UPDATE suppliers SET name=?,email=?,phone=?,address=?,gstin=? WHERE id=?').run(name, email, phone, address, gstin, req.params.id);
  res.json({ message: 'Updated' });
});

// ══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS  (warehouse, admin)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/purchase-orders', requireRole('warehouse'), (req, res) => {
  const pos = db.prepare('SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id ORDER BY po.created_at DESC').all();
  res.json(pos);
});

app.get('/api/purchase-orders/:id', requireRole('warehouse'), (req, res) => {
  const po = db.prepare('SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id=?').get(req.params.id);
  if (!po) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare('SELECT pi.*, p.name as product_name, p.sku, p.unit FROM po_items pi JOIN products p ON pi.product_id = p.id WHERE pi.po_id=?').all(req.params.id);
  res.json({ ...po, items });
});

app.post('/api/purchase-orders', requireRole('warehouse'), (req, res) => {
  const { supplier_id, expected_date, notes, items } = req.body;
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as c FROM purchase_orders').get().c;
  const po_number = `PO-${year}-${String(count + 1).padStart(3, '0')}`;
  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const insertPO = db.transaction(() => {
    const r = db.prepare('INSERT INTO purchase_orders (po_number,supplier_id,expected_date,total_amount,notes) VALUES (?,?,?,?,?)').run(po_number, supplier_id, expected_date, total, notes);
    const poId = r.lastInsertRowid;
    items.forEach(i => db.prepare('INSERT INTO po_items (po_id,product_id,qty,unit_price) VALUES (?,?,?,?)').run(poId, i.product_id, i.qty, i.unit_price));
    return poId;
  });
  const poId = insertPO();
  res.status(201).json({ id: poId, po_number });
});

app.put('/api/purchase-orders/:id/status', requireRole('warehouse'), (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE purchase_orders SET status=? WHERE id=?').run(status, req.params.id);
  if (status === 'received') {
    const items = db.prepare('SELECT * FROM po_items WHERE po_id=?').all(req.params.id);
    db.transaction(() => {
      items.forEach(i => {
        db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id=?').run(i.qty, i.product_id);
        db.prepare("INSERT INTO stock_movements (product_id,type,qty,ref_type,ref_id,notes) VALUES (?,?,?,?,?,?)").run(i.product_id, 'purchase', i.qty, 'purchase_order', req.params.id, 'PO received');
      });
    })();
  }
  res.json({ message: 'Status updated' });
});

// ══════════════════════════════════════════════════════════════════════════════
// CHALLANS  (sales, warehouse, admin)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/challans', requireRole('sales', 'warehouse'), (req, res) => {
  const { status, customer_id } = req.query;
  let q = `SELECT ch.*, c.name as customer_name, u.name as created_by_name
    FROM challans ch
    JOIN customers c ON ch.customer_id = c.id
    LEFT JOIN users u ON ch.created_by = u.id
    WHERE 1=1`;
  const params = [];
  if (status) { params.push(status); q += ' AND ch.status=?'; }
  if (customer_id) { params.push(customer_id); q += ' AND ch.customer_id=?'; }
  q += ' ORDER BY ch.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

app.get('/api/challans/:id', requireRole('sales', 'warehouse'), (req, res) => {
  const ch = db.prepare(`
    SELECT ch.*, c.name as customer_name, c.address, c.gstin, u.name as created_by_name
    FROM challans ch
    JOIN customers c ON ch.customer_id = c.id
    LEFT JOIN users u ON ch.created_by = u.id
    WHERE ch.id=?
  `).get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Challan not found' });
  // Use snapshot columns if available, fallback to product JOIN
  const items = db.prepare(`
    SELECT ci.*,
      COALESCE(ci.product_name, p.name) as product_name,
      COALESCE(ci.product_sku,  p.sku)  as product_sku,
      COALESCE(ci.product_unit, p.unit) as product_unit,
      p.tax_rate
    FROM challan_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.challan_id=?
  `).all(req.params.id);
  res.json({ ...ch, items });
});

app.post('/api/challans', requireRole('sales', 'warehouse'), (req, res) => {
  const { customer_id, delivery_address, notes, items, status } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  const challanStatus = status || 'Draft';
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as c FROM challans').get().c;
  const challan_no = `CH-${year}-${String(count + 1).padStart(3, '0')}`;

  try {
    const challanId = db.transaction(() => {
      // 1. Compute total quantity
      const total_qty = items.reduce((s, i) => s + Number(i.qty || 0), 0);

      // 2. Insert challan header
      const r = db.prepare(
        'INSERT INTO challans (challan_no,customer_id,status,delivery_address,notes,total_qty,created_by) VALUES (?,?,?,?,?,?,?)'
      ).run(challan_no, customer_id, challanStatus, delivery_address || null, notes || null, total_qty, req.user.id);
      const id = r.lastInsertRowid;

      // 3. Validate items & stock, insert line items with product snapshot
      for (const i of items) {
        const product = db.prepare('SELECT * FROM products WHERE id=?').get(i.product_id);
        if (!product) throw new Error(`Product ID ${i.product_id} not found`);

        if (challanStatus === 'Confirmed') {
          if (product.stock_qty < i.qty) {
            throw new Error(
              `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.stock_qty}, Required: ${i.qty}`
            );
          }
          // Deduct stock atomically
          db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id=?').run(i.qty, i.product_id);
          // Log movement with creator
          db.prepare(
            'INSERT INTO stock_movements (product_id,type,qty,ref_type,ref_id,notes,created_by) VALUES (?,?,?,?,?,?,?)'
          ).run(i.product_id, 'OUT', i.qty, 'challan', id, `Challan Confirmed: ${challan_no}`, req.user.id);
        }

        // Store product snapshot so challan history is immutable
        db.prepare(
          'INSERT INTO challan_items (challan_id,product_id,qty,unit_price,discount,product_sku,product_name,product_unit) VALUES (?,?,?,?,?,?,?,?)'
        ).run(id, i.product_id, i.qty, i.unit_price, i.discount || 0, product.sku, product.name, product.unit);
      }
      return id;
    })();

    res.status(201).json({ id: challanId, challan_no, status: challanStatus });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/challans/:id/status', requireRole('sales', 'warehouse'), (req, res) => {
  const { status } = req.body; // 'Confirmed' or 'Cancelled'
  const challanId = req.params.id;

  try {
    db.transaction(() => {
      const challan = db.prepare('SELECT * FROM challans WHERE id=?').get(challanId);
      if (!challan) throw new Error('Challan not found');

      if (challan.status === status) return; // No change

      if (status === 'Confirmed') {
        if (challan.status !== 'Draft') throw new Error('Can only confirm a Draft challan');
        // Validate and deduct stock
        const items = db.prepare('SELECT * FROM challan_items WHERE challan_id=?').all(challanId);
        for (const i of items) {
          const product = db.prepare('SELECT * FROM products WHERE id=?').get(i.product_id);
          if (!product) throw new Error(`Product not found for item`);
          if (product.stock_qty < i.qty) {
            throw new Error(`Insufficient stock for product: ${product.name} (Available: ${product.stock_qty}, Required: ${i.qty})`);
          }
          db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id=?').run(i.qty, i.product_id);
          db.prepare("INSERT INTO stock_movements (product_id,type,qty,ref_type,ref_id,notes,created_by) VALUES (?,?,?,?,?,?,?)").run(
            i.product_id, 'OUT', i.qty, 'challan', challanId, `Challan Confirmed: ${challan.challan_no}`, req.user.id
          );
        }
      } else if (status === 'Cancelled') {
        if (challan.status === 'Confirmed') {
          // Restore stock
          const items = db.prepare('SELECT * FROM challan_items WHERE challan_id=?').all(challanId);
          for (const i of items) {
            db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id=?').run(i.qty, i.product_id);
            db.prepare("INSERT INTO stock_movements (product_id,type,qty,ref_type,ref_id,notes,created_by) VALUES (?,?,?,?,?,?,?)").run(
              i.product_id, 'IN', i.qty, 'challan', challanId, `Challan Cancelled: ${challan.challan_no}`, req.user.id
            );
          }
        }
      }

      db.prepare('UPDATE challans SET status=? WHERE id=?').run(status, challanId);
    })();
    res.json({ message: `Challan status updated to ${status}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// INVOICES  (accounts, admin)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/invoices', requireRole('accounts', 'sales'), (req, res) => {
  const { status, customer_id } = req.query;
  let q = 'SELECT i.*, c.name as customer_name FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE 1=1';
  const params = [];
  if (status) { params.push(status); q += ' AND i.status=?'; }
  if (customer_id) { params.push(customer_id); q += ' AND i.customer_id=?'; }
  q += ' ORDER BY i.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

app.get('/api/invoices/:id', requireRole('accounts', 'sales'), (req, res) => {
  const inv = db.prepare('SELECT i.*, c.name as customer_name, c.address, c.gstin, c.mobile_number as phone, c.email FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id=?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  if (inv.challan_id) inv.items = db.prepare('SELECT ci.*, p.name as product_name, p.sku, p.unit, p.tax_rate FROM challan_items ci JOIN products p ON ci.product_id = p.id WHERE ci.challan_id=?').all(inv.challan_id);
  res.json(inv);
});

app.post('/api/invoices', requireRole('accounts', 'sales'), (req, res) => {
  const { challan_id, customer_id, due_date, notes, items, discount_amount } = req.body;
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
  const invoice_no = `INV-${year}-${String(count + 1).padStart(3, '0')}`;
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const tax_amount = items.reduce((s, i) => s + (i.total * ((i.tax_rate || 18) / 100)), 0);
  const total_amount = subtotal + tax_amount - (discount_amount || 0);
  const r = db.prepare('INSERT INTO invoices (invoice_no,challan_id,customer_id,due_date,subtotal,tax_amount,discount_amount,total_amount,notes) VALUES (?,?,?,?,?,?,?,?,?)').run(invoice_no, challan_id || null, customer_id, due_date, subtotal, tax_amount, discount_amount || 0, total_amount, notes);
  res.status(201).json({ id: r.lastInsertRowid, invoice_no });
});

app.put('/api/invoices/:id/payment', requireRole('accounts'), (req, res) => {
  const { amount } = req.body;
  const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  const new_paid = (inv.paid_amount || 0) + amount;
  const status = new_paid >= inv.total_amount ? 'paid' : 'partial';
  db.prepare('UPDATE invoices SET paid_amount=?, status=? WHERE id=?').run(new_paid, status, req.params.id);
  res.json({ message: 'Payment recorded', status });
});

// ══════════════════════════════════════════════════════════════════════════════
// CRM FOLLOW-UPS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/crm', requireRole('sales'), (req, res) => {
  const { status, customer_id } = req.query;
  let q = 'SELECT f.*, c.name as customer_name FROM crm_followups f JOIN customers c ON f.customer_id = c.id WHERE 1=1';
  const params = [];
  if (status) { params.push(status); q += ' AND f.status=?'; }
  if (customer_id) { params.push(customer_id); q += ' AND f.customer_id=?'; }
  q += ' ORDER BY f.follow_date DESC';
  res.json(db.prepare(q).all(...params));
});

app.post('/api/crm', requireRole('sales'), (req, res) => {
  const { customer_id, type, notes, status, follow_date } = req.body;
  const r = db.prepare('INSERT INTO crm_followups (customer_id,type,notes,status,follow_date,created_by) VALUES (?,?,?,?,?,?)').run(customer_id, type, notes, status || 'pending', follow_date, req.user.id);
  res.status(201).json({ id: r.lastInsertRowid });
});

app.put('/api/crm/:id', requireRole('sales'), (req, res) => {
  const { type, notes, status, follow_date } = req.body;
  db.prepare('UPDATE crm_followups SET type=?,notes=?,status=?,follow_date=? WHERE id=?').run(type, notes, status, follow_date, req.params.id);
  res.json({ message: 'Updated' });
});

app.delete('/api/crm/:id', requireRole('sales'), (req, res) => {
  db.prepare('DELETE FROM crm_followups WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ══════════════════════════════════════════════════════════════════════════════
// STOCK
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/stock', requireRole('warehouse'), (req, res) => {
  const { search, low_stock } = req.query;
  let q = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (search) { params.push(`%${search}%`, `%${search}%`); q += ' AND (name LIKE ? OR sku LIKE ?)'; }
  if (low_stock === 'true') { q += ' AND stock_qty <= min_stock'; }
  q += ' ORDER BY stock_qty ASC';
  const products = db.prepare(q).all(...params);
  const movements = db.prepare(`
    SELECT sm.*, p.name as product_name, p.sku, u.name as user_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    LEFT JOIN users u ON sm.created_by = u.id
    ORDER BY sm.created_at DESC LIMIT 100
  `).all();
  res.json({ products, movements });
});

// Paginated stock movements with search/filter
app.get('/api/stock/movements', requireRole('warehouse'), (req, res) => {
  const { product_id, type, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let q = `
    SELECT sm.*, p.name as product_name, p.sku, u.name as user_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    LEFT JOIN users u ON sm.created_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (product_id) { params.push(product_id); q += ' AND sm.product_id = ?'; }
  if (type) { params.push(type); q += ' AND sm.type = ?'; }
  q += ' ORDER BY sm.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);
  const movements = db.prepare(q).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as c FROM stock_movements sm WHERE 1=1${product_id ? ' AND sm.product_id=?' : ''}${type ? ' AND sm.type=?' : ''}`).get(...params.slice(0, -2)).c;
  res.json({ movements, total, page: Number(page), limit: Number(limit) });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 SyncERP API running on http://localhost:${PORT}`));
