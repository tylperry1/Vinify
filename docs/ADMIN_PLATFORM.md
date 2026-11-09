# Vinify admin platform

## Repository audit

The implementation extends `tylperry1/Vinify` from `main` at `2abeb62`. The existing site uses Next.js 15 App Router, TypeScript and Tailwind, with the blue-gradient V, navy typography and public pages. The free decoder originally called NHTSA directly from the browser. Recalls were already identified as model-level campaigns, and the sample report was visibly fictional. There were no admin routes, configured identity provider, Prisma client, applied migrations, or Stripe integration. The contact form displayed a confirmation without persisting a ticket. The roadmap identifies `govinify` as the intended Vercel project; `vinify` is a separate older project. Neither project had environment variables configured at audit time.

- Connect and migrate the existing PostgreSQL data model; keep public pages available without a database.
- Authenticate staff and authorize each admin data read and mutation on the server. Use database sessions for immediate revocation and audit successful changes.
- Add live overview, customer, report, order, subscriptions, API Center, analytics, activity, support and staff views.
- Proxy and monitor free vPIC decoding. Store supplier credentials only in environment variables or encrypted database columns.
- Reserve, settle and recover report credits. Require a reviewed licensed adapter before accepting payments or fetching history.
- Verify one-time Stripe checkout and reconciliation in an isolated test environment. Deploy to Vercel Preview only.

## Database and staff setup

Use Node 24 or the version configured on Vercel. Copy `.env.example` to `.env.local`. Use a **separate empty database** for Preview. Supply `DATABASE_URL` and the browser origin in `NEXT_PUBLIC_SITE_URL`. Vercel's generated deployment and branch origins are accepted automatically in Preview when system environment variables are exposed. Set the exact site origin for custom aliases and local development. Do not put database or supplier keys in public environment variables.

```sh
npm ci
node --env-file=.env.local node_modules/prisma/build/index.js migrate deploy
npm run admin:create
npm run dev
```

Create the first `SUPER_ADMIN` interactively, then provision `ADMIN` staff as needed. The script never overwrites an existing user or prints a password. Keep preview access protected in Vercel. Staff sessions have an eight-hour absolute expiry, hashed random tokens, secure HTTP-only cookies on deployed builds, and a database check on every protected entry point. Role changes revoke the affected user's sessions. Sign-in is throttled by email and by the address Vercel supplies at ingress. When running behind another proxy, ensure it replaces the forwarded address header.

Admins can manage customer suspension and support statuses, inspect reports and orders, test NHTSA, and view API usage and activity. Only Super Admin can change provider settings, adjust credits, change staff roles, or release stale reservations. Report libraries and report detail pages restrict access by account ownership. Staff can create 24-hour, single-use customer invitations under Customers. Share each link privately. Customers set their own password and sign in after redemption. Identity recovery and MFA are launch follow-ups.

## Providers and observability

- **NHTSA vPIC**: `/api/decode` validates a complete VIN, calls the free adapter with a timeout, and records outcome and latency when a database is configured. The separate `/api/recalls` endpoint monitors model-level recall campaigns with the same provider switch and a separate rate limit. A missing database leaves the decoder available with no durable usage logging. Add Vercel ingress rate limits before exposing an unconfigured preview publicly.
- **History**: `src/lib/providers/types.ts` defines the adapter and coverage contract. `src/lib/server/providers.ts` is the allowlist for approved adapters. `HISTORY_PROVIDER` selects a registered adapter; it cannot create an arbitrary endpoint or activate the sample provider. To onboard a supplier, confirm written resale/retention rights and billable failure terms, validate the real response, strip personal information, map coverage statuses and source dates, register the adapter, and test with the supplier sandbox before enabling it.
- **Credentials**: generate a 32-byte random base64 `API_ENCRYPTION_KEY`. API Center writes AES-256-GCM ciphertext bound to the provider slot. An encrypted secret takes precedence over `HISTORY_PROVIDER_API_KEY`. Removing the stored secret restores the environment fallback. Keep the encryption key in the deployment secret store; replacing it requires re-entering credentials. Logs never include credentials or supplier payloads.
- **Usage and costs**: API Center lists individual outcomes and latency; Analytics groups the last 30 days by provider and outcome, plus VIN search and order totals. Costs are configured wholesale estimates, with billable supplier failures included. Reconcile with supplier invoices. Schedule expiry cleanup for `Session` and `RateLimit` rows and define retention for tickets, logs and VIN searches before a public launch.

## Commerce and recovery

`COMMERCE_ENABLED` defaults to false. Checkout remains closed unless a licensed adapter is registered and enabled and the Stripe secret and webhook configuration match the environment. Prices and credits come from server-side plans. The proposal prices in `src/lib/pricing.ts` need margin review before activation. `STRIPE_LIVE_MODE` defaults to false; use test credentials and the test webhook endpoint for Preview. Never share production billing credentials with Preview.

Point a Stripe endpoint at `/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, and `charge.refunded`. Vercel protection must allow Stripe to reach only the webhook endpoint before test deliveries can work. Check Stripe delivery status; the route verifies raw-body signatures, rejects environment mismatches, deduplicates event IDs, and updates payment and credits in one transaction. Handle refunds in Stripe; cumulative proportional credit reversals are idempotent and may leave a negative balance if credits were already spent. Subscription records are visible to staff, but recurring checkout, invoice grants, cancellation, and plan changes are outside the implemented one-time flow.

Reports use a transaction to reserve a credit and an atomic claim to prevent duplicate supplier calls. A normal failure releases the reservation. An interrupted request can be released from Reports by a Super Admin after ten minutes; reconcile any supplier charge before a new request. Stored reports contain normalized data, excluding raw supplier payloads. The public sample is separate. Customers can print a report or save it as a PDF from its private detail page. Supplier-specific recovery still requires a contracted adapter.

## Verification

- `npm test`, `npm run lint`, `npm run build`, and `npm audit` cover local checks. The existing font rule warning in the App Router layout is non-blocking.
- To run the database integration suite, apply the migration to a disposable empty PostgreSQL database, set `TEST_DATABASE_URL` to that database, then run `npm test -- tests/database.test.ts`. The suite writes test fixtures; use a fresh database for each run. Tests simulate Stripe/supplier responses and never issue a charge or a paid supplier request.
- Preview without environment variables: open `/admin` and confirm it redirects to `/admin/login`, which explains database setup; check that `/decode` still returns live NHTSA results. With a preview database, migrate it and provision staff before exercising credentials, support ticketing and activity. Complete real Stripe test mode and licensed supplier sandbox checks before considering production.
