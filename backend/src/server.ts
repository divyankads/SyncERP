import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/pool';
import { errorHandler } from './middleware/validate';

import dashboardRouter      from './routes/dashboard';
import customersRouter      from './routes/customers';
import productsRouter       from './routes/products';
import suppliersRouter      from './routes/suppliers';
import purchaseOrdersRouter from './routes/purchaseOrders';
import challansRouter       from './routes/challans';
import invoicesRouter       from './routes/invoices';
import crmRouter            from './routes/crm';
import stockRouter          from './routes/stock';
import authRouter           from './routes/auth';

import connectMongoDB from './db/mongo';

dotenv.config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',            authRouter);
app.use('/api/dashboard',       dashboardRouter);
app.use('/api/customers',       customersRouter);
app.use('/api/products',        productsRouter);
app.use('/api/suppliers',       suppliersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/challans',        challansRouter);
app.use('/api/invoices',        invoicesRouter);
app.use('/api/crm',             crmRouter);
app.use('/api/stock',           stockRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5001;

async function start(): Promise<void> {
  // Connect to MongoDB Atlas
  try {
    if (process.env.MONGODB_URI) {
      await connectMongoDB();
    }
  } catch (err) {
    console.error('⚠️ MongoDB connection warning:', err instanceof Error ? err.message : err);
  }

  try {
    await pool.query('SELECT 1'); // verify Postgres connection
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.log('💡 PostgreSQL not connected, running with active database drivers.');
  }

  app.listen(PORT, () => console.log(`🚀 SyncERP API running on http://localhost:${PORT}`));
}

start();

export default app;
