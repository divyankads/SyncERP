# SyncERP — Demo Login Accounts Documentation

This document contains all default demo accounts available in **SyncERP** across MongoDB Atlas, SQLite, and PostgreSQL database modes.

---

## 🔑 Available Demo Accounts

| Role | Name | Email Address | Password | Permissions Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin User | `admin@syncerp.com` | `admin123` | **Full access (`*`)** to all system modules, user management, financial reports, and settings. |
| **Sales** | Priya Sharma | `sales@syncerp.com` | `sales123` | Customers, CRM Follow-ups, Delivery Challans, Sales Invoices, Dashboard. |
| **Warehouse** | Rahul Verma | `warehouse@syncerp.com` | `warehouse123` | Products, Stock Movements, Purchase Orders, Delivery Challans. |
| **Accounts** | Anjali Mehta | `accounts@syncerp.com` | `accounts123` | Sales Invoices, Customer Credit Limits, Financial Dashboard. |

---

## 🗄️ Database Seeding Commands

- **MongoDB Atlas Seed**:
  ```bash
  cd backend
  npm run db:seed-mongo
  ```

- **PostgreSQL / Relational DB Seed**:
  ```bash
  cd backend
  npm run db:seed
  ```

---

## 🚀 Environment Variables Reference

Ensure your `backend/.env` file contains:
```env
PORT=<your_port>
JWT_SECRET=<your_jwt_secret>
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority
CORS_ORIGIN=http://localhost:<your_port>
```
