# Vinify

Vehicle History. Made Simple. — VIN decoding and vehicle history reports.

> Pre-launch. The NHTSA VIN decoder is free. Paid history sales require a licensed supplier and verified billing.
> See the [admin runbook](./docs/ADMIN_PLATFORM.md), [roadmap](./ROADMAP.md), and [supplier research](./docs/RESEARCH.md).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL via Prisma · Stripe · Vercel

## Getting started

```bash
npm ci
cp .env.example .env.local
npm run dev          # http://localhost:3000
npm test             # Vitest unit tests
npm run build        # production build
```

The public site and decoder work without a database. For the admin console and account pages, see the
[database and staff setup](./docs/ADMIN_PLATFORM.md). The app requires a Next.js server build for its API routes.

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
tests/                   Unit tests
```

## Product guardrails

- Never advertise a report section unless a contracted supplier reliably provides it.
- Every report section carries a coverage status: `reported`, `no_records`, `not_covered`, `unavailable`.
- No claim of CARFAX-equivalent coverage. Not affiliated with CARFAX or NHTSA.
- Reports describe vehicles, not people (DPPA). No owner names or addresses.
- NHTSA recalls are model-level and labelled as such.
- The sample provider throws in production unless explicitly allowed.
