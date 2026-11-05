# Vinify — Research Findings

Last updated: 2026-11-05. Findings are external research, **not** contractual commitments. Anything not
confirmed in writing by a supplier, Stripe, or counsel stays an **unverified assumption**.

## 1. NMVTIS and approved providers

- Only Approved NMVTIS Data Providers (ANDPs) are authorized to sell NMVTIS vehicle history reports and
  display the NMVTIS logo. ANDP status is established through an application process and a formal contract
  with AAMVA, the system operator.
  Sources: [NMVTIS 2018 Annual Report](https://vehiclehistory.bja.ojp.gov/sites/vehiclehist/files/media/document/NMVTIS-2018-Annual-Report.pdf),
  [NMVTIS Glossary](https://vehiclehistory.bja.ojp.gov/nmvtis-annual-reports-and-financial-audits/glossary)
- NMVTIS consumer data covers: current state of title and last title date, brand history, odometer
  reading, total-loss history and salvage history. It does **not** by itself establish accident, service,
  or ownership-count history.
  Source: [NMVTIS 2018 Annual Report](https://vehiclehistory.bja.ojp.gov/sites/vehiclehist/files/media/document/NMVTIS-2018-Annual-Report.pdf)
- Current public + commercial ANDPs include Bumper, Carsforsale, carVertical, CheckThatVIN, ClearVin,
  EpicVIN, GoodCar, TitleCheck.us, VinAudit, VINData and VinReport. CARFAX, Experian and others are
  commercial-only. Source: [DOJ Approved NMVTIS Data Providers](https://vehiclehistory.bja.ojp.gov/nmvtis_vehiclehistory)
- FY2024: 19 ANDPs operating across 26 approved websites.
  Source: [NMVTIS FY2024 Annual Report](https://vehiclehistory.bja.ojp.gov/doc/fy24-nmvtis-annual-report.pdf)

**Implication:** Vinify must either (a) become an ANDP itself, or (b) operate as an approved reseller /
affiliate under an existing ANDP, with that arrangement documented. API access alone is not authorization.

## 2. Supplier candidate: VinAudit (first to evaluate)

| Item | Finding | Status |
|---|---|---|
| Vehicle History API self-service | $100/mo + $1/query; self-service limited to qualifying developers / early-stage startups | Third-party summaries of VinAudit pricing ([Vincario](https://vincario.com/blog/alternatives/vinaudit-api/), [1Lookup](https://www.1lookup.io/compare/vinaudit)); VinAudit says pricing varies by product, coverage and access level ([VinAudit Data pricing](https://data.vinaudit.com/pricing)) — **needs written quote** |
| Resale route | VinAudit directs vehicle-history resale to its Affiliates & Resellers program rather than the general API subscription ([VinAudit Canada API page](https://www.vinaudit.ca/api-subscription)) | **Must confirm for US** |
| Formats | JSON, XML or PDF via api.vinaudit.com ([VinAudit API intro](https://data.vinaudit.com/docs/api/introduction)) | Documented |
| Re-fetch billing | Billed at most once per unique report ID when re-retrieved within a 90-day retention window; duplicate VIN requests are not automatically free ([Vehicle History API docs](https://data.vinaudit.com/docs/api/vin/vehicle-history)) | Documented — design caching around report ID |

### Effective supplier cost at $100/mo + $1/query (illustrative)

| Billable reports / month | Effective cost per report |
|---:|---:|
| 25 | $5.00 |
| 100 | $2.00 |
| 500 | $1.20 |

Implemented as `effectiveSupplierCost()` in `src/lib/pricing.ts` and covered by unit tests.

## 3. Payments

- Stripe standard US domestic cards: 2.9% + 30¢ per successful transaction
  ([Stripe pricing](https://stripe.com/pricing)).
- Stripe Billing pay-as-you-go: 0.7% of Billing volume, on top of processing
  ([Stripe Billing pricing](https://stripe.com/billing/pricing)).

### Contribution per report at full redemption (Stripe fees only, before supplier cost)

| Plan | Price | Reports | ≈ Net per report |
|---|---:|---:|---:|
| Single | $9.99 | 1 | $9.40 |
| 3-Report Bundle | $24.99 | 3 | $7.99 |
| Plus | $19.99/mo | 3 | $6.32 |
| Pro | $49.99/mo | 10 | $4.79 |

At 25 reports/month (effective $5 supplier cost), **Pro loses money on every fully-used credit**. Pro
pricing must not be approved until supplier volume pricing is known. Covered by `tests/pricing.test.ts`.

## 4. DPPA (Driver's Privacy Protection Act)

- 18 U.S.C. § 2721 restricts disclosure of personal information from state motor-vehicle records.
  Authorized recipients may resell/redisclose only for permitted uses and must keep records of each
  recipient and purpose for 5 years.
  Source: [18 U.S.C. § 2721 (uscode.house.gov)](https://uscode.house.gov/us/usc/119-134/t18/s2721/)

**Decision implemented in product copy:** Vinify reports describe vehicles, not people. No owner names,
addresses or contact details. "Ownership history" means non-identifying ownership periods/counts only,
subject to supplier rights and legal review.

## 5. NHTSA (free data)

- vPIC VIN decoding — free, no key, CORS-enabled (verified 2026-11-05 with live requests). Intended
  principally for MY 1981+ vehicles for the US market.
- Recalls API (`api.nhtsa.gov/recalls/recallsByVehicle`) — by year/make/model only. **Not VIN-specific**;
  the UI labels results as model-level campaigns and links to nhtsa.gov/recalls for VIN-specific status.

## 6. Open research items

- Written answers from 2–3 ANDPs on: resale/white-label rights, required disclaimers, field coverage,
  failed-request billing, storage/PDF rights, minimums, rate limits, sample reports.
- Trademark clearance for "Vinify" (USPTO search + counsel).
- Domain availability.
- State sales-tax treatment of digital reports (Stripe Tax evaluation).
- Subscription auto-renewal disclosure rules (FTC + state laws) — counsel.
