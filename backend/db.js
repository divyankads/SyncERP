const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// DB_PATH env lets Docker/Render mount a persistent volume
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'syncerp.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'sales',
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    mobile_number   TEXT,
    email           TEXT,
    business_name   TEXT,
    gstin           TEXT,
    customer_type   TEXT DEFAULT 'Retail',
    address         TEXT,
    city            TEXT,
    credit_limit    REAL DEFAULT 0,
    status          TEXT DEFAULT 'Lead',
    follow_up_date  TEXT,
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    created_by      INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT,
    phone      TEXT,
    address    TEXT,
    gstin      TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sku             TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    category        TEXT,
    unit            TEXT DEFAULT 'pcs',
    purchase_price  REAL DEFAULT 0,
    sale_price      REAL DEFAULT 0,
    tax_rate        REAL DEFAULT 18,
    stock_qty       REAL DEFAULT 0,
    min_stock       REAL DEFAULT 10,
    location        TEXT DEFAULT 'Warehouse A',
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number     TEXT UNIQUE NOT NULL,
    supplier_id   INTEGER REFERENCES suppliers(id),
    status        TEXT DEFAULT 'draft',
    order_date    TEXT DEFAULT (date('now')),
    expected_date TEXT,
    total_amount  REAL DEFAULT 0,
    notes         TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS po_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id       INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id  INTEGER REFERENCES products(id),
    qty         REAL NOT NULL,
    unit_price  REAL NOT NULL,
    total       REAL GENERATED ALWAYS AS (qty * unit_price) STORED
  );

  CREATE TABLE IF NOT EXISTS challans (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    challan_no       TEXT UNIQUE NOT NULL,
    customer_id      INTEGER REFERENCES customers(id),
    status           TEXT DEFAULT 'Draft',
    challan_date     TEXT DEFAULT (date('now')),
    delivery_address TEXT,
    notes            TEXT,
    total_qty        REAL DEFAULT 0,
    created_by       INTEGER REFERENCES users(id),
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challan_items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    challan_id    INTEGER REFERENCES challans(id) ON DELETE CASCADE,
    product_id    INTEGER REFERENCES products(id),
    qty           REAL NOT NULL,
    unit_price    REAL NOT NULL,
    discount      REAL DEFAULT 0,
    total         REAL GENERATED ALWAYS AS (qty * unit_price * (1 - discount/100)) STORED,
    product_sku   TEXT,
    product_name  TEXT,
    product_unit  TEXT
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no      TEXT UNIQUE NOT NULL,
    challan_id      INTEGER REFERENCES challans(id),
    customer_id     INTEGER REFERENCES customers(id),
    status          TEXT DEFAULT 'unpaid',
    invoice_date    TEXT DEFAULT (date('now')),
    due_date        TEXT,
    subtotal        REAL DEFAULT 0,
    tax_amount      REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total_amount    REAL DEFAULT 0,
    paid_amount     REAL DEFAULT 0,
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS crm_followups (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id  INTEGER REFERENCES customers(id),
    type         TEXT DEFAULT 'call',
    notes        TEXT,
    status       TEXT DEFAULT 'pending',
    follow_date  TEXT DEFAULT (date('now')),
    created_by   INTEGER REFERENCES users(id),
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER REFERENCES products(id),
    type        TEXT NOT NULL,
    qty         REAL NOT NULL,
    ref_type    TEXT,
    ref_id      INTEGER,
    notes       TEXT,
    created_by  INTEGER REFERENCES users(id),
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Safe Migrations (add new columns without breaking existing DBs) ─────────
// These run each time but SQLite ignores errors for duplicate columns via try/catch
const migrations = [
  'ALTER TABLE products ADD COLUMN location TEXT DEFAULT \'Warehouse A\'',
  'ALTER TABLE challans ADD COLUMN total_qty REAL DEFAULT 0',
  'ALTER TABLE challans ADD COLUMN created_by INTEGER',
  'ALTER TABLE challan_items ADD COLUMN product_sku TEXT',
  'ALTER TABLE challan_items ADD COLUMN product_name TEXT',
  'ALTER TABLE challan_items ADD COLUMN product_unit TEXT',
  'ALTER TABLE stock_movements ADD COLUMN created_by INTEGER',
];
migrations.forEach(sql => {
  try { db.exec(sql); } catch (_) { /* column already exists, safe to ignore */ }
});

// ─── Seed ──────────────────────────────────────────────────────────────────

const seedCheck = db.prepare('SELECT COUNT(*) as cnt FROM users').get();

if (seedCheck.cnt === 0) {
  // ── Users (all 4 roles) ──
  const insertUser = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)');
  const users = [
    ['Admin User', 'admin@syncerp.com', bcrypt.hashSync('admin123', 10), 'admin'],
    ['Priya Sharma', 'sales@syncerp.com', bcrypt.hashSync('sales123', 10), 'sales'],
    ['Rahul Verma', 'warehouse@syncerp.com', bcrypt.hashSync('warehouse123', 10), 'warehouse'],
    ['Anjali Mehta', 'accounts@syncerp.com', bcrypt.hashSync('accounts123', 10), 'accounts'],
  ];
  users.forEach(u => insertUser.run(...u));

  // ── Customers (extended schema) ──
  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, mobile_number, email, business_name, gstin, customer_type, address, city, credit_limit, status, follow_up_date, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const customers = [
    ['Rajesh Agarwal', '9810001234', 'rajesh@agarwal.com', 'Agarwal Traders', '07AABCU9603R1ZX', 'Wholesale', '12, Industrial Area', 'Delhi', 200000, 'Active', '2024-03-15', 'Key wholesale partner. Interested in bulk Steel Pipe orders.'],
    ['Vikram Mehta', '9820005678', 'vikram@mehta.com', 'Mehta Enterprises', '27AAACM5897P1ZY', 'Distributor', '45, MG Road', 'Mumbai', 150000, 'Active', '2024-03-20', 'Long-term distributor. Pending invoice follow-up needed.'],
    ['Sunita Sharma', '9830009012', 'sunita@sharma.com', 'Sharma Wholesale', '08AAICS2095G1ZA', 'Wholesale', '78, Ring Road', 'Jaipur', 100000, 'Active', '2024-04-01', 'Showroom visit scheduled.'],
    ['Dhruv Patel', '9840003456', 'dhruv@patel.com', 'Patel Distributors', '24AAHCP8562R1ZB', 'Distributor', '23, GT Road', 'Ahmedabad', 300000, 'Active', '2024-03-25', 'High-value account. Priority customer.'],
    ['Ankit Gupta', '9850007890', 'ankit@gupta.com', 'Gupta Supply Co', '09AABCG6723R1ZC', 'Retail', '56, Civil Lines', 'Lucknow', 80000, 'Active', '2024-03-30', 'New customer. Welcome email sent.'],
    ['Kavita Singh', '9860001111', 'kavita@ksingh.com', 'K Singh Traders', null, 'Retail', '34, Sector 12', 'Noida', 0, 'Lead', '2024-04-05', 'Contacted via trade fair. Send product catalog.'],
    ['Amit Bose', '9870002222', 'amit@bose.co', 'Bose Industrial', null, 'Wholesale', '67, Jadavpur', 'Kolkata', 0, 'Lead', '2024-04-10', 'Interested in electrical items.'],
    ['Pooja Nair', '9880003333', 'pooja@nair.com', 'Nair Distribution', '32AABCN1234Z1ZX', 'Distributor', '23, MG Road', 'Kochi', 120000, 'Inactive', null, 'Account dormant for 6 months.'],
  ];
  customers.forEach(c => insertCustomer.run(...c));

  // ── Suppliers ──
  const insertSupplier = db.prepare('INSERT INTO suppliers (name, email, phone, address, gstin) VALUES (?,?,?,?,?)');
  const suppliers = [
    ['ABC Manufacturing', 'abc@mfg.com', '9811112222', 'MIDC, Pune', '27AABCA1234B1ZZ'],
    ['XYZ Imports Ltd', 'xyz@imports.com', '9822223333', 'Jawaharlal Nehru Port, Mumbai', '27AABCX5678C1ZY'],
    ['PQR Industries', 'pqr@ind.co', '9833334444', 'Sector 5, Noida', '09AABCP9012D1ZX'],
  ];
  suppliers.forEach(s => insertSupplier.run(...s));

  // ── Products ──
  const insertProduct = db.prepare(`
    INSERT INTO products (sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock, location)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);
  const products = [
    ['SKU-001', 'Industrial Bolt M10', 'Hardware', 'pcs', 5, 12, 18, 500, 50, 'Warehouse A'],
    ['SKU-002', 'Steel Pipe 2inch', 'Pipes & Fittings', 'mtr', 180, 350, 18, 120, 20, 'Warehouse B'],
    ['SKU-003', 'PVC Elbow 90°', 'Pipes & Fittings', 'pcs', 25, 55, 18, 300, 30, 'Warehouse B'],
    ['SKU-004', 'Copper Wire 6mm', 'Electrical', 'mtr', 90, 180, 18, 80, 15, 'Warehouse C'],
    ['SKU-005', 'Safety Helmet', 'Safety', 'pcs', 120, 250, 12, 45, 10, 'Warehouse A'],
    ['SKU-006', 'Bearing 6205', 'Mechanical', 'pcs', 220, 450, 18, 60, 10, 'Warehouse A'],
    ['SKU-007', 'Hydraulic Oil 20L', 'Lubricants', 'ltr', 950, 1800, 18, 30, 5, 'Warehouse C'],
    ['SKU-008', 'Drill Bit Set', 'Tools', 'set', 380, 750, 18, 25, 5, 'Warehouse A'],
  ];
  products.forEach(p => insertProduct.run(...p));

  // ── Purchase Orders ──
  db.prepare('INSERT INTO purchase_orders (po_number, supplier_id, status, expected_date, total_amount) VALUES (?,?,?,?,?)').run('PO-2024-001', 1, 'received', '2024-02-15', 52500);
  db.prepare('INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES (?,?,?,?)').run(1, 1, 1000, 5);
  db.prepare('INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES (?,?,?,?)').run(1, 2, 100, 180);
  db.prepare('INSERT INTO purchase_orders (po_number, supplier_id, status, expected_date, total_amount) VALUES (?,?,?,?,?)').run('PO-2024-002', 2, 'confirmed', '2024-03-01', 28800);
  db.prepare('INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES (?,?,?,?)').run(2, 4, 160, 90);
  db.prepare('INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES (?,?,?,?)').run(2, 5, 80, 120);

  // ── Challans ──
  db.prepare("INSERT INTO challans (challan_no, customer_id, status, delivery_address) VALUES (?,?,?,?)").run('CH-2024-001', 1, 'delivered', '12, Industrial Area, Delhi');
  db.prepare('INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)').run(1, 1, 200, 12, 5);
  db.prepare('INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)').run(1, 2, 50, 350, 0);
  db.prepare("INSERT INTO challans (challan_no, customer_id, status, delivery_address) VALUES (?,?,?,?)").run('CH-2024-002', 2, 'delivered', '45, MG Road, Mumbai');
  db.prepare('INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)').run(2, 3, 100, 55, 10);
  db.prepare('INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)').run(2, 6, 30, 450, 0);
  db.prepare("INSERT INTO challans (challan_no, customer_id, status, delivery_address) VALUES (?,?,?,?)").run('CH-2024-003', 3, 'dispatched', '78, Ring Road, Jaipur');
  db.prepare('INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)').run(3, 7, 10, 1800, 0);
  db.prepare('INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)').run(3, 8, 5, 750, 5);

  // ── Invoices ──
  db.prepare('INSERT INTO invoices (invoice_no, challan_id, customer_id, status, due_date, subtotal, tax_amount, total_amount, paid_amount) VALUES (?,?,?,?,?,?,?,?,?)').run('INV-2024-001', 1, 1, 'paid', '2024-02-28', 19800, 3564, 23364, 23364);
  db.prepare('INSERT INTO invoices (invoice_no, challan_id, customer_id, status, due_date, subtotal, tax_amount, total_amount, paid_amount) VALUES (?,?,?,?,?,?,?,?,?)').run('INV-2024-002', 2, 2, 'partial', '2024-03-15', 18150, 3267, 21417, 10000);
  db.prepare('INSERT INTO invoices (invoice_no, challan_id, customer_id, status, due_date, subtotal, tax_amount, total_amount, paid_amount) VALUES (?,?,?,?,?,?,?,?,?)').run('INV-2024-003', 3, 3, 'unpaid', '2024-04-01', 21525, 3874.5, 25399.5, 0);

  // ── CRM Follow-ups ──
  db.prepare("INSERT INTO crm_followups (customer_id, type, notes, status, follow_date, created_by) VALUES (?,?,?,?,?,?)").run(1, 'call', 'Discussed bulk Steel Pipe order. Quoted ₹320/mtr. Decision expected next week.', 'done', '2024-01-15', 2);
  db.prepare("INSERT INTO crm_followups (customer_id, type, notes, status, follow_date, created_by) VALUES (?,?,?,?,?,?)").run(2, 'email', 'Sent product catalog for Q1 2024. Awaiting response.', 'done', '2024-01-20', 2);
  db.prepare("INSERT INTO crm_followups (customer_id, type, notes, status, follow_date, created_by) VALUES (?,?,?,?,?,?)").run(3, 'visit', 'Scheduled showroom visit. Interested in hydraulic range.', 'pending', '2024-02-10', 2);
  db.prepare("INSERT INTO crm_followups (customer_id, type, notes, status, follow_date, created_by) VALUES (?,?,?,?,?,?)").run(4, 'call', 'Follow up on INV-2024-002 payment. Promised payment by 20th March.', 'pending', '2024-02-05', 2);
  db.prepare("INSERT INTO crm_followups (customer_id, type, notes, status, follow_date, created_by) VALUES (?,?,?,?,?,?)").run(5, 'email', 'Welcome email + onboarding docs sent.', 'done', '2024-01-25', 2);
  db.prepare("INSERT INTO crm_followups (customer_id, type, notes, status, follow_date, created_by) VALUES (?,?,?,?,?,?)").run(6, 'whatsapp', 'Shared product catalog on WhatsApp. Hot lead from trade fair.', 'pending', '2024-03-01', 2);

  console.log('✅ Database seeded — 4 users, 8 customers, products, POs, challans, invoices, CRM');
}

module.exports = db;
