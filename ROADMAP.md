# Vinify — Master Development Roadmap

**Version 1.0 · November 2026 · Single source of truth for scope, dependencies, progress and launch readiness.**

Vehicle History. Made Simple. · Clean & Modern — blue gradient, navy, white.
Stack: Next.js · TypeScript · Tailwind CSS · PostgreSQL · Stripe · Vercel.

The [admin platform runbook](docs/ADMIN_PLATFORM.md) records the implementation and verification added after the original baseline below. Supplier licensing, recurring billing, and public launch gates remain open.

## Status legend

A box is checked **only** when the item is CONFIRMED (owner decision) or VERIFIED (implemented and tested
with evidence). Everything else stays unchecked with a status tag.

| Tag | Meaning |
|---|---|
| `CONFIRMED` | Explicit owner decision |
| `VERIFIED` | Implemented **and** tested; evidence cited |
| `IMPLEMENTED` | Code exists but not yet verified in production / end-to-end |
| `DRAFT` | First version exists; needs owner, legal or supplier sign-off |
| `RESEARCHED` | Findings documented in `docs/RESEARCH.md`; no decision yet |
| `PROPOSED` | Planned value, not validated |
| `BLOCKED` | Waiting on a dependency (named) |
| `NOT STARTED` | — |

Evidence keys: **T** = `npm test` (Vitest, 26 tests), **B** = `npm run build` + `STATIC_EXPORT=1` build,
**QA** = Playwright flows at 1280px and 375px (15/15 passing, 0 page errors, 0 horizontal overflow).

## Launch gates (execution order)

| Gate | Required outcome | Status |
|---|---|---|
| A — Commercial feasibility | Written supplier terms, sample data, approved resale route, cost model | RESEARCHED — supplier outreach not started |
| B — Technical proof | Decode VIN → licensed test report → normalize → display | Partial: decode VERIFIED; supplier not contracted |
| C — Paid vertical slice | Test purchase → entitlement → supplier call → report → retrieval | NOT STARTED (needs DB, auth, Stripe test keys) |
| D — Failure recovery | Retries, duplicate events, failed fulfillment, credit restore, refunds | Ledger logic VERIFIED (unit); integration NOT STARTED |
| E — Subscription readiness | Renewals, credit grants, cancel, plan changes, full-use economics | NOT STARTED |
| F — Private beta | Usability, labeling, support, security, recovery | NOT STARTED |
| G — Public launch | Legal, operational, payment, supplier, QA gates closed | NOT STARTED |

---

## Phase 1 — Branding & Project Setup · P0

- [x] Select business name: Vinify — `CONFIRMED`
- [x] Select branding direction: Clean & Modern — `CONFIRMED`
- [x] Choose primary color scheme: Blue, Navy, White — `CONFIRMED`
- [ ] Finalize primary Vinify logo — `DRAFT` `src/components/Logo.tsx` (V-check mark + wordmark); awaiting owner approval
- [ ] Create standalone V icon — `DRAFT` `src/app/icon.svg`; awaiting approval
- [ ] Create light and dark logo variations — `DRAFT` `Logo tone="light|dark"`, `VMark mono`; no exported asset files yet
- [ ] Create favicon and app icons — `DRAFT` SVG favicon only; apple-touch / PWA sizes NOT STARTED
- [ ] Create social media branding assets — `NOT STARTED`
- [ ] Verify domain availability and purchase domain — `NOT STARTED`
- [ ] Conduct trademark clearance research — `NOT STARTED` (needs USPTO search + counsel)
- [x] Create GitHub repository — `VERIFIED` github.com/tylperry1/Vinify exists with admin access. **Note: repo is public.**
- [x] Configure Vercel hosting — `VERIFIED` 2026-11-05: production project `govinify` (team tyler-perrys-projects) linked to GitHub `main`; production deployment READY at https://govinify.vercel.app (earlier project `vinify` / vinify-nine.vercel.app also deploys from `main` — duplicate, pending removal decision); pages return 200, unknown route 404, VIN decode works live (desktop + mobile), robots.txt disallows indexing. Custom domain not yet configured.
- [ ] Configure production and development environments — `NOT STARTED`; `.env.example` lists required variables
- [ ] Set up PostgreSQL database — `IMPLEMENTED` (schema only): `prisma/schema.prisma` passes `prisma validate`; no database provisioned or migrated
- [ ] Configure environment variables and secrets — `NOT STARTED` (template in `.env.example`)
- [ ] Establish reusable UI design system — `IMPLEMENTED` tokens in `src/app/globals.css` (navy/blue/sky scale, status colors, Cabinet Grotesk / Satoshi / JetBrains Mono); shared components in `src/components/`

