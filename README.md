# SyncERP — Wholesale & Distribution ERP/CRM

[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue?logo=sqlite)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-ready-blue?logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A production-ready ERP/CRM system for wholesale and distribution companies. Built with **Node.js + Express + SQLite** (backend) and **React + Vite** (frontend).

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start (Local)](#-quick-start-local-setup)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
  - [Docker](#option-a-docker-recommended)
  - [Vercel + Render](#option-b-vercel--render-free-cloud)
  - [Railway](#option-c-railway)
- [GitHub Actions CI/CD](#-github-actions-cicd)
- [Assumptions](#-assumptions-made)
- [Demo Credentials](#-demo-credentials)

---

## ✨ Features

| Module | Features |
|--------|----------|
| **Auth** | JWT login, 4 role-based access levels (admin, sales, warehouse, accounts) |
| **Dashboard** | KPIs, revenue chart, top products, recent invoices, pending follow-ups |
| **Customers** | CRUD, search/filter, customer detail with invoice & follow-up history |
| **Products** | CRUD, SKU, category, unit price, current stock, min stock alert, location/warehouse |
| **Inventory / Stock** | Live stock levels, stock movement log (IN/OUT), created-by tracking |
| **Purchase Orders** | Multi-item POs, auto stock increment on receipt |
| **Sales Challans** | Customer selection, multi-product lines, auto challan number, Draft → Confirmed flow, stock deduction, product snapshot data |
| **Invoices** | GST breakdown, payment recording, status tracking (unpaid / partial / paid) |
| **CRM Follow-ups** | Call/email/visit/WhatsApp tracking, pending dashboard widget |
| **Suppliers** | CRUD |

### Business Logic Highlights
- ✅ Confirming a challan **deducts stock atomically** in a DB transaction
- ✅ Insufficient stock returns HTTP 400 with a clear error message
- ✅ **Product snapshot** stored in `challan_items` — history is immutable even if product is edited later
- ✅ Cancelling a confirmed challan **restores stock** and logs the reversal movement
- ✅ All stock movements record `created_by`, `type`, `qty`, `reason`, `reference`, and `timestamp`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 |
| Framework | Express.js |
| Database | SQLite 3 (via `better-sqlite3`) |
| Auth | JWT (`jsonwebtoken` + `bcryptjs`) |
| Frontend | React 18 + Vite 5 |
| Styling | Vanilla CSS (custom dark design system) |
| Charts | Recharts |
| Containerisation | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Hosting | Vercel (frontend) + Render (backend) |

---

## 🗂️ Project Structure

```
SyncERP/
├── backend/
│   ├── server.js           # Express API — all routes in one file
│   ├── db.js               # SQLite schema, migrations & seed data
│   ├── Dockerfile          # Backend container (Node 20 Alpine)
│   ├── .env.example        # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/          # Dashboard, Customers, Products, Challans, Stock…
│   │   ├── components/     # Sidebar, ProtectedRoute
│   │   ├── context/        # AuthContext (JWT + role permissions)
│   │   ├── api.js          # Centralised fetch client
│   │   └── index.css       # Design system tokens & utilities
│   ├── vercel.json         # Vercel SPA routing config
│   ├── Dockerfile          # Frontend container (Nginx Alpine)
│   └── package.json
├── docker-compose.yml      # Full-stack local Docker setup
├── render.yaml             # Render.com blueprint for backend
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions CI/CD pipeline
├── SyncERP_API.postman_collection.json
└── README.md
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Node.js 20+** — [download](https://nodejs.org)
- **npm 9+** (bundled with Node.js)
- No PostgreSQL required — the app uses **SQLite** (file-based, zero setup)

### Step 1 — Clone

```bash
git clone https://github.com/your-username/SyncERP.git
cd SyncERP
```

### Step 2 — Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend (separate terminal)
cd ../frontend && npm install
```

### Step 3 — Configure environment

```bash
cd backend
cp .env.example .env
# The defaults work out of the box for local dev
# Only change JWT_SECRET in production
```

### Step 4 — Start servers

**Terminal 1 — Backend:**
```bash
cd backend
node server.js
# ✅ Server starts at http://localhost:5001
# ✅ SQLite DB auto-created and seeded on first run
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# ✅ App opens at http://localhost:3000
```

### Step 5 — Login

Open **http://localhost:3000** and login with any demo credential below.

> **Note:** The SQLite database (`backend/syncerp.db`) is auto-created and seeded with sample data on the **very first run**. No separate migration step needed.

---

## 🔐 Environment Variables

All environment variables live in `backend/.env`. Copy `backend/.env.example` to get started.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `5001` |
| `NODE_ENV` | `development` or `production` | `development` |
| `JWT_SECRET` | Secret for signing JWT tokens — **change in production** | *(insecure default)* |
| `JWT_EXPIRES` | JWT expiry duration | `8h` |
| `CORS_ORIGIN` | Allowed frontend URL(s) | `http://localhost:3000` |
| `DB_PATH` | Path to SQLite file | `<backend_dir>/syncerp.db` |

### How secrets are managed
- **Local dev**: `.env` file (git-ignored)
- **Docker**: `environment:` block in `docker-compose.yml` / Docker secrets
- **Render**: Dashboard → Environment Variables (UI)
- **GitHub Actions**: Settings → Secrets → Actions (encrypted)

---

## 📡 API Reference

All endpoints require `Authorization: Bearer <token>` except `/health` and `/api/auth/login`.

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | ❌ Public | Login — returns JWT token |
| `GET` | `/api/auth/me` | ✅ Any | Current user profile |
| `GET` | `/health` | ❌ Public | Health check |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | KPIs, charts, top products, recent invoices |

### Customers
| Method | Endpoint | Params | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/customers` | `?search=&status=&customer_type=` | List with search |
| `GET` | `/api/customers/:id` | — | Detail + invoices + follow-ups |
| `POST` | `/api/customers` | body | Create customer |
| `PUT` | `/api/customers/:id` | body | Update customer |
| `DELETE` | `/api/customers/:id` | — | Deactivate (admin only) |
| `POST` | `/api/customers/:id/followups` | body | Add CRM follow-up |

### Products & Inventory
| Method | Endpoint | Params | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/products` | `?search=&category=&low_stock=true` | List with filters |
| `POST` | `/api/products` | body | Create product (warehouse role) |
| `PUT` | `/api/products/:id` | body | Update product (warehouse role) |
| `DELETE` | `/api/products/:id` | — | Delete (admin only) |
| `GET` | `/api/stock` | `?search=&low_stock=true` | Inventory + recent movements |
| `GET` | `/api/stock/movements` | `?type=IN\|OUT&product_id=&page=&limit=` | Paginated movement log |

### Sales Challans
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/challans` | `?status=Draft\|Confirmed\|Cancelled&customer_id=` |
| `GET` | `/api/challans/:id` | Challan with product snapshot items |
| `POST` | `/api/challans` | Create challan — `status: Draft` or `Confirmed` |
| `PUT` | `/api/challans/:id/status` | Update status — stock deducted/restored |

**POST /api/challans request body:**
```json
{
  "customer_id": 1,
  "delivery_address": "12, Industrial Area, Delhi",
  "notes": "Handle with care",
  "status": "Draft",
  "items": [
    { "product_id": 1, "qty": 50, "unit_price": 12, "discount": 5 }
  ]
}
```

**Insufficient stock error (HTTP 400):**
```json
{
  "error": "Insufficient stock for \"Steel Pipe 2inch\" (SKU: SKU-002). Available: 20, Required: 100"
}
```

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/invoices` | `?status=unpaid\|partial\|paid&customer_id=` |
| `GET` | `/api/invoices/:id` | Invoice with GST breakdown |
| `POST` | `/api/invoices` | Create invoice |
| `PUT` | `/api/invoices/:id/payment` | Record partial/full payment |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST/PUT/DELETE` | `/api/crm` | CRM follow-ups |
| `GET/POST/PUT` | `/api/suppliers` | Supplier management |
| `GET/POST` | `/api/purchase-orders` | Purchase orders |
| `PUT` | `/api/purchase-orders/:id/status` | Receive PO (adds stock) |

---

## ☁️ Deployment

### Option A: Docker (Recommended)

Best for self-hosted VMs (any cloud provider).

```bash
# 1. Copy and edit environment file
cp backend/.env.example backend/.env
# Edit JWT_SECRET and CORS_ORIGIN

# 2. Build and run
docker compose up --build -d

# App:  http://localhost:3000
# API:  http://localhost:5001
# Data: persisted in Docker volume "syncerp-data"
```

**Stop / restart:**
```bash
docker compose down          # stop (data preserved)
docker compose down -v       # stop + delete data (fresh start)
docker compose restart       # restart containers
```

---

### Option B: Vercel + Render (Free Cloud)

#### Backend → Render

1. Push this repo to GitHub
2. Go to **[render.com](https://render.com)** → New → **Blueprint**
3. Connect your GitHub repo — Render auto-detects `render.yaml`
4. Click **Apply** — Render creates the web service + persistent disk automatically
5. Copy your Render URL (e.g. `https://syncerp-api.onrender.com`)

**After deploy, set these env vars in Render Dashboard → Environment:**

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | Any long random string |
| `CORS_ORIGIN` | Your Vercel frontend URL (set after step below) |

#### Frontend → Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from the frontend directory
cd frontend
vercel deploy --prod
```

Or connect via **[vercel.com](https://vercel.com)** → Import Git Repository → set **Root Directory** to `frontend`.

**Vercel Environment Variables** (Dashboard → Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your Render backend URL e.g. `https://syncerp-api.onrender.com` |

**Final step:** Go back to Render → update `CORS_ORIGIN` to your Vercel URL, then redeploy.

---

### Option C: Railway

Railway natively supports SQLite with persistent volumes.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and create project
railway login
railway init

# Deploy backend
cd backend
railway up

# Set environment variables
railway variables set JWT_SECRET=your_secret_here
railway variables set CORS_ORIGIN=https://your-frontend.vercel.app
railway variables set DB_PATH=/data/syncerp.db

# Add a volume for SQLite persistence in Railway Dashboard
# Mount path: /data
```

---

## 🔄 GitHub Actions CI/CD

The pipeline in `.github/workflows/deploy.yml` runs on every push to `main`:

1. **Validate** — installs deps, runs frontend build (catches JSX errors)
2. **Deploy Backend** — triggers Render re-deploy via deploy hook
3. **Deploy Frontend** — deploys to Vercel using Vercel CLI

### Required GitHub Secrets

Go to your repo → **Settings → Secrets → Actions** and add:

| Secret | How to get it |
|--------|--------------|
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | `vercel whoami` → copy `id` from `~/.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same file as above |
| `RENDER_DEPLOY_HOOK_URL` | Render Dashboard → Service → Settings → Deploy Hooks |

---

## 💡 Assumptions Made

1. **SQLite over PostgreSQL** — SQLite is sufficient for a demo/assignment project. It runs with zero infrastructure. For production scale, the backend can be migrated to PostgreSQL using the `pg` package (already installed as a dependency).

2. **Single-file backend** — All routes are in `server.js` for simplicity. The `backend/src/` directory contains a TypeScript/PostgreSQL version for future use.

3. **Role-based access** — Four fixed roles are seeded: admin, sales, warehouse, accounts. Role permissions are enforced on all API routes.

4. **Challan statuses** — The flow is `Draft → Confirmed → Cancelled`. Stock is only deducted on `Confirmed` and restored on `Cancelled` (if previously Confirmed).

5. **Challan number generation** — Auto-generated as `CH-{YEAR}-{NNN}` (sequential). In production, a database sequence would be safer for concurrency.

6. **SQLite persistence on Render** — Render's free tier doesn't include persistent disks, but the `render.yaml` provisions a 1GB disk add-on ($0.25/GB/month). As an alternative, Railway's free tier supports volumes.

7. **No email/SMS** — Notifications are UI-only. Real deployments would integrate an email service (e.g., SendGrid) for invoice delivery.

---

## 👥 Demo Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | `admin@syncerp.com` | `admin123` | Full access to everything |
| **Sales** | `sales@syncerp.com` | `sales123` | Customers, Challans, Invoices, CRM |
| **Warehouse** | `warehouse@syncerp.com` | `warehouse123` | Products, Stock, Purchase Orders |
| **Accounts** | `accounts@syncerp.com` | `accounts123` | Invoices, Customers |

---

## 🧪 Postman Collection

Import `SyncERP_API.postman_collection.json` into Postman.

1. Set `base_url` variable to your server (`http://localhost:5001` or your Render URL)
2. Run **Auth → Login (Admin)** — token is auto-saved
3. All other requests use the token automatically

---

## 📦 Bonus Features Implemented

- [x] **Docker setup** — `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`
- [x] **GitHub Actions** — `.github/workflows/deploy.yml` (validate + deploy)
- [x] **Render Blueprint** — `render.yaml` (one-click deploy)
- [x] **Postman Collection** — Full API test suite with auto-token saving
- [ ] Export invoice as PDF *(out of scope — future enhancement)*
- [ ] Upload product image to S3 *(out of scope — future enhancement)*

---

## 📄 License

MIT — Built for demonstration purposes.
