/**
 * Fictional development fixtures.
 *
 * EVERYTHING in this file is invented test data:
 *  - emails use the reserved `.test` domain (RFC 2606) or `.local`,
 *  - names, VINs, orders, payments and reports are generated for local testing,
 *  - no real customer, vehicle or payment data is present.
 *
 * Vehicles are represented with the schema the product already uses (VinSearch,
 * SavedVehicle and the NormalizedReport payload) — no schema change was made.
 */

const TRANSLITERATION = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** 49 CFR 565 check digit, mirroring src/lib/vin.ts. Generated VINs pass validation. */
export function computeCheckDigit(vin17) {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin17[i];
    const value = c >= "0" && c <= "9" ? Number(c) : TRANSLITERATION[c];
    if (value === undefined) throw new Error(`Invalid VIN character: ${c}`);
    sum += value * WEIGHTS[i];
  }
  const remainder = sum % 11;
  return remainder === 10 ? "X" : String(remainder);
}

/** Builds a 17-character VIN whose 9th character is a valid check digit. */
export function buildVin({ wmi, vds, yearCode, plant, serial }) {
  const body = `${wmi}${vds}${yearCode}${plant}${serial}`;
  if (body.length !== 16) throw new Error(`VIN body must be 16 characters, got ${body.length}`);
  return `${body.slice(0, 8)}${computeCheckDigit(`${body.slice(0, 8)}0${body.slice(8)}`)}${body.slice(8)}`;
}

export const SEED_VERSION = "2026-11-23";

/** Development-only sign-in details. Printed by the seeder; never valid outside a local database. */
export const DEV_ADMIN = {
  id: "seed_admin_dev",
  email: "dev.admin@vinify.local",
  name: "Dev Admin (fictional)",
  password: "Dev-Admin-Local-2026",
  role: "SUPER_ADMIN",
};

export const CUSTOMER_PASSWORD = "Customer-Dev-2026";

export const CUSTOMERS = [
  { n: 1, name: "Amelia Rhodes", email: "amelia.rhodes@example.test", createdAt: "2025-01-14T09:12:00Z", verified: true, marketing: true },
  { n: 2, name: "Marcus Lee", email: "marcus.lee@example.test", createdAt: "2025-03-02T16:40:00Z", verified: true, marketing: false },
  { n: 3, name: "Priya Nair", email: "priya.nair@example.test", createdAt: "2025-04-19T11:05:00Z", verified: false, marketing: false },
  { n: 4, name: "Devon Carter", email: "devon.carter@example.test", createdAt: "2025-06-08T21:33:00Z", verified: true, marketing: false, suspendedAt: "2026-02-11T10:00:00Z" },
  { n: 5, name: "Sofia Marchetti", email: "sofia.marchetti@example.test", createdAt: "2025-08-23T08:47:00Z", verified: true, marketing: true },
  { n: 6, name: "Ethan Brooks", email: "ethan.brooks@example.test", createdAt: "2025-10-05T14:22:00Z", verified: false, marketing: false },
  { n: 7, name: "Hana Sato", email: "hana.sato@example.test", createdAt: "2026-01-11T19:03:00Z", verified: true, marketing: false },
  { n: 8, name: "Luis Ortega", email: "luis.ortega@example.test", createdAt: "2026-03-27T12:58:00Z", verified: true, marketing: true, suspendedAt: "2026-09-02T15:30:00Z" },
  { n: 9, name: "Nia Washington", email: "nia.washington@example.test", createdAt: "2026-06-15T07:10:00Z", verified: false, marketing: false },
  { n: 10, name: "Oliver Bennett", email: "oliver.bennett@example.test", createdAt: "2026-09-30T18:44:00Z", verified: true, marketing: false },
];

/**
 * 15 fictional vehicles. Each VIN is generated with a valid 49 CFR 565 check digit;
 * the first one keeps the well-known Honda Accord VIN already used by the sample report.
 */
