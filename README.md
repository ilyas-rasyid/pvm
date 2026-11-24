# PVMS — Procurement & Vendor Management System

An enterprise full-stack web application designed to streamline the end-to-end procurement process: from Purchase Requests and multi-stage approvals to vendor sourcing, Purchase Orders, Goods Receipts, and 3-way invoice matching.

---

## Key Features & Workflow

The system follows a complete procure-to-pay lifecycle:

```text
[Purchase Request] ──> [Department Approval] ──> [RFQ & Sourcing]
        │
        └──> [Purchase Order] ──> [Goods Receipt] ──> [3-Way Invoice Match] ──> Ready for Payment
```

- **Purchase Requests (PR)**: Employees draft and submit purchase requests with item details and budget allocation.
- **Department Approvals**: Department managers review, approve, or reject pending requests.
- **RFQ & Vendor Sourcing**: Procurement officers create requests for quotes, record vendor bids, evaluate offers, and award contracts.
- **Purchase Orders (PO)**: Generate and issue formal POs, locking quantities and reserving budgets.
- **Goods Receipt (GR)**: Receiving officers verify shipments, recording accepted and rejected quantities.
- **3-Way Matching & Invoicing**: Finance matches Vendor Invoices against POs and Goods Receipts for payment clearance.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions and workflows tailored across 6 organizational roles.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TanStack Router & Query, Tailwind CSS v4, Lucide Icons.
- **Backend**: Bun, Elysia, Prisma ORM 7, Decimal.js.
- **Database**: PostgreSQL 17 (managed via Docker Compose).

---

## Quickstart

### Prerequisites

- [Bun](https://bun.sh/) (v1.2+)
- [Docker & Docker Compose](https://docs.docker.com/compose/)

### 1. Installation & Environment Setup

Clone the repository and install dependencies:

```bash
bun install

# Copy environment configuration files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Database Setup

Start the PostgreSQL service, run database migrations, and populate initial seed data:

```bash
# Start PostgreSQL container
bun run db:up

# Run Prisma schema generation and migrations
bun run db:generate
bun run db:migrate:deploy

# Seed demo users, master data, and workflows
NODE_ENV=development DEMO_PASSWORD='YourSecureDemoPassword123!' bun run db:seed
```

### 3. Start Development Servers

Run both backend and frontend applications concurrently:

```bash
bun run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

_(The Vite development server automatically proxies `/api` requests to the backend)._

---

## Demo Accounts

The seed script creates 6 pre-configured development accounts (all accounts use the password specified in `DEMO_PASSWORD`):

| Role                    | Email                           | Primary Responsibilities                             |
| ----------------------- | ------------------------------- | ---------------------------------------------------- |
| **Employee**            | `employee@pvms.demo`            | Create and track Purchase Requests                   |
| **Department Manager**  | `department-manager@pvms.demo`  | Review and approve departmental requests             |
| **Procurement Officer** | `procurement-officer@pvms.demo` | RFQs, vendor evaluations, and PO issuance            |
| **Receiving Officer**   | `receiving-officer@pvms.demo`   | Inspect deliveries and log Goods Receipts            |
| **Finance Officer**     | `finance-officer@pvms.demo`     | 3-way matching and invoice verification              |
| **Administrator**       | `admin@pvms.demo`               | Master data, users, departments, and system settings |

---

## Project Structure

```text
procurement-vendor-management/
├── backend/
│   ├── prisma/             # Prisma schema, migrations, and seed script
│   ├── src/features/       # Modular domain features (auth, PR, PO, invoices, etc.)
│   ├── src/security/       # CSRF protection, origin guards, session cookies
│   └── src/index.ts        # Elysia server entry point
├── frontend/
│   ├── src/app/            # App setup, router, and query client
│   ├── src/features/       # UI feature pages, forms, and dialogs
│   ├── src/routes/         # Role-protected routing wrappers
│   └── src/layouts/        # App layout and navigation
├── compose.yaml            # Docker Compose setup for PostgreSQL
└── package.json            # Monorepo workspaces and unified scripts
```

---

## Common Commands

| Command                | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `bun run dev`          | Run backend and frontend concurrently                            |
| `bun run dev:backend`  | Run backend with hot-reload (`bun --watch`)                      |
| `bun run dev:frontend` | Run frontend Vite dev server                                     |
| `bun run check`        | Run linter, typecheck, architecture audit, unit tests, and build |
| `bun run typecheck`    | Run TypeScript verification across frontend and backend          |
| `bun run test:unit`    | Run all unit tests                                               |
| `bun run db:studio`    | Open Prisma Studio to inspect the database                       |

---

