import { Router } from 'express';
import pool from '../db/pool';
import { asyncHandler } from '../middleware/validate';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const [
    customers, products, lowStock, revenue, pending, openPOs, pendingFollowups,
    recentInvoices, topProducts, monthlySales,
  ] = await Promise.all([
    pool.query("SELECT COUNT(*) as c FROM customers WHERE status = 'active'"),
    pool.query('SELECT COUNT(*) as c FROM products'),
    pool.query('SELECT COUNT(*) as c FROM products WHERE stock_qty <= min_stock'),
    pool.query('SELECT COALESCE(SUM(total_amount),0) as r FROM invoices'),
    pool.query("SELECT COALESCE(SUM(total_amount - paid_amount),0) as p FROM invoices WHERE status != 'paid'"),
    pool.query("SELECT COUNT(*) as c FROM purchase_orders WHERE status IN ('draft','confirmed')"),
    pool.query("SELECT COUNT(*) as c FROM crm_followups WHERE status = 'pending'"),
    pool.query(`
      SELECT i.*, c.name as customer_name
      FROM invoices i JOIN customers c ON i.customer_id = c.id
      ORDER BY i.created_at DESC LIMIT 5
    `),
    pool.query(`
      SELECT p.name, p.sku, SUM(ci.qty) as total_sold, SUM(ci.total) as revenue
      FROM challan_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN challans ch ON ci.challan_id = ch.id
      WHERE ch.status IN ('delivered','dispatched')
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_sold DESC LIMIT 5
    `),
    pool.query(`
      SELECT TO_CHAR(invoice_date, 'YYYY-MM') as month, SUM(total_amount) as total
      FROM invoices
      GROUP BY month
      ORDER BY month DESC LIMIT 6
    `),
  ]);

  res.json({
    totalCustomers:   Number(customers.rows[0].c),
    totalProducts:    Number(products.rows[0].c),
    lowStockCount:    Number(lowStock.rows[0].c),
    totalRevenue:     Number(revenue.rows[0].r),
    pendingAmount:    Number(pending.rows[0].p),
    openPOs:          Number(openPOs.rows[0].c),
    pendingFollowups: Number(pendingFollowups.rows[0].c),
    recentInvoices:   recentInvoices.rows,
    topProducts:      topProducts.rows,
    monthlySales:     monthlySales.rows.reverse(),
  });
}));

export default router;