export const VEHICLES = [
  { key: "accord", year: 2003, make: "Honda", model: "Accord", trim: "EX V6", body: "Sedan", engine: "3.0L V6", fuel: "Gasoline", transmission: "5-speed automatic", drivetrain: "FWD", vin: "1HGCM82633A004352" },
  { key: "f150", year: 2018, make: "Ford", model: "F-150", trim: "XLT", body: "Pickup", engine: "5.0L V8", fuel: "Gasoline", transmission: "10-speed automatic", drivetrain: "4WD", wmi: "1FT", vds: "FW1ET", yearCode: "J", plant: "D", serial: "104321" },
  { key: "model3", year: 2021, make: "Tesla", model: "Model 3", trim: "Long Range", body: "Sedan", engine: "Dual electric motor", fuel: "Electric", transmission: "Single-speed", drivetrain: "AWD", wmi: "5YJ", vds: "3E1EA", yearCode: "M", plant: "F", serial: "220118" },
  { key: "330i", year: 2017, make: "BMW", model: "330i", trim: "Sport Line", body: "Sedan", engine: "2.0L I4 turbo", fuel: "Gasoline", transmission: "8-speed automatic", drivetrain: "RWD", wmi: "WBA", vds: "8E9G5", yearCode: "H", plant: "P", serial: "553201" },
  { key: "rav4", year: 2019, make: "Toyota", model: "RAV4", trim: "XLE", body: "SUV", engine: "2.5L I4", fuel: "Gasoline", transmission: "8-speed automatic", drivetrain: "AWD", wmi: "JTM", vds: "BFREV", yearCode: "K", plant: "D", serial: "331807" },
  { key: "malibu", year: 2016, make: "Chevrolet", model: "Malibu", trim: "LT", body: "Sedan", engine: "1.5L I4 turbo", fuel: "Gasoline", transmission: "6-speed automatic", drivetrain: "FWD", wmi: "1G1", vds: "ZD5ST", yearCode: "G", plant: "F", serial: "226544" },
  { key: "jetta", year: 2020, make: "Volkswagen", model: "Jetta", trim: "SE", body: "Sedan", engine: "1.4L I4 turbo", fuel: "Gasoline", transmission: "8-speed automatic", drivetrain: "FWD", wmi: "3VW", vds: "2B7AJ", yearCode: "L", plant: "M", serial: "118903" },
  { key: "camry", year: 2015, make: "Toyota", model: "Camry", trim: "SE", body: "Sedan", engine: "2.5L I4", fuel: "Gasoline", transmission: "6-speed automatic", drivetrain: "FWD", wmi: "4T1", vds: "BF1FK", yearCode: "F", plant: "U", serial: "771245" },
  { key: "elantra", year: 2018, make: "Hyundai", model: "Elantra GT", trim: "Base", body: "Hatchback", engine: "2.0L I4", fuel: "Gasoline", transmission: "6-speed automatic", drivetrain: "FWD", wmi: "KMH", vds: "D35LH", yearCode: "J", plant: "U", serial: "339410" },
  { key: "pacifica", year: 2022, make: "Chrysler", model: "Pacifica", trim: "Touring L", body: "Minivan", engine: "3.6L V6", fuel: "Gasoline", transmission: "9-speed automatic", drivetrain: "FWD", wmi: "2C4", vds: "RC1BG", yearCode: "N", plant: "R", serial: "447120" },
  { key: "370z", year: 2014, make: "Nissan", model: "370Z", trim: "Touring", body: "Coupe", engine: "3.7L V6", fuel: "Gasoline", transmission: "7-speed automatic", drivetrain: "RWD", wmi: "JN1", vds: "AZ4EH", yearCode: "E", plant: "T", serial: "102988" },
  { key: "cherokee", year: 2019, make: "Jeep", model: "Grand Cherokee", trim: "Limited", body: "SUV", engine: "3.6L V6", fuel: "Gasoline", transmission: "8-speed automatic", drivetrain: "4WD", wmi: "1C4", vds: "RJFAG", yearCode: "K", plant: "C", serial: "559031" },
  { key: "santafe", year: 2020, make: "Hyundai", model: "Santa Fe", trim: "SEL", body: "SUV", engine: "2.4L I4", fuel: "Gasoline", transmission: "8-speed automatic", drivetrain: "AWD", wmi: "5NM", vds: "S3CAD", yearCode: "L", plant: "U", serial: "612470" },
  { key: "c300", year: 2016, make: "Mercedes-Benz", model: "C 300", trim: "4MATIC", body: "Sedan", engine: "2.0L I4 turbo", fuel: "Gasoline", transmission: "7-speed automatic", drivetrain: "AWD", wmi: "WDD", vds: "GF4HB", yearCode: "G", plant: "F", serial: "208119" },
  { key: "sierra", year: 2017, make: "GMC", model: "Sierra 1500", trim: "SLE", body: "Pickup", engine: "5.3L V8", fuel: "Gasoline", transmission: "6-speed automatic", drivetrain: "4WD", wmi: "1GT", vds: "V2UEC", yearCode: "H", plant: "Z", serial: "330456" },
].map((vehicle) => ({ ...vehicle, vin: vehicle.vin ?? buildVin(vehicle) }));

