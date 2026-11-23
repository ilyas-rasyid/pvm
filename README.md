# PVMS — Procurement & Vendor Management System

**Enterprise fullstack source workspace** for Purchase Requests, approvals, vendor quotations, Purchase Orders, Goods Receipts, and vendor invoice matching.

> **Implementation draft, not yet verified as complete.** This archive was created without access to Bun, Docker, PostgreSQL, or a package registry. Static TypeScript syntax and repository import paths were checked, but the actual app build, Prisma migration execution, PostgreSQL concurrency behavior and browser tests must still be verified. See [`docs/handoff/ANTIGRAVITY-VERIFICATION.md`](docs/handoff/ANTIGRAVITY-VERIFICATION.md).

## Technology

Frontend: React 19, TypeScript, Vite, TanStack Router/Query, Tailwind CSS, React Hook Form (dependency prepared), Lucide. Backend: Bun, Elysia, Prisma ORM 7 (PostgreSQL adapter), PostgreSQL 17, Decimal.js. The deployment skeleton uses Docker Compose.

## Repository layout

```
frontend/
  src/app/                 App initialization, router, QueryClient
  src/routes/              Role-protected file-based route wrappers
  src/features/            Domain pages, forms, workspaces
  src/layouts/             App shell and navigation
  src/shared/              API client, formatters and UI primitives
backend/
  prisma/models/           47 domain models, split by responsibility
  prisma/migrations/       Initial SQL migration and constraints
  prisma/seed.ts           Synthetic six-role demonstration setup
  src/features/            Each HTTP/domain area separated
  src/security/            Cookie sessions, CSRF, Origin guard
  src/shared/              Transactions, finance, error responses
  src/workers/             Outbox worker
scripts/                   Source architecture audit
```

## Quickstart (Ubuntu / Antigravity)

Install Bun and Docker/Compose first. Use the repo root as workspace. **Do not run the seed against a real/company database.**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
bun install
# Commit the newly generated bun.lock once resolved and verified.
docker compose up -d db
bun run db:generate
bun run db:migrate:deploy
NODE_ENV=development DEMO_PASSWORD='ChooseAUniqueDemoPassphraseHere' bun run db:seed
```

Start two terminals:

```bash
bun run dev:backend
bun run dev:frontend
```

Then visit `http://localhost:5173`, with API at `http://localhost:3001`. The dev Vite proxy routes `/api` and `/health` to the backend. The seed uses the password supplied in `DEMO_PASSWORD` for six **synthetic development-only** accounts:

- `employee@pvms.demo`
- `department-manager@pvms.demo`
- `procurement-officer@pvms.demo`
- `receiving-officer@pvms.demo`
- `finance-officer@pvms.demo`
- `admin@pvms.demo`

## Quality checks

```bash
bun run db:generate
bun run typecheck
bun run lint
bun run check:architecture
bun run test:unit
bun run build
```

These commands are part of the intended implementation contract and **have not been executed successfully in the generating environment**. First-run library API and schema compatibility adjustments may be necessary.

## Primary workflow

1. Employee creates a PR draft, opens it and submits.
2. Department Manager approves the submitted request.
3. Procurement creates an RFQ, opens it, records quotations, evaluates vendor offers and awards quantities, **or** records an authorized direct-purchase exception.
4. Procurement creates a PO draft and issues it; issue reserves PR quantities and budget.
5. Receiving posts a draft Goods Receipt with accepted/rejected units.
6. Finance creates and submits an invoice, matches against accepted receipts, and final-verifies it to Ready for Payment.
7. Procurement closes a reconciled PO.

**Ready for Payment is not Paid.** Banking, general ledger, multi-currency and actual payment processing are outside the MVP.

## Security caveats

This is a portfolio/source implementation draft, **not a production-approved financial system**. Do not deploy with actual documents, credentials, or financial transactions before security review, complete tests, and migration validation. The current login throttle is process-local; authorization/CSRF and attachment handling must be exercised under the intended deployment topology. The source includes financial transaction and locking logic, but concurrency correctness is not yet proven by database tests.

## What is not yet verified or complete

A substantive set of routes and flows is implemented, but the frozen 125-item Master PRD is **not yet fully satisfied**. Remaining work includes PO amendments, invoice edits/corrections, quotation revisions, attachment versioning, deeper admin controls, complete domain authorization matrix, comprehensive ETag/Idempotency recovery, production-grade tests and hardening. See the handoff verification checklist for the exact unresolved requirements.

## License

MIT. The demo organization/vendor names are invented and do not represent real companies.
