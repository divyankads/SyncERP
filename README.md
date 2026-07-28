# SyncERP — Wholesale & Distribution ERP/CRM System

[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://postgresql.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)

A production-ready ERP/CRM system for wholesale and distribution companies. Manages customers, products, purchase orders, delivery challans, GST invoices, and CRM follow-ups.

---

## 🗂️ Project Structure

```
SyncERP/
├── backend/                   # Express + TypeScript + PostgreSQL API
│   ├── src/
│   │   ├── db/
│   │   │   ├── pool.ts        # PostgreSQL connection pool
│   │   │   ├── migrate.ts     # Schema migrations
│   │   │   └── seed.ts        # Seed data
│   │   ├── middleware/
│   │   │   └── validate.ts    # Zod validation + error handler
│   │   ├── routes/
│   │   │   ├── dashboard.ts
│   │   │   ├── customers.ts
│   │   │   ├── products.ts
│   │   │   ├── suppliers.ts
│   │   │   ├── purchaseOrders.ts
│   │   │   ├── challans.ts
│   │   │   ├── invoices.ts
│   │   │   ├── crm.ts
│   │   │   └── stock.ts
│   │   ├── types/
│   │   │   └── schemas.ts     # Zod validation schemas
│   │   └── server.ts          # App entry point
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
├── frontend/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/             # Dashboard, Customers, Products, etc.
│   │   ├── components/        # Sidebar, shared components
│   │   ├── api.js             # Centralized API client
│   │   └── index.css          # Design system
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 13+ (or run the app in SQLite fallback mode)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/SyncERP.git
cd SyncERP

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=syncerp
```

### 3. Set up PostgreSQL

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE syncerp;"

# Run migrations
cd backend
npm run db:migrate

# Seed sample data
npm run db:seed
```

### 4. Start Servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

App runs at **http://localhost:3000**  
API runs at **http://localhost:5001**

---

## 🛠️ Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Backend    | Node.js · TypeScript · Express.js  |
| Database   | PostgreSQL (AWS RDS in production) |
| Validation | Zod                                |
| Frontend   | React 18 · Vite                    |
| Styling    | Vanilla CSS (custom design system) |
| Charts     | Recharts                           |

---

## 📡 API Reference

All endpoints are prefixed with `/api`.

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | KPIs, charts, recent invoices |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all (supports `?search=`, `?status=`) |
| GET | `/api/customers/:id` | Customer detail with invoices & follow-ups |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Deactivate customer |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all (supports `?search=`, `?low_stock=true`) |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Purchase Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchase-orders` | All POs |
| GET | `/api/purchase-orders/:id` | PO detail with items |
| POST | `/api/purchase-orders` | Create PO (stock updates on `received`) |
| PUT | `/api/purchase-orders/:id/status` | Update status |

### Challans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/challans` | All challans |
| GET | `/api/challans/:id` | Challan with items |
| POST | `/api/challans` | Create challan |
| PUT | `/api/challans/:id/status` | Update status (stock deducted on `dispatched`) |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | All invoices |
| GET | `/api/invoices/:id` | Invoice with GST breakdown |
| POST | `/api/invoices` | Create invoice |
| PUT | `/api/invoices/:id/payment` | Record payment |

### CRM Follow-ups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/crm` | All follow-ups |
| POST | `/api/crm` | Create follow-up |
| PUT | `/api/crm/:id` | Update |
| DELETE | `/api/crm/:id` | Delete |

### Stock
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stock` | Inventory levels + movement log |

---

## ☁️ AWS Deployment

### Architecture

```
Internet → Route 53 → ALB → EC2 (Node.js) → RDS PostgreSQL
                      ↓
                   S3 + CloudFront (React build)
```

### Step 1 — RDS PostgreSQL Setup

1. Open **AWS RDS → Create Database**
2. Engine: **PostgreSQL 15**
3. Template: **Free Tier** (or Production)
4. DB identifier: `syncerp-db`
5. Credentials: set a strong password
6. VPC Security Group: allow inbound 5432 from EC2 security group

```bash
# After RDS is ready, update .env on EC2:
DB_HOST=your-endpoint.rds.amazonaws.com
DB_SSL=true
```

### Step 2 — EC2 Server Setup

```bash
# Connect to EC2 (Ubuntu 22.04 recommended)
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/your-username/SyncERP.git
cd SyncERP/backend
npm install
cp .env.example .env
# Edit .env with RDS credentials

# Run migrations
npm run db:migrate
npm run db:seed

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/server.js --name syncerp-api
pm2 startup
pm2 save
```

### Step 3 — Frontend (S3 + CloudFront)

```bash
# Build frontend
cd frontend
npm run build

# Create S3 bucket (replace with your domain)
aws s3 mb s3://syncerp-frontend

# Upload build
aws s3 sync dist/ s3://syncerp-frontend --delete

# Enable static website hosting
aws s3 website s3://syncerp-frontend \
  --index-document index.html \
  --error-document index.html
```

Then create a **CloudFront distribution** pointing to the S3 bucket for HTTPS + CDN.

### Step 4 — Nginx Reverse Proxy (EC2)

```nginx
# /etc/nginx/sites-available/syncerp
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
# Use certbot for HTTPS: sudo certbot --nginx
```

---

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `5001` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_NAME` | Database name | `syncerp` |
| `DB_SSL` | Enable SSL (for RDS) | `false` |
| `CORS_ORIGIN` | Allowed frontend origin | `*` |

---

## 📋 Git Workflow

```bash
# Initial commit
git init
git add .
git commit -m "feat: initial SyncERP ERP/CRM system"

# Feature branches
git checkout -b feat/invoice-pdf-export
git checkout -b fix/stock-calculation-bug

# Commit conventions
git commit -m "feat(invoices): add PDF export"
git commit -m "fix(stock): correct qty deduction on dispatch"
git commit -m "docs: update deployment guide"
```

---

## 🧩 Modules

| Module | Status | Features |
|--------|--------|----------|
| Dashboard | ✅ | KPIs, revenue chart, top products |
| Customers | ✅ | CRUD, search, detail view with invoice history |
| Products | ✅ | CRUD, stock alerts, low-stock filter |
| Suppliers | ✅ | CRUD |
| Purchase Orders | ✅ | Multi-item POs, auto stock update on receipt |
| Sales Challans | ✅ | Multi-item, dispatch workflow, stock deduction |
| Invoices | ✅ | GST breakdown, payment recording, status tracking |
| CRM Follow-ups | ✅ | Call/email/visit tracking, mark-done workflow |
| Stock | ✅ | Live inventory, progress bars, movement log |

---

## 📄 License

MIT — Built for demonstration purposes.