## Phase 2 — Vehicle Data Providers & API Integrations · P0

- [ ] Research NMVTIS-approved data providers — `RESEARCHED` (docs/RESEARCH.md §1)
- [ ] Research commercial vehicle history API providers — `RESEARCHED` partial (VinAudit); others pending
- [ ] Compare CARFAX alternatives and wholesale data providers — `NOT STARTED`
- [ ] Identify providers supporting commercial resale — `RESEARCHED` partial: VinAudit routes history resale to its reseller program (unconfirmed for US)
- [ ] Request API documentation and sample reports — `NOT STARTED` (owner outreach)
- [ ] Obtain wholesale per-report pricing — `RESEARCHED` published VinAudit self-service only; no quote
- [ ] Identify minimum monthly commitments — `RESEARCHED` VinAudit $100/mo base (published)
- [ ] Verify licensing and redistribution permissions — `BLOCKED` on supplier written terms
- [ ] Compare data coverage and completeness — `BLOCKED` on sample reports
- [ ] Evaluate accident history data availability — `BLOCKED` on sample reports
- [ ] Evaluate title and salvage history — `RESEARCHED` NMVTIS covers title, brands, salvage, total loss
- [ ] Evaluate odometer history — `RESEARCHED` NMVTIS covers odometer readings
- [ ] Evaluate theft records — `BLOCKED` on sample reports
- [ ] Evaluate ownership history — `BLOCKED`; DPPA constraint — non-identifying only
- [ ] Evaluate auction and sales history — `BLOCKED` on sample reports
- [ ] Evaluate service and maintenance history — `BLOCKED`; treated as `not_covered` until proven
- [x] Integrate NHTSA VIN decoding — `VERIFIED` `src/lib/nhtsa.ts` (vPIC DecodeVinValuesExtended); T (mapping), QA (live decode of 1HGCM82633A004352 → 2003 Honda Accord EX-V6)
- [x] Evaluate NHTSA recall data integration — `VERIFIED` recallsByVehicle integrated, labeled model-level, not VIN-specific; QA (24 campaigns, collapse/expand)
- [ ] Select primary paid history provider — `BLOCKED` on Gate A
- [ ] Evaluate backup provider — `NOT STARTED`
- [ ] Implement supplier API authentication — `BLOCKED` on provider selection; adapter contract in `src/lib/providers/types.ts`
- [ ] Implement API usage tracking — `IMPLEMENTED` (schema): `SupplierRequest` model
- [ ] Implement supplier cost monitoring — `IMPLEMENTED` (schema): `SupplierRequest.costCents`, `billable`
- [ ] Implement error handling and retries — `IMPLEMENTED` (contract): `ProviderError.retryable/billable`; no runtime yet
- [ ] Implement report caching where permitted — `NOT STARTED`; design around supplier report ID (VinAudit 90-day re-fetch)
- [ ] Verify supplier terms before commercial launch — `BLOCKED` on Gate A

## Phase 3 — Public Website & User Experience · P0

- [ ] Design premium, modern homepage — `IMPLEMENTED` `src/app/page.tsx`; QA desktop + mobile. Awaiting owner review
- [x] Add prominent VIN lookup search bar — `VERIFIED` `VinSearch` with live validation + 17-cell VIN anatomy strip; QA
- [x] Build responsive mobile-first layout — `VERIFIED` QA at 375px, no overflow on 10 pages; mobile menu tested
- [x] Create free VIN decoder experience — `VERIFIED` `/decode`; QA covers valid, invalid, check-digit warning, undecodable, malformed URL
- [x] Create vehicle details preview — `VERIFIED` spec grid on `/decode`
- [ ] Create paid report preview — `IMPLEMENTED` locked-section card on `/decode`; no purchase path yet
- [ ] Create individual report purchase page — `BLOCKED` on Stripe (Phase 6)
- [ ] Create subscription pricing page — `IMPLEMENTED` `/pricing` with PROPOSED prices, buttons disabled
- [ ] Create report bundle purchase page — `BLOCKED` on Stripe
- [ ] Create sample vehicle history report page — `IMPLEMENTED` `/sample-report`, clearly labeled fictional
- [ ] Create How It Works page — `IMPLEMENTED`
- [ ] Create About Vinify page — `IMPLEMENTED`
- [ ] Create Contact page — `IMPLEMENTED` UI + validation (QA); **not connected** to inbox (Phase 10)
- [ ] Create FAQ page — `IMPLEMENTED` with FAQPage JSON-LD (QA)
- [ ] Create Privacy Policy — `DRAFT` marked "not in effect"; needs counsel
- [ ] Create Terms of Service — `DRAFT` marked "not in effect"; needs counsel
- [ ] Create Refund Policy — `DRAFT` marked "not in effect"
- [ ] Create data coverage and limitations disclosures — `DRAFT` `/data-coverage`; per-section sources pending supplier
- [x] Create professional navigation and footer — `VERIFIED` QA desktop + mobile
- [ ] Add trust and security messaging — `DRAFT` honesty/coverage messaging; security claims deferred until implemented
- [ ] Add SEO metadata and structured data — `IMPLEMENTED` per-page metadata, OG, sitemap, robots, FAQ JSON-LD. **Indexing disabled** until `VINIFY_INDEXABLE=true`
- [ ] Optimize performance and accessibility — `IMPLEMENTED` partial: static pages (~103–114 kB first load), skip link, labels, focus rings, aria-live, reduced-motion. No Lighthouse/axe audit yet

