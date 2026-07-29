import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// @ts-ignore
import db from '../../db';
import { UserModel } from '../db/mongo';

const router = Router();

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'syncerp_dev_secret_change_in_production_2026';
const JWT_EXPIRES: any = process.env.JWT_EXPIRES || '8h';

const PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  sales: ['customers', 'crm', 'challans', 'invoices', 'dashboard'],
  warehouse: ['products', 'stock', 'purchase-orders', 'challans', 'dashboard'],
  accounts: ['invoices', 'customers', 'dashboard'],
};

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  let user: any = null;

  // 1. Try MongoDB Atlas user store
  try {
    const mongoUser = await UserModel.findOne({ email: cleanEmail, status: 'active' });
    if (mongoUser) {
      user = {
        id: mongoUser._id.toString(),
        name: mongoUser.name,
        email: mongoUser.email,
        password: mongoUser.password,
        role: mongoUser.role,
      };
    }
  } catch (err) {
    console.warn('MongoDB lookup warning:', err);
  }

  // 2. Fall back to SQLite local db
  if (!user && db && typeof db.prepare === 'function') {
    try {
      const sqliteUser = db.prepare('SELECT * FROM users WHERE email = ? AND status = ?').get(cleanEmail, 'active');
      if (sqliteUser) {
        user = sqliteUser;
      }
    } catch (err) {
      console.warn('SQLite lookup warning:', err);
    }
  }

  if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  res.json({
    token,
    user: payload,
    permissions: PERMISSIONS[user.role] || [],
  });
});

// GET /api/auth/me
router.get('/me', async (req: any, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    permissions: PERMISSIONS[req.user.role] || [],
  });
});

export default router;
