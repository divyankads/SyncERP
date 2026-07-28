import pool from './pool';

export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(255) NOT NULL,
        email         VARCHAR(255),
        phone         VARCHAR(20),
        address       TEXT,
        city          VARCHAR(100),
        gstin         VARCHAR(20),
        credit_limit  NUMERIC(12,2) DEFAULT 0,
        status        VARCHAR(20)   DEFAULT 'active',
        created_at    TIMESTAMPTZ   DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255),
        phone      VARCHAR(20),
        address    TEXT,
        gstin      VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id              SERIAL PRIMARY KEY,
        sku             VARCHAR(50) UNIQUE NOT NULL,
        name            VARCHAR(255) NOT NULL,
        category        VARCHAR(100),
        unit            VARCHAR(20) DEFAULT 'pcs',
        purchase_price  NUMERIC(12,2) DEFAULT 0,
        sale_price      NUMERIC(12,2) DEFAULT 0,
        tax_rate        NUMERIC(5,2)  DEFAULT 18,
        stock_qty       NUMERIC(12,2) DEFAULT 0,
        min_stock       NUMERIC(12,2) DEFAULT 10,
        created_at      TIMESTAMPTZ   DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id            SERIAL PRIMARY KEY,
        po_number     VARCHAR(50) UNIQUE NOT NULL,
        supplier_id   INTEGER REFERENCES suppliers(id),
        status        VARCHAR(30) DEFAULT 'draft',
        order_date    DATE        DEFAULT CURRENT_DATE,
        expected_date DATE,
        total_amount  NUMERIC(14,2) DEFAULT 0,
        notes         TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS po_items (
        id          SERIAL PRIMARY KEY,
        po_id       INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id  INTEGER REFERENCES products(id),
        qty         NUMERIC(12,2) NOT NULL,
        unit_price  NUMERIC(12,2) NOT NULL,
        total       NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED
      );

      CREATE TABLE IF NOT EXISTS challans (
        id               SERIAL PRIMARY KEY,
        challan_no       VARCHAR(50) UNIQUE NOT NULL,
        customer_id      INTEGER REFERENCES customers(id),
        status           VARCHAR(30) DEFAULT 'draft',
        challan_date     DATE        DEFAULT CURRENT_DATE,
        delivery_address TEXT,
        notes            TEXT,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS challan_items (
        id          SERIAL PRIMARY KEY,
        challan_id  INTEGER REFERENCES challans(id) ON DELETE CASCADE,
        product_id  INTEGER REFERENCES products(id),
        qty         NUMERIC(12,2) NOT NULL,
        unit_price  NUMERIC(12,2) NOT NULL,
        discount    NUMERIC(5,2)  DEFAULT 0,
        total       NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_price * (1 - discount / 100)) STORED
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id              SERIAL PRIMARY KEY,
        invoice_no      VARCHAR(50) UNIQUE NOT NULL,
        challan_id      INTEGER REFERENCES challans(id),
        customer_id     INTEGER REFERENCES customers(id),
        status          VARCHAR(20) DEFAULT 'unpaid',
        invoice_date    DATE        DEFAULT CURRENT_DATE,
        due_date        DATE,
        subtotal        NUMERIC(14,2) DEFAULT 0,
        tax_amount      NUMERIC(14,2) DEFAULT 0,
        discount_amount NUMERIC(14,2) DEFAULT 0,
        total_amount    NUMERIC(14,2) DEFAULT 0,
        paid_amount     NUMERIC(14,2) DEFAULT 0,
        notes           TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_followups (
        id          SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        type        VARCHAR(30) DEFAULT 'call',
        notes       TEXT,
        status      VARCHAR(20) DEFAULT 'pending',
        follow_date DATE        DEFAULT CURRENT_DATE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id          SERIAL PRIMARY KEY,
        product_id  INTEGER REFERENCES products(id),
        type        VARCHAR(30) NOT NULL,
        qty         NUMERIC(12,2) NOT NULL,
        ref_type    VARCHAR(50),
        ref_id      INTEGER,
        notes       TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Migrations completed');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate().catch(console.error).finally(() => process.exit());
}
