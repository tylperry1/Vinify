# Vinify local development guide

Everything here is for **local development only**. It never connects to the production Neon
database, never rewrites production environment variables, and never resets production data.

- **Local**: embedded PostgreSQL in `.local-test/pgdata` on `127.0.0.1:55432`, `.env.local`, fictional seed data, development-only accounts.
- **Production**: Neon PostgreSQL, Vercel environment variables, real customer accounts, orders and transactions.

## Quick reference

| Command | What it does |
|---|---|
| `npm run dev:db` | Start PostgreSQL, wait for it, apply migrations, start Next.js on `http://localhost:3001` |
| `npm run db:seed` | Load (or refresh) fictional test data — idempotent |
| `npm run db:status` | Show connection, migration state and row counts (read-only) |
| `npm run db:reset:local` | Drop and rebuild the **local** database, then reseed |
| `npm run db:stop:local` | Stop the local PostgreSQL server |
| `npm run admin:create` | Interactively provision an extra staff account |
| `npm run dev` | Next.js only on port 3000 (no database bootstrap) |

## First-time setup

```bash
npm ci
npm install --no-save embedded-postgres   # local PostgreSQL binaries, not a project dependency
npm run dev:db
```

`npm run dev:db` creates `.env.local` from local defaults if no env file exists (it never
overwrites an existing one). Expected output:

```
Vinify development stack
  Database postgresql://postgres:***@127.0.0.1:55432/vinify (local)
› Applying database migrations
...
✔ Ready
  App       http://localhost:3001
  Sign in   http://localhost:3001/login (staff land on /admin, customers on /account)
  Database  postgresql://postgres:***@127.0.0.1:55432/vinify
  Seed data npm run db:seed · status: npm run db:status · reset: npm run db:reset:local

› Starting Next.js on 0.0.0.0:3001
```

Then load the fictional test data (in a second terminal):

```bash
npm run db:seed
```

### Why `embedded-postgres` is installed with `--no-save`

The project itself targets managed PostgreSQL. The embedded server is just a convenience for
local machines without PostgreSQL installed and does not require root or Docker. It is
deliberately **not** in `package.json`, so installing production dependencies never pulls a
database. `npm ci` removes it; reinstall it with the command above.

### If PostgreSQL is already running elsewhere

Point `DATABASE_URL` at any **loopback** PostgreSQL instance instead. The scripts only accept
`localhost`, `127.0.0.1` or `::1`; anything else is refused:

```
✖ Refusing to seed test data: DATABASE_URL points at "ep-example.neon.tech:5432/neondb", which is not local.
  Development scripts only touch local PostgreSQL.
```

## Daily workflow

```bash
npm run dev:db     # start database + app (safe to rerun)
```

If the database is already up, it is reused. If port 3001 is already serving, `dev:db` reports
it and exits instead of starting a duplicate Next.js process:

```
• Port 3001 is already in use — Next.js appears to be running already.
  Open http://localhost:3001 (sign in at /login).
```

## Stopping and restarting

- **App**: `Ctrl+C` in the terminal running `npm run dev:db` (that stops Next.js; PostgreSQL keeps running).
- **Database**: `npm run db:stop:local`.
- **Restart everything**: `npm run db:stop:local && npm run dev:db`.
- **Restart without losing data**: just `npm run dev:db` again — `.local-test/pgdata` persists
  across terminal sessions and workspace restarts.

To confirm data survived a restart:

```bash
npm run db:status     # row counts before and after should match
```

If a workspace is restored without `node_modules` or `.local-test` (for example after an archive),
rebuild the environment — the seed is deterministic, so the same 10 customers / 20 orders / 8 reports
come back:

```bash
npm ci
npm install --no-save embedded-postgres
npm run dev:db      # initialises .local-test/pgdata and applies migrations
npm run db:seed
```

## Seeding test data

```bash
npm run db:seed
```

Seeding is idempotent: every record has a deterministic `seed_*` id or unique key, so running
it repeatedly updates the same 10 customers, 15 vehicles, 20 orders, 8 reports and related
rows instead of creating duplicates.

Expected result:

```
✔ Development seed complete (idempotent) — fictional data only

  customers        10
  orders           20
  reports          8
  reportRequests   14
  vinSearches      15
  savedVehicles    8
  ledgerEntries    39
  tickets          4
  subscriptions    3
  webhookEvents    16
  apiUsage         20
```

### What the seed contains

| Area | Details |
|---|---|
| Customers | 10 profiles: verified/unverified email, marketing opt-in on/off, 2 suspended, creation dates spread across 2025–2026 |
| Vehicles | 15 makes/models/years. VINs are generated with valid 49 CFR 565 check digits (see `scripts/dev/fixtures.mjs`) |
| Orders | 20 spread over `PENDING` (4), `PAID` (10: 7 completed + 3 processing), `FAILED` (4: 2 declined + 2 cancelled checkouts), `REFUNDED` (1), `PARTIALLY_REFUNDED` (1), with realistic timestamps and amounts ($9.99–$49.99) |
| Transactions | Credit-ledger grants, reservations, settlements, releases and a refund reversal; Stripe webhook events marked `livemode: false` with `evt_test_*` ids |
| Reports | 8 reports with alternating stories: clean, 1–2 accidents, salvage brand + total loss, odometer rollback, open recalls, model-level recall labels |
| Support / subscriptions | 4 tickets in open/in-progress/resolved, 3 subscriptions (active, past due, canceled) |

**Status mapping.** The schema has no `CANCELLED` order status and no `PROCESSING` status, and no
migration was added for this task. Development data maps onto the existing enum:

