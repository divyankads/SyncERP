import pool from './pool';
import { migrate } from './migrate';

async function seed(): Promise<void> {
  await migrate();

  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT COUNT(*) as cnt FROM customers');
    if (Number(rows[0].cnt) > 0) {
      console.log('ℹ️  Database already seeded — skipping');
      return;
    }

    await client.query('BEGIN');

    // Customers
    const custResult = await client.query(`
      INSERT INTO customers (name, email, phone, address, city, gstin, credit_limit) VALUES
      ('Agarwal Traders',    'agarwal@traders.com',  '9810001234', '12, Industrial Area', 'Delhi',     '07AABCU9603R1ZX', 200000),
      ('Mehta Enterprises',  'mehta@enterprises.in', '9820005678', '45, MG Road',         'Mumbai',    '27AAACM5897P1ZY', 150000),
      ('Sharma Wholesale',   'sharma@wholesale.co',  '9830009012', '78, Ring Road',        'Jaipur',   '08AAICS2095G1ZA', 100000),
      ('Patel Distributors', 'patel@dist.co',        '9840003456', '23, GT Road',          'Ahmedabad','24AAHCP8562R1ZB', 300000),
      ('Gupta Supply Co',    'gupta@supply.in',      '9850007890', '56, Civil Lines',      'Lucknow',  '09AABCG6723R1ZC',  80000)
      RETURNING id
    `);
    const [c1, c2, c3] = custResult.rows;

    // Suppliers
    const supResult = await client.query(`
      INSERT INTO suppliers (name, email, phone, address, gstin) VALUES
      ('ABC Manufacturing', 'abc@mfg.com',     '9811112222', 'MIDC, Pune',                  '27AABCA1234B1ZZ'),
      ('XYZ Imports Ltd',   'xyz@imports.com', '9822223333', 'Jawaharlal Nehru Port, Mumbai','27AABCX5678C1ZY'),
      ('PQR Industries',    'pqr@ind.co',      '9833334444', 'Sector 5, Noida',             '09AABCP9012D1ZX')
      RETURNING id
    `);
    const [s1] = supResult.rows;

    // Products
    const prodResult = await client.query(`
      INSERT INTO products (sku, name, category, unit, purchase_price, sale_price, tax_rate, stock_qty, min_stock) VALUES
      ('SKU-001', 'Industrial Bolt M10', 'Hardware',          'pcs',  5,   12,  18, 500, 50),
      ('SKU-002', 'Steel Pipe 2inch',    'Pipes & Fittings',  'mtr', 180, 350,  18, 120, 20),
      ('SKU-003', 'PVC Elbow 90°',       'Pipes & Fittings',  'pcs', 25,   55,  18, 300, 30),
      ('SKU-004', 'Copper Wire 6mm',     'Electrical',        'mtr', 90,  180,  18,  80, 15),
      ('SKU-005', 'Safety Helmet',       'Safety',            'pcs', 120, 250,  12,  45, 10),
      ('SKU-006', 'Bearing 6205',        'Mechanical',        'pcs', 220, 450,  18,  60, 10),
      ('SKU-007', 'Hydraulic Oil 20L',   'Lubricants',        'ltr', 950,1800,  18,  30,  5),
      ('SKU-008', 'Drill Bit Set',       'Tools',             'set', 380, 750,  18,  25,  5)
      RETURNING id
    `);
    const [p1, p2, p3, p4, p5, p6, p7, p8] = prodResult.rows;

    // Purchase Orders
    const po1 = await client.query(`
      INSERT INTO purchase_orders (po_number, supplier_id, status, expected_date, total_amount)
      VALUES ('PO-2024-001', $1, 'received', '2024-02-15', 52500) RETURNING id
    `, [s1.id]);
    await client.query('INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES ($1,$2,1000,5),($1,$3,100,180)', [po1.rows[0].id, p1.id, p2.id]);

    const po2 = await client.query(`
      INSERT INTO purchase_orders (po_number, supplier_id, status, expected_date, total_amount)
      VALUES ('PO-2024-002', $1, 'confirmed', '2024-03-01', 28800) RETURNING id
    `, [s1.id]);
    await client.query('INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES ($1,$2,160,90),($1,$3,80,120)', [po2.rows[0].id, p4.id, p5.id]);

    // Challans
    const ch1 = await client.query(`
      INSERT INTO challans (challan_no, customer_id, status, delivery_address)
      VALUES ('CH-2024-001', $1, 'delivered', '12, Industrial Area, Delhi') RETURNING id
    `, [c1.id]);
    await client.query('INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES ($1,$2,200,12,5),($1,$3,50,350,0)', [ch1.rows[0].id, p1.id, p2.id]);

    const ch2 = await client.query(`
      INSERT INTO challans (challan_no, customer_id, status, delivery_address)
      VALUES ('CH-2024-002', $1, 'delivered', '45, MG Road, Mumbai') RETURNING id
    `, [c2.id]);
    await client.query('INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES ($1,$2,100,55,10),($1,$3,30,450,0)', [ch2.rows[0].id, p3.id, p6.id]);

    const ch3 = await client.query(`
      INSERT INTO challans (challan_no, customer_id, status, delivery_address)
      VALUES ('CH-2024-003', $1, 'dispatched', '78, Ring Road, Jaipur') RETURNING id
    `, [c3.id]);
    await client.query('INSERT INTO challan_items (challan_id, product_id, qty, unit_price, discount) VALUES ($1,$2,10,1800,0),($1,$3,5,750,5)', [ch3.rows[0].id, p7.id, p8.id]);

    // Invoices
    await client.query(`
      INSERT INTO invoices (invoice_no, challan_id, customer_id, status, due_date, subtotal, tax_amount, total_amount, paid_amount)
      VALUES
      ('INV-2024-001', $1, $2, 'paid',    '2024-02-28', 19800,   3564,   23364,   23364),
      ('INV-2024-002', $3, $4, 'partial', '2024-03-15', 18150,   3267,   21417,   10000),
      ('INV-2024-003', $5, $6, 'unpaid',  '2024-04-01', 21525, 3874.5, 25399.5,       0)
    `, [ch1.rows[0].id, c1.id, ch2.rows[0].id, c2.id, ch3.rows[0].id, c3.id]);

    // CRM
    await client.query(`
      INSERT INTO crm_followups (customer_id, type, notes, status, follow_date) VALUES
      ($1, 'call',     'Discussed new product requirements. Interested in bulk Steel Pipe orders.', 'done',    '2024-01-15'),
      ($2, 'email',    'Sent product catalog. Awaiting response.',                                  'done',    '2024-01-20'),
      ($3, 'visit',    'Scheduled showroom visit. Need to confirm date.',                           'pending', '2024-02-10'),
      ($4, 'call',     'Follow up on pending payment for INV-2023-045.',                            'pending', '2024-02-05'),
      ($5, 'email',    'Welcome email + onboarding docs sent.',                                     'done',    '2024-01-25')
    `, [c1.id, c2.id, c3.id, c1.id, c2.id]);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed().catch(console.error).finally(() => process.exit());
