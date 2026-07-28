const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'syncerp.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT,
    phone       TEXT,
    address     TEXT,
    city        TEXT,
    gstin       TEXT,
    credit_limit REAL DEFAULT 0,
    status      TEXT DEFAULT 'active',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sku          TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL,
    category     TEXT,
    unit         TEXT DEFAULT 'pcs',
    purchase_price REAL DEFAULT 0,
    sale_price   REAL DEFAULT 0,
    tax_rate     REAL DEFAULT 18,
    stock_qty    REAL DEFAULT 0,
    min_stock    REAL DEFAULT 10,
    created_at   TEXT DEFAULT (datetime('now'))
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

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number    TEXT UNIQUE NOT NULL,
    supplier_id  INTEGER REFERENCES suppliers(id),
    status       TEXT DEFAULT 'draft',
    order_date   TEXT DEFAULT (date('now')),
    expected_date TEXT,
    total_amount REAL DEFAULT 0,
    notes        TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
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
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    challan_no   TEXT UNIQUE NOT NULL,
    customer_id  INTEGER REFERENCES customers(id),
    status       TEXT DEFAULT 'draft',
    challan_date TEXT DEFAULT (date('now')),
    delivery_address TEXT,
    notes        TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challan_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    challan_id  INTEGER REFERENCES challans(id) ON DELETE CASCADE,
    product_id  INTEGER REFERENCES products(id),
    qty         REAL NOT NULL,
    unit_price  REAL NOT NULL,
    discount    REAL DEFAULT 0,
    total       REAL GENERATED ALWAYS AS (qty * unit_price * (1 - discount/100)) STORED
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
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Seed Data ─────────────────────────────────────────────────────────────

const seedCheck = db.prepare('SELECT COUNT(*) as cnt FROM customers').get();