export const SALES_STATES = ["Ohio", "Indiana", "Michigan", "Arizona", "Texas", "Oregon", "Georgia", "Colorado"];

const day = (year, month, date) => `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

/**
 * Builds a NormalizedReport with the coverage contract the UI renders
 * (accidents, title/ownership, mileage, recalls, specs, plus not-covered service).
 * `variant` nudges the story per vehicle so the seeded reports differ.
 */
export function fictionalReport(vehicle, variant = {}) {
  const source = "Fictional test data";
  const firstYear = vehicle.year;
  const state = SALES_STATES[vehicle.key.length % SALES_STATES.length];
  const secondState = SALES_STATES[(vehicle.key.length + 3) % SALES_STATES.length];
  const baseMiles = Math.max(10, (2026 - firstYear) * 9800);
  const accidents = variant.accidents ?? 0;
  const recalls = variant.recalls ?? 0;
  const salvage = Boolean(variant.salvage);
  const rollback = Boolean(variant.rollback);

  const titleEvents = [
    { date: day(firstYear, 4, 17), type: "title", title: "First title issued", location: state, odometer: 12, source },
    { date: day(firstYear + 4, 8, 2), type: "title", title: "Title transferred", location: state, odometer: Math.round(baseMiles * 0.45), source },
  ];
  if (!salvage) {
    titleEvents.push({ date: day(firstYear + 9, 5, 21), type: "title", title: "Title issued — new state", location: secondState, odometer: Math.round(baseMiles * 0.8), source });
  }

  const odometerValues = [
    { date: day(firstYear, 4, 17), miles: 12 },
    { date: day(firstYear + 3, 3, 11), miles: Math.round(baseMiles * 0.3) },
    { date: day(firstYear + 6, 8, 2), miles: Math.round(baseMiles * 0.55) },
    { date: day(firstYear + 9, 9, 30), miles: Math.round(baseMiles * 0.8) },
    { date: day(Math.min(2026, firstYear + 12), 5, 21), miles: rollback ? Math.round(baseMiles * 0.42) : baseMiles },
  ];

  const accidentEvents = Array.from({ length: accidents }, (_, index) => ({
    date: day(firstYear + 5 + index, 1 + index * 3, 9 + index),
    type: "accidents",
    title: index === 0 ? "Damage reported — front" : "Damage reported — rear",
    detail: index === 0 ? "Minor; vehicle drivable" : "Moderate; airbags not deployed",
    location: index === 0 ? state : secondState,
    source,
  }));

  const recallEvents = Array.from({ length: recalls }, (_, index) => ({
    date: null,
    type: "recalls",
    title: `Open safety recall ${index + 1} (model-level)`,
    detail: `NHTSA campaign 2${index + 4}V-${String(120 + index * 37).padStart(3, "0")} — applies to the model, not verified for this VIN`,
    source: "NHTSA (model-level, fictional campaign number)",
  }));

  const sections = [
    {
      key: "title",
      status: "reported",
      label: "Title history",
      summary: `${titleEvents.length} title records across ${salvage ? 2 : 2} states${salvage ? " · branded title reported" : ""}`,
      events: titleEvents,
    },
    {
      key: "brands",
      status: salvage ? "reported" : "no_records",
      label: "Title brands (salvage, rebuilt, flood, lemon)",
      summary: salvage ? "1 brand reported — salvage (fictional)" : "No brand records found",
      events: salvage
        ? [{ date: day(firstYear + 7, 2, 14), type: "brands", title: "Salvage title brand reported", detail: "Insurance total loss (fictional record)", location: state, source }]
        : [],
    },
    {
      key: "odometer",
      status: "reported",
      label: "Odometer readings",
      summary: `${odometerValues.length} readings${rollback ? " · possible rollback (reading decreased)" : " · no rollback indicators"}`,
      events: odometerValues.map((reading) => ({ date: reading.date, type: "odometer", title: "Odometer reading", odometer: reading.miles, source })),
    },
    {
      key: "totalLoss",
      status: salvage ? "reported" : "no_records",
      label: "Insurance total loss",
      summary: salvage ? "1 total-loss record reported" : "No total-loss records found",
      events: salvage
        ? [{ date: day(firstYear + 7, 2, 10), type: "totalLoss", title: "Vehicle declared a total loss", location: state, source }]
        : [],
    },
    { key: "theft", status: "no_records", label: "Theft records", summary: "No theft records found", events: [] },
    {
      key: "accidents",
      status: accidents ? "reported" : "no_records",
      label: "Accident & damage records",
      summary: accidents ? `${accidents} reported damage event${accidents > 1 ? "s" : ""}` : "No accident records found",
      events: accidentEvents,
    },
    {
      key: "ownership",
      status: "reported",
      label: "Ownership events",
      summary: `Approximately ${salvage ? 2 : 3} ownership periods (no personal data)`,
      events: [
        { date: day(firstYear, 4, 17), type: "ownership", title: "First owner registered", location: state, source },
        { date: day(firstYear + 4, 8, 2), type: "ownership", title: "Ownership transfer", location: state, odometer: Math.round(baseMiles * 0.45), source },
      ],
    },
    {
      key: "auctions",
      status: "reported",
      label: "Auction & sale listings",
      summary: "1 auction record",
      events: [{ date: day(firstYear + 9, 4, 2), type: "auctions", title: "Offered at wholesale auction", location: secondState, odometer: Math.round(baseMiles * 0.78), source }],
    },
    {
      key: "sales",
      status: "reported",
      label: "Sales history",
      summary: "1 dealer sale listing",
      events: [{ date: day(firstYear + 9, 4, 18), type: "sales", title: "Listed for retail sale", location: secondState, odometer: Math.round(baseMiles * 0.79), source }],
    },
    { key: "service", status: "not_covered", label: "Service & maintenance", summary: "Not included in this report", events: [] },
    {
      key: "recalls",
      status: recalls ? "reported" : "no_records",
      label: "Safety recalls",
      summary: recalls ? `${recalls} open recall${recalls > 1 ? "s" : ""} (model-level)` : "No unrepaired recalls found",
      events: recallEvents,
    },
    {
      key: "specs",
      status: "reported",
      label: "Vehicle specifications",
      summary: `${vehicle.engine} · ${vehicle.transmission} · ${vehicle.drivetrain}`,
      events: [
        { date: null, type: "specs", title: "Engine", detail: vehicle.engine, source },
        { date: null, type: "specs", title: "Transmission", detail: vehicle.transmission, source },
        { date: null, type: "specs", title: "Body style", detail: `${vehicle.body} · ${vehicle.drivetrain}`, source },
      ],
    },
  ];

  return {
    vin: vehicle.vin,
    provider: "sample",
    providerReportId: `SEED-${vehicle.vin.slice(-6)}`,
    sourceAsOf: "2026-11-01",
    sections,
  };
}

const PLAN_PRICE = { single: 999, bundle3: 2499, plus: 1999, pro: 4999 };

/**
 * 20 fictional orders. Statuses map onto the existing OrderStatus enum:
 *   completed  -> PAID + generated report
 *   processing -> PAID + ReportRequest QUEUED/FETCHING
 *   pending    -> PENDING (checkout created, unpaid)
 *   failed     -> FAILED (payment declined)
 *   cancelled  -> FAILED with no payment intent (checkout abandoned) — the schema has no CANCELLED value
 *   refunded   -> REFUNDED / PARTIALLY_REFUNDED
 */
export const ORDERS = [
  { n: 1, customer: 1, vehicle: 0, plan: "single", status: "PAID", scenario: "completed", reportStatus: "SUCCEEDED", daysAgo: 96 },
  { n: 2, customer: 2, vehicle: 1, plan: "bundle3", status: "PAID", scenario: "completed", reportStatus: "SUCCEEDED", daysAgo: 88, credits: 3 },
  { n: 3, customer: 3, vehicle: 2, plan: "single", status: "PAID", scenario: "completed", reportStatus: "SUCCEEDED", daysAgo: 74 },
  { n: 4, customer: 5, vehicle: 4, plan: "single", status: "PAID", scenario: "completed", reportStatus: "SUCCEEDED", daysAgo: 61 },
  { n: 5, customer: 6, vehicle: 5, plan: "bundle3", status: "PAID", scenario: "completed", reportStatus: "SUCCEEDED", daysAgo: 47, credits: 3 },
  { n: 6, customer: 7, vehicle: 11, plan: "single", status: "PAID", scenario: "completed", reportStatus: "SUCCEEDED", daysAgo: 33 },
  { n: 7, customer: 9, vehicle: 12, plan: "single", status: "PAID", scenario: "completed", reportStatus: "SUCCEEDED", daysAgo: 19 },
  { n: 8, customer: 10, vehicle: 13, plan: "plus", status: "PAID", scenario: "processing", reportStatus: "FETCHING", daysAgo: 3, credits: 3 },
  { n: 9, customer: 2, vehicle: 6, plan: "single", status: "PAID", scenario: "processing", reportStatus: "QUEUED", daysAgo: 1 },
  { n: 10, customer: 5, vehicle: 8, plan: "bundle3", status: "PAID", scenario: "processing", reportStatus: "FETCHING", daysAgo: 0, credits: 3 },
  { n: 11, customer: 1, vehicle: 9, plan: "single", status: "PENDING", scenario: "pending", daysAgo: 2 },
  { n: 12, customer: 3, vehicle: 10, plan: "single", status: "PENDING", scenario: "pending", daysAgo: 5 },
  { n: 13, customer: 6, vehicle: 3, plan: "bundle3", status: "PENDING", scenario: "pending", daysAgo: 8 },
  { n: 14, customer: 7, vehicle: 14, plan: "pro", status: "PENDING", scenario: "pending", daysAgo: 12 },
  { n: 15, customer: 4, vehicle: 7, plan: "single", status: "FAILED", scenario: "payment_failed", reportStatus: "FAILED", daysAgo: 41 },
  { n: 16, customer: 8, vehicle: 3, plan: "single", status: "FAILED", scenario: "payment_failed", reportStatus: "FAILED", daysAgo: 27 },
  { n: 17, customer: 9, vehicle: 10, plan: "single", status: "FAILED", scenario: "cancelled", daysAgo: 15 },
  { n: 18, customer: 5, vehicle: 0, plan: "bundle3", status: "FAILED", scenario: "cancelled", daysAgo: 9 },
  { n: 19, customer: 2, vehicle: 2, plan: "single", status: "REFUNDED", scenario: "refunded", reportStatus: "REFUNDED", daysAgo: 58 },
  { n: 20, customer: 1, vehicle: 4, plan: "single", status: "PARTIALLY_REFUNDED", scenario: "partial_refund", reportStatus: "SUCCEEDED", daysAgo: 36 },
].map((order) => ({ ...order, amountCents: PLAN_PRICE[order.plan], credits: order.credits ?? 1 }));

export const SUBSCRIPTIONS = [
  { n: 1, customer: 10, plan: "plus", status: "ACTIVE", reports: 3, startedDaysAgo: 34, endsInDays: 24, cancelAtPeriodEnd: false },
  { n: 2, customer: 7, plan: "pro", status: "PAST_DUE", reports: 10, startedDaysAgo: 128, endsInDays: -4, cancelAtPeriodEnd: false },
  { n: 3, customer: 2, plan: "plus", status: "CANCELED", reports: 3, startedDaysAgo: 210, endsInDays: -30, cancelAtPeriodEnd: true },
];

export const TICKETS = [
  { n: 1, customer: 4, category: "billing", subject: "Charged twice for one report", status: "in_progress", daysAgo: 6 },
  { n: 2, customer: 6, category: "report", subject: "Report missing service records", status: "open", daysAgo: 3 },
  { n: 3, customer: 2, category: "refund", subject: "Refund not showing on statement", status: "resolved", daysAgo: 54 },
  { n: 4, customer: 9, category: "other", subject: "Can I decode a motorcycle VIN?", status: "open", daysAgo: 1 },
];

export const SAVED_VEHICLES = [
  { customer: 1, vehicle: 0, nickname: "First car" },
  { customer: 1, vehicle: 4, nickname: "Shortlist A" },
  { customer: 2, vehicle: 1, nickname: "Work truck" },
  { customer: 3, vehicle: 2, nickname: null },
  { customer: 5, vehicle: 8, nickname: "Family search" },
  { customer: 6, vehicle: 5, nickname: null },
  { customer: 9, vehicle: 12, nickname: "Test drive Saturday" },
  { customer: 10, vehicle: 13, nickname: null },
];