| Story | Stored as |
|---|---|
| Pending payment | `OrderStatus.PENDING`, no report request |
| Processing (paid, report not finished) | `OrderStatus.PAID` + `ReportRequest.QUEUED`/`FETCHING` |
| Completed | `OrderStatus.PAID` + `ReportRequest.SUCCEEDED` + `Report` |
| Failed payment | `OrderStatus.FAILED`, report request `FAILED` |
| Cancelled checkout | `OrderStatus.FAILED`, no `stripePaymentIntent` |
| Refunded | `OrderStatus.REFUNDED` + `REFUND_REVERSAL` ledger entry |
| Partially refunded | `OrderStatus.PARTIALLY_REFUNDED` (credit retained) |

Vehicles live in `VinSearch` (decoded year/make/model), `SavedVehicle` and in the report payload
(`NormalizedReport` sections), because the schema has no separate `Vehicle` table.
"Transactions" are `Order` + `CreditLedger` + `WebhookEvent`, since there is no `Transaction` model.

### Fictional-data markers

- Emails use the reserved `.test` domain (`amelia.rhodes@example.test`) or `.local`.
- Seeded ids start with `seed_`; Stripe ids start with `cus_test_seed_`, `cs_test_seed_`, `pi_test_seed_`, `sub_test_seed_`, `evt_test_seed_`.
- Report numbers are `VNF-DEMO-##`, provider is `sample`, event sources read "Fictional test data".
- Every run writes an `AuditLog` entry `SEED_RUN` with `{ fictional: true, version }`.

## Resetting the local database

```bash
npm run db:reset:local
```

This drops and rebuilds the **loopback** database only, reapplies migrations, and reseeds. Use
`npm run db:reset:local -- --no-seed` to reset without loading test data. The command refuses to
run if `DATABASE_URL` is not local or `NODE_ENV=production`.

## Creating an administrator

### Development-only seeded administrator

`npm run db:seed` creates one staff account for local testing:

```
dev.admin@vinify.local / Dev-Admin-Local-2026   (SUPER_ADMIN)
```

Seeded customers all share `Customer-Dev-2026` (e.g. `amelia.rhodes@example.test`). These
credentials exist only in your local database. Never recreate them anywhere else.

### Adding a real staff account (interactive)

`npm run admin:create` keeps its interactive, hidden-input prompt. It asks for email, role
(`ADMIN` or `SUPER_ADMIN`) and password (14–256 characters), then stores a salted scrypt hash
in the same format the app verifies. It never overwrites an existing account and never prints
the password.

**In Freebuff:** open the terminal panel (the right-side terminal, or ask the agent to open
one), then run:

```bash
npm run admin:create
```

and type the three answers. You must use a real terminal — piping the answers aborts the
prompt (`Aborted with Ctrl+D`), because the script hides input through a TTY.

This does not bypass authentication: it writes a normal password hash and an audit log entry
`STAFF_PROVISIONED`. Sign-in, session expiry, rate limiting and the credentials screen at
`/admin/account` all behave exactly as in production. MFA is not implemented in this project
and is not affected by these scripts.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `✖ Local PostgreSQL binaries are missing` | `node_modules` was reinstalled or restored | `npm install --no-save embedded-postgres` |
| `✖ DATABASE_URL is not set` | No `.env.local` | Run `npm run dev:db` (creates it) or copy `.env.example` and set the local URL |
| `✖ Refusing to … "…neon.tech…"` | A production URL leaked into the shell or env file | Put the local URL in `.env.local`; use `npm run db:status` to see the active target |
| `Connection ok` fails with `ECONNREFUSED` | PostgreSQL is not running | `npm run dev:db` (it starts the database first) |
| `Port 3001 is already in use` | A dev server is already running | Reuse it, or stop it with `Ctrl+C` in its terminal. Check with `ss -ltnp \| grep 3001` |
| `PostgreSQL did not start` | Data directory or socket conflict | Read `.local-test/pg.log`; `npm run db:stop:local` then `npm run dev:db` |
| Migrations pending | New migration added | `npm run dev:db`, or `npx prisma migrate deploy` with the local env loaded |
| `PrismaClientInitializationError` in the app | Database stopped after the app started | `npm run dev:db`, then reload the page |
| Seeded data disappeared | A workspace restore dropped `.local-test/pgdata`, or `db:reset:local` was run | `npm run dev:db` then `npm run db:seed` — seed ids and counts are deterministic |

## Distinguishing local development from production

`npm run db:status` always prints the target and classification:

```
  Target      postgresql://postgres:***@127.0.0.1:55432/vinify
  Environment LOCAL DEVELOPMENT
```

```
  Target      postgresql://user:***@ep-…neon.tech:5432/neondb
  Environment REMOTE — not touched by dev scripts
```

Additional differences:

| | Local development | Production |
|---|---|---|
| Database | embedded PostgreSQL, `.local-test/pgdata`, port 55432 | Neon, managed |
| Env file | `.env.local` (git-ignored) | Vercel project settings |
| Port / URL | `http://localhost:3001` | `https://govinify.vercel.app` |
| Data | fictional, `seed_*` ids, `.test` emails | real customers and orders |
| Stripe | commerce disabled, `livemode: false` events | live keys in Vercel only |
| Dev commands | allowed on loopback | refused (`assertLocalDatabase`) |

The production database is only reachable through the deployment's own `DATABASE_URL`.
`npm run db:seed`, `npm run db:reset:local` and `npm run dev:db` all call
`assertLocalDatabase()` first, so a Neon hostname stops the command before it connects.
