# Vinify

Vehicle History. Made Simple. — VIN decoding and vehicle history reports.

> Pre-launch. The free NHTSA-based VIN decoder works today. Paid history reports are blocked on supplier
> contracts. See [`ROADMAP.md`](./ROADMAP.md) for exact status and [`docs/RESEARCH.md`](./docs/RESEARCH.md)
> for supplier, pricing and legal findings.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL via Prisma · Stripe (planned) · Vercel

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
npm test             # Vitest unit tests
npm run build        # production build
STATIC_EXPORT=1 npm run build   # static preview into out/
```

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