## Phase 4 — User Accounts & Authentication · P0

- [ ] Email and password registration — `NOT STARTED` (schema: `User.passwordHash`)
- [ ] Google sign-in — `NOT STARTED` (schema: Auth.js `Account`)
- [ ] Secure login and logout — `NOT STARTED`
- [ ] Email verification — `NOT STARTED` (schema: `VerificationToken`)
- [ ] Password reset — `NOT STARTED`
- [ ] Account profile management — `NOT STARTED`
- [ ] Customer dashboard — `NOT STARTED` (`/account` placeholder)
- [ ] Saved VIN searches — `NOT STARTED` (schema: `VinSearch`)
- [ ] Purchased report history — `NOT STARTED`
- [ ] Downloadable report library — `NOT STARTED`
- [ ] Subscription management — `NOT STARTED`
- [ ] Report credit balance — `NOT STARTED` (logic VERIFIED in Phase 6)
- [ ] Purchase history — `NOT STARTED`
- [ ] Billing information — `NOT STARTED`
- [ ] Account notifications — `NOT STARTED`
- [ ] Account deletion — `NOT STARTED` (schema: `User.deletedAt`)
- [ ] Data export and privacy controls — `NOT STARTED`
- [ ] Secure sessions and role-based permissions — `NOT STARTED` (schema: `Role` enum, `Session`)

## Phase 5 — VIN Lookup & Vehicle History Report Engine · P0

- [x] VIN format validation — `VERIFIED` `src/lib/vin.ts`; T (length, I/O/Q, symbols, empty)
- [x] VIN checksum validation where applicable — `VERIFIED` T; results cross-checked against NHTSA's own check-digit verdicts for 4 VINs. Mismatch = warning, not error
- [x] Free VIN decoding — `VERIFIED` (see Phase 2)
- [x] Vehicle year, make and model identification — `VERIFIED`
- [x] Engine and transmission specifications — `VERIFIED`
- [x] Vehicle manufacturer information — `VERIFIED`
- [ ] Paid history report generation — `BLOCKED` on supplier
- [ ] Accident history section — `BLOCKED` on supplier coverage
- [ ] Title history section — `IMPLEMENTED` (UI with sample data)
- [ ] Salvage and rebuilt title section — `IMPLEMENTED` (UI with sample data)
- [ ] Odometer history section — `IMPLEMENTED` (UI + chart with sample data)
- [ ] Ownership history section — `BLOCKED`; non-identifying only
- [ ] Theft history section — `IMPLEMENTED` (UI with sample data)
- [ ] Recall information section — `IMPLEMENTED` on decoder; not yet in paid report
- [ ] Auction history section — `BLOCKED` on supplier coverage
- [ ] Sales history section — `BLOCKED` on supplier coverage
- [ ] Service history section — `BLOCKED`; shown as "Not included"
- [x] Vehicle specifications section — `VERIFIED` on decoder
- [x] Data coverage and unavailable-record indicators — `VERIFIED` four states (`reported`, `no_records`, `not_covered`, `unavailable`) in `providers/types.ts` + `CoverageBadge`; rendered and QA'd
- [ ] Vehicle history timeline — `IMPLEMENTED` (sample data)
- [ ] Professional report layout — `IMPLEMENTED` `ReportView`; awaiting owner review
- [ ] Mobile-friendly report viewer — `IMPLEMENTED` QA at 375px with sample
- [ ] Downloadable PDF reports — `NOT STARTED`
- [ ] Report identification numbers — `IMPLEMENTED` (schema `Report.publicId`, UI shows VNF-…)
- [ ] Report generation timestamps — `IMPLEMENTED` (schema separates `generatedAt` vs `sourceAsOf`; UI shows both)
- [ ] Purchased report storage — `IMPLEMENTED` (schema only)
- [ ] Report retrieval and download — `NOT STARTED`
- [ ] Duplicate purchase prevention — `IMPLEMENTED` (unit): idempotent reserve; per-VIN/age policy NOT STARTED
- [ ] Supplier failure and refund handling — `IMPLEMENTED` (unit): reserve → release restores credit; Stripe refund NOT STARTED
- [ ] Report data normalization — `IMPLEMENTED` (contract): `NormalizedReport`
- [ ] Report usage and generation logs — `IMPLEMENTED` (schema): `ReportRequest`, `SupplierRequest`, `AuditLog`

