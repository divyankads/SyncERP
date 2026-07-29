import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { seedMongoDB } from './db/seed-mongo';

dotenv.config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', database: 'MongoDB', timestamp: new Date().toISOString() });
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

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5001;

async function start(): Promise<void> {
  try {
    await connectMongoDB();
    await seedMongoDB();
    console.log('✅ MongoDB Atlas connected and active');
  } catch (err) {
    console.error('⚠️ MongoDB connection/seed warning:', err instanceof Error ? err.message : err);
  }

  app.listen(PORT, () => console.log(`🚀 SyncERP API (MongoDB Native) running on port ${PORT}`));
}

start();

export default app;