if (seedCheck.cnt === 0) {
  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, email, phone, address, city, gstin, credit_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const customers = [
    ['Agarwal Traders', 'agarwal@traders.com', '9810001234', '12, Industrial Area', 'Delhi', '07AABCU9603R1ZX', 200000],
    ['Mehta Enterprises', 'mehta@enterprises.in', '9820005678', '45, MG Road', 'Mumbai', '27AAACM5897P1ZY', 150000],
    ['Sharma Wholesale', 'sharma@wholesale.co', '9830009012', '78, Ring Road', 'Jaipur', '08AAICS2095G1ZA', 100000],
    ['Patel Distributors', 'patel@dist.co', '9840003456', '23, GT Road', 'Ahmedabad', '24AAHCP8562R1ZB', 300000],
    ['Gupta Supply Co', 'gupta@supply.in', '9850007890', '56, Civil Lines', 'Lucknow', '09AABCG6723R1ZC', 80000],
  ];
  customers.forEach(c => insertCustomer.run(...c));

  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (name, email, phone, address, gstin)
    VALUES (?, ?, ?, ?, ?)
  `);
  const suppliers = [
    ['ABC Manufacturing', 'abc@mfg.com', '9811112222', 'MIDC, Pune', '27AABCA1234B1ZZ'],
    ['XYZ Imports Ltd', 'xyz@imports.com', '9822223333', 'Jawaharlal Nehru Port, Mumbai', '27AABCX5678C1ZY'],
    ['PQR Industries', 'pqr@ind.co', '9833334444', 'Sector 5, Noida', '09AABCP9012D1ZX'],
  ];
  suppliers.forEach(s => insertSupplier.run(...s));

  const insertProduct = db.prepare(`
    INSERT INTO products (sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const products = [
    ['SKU-001', 'Industrial Bolt M10', 'Hardware', 'pcs', 5, 12, 18, 500, 50],
    ['SKU-002', 'Steel Pipe 2inch', 'Pipes & Fittings', 'mtr', 180, 350, 18, 120, 20],
    ['SKU-003', 'PVC Elbow 90°', 'Pipes & Fittings', 'pcs', 25, 55, 18, 300, 30],
    ['SKU-004', 'Copper Wire 6mm', 'Electrical', 'mtr', 90, 180, 18, 80, 15],
    ['SKU-005', 'Safety Helmet', 'Safety', 'pcs', 120, 250, 12, 45, 10],
    ['SKU-006', 'Bearing 6205', 'Mechanical', 'pcs', 220, 450, 18, 60, 10],
    ['SKU-007', 'Hydraulic Oil 20L', 'Lubricants', 'ltr', 950, 1800, 18, 30, 5],
    ['SKU-008', 'Drill Bit Set', 'Tools', 'set', 380, 750, 18, 25, 5],
  ];
  products.forEach(p => insertProduct.run(...p));

  // Sample Purchase Order
  const po = db.prepare(`INSERT INTO purchase_orders (po_number, supplier_id, status, expected_date, total_amount) VALUES (?,?,?,?,?)`);
  po.run('PO-2024-001', 1, 'received', '2024-02-15', 52500);
  db.prepare(`INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES (?,?,?,?)`).run(1, 1, 1000, 5);
  db.prepare(`INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES (?,?,?,?)`).run(1, 2, 100, 180);

  po.run('PO-2024-002', 2, 'confirmed', '2024-03-01', 28800);
  db.prepare(`INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES (?,?,?,?)`).run(2, 4, 160, 90);
  db.prepare(`INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES (?,?,?,?)`).run(2, 5, 80, 120);

  // Sample Challans
  const challan = db.prepare(`INSERT INTO challans (challan_no, customer_id, status, delivery_address) VALUES (?,?,?,?)`);
  challan.run('CH-2024-001', 1, 'delivered', '12, Industrial Area, Delhi');
  db.prepare(`INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)`).run(1, 1, 200, 12, 5);
  db.prepare(`INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)`).run(1, 2, 50, 350, 0);

  challan.run('CH-2024-002', 2, 'delivered', '45, MG Road, Mumbai');
  db.prepare(`INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)`).run(2, 3, 100, 55, 10);
  db.prepare(`INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)`).run(2, 6, 30, 450, 0);

  challan.run('CH-2024-003', 3, 'dispatched', '78, Ring Road, Jaipur');
  db.prepare(`INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)`).run(3, 7, 10, 1800, 0);
  db.prepare(`INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES (?,?,?,?,?)`).run(3, 8, 5, 750, 5);

  // Sample Invoices
  const inv = db.prepare(`INSERT INTO invoices (invoice_no, challan_id, customer_id, status, due_date, subtotal, tax_amount, total_amount, paid_amount) VALUES (?,?,?,?,?,?,?,?,?)`);
  inv.run('INV-2024-001', 1, 1, 'paid', '2024-02-28', 19800, 3564, 23364, 23364);
  inv.run('INV-2024-002', 2, 2, 'partial', '2024-03-15', 18150, 3267, 21417, 10000);
  inv.run('INV-2024-003', 3, 3, 'unpaid', '2024-04-01', 21525, 3874.5, 25399.5, 0);

  // CRM Followups
  const fu = db.prepare(`INSERT INTO crm_followups (customer_id, type, notes, status, follow_date) VALUES (?,?,?,?,?)`);
  fu.run(1, 'call', 'Discussed new product requirements. Interested in bulk Steel Pipe orders.', 'done', '2024-01-15');
  fu.run(2, 'email', 'Sent product catalog. Awaiting response.', 'done', '2024-01-20');
  fu.run(3, 'visit', 'Scheduled showroom visit. Need to confirm date.', 'pending', '2024-02-10');
  fu.run(4, 'call', 'Follow up on pending payment for INV-2023-045.', 'pending', '2024-02-05');
  fu.run(5, 'email', 'Welcome email + onboarding docs sent.', 'done', '2024-01-25');

  console.log('✅ Database seeded successfully');
}

module.exports = db;