## Phase 6 — Pricing, Payments & Subscriptions · P0

Proposed pricing — `PROPOSED`, subject to supplier cost validation (`src/lib/pricing.ts`):
Single $9.99 · 3-Report Bundle $24.99 · Vinify Plus $19.99/mo (3) · Vinify Pro $49.99/mo (10) · Dealership custom.

**Risk flagged:** at $100/mo + $1/query and 25 reports/month, Pro is negative per fully-used credit (T).

- [ ] Finalize report pricing based on supplier costs — `BLOCKED` on Gate A
- [ ] Integrate Stripe — `NOT STARTED` (needs test keys)
- [ ] Implement individual report purchases — `NOT STARTED`
- [ ] Implement report bundles — `NOT STARTED`
- [ ] Implement monthly subscriptions — `NOT STARTED`
- [ ] Implement subscription upgrades — `NOT STARTED`
- [ ] Implement subscription downgrades — `NOT STARTED`
- [ ] Implement subscription cancellation — `NOT STARTED`
- [ ] Implement report credit system — `IMPLEMENTED` (pure logic, T: reserve/consume/release, idempotent retries, zero-balance refusal); DB integration NOT STARTED
- [ ] Define report credit expiration and rollover policies — `NOT STARTED` (owner decision)
- [ ] Implement subscription usage limits — `NOT STARTED`
- [ ] Implement secure payment webhooks — `IMPLEMENTED` (schema): `WebhookEvent` keyed by Stripe event id for idempotency
- [ ] Implement billing history — `NOT STARTED`
- [ ] Implement automatic receipts — `NOT STARTED`
- [ ] Implement customer invoices — `NOT STARTED`
- [ ] Implement failed payment recovery — `NOT STARTED`
- [ ] Implement refund management — `NOT STARTED`
- [ ] Implement promotional codes — `NOT STARTED`
- [ ] Implement tax calculation where required — `NOT STARTED` (evaluate Stripe Tax)
- [ ] Prevent duplicate charges and report credit errors — `IMPLEMENTED` (unit + schema unique keys)
- [ ] Track supplier cost and profit per purchase — `IMPLEMENTED` (helpers `contributionPerReport`, `effectiveSupplierCost`; T)

## Phase 7 — Customer Dashboard · P0

All items `NOT STARTED` (depend on Phase 4 + 6): dashboard overview, recent searches, purchased reports,
saved vehicles, credits, subscription status, next billing date, payment history, download buttons,
purchase more, upgrade, cancel, profile, email preferences, contact support, mobile optimization.

## Phase 8 — Admin Management Portal · P1

All items `NOT STARTED`. Schema supports `Role.ADMIN/SUPPORT`, `AuditLog`, `CreditLedger.ADMIN_ADJUSTMENT`,
`SupplierRequest` metrics. **Minimum ops tooling (find payment, find report, restore credit, refund with
audit trail) is a Gate F requirement even though the full portal is P1.**

## Phase 9 — Emails & Notifications · P1

All items `NOT STARTED`. Essential transactional emails (verification, password reset, purchase
confirmation, receipt) are Gate F requirements.

## Phase 10 — Customer Support · P1

- [ ] Contact support form — `IMPLEMENTED` (UI only, not delivered anywhere)
- All other items `NOT STARTED` (schema: `SupportTicket`). A working support route is a Gate F requirement.

## Phase 11 — Dealership & Business Accounts · P2

All items `NOT STARTED`. Dealer CTA on `/pricing` routes to `/contact`.

## Phase 12 — Marketing, SEO & Affiliates · P1/P2

