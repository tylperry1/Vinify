# Vinify

Vehicle History. Made Simple. — VIN decoding and vehicle history reports.

> Pre-launch. The NHTSA VIN decoder is free. Paid history sales require a licensed supplier and verified billing.
> See the [admin runbook](./docs/ADMIN_PLATFORM.md), [roadmap](./ROADMAP.md), and [supplier research](./docs/RESEARCH.md).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL via Prisma · Stripe · Vercel

## Getting started

```bash
npm ci
npm run dev:db       # local PostgreSQL + migrations + http://localhost:3001
npm run db:seed      # fictional test data (idempotent)
npm test             # Vitest unit tests
npm run build        # production build
```

`npm run dev:db` starts an embedded PostgreSQL instance in `.local-test/pgdata`, applies migrations
and starts Next.js on port 3001. It only ever touches loopback databases — production (Neon) is off
limits to every development command. See the [development guide](./docs/DEVELOPMENT.md) for seeded
accounts, `db:status`, `db:reset:local` and troubleshooting.

`npm run dev` still runs Next.js alone on port 3000. The public site and decoder work without a
database; the admin console and account pages need one. For staff provisioning and the admin
platform itself, see the [admin runbook](./docs/ADMIN_PLATFORM.md). The app requires a Next.js
server build for its API routes.

## Layout

```
src/app/                 Routes (home, decode, pricing, sample-report, legal, …)
src/components/          Shared UI (VinSearch, ReportView, Coverage badges, header/footer, Logo)
src/lib/vin.ts           VIN normalization, validation, check digit (49 CFR 565)
src/lib/nhtsa.ts         NHTSA vPIC decoder + model-level recall campaigns
src/lib/pricing.ts       PROPOSED plans + unit-economics helpers
src/lib/credits.ts       Append-only credit ledger logic (reserve → consume | release)
src/lib/providers/       History-provider adapter contract + clearly-labelled sample provider
prisma/schema.prisma     Data model (users, orders, subscriptions, ledger, reports, webhooks, audit)
scripts/dev/             Local database lifecycle, seeding and status commands
tests/                   Unit tests
```

## Product guardrails

- Never advertise a report section unless a contracted supplier reliably provides it.
- Every report section carries a coverage status: `reported`, `no_records`, `not_covered`, `unavailable`.
- No claim of CARFAX-equivalent coverage. Not affiliated with CARFAX or NHTSA.
- Reports describe vehicles, not people (DPPA). No owner names or addresses.
- NHTSA recalls are model-level and labelled as such.
- The sample provider throws in production unless explicitly allowed.
