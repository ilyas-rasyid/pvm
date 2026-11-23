# PVMS — Antigravity Verification Checklist

**IMPORTANT:** This repository was generated in a restricted environment without Bun, Docker, or npm registry access. TypeScript syntax was checked, but builds, migration deployment, and end-to-end workflows **were not run**. Do not mark the MVP as complete until the checks below pass.

1. Install a pinned compatible Bun and Docker/Compose.
2. Copy `backend/.env.example` to `backend/.env`; configure a development-only PostgreSQL URL.
3. Run `bun install`, then commit the generated `bun.lock` to the repository.
4. Run `docker compose up -d db`.
5. Run `bun run --cwd backend db:generate` and `bun run --cwd backend db:migrate:deploy`.
6. Set `DEMO_PASSWORD` to a local-only password with at least 15 characters, then `bun run --cwd backend db:seed`.
7. Run `bun run dev:backend` and `bun run dev:frontend` in separate terminals.
8. Inspect `GET /health/live` and `GET /health/ready`.
9. Run `bun run typecheck`, `bun run lint`, `bun run check:architecture`, `bun run test:unit`, and `bun run build`.
10. Test Employee → PR → Manager approval → RFQ/quotation → PO issue → receipt → invoice match → Ready for Payment.
11. Run real PostgreSQL concurrency tests. These have **not yet been implemented exhaustively**.
12. Inspect accessibility and security before deployment. Do not use real procurement documents, bank details or production credentials.

## Known remaining work (not optional for Master PRD completion)

- Validate and correct installed library APIs and the initial migration against the pinned Prisma runtime.
- Implement and test full PO amendment, invoice correction/edit, quotation revision and vendor contact management.
- Complete document attachment versions and stricter invoice-evidence requirements.
- Complete full API security test coverage, persistent distributed login throttling, and verified ETag/idempotency retries.
- Add all 20 concurrency tests, all 30 E2E scenarios, backup/restore drills and production deployment readiness.
- Run Prettier and fix formatting/lint/typecheck after dependencies install.
- Review financial split-invoice rounding, budget concurrency and close/cancel edge cases under real PostgreSQL transactions.

**Status:** Substantial implementation draft; **not a verified production-ready complete MVP**.