- [ ] SEO optimization — `IMPLEMENTED` partial (see Phase 3)
- [ ] Search engine indexing — `BLOCKED` intentionally until launch (`VINIFY_INDEXABLE`)
- All other items `NOT STARTED`.

## Phase 13 — Security, Legal & Compliance · P0

- [ ] Verify business formation requirements — `NOT STARTED`
- [ ] Confirm vehicle data resale licenses — `BLOCKED` on Gate A
- [ ] Review NMVTIS-related requirements — `RESEARCHED` (RESEARCH.md §1)
- [ ] Review applicable DPPA restrictions — `RESEARCHED` (RESEARCH.md §4); product decision: no personal owner data
- [ ] Review privacy and consumer protection requirements — `NOT STARTED`
- [ ] Verify permitted advertising and report claims — `IMPLEMENTED` guardrails in copy: no CARFAX-parity claim, explicit non-affiliation, coverage states, "not a guarantee" notices; counsel review NOT STARTED
- [ ] Implement privacy policy — `DRAFT`
- [ ] Implement terms of service — `DRAFT`
- [ ] Implement refund policy — `DRAFT`
- [ ] Implement secure authentication — `NOT STARTED`
- [ ] Implement role-based access controls — `NOT STARTED` (schema only)
- [ ] Implement API rate limiting — `NOT STARTED`
- [ ] Implement bot and abuse prevention — `NOT STARTED`
- [ ] Protect API credentials — `IMPLEMENTED` partial: `.env*` git-ignored, sample provider refuses production use
- [ ] Encrypt sensitive data — `NOT STARTED`
- [ ] Implement secure payment processing — `NOT STARTED`
- [ ] Configure database backups — `NOT STARTED`
- [ ] Establish data retention policies — `NOT STARTED`
- [ ] Implement account deletion workflows — `NOT STARTED`
- [ ] Implement monitoring and audit logs — `IMPLEMENTED` (schema `AuditLog`)
- [ ] Conduct security testing — `NOT STARTED`
- [ ] Obtain appropriate legal review before launch — `NOT STARTED`
- Security headers (HSTS, nosniff, frame-deny, referrer, permissions) — `VERIFIED` on Vercel production (HSTS header confirmed 2026-11-05)

## Phase 14 — Testing & Quality Assurance · P0

- [x] Test VIN decoding accuracy — `VERIFIED` T + live QA; check-digit results match NHTSA for 4 VINs
- [x] Test invalid VIN handling — `VERIFIED` T + QA
- [ ] Test vehicle data provider responses — `BLOCKED` on supplier
- [ ] Test missing history records — `IMPLEMENTED` (sample shows `no_records` / `not_covered`)
- [ ] Test report generation — `BLOCKED`
- [ ] Test PDF downloads — `NOT STARTED`
- [ ] Test registration / login / password reset — `NOT STARTED`
- [ ] Test individual purchases / subscriptions / cancellation — `NOT STARTED`
- [ ] Test report credit deductions — `IMPLEMENTED` (unit T); integration NOT STARTED
- [ ] Test duplicate purchase prevention — `IMPLEMENTED` (unit T)
- [ ] Test failed payments / refunds — `NOT STARTED`
- [ ] Test customer / admin dashboard — `NOT STARTED`
- [ ] Test email delivery — `NOT STARTED`
- [x] Test mobile responsiveness — `VERIFIED` QA 375px, current pages
- [ ] Test Safari, Chrome, Firefox and Edge — `IMPLEMENTED` Chromium only
- [ ] Test accessibility — `NOT STARTED` (no axe/Lighthouse run)
- [ ] Test API rate limits / database security / webhook reliability / backup & recovery — `NOT STARTED`
- [ ] Complete end-to-end production verification — `NOT STARTED`

## Phase 15 — Production Launch · P0

All items `NOT STARTED`.

---

## Change log

- 2026-11-05 — First production deployment on Vercel; production project is `govinify` (https://govinify.vercel.app). Pushes to `main` auto-deploy to production. Site remains noindex; payments, accounts and history reports not live.

| Date | Change | Evidence |
|---|---|---|
| 2026-11-05 | Roadmap v1.0 adopted as source of truth | Owner |
| 2026-11-05 | Research pass: NMVTIS, VinAudit, Stripe, DPPA, NHTSA | docs/RESEARCH.md |
| 2026-11-05 | Foundation build: Next.js 15 app, design system, 12 public pages, free decoder, VIN validation, credit ledger, Prisma schema, provider adapter | T 26/26, B pass, QA 15/15 |
