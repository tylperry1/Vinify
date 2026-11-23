import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { VinSearch } from "@/components/VinSearch";
import { currentUser } from "@/lib/server/auth";
import { decodeVehicle, modelRecalls, recordSearch } from "@/lib/server/decode";
import { validateVin } from "@/lib/vin";
import type { DecodedVehicle, RecallCampaign } from "@/lib/nhtsa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vehicle preview", robots: { index: false } };

const ACRONYMS = new Set(["USA", "US", "UK", "BMW", "GMC", "GM", "VW", "RAM", "LLC", "AG", "BYD", "MPV", "SUV", "CUV", "AWD", "FWD", "RWD", "4WD", "LTD", "SRT", "AMG", "TRD", "GT", "HD"]);

function titleCase(s: string | null) {
  if (!s) return s;
  return s.split(/(\s+)/).map((w) => {
    const core = w.replace(/[^A-Za-z]/g, "");
    if (ACRONYMS.has(core)) return w.replace(/[a-z]+/gi, (m) => m.toUpperCase());
    return w.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_, a, b) => a + b.toUpperCase());
  }).join("");
}

function Spec({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-b border-line py-3">
      <dt className="text-xs font-medium uppercase tracking-[0.1em] text-faint">{label}</dt>
      <dd className={`mt-1 font-semibold ${value ? "text-navy-900" : "text-faint"}`}>{value || "Not reported"}</dd>
    </div>
  );
}

export default async function VehiclePreview({ params }: { params: Promise<{ vin: string }> }) {
  const { vin: raw } = await params;
  const validation = validateVin(decodeURIComponent(raw ?? ""));

  if (!validation.wellFormed) {
    return (
      <PageShell>
        <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
          <h1 className="text-3xl font-bold">That VIN doesn&apos;t look right</h1>
          <p role="alert" className="my-4 rounded-xl bg-bad-bg p-4 text-bad">
            {validation.errors[0]?.message ?? "Enter a 17-character VIN."}
          </p>
          <div className="mt-8"><VinSearch tone="light" /></div>
        </main>
      </PageShell>
    );
  }

  const user = await currentUser();
  let vehicle: DecodedVehicle;
  try {
    vehicle = await decodeVehicle(validation.vin);
  } catch {
    return (
      <PageShell>
        <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
          <h1 className="text-3xl font-bold">Decoder temporarily unavailable</h1>
          <p className="my-4 rounded-xl bg-warn-bg p-4 text-warn">We couldn&apos;t reach NHTSA to decode this VIN. Nothing was charged. Try again in a moment.</p>
          <div className="mt-8"><VinSearch tone="light" initial={validation.vin} /></div>
        </main>
      </PageShell>
    );
  }

  if (user) {
    try { await recordSearch(user.id, vehicle); } catch { /* search history is best-effort */ }
  }

  let recalls: RecallCampaign[] = [];
  let recallsFailed = false;
  if (vehicle.identified && vehicle.make && vehicle.model && vehicle.year) {
    try { recalls = await modelRecalls(vehicle.make, vehicle.model, vehicle.year); }
    catch { recallsFailed = true; }
  }

  const title = [vehicle.year, titleCase(vehicle.make), vehicle.model, vehicle.trim].filter(Boolean).join(" ") || "Vehicle preview";
  const engine = [
    vehicle.engine.displacementL && `${vehicle.engine.displacementL}L`,
    vehicle.engine.configuration && vehicle.engine.cylinders ? `${vehicle.engine.configuration.replace(/-Shaped/i, "")}${vehicle.engine.cylinders}` : vehicle.engine.cylinders && `${vehicle.engine.cylinders}-cyl`,
    vehicle.engine.horsepower && `${Math.round(Number(vehicle.engine.horsepower))} hp`,
  ].filter(Boolean).join(" · ");
  const transmission = [vehicle.transmission.speeds && `${vehicle.transmission.speeds}-speed`, vehicle.transmission.style].filter(Boolean).join(" ");
  const plant = [titleCase(vehicle.plant.city), titleCase(vehicle.plant.state), titleCase(vehicle.plant.country)].filter(Boolean).join(", ");

  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <Link href="/decode" className="text-sm text-blue-600 hover:underline">← Decode another VIN</Link>

        {!vehicle.identified ? (
          <section className="mt-6 rounded-2xl border border-line p-6">
            <h1 className="text-2xl font-bold">We couldn&apos;t identify this vehicle</h1>
            <p className="mt-2 text-muted">
              NHTSA returned no year, make or model for <span className="font-mono">{vehicle.vin}</span>. Vehicles built
              before 1981, or not sold in the U.S., may not decode. Double-check the VIN before buying a report.
            </p>
            {vehicle.errorText && <p className="mt-3 text-sm text-faint">NHTSA: {vehicle.errorText}</p>}
          </section>
        ) : (
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-good-bg px-2.5 py-1 text-xs font-semibold text-good">Decoded</span>
                {validation.checkDigitValid === false && <span className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-semibold text-warn">Check digit mismatch</span>}
                <span className="font-mono text-sm tracking-[0.12em] text-muted">{vehicle.vin}</span>
              </div>
              <h1 className="font-display mt-3 text-3xl font-extrabold text-navy-900 sm:text-4xl">{title}</h1>
              {(vehicle.series || vehicle.bodyClass) && <p className="mt-1 text-muted">{[vehicle.series, vehicle.bodyClass].filter(Boolean).join(" · ")}</p>}

              <dl className="mt-8 grid gap-x-8 sm:grid-cols-2">
                <Spec label="Engine" value={engine || null} />
                <Spec label="Fuel" value={vehicle.engine.fuelType} />
                <Spec label="Transmission" value={transmission || null} />
                <Spec label="Drive type" value={vehicle.driveType} />
                <Spec label="Body" value={vehicle.bodyClass} />
                <Spec label="Doors" value={vehicle.doors} />
                <Spec label="Manufacturer" value={titleCase(vehicle.manufacturer)} />
                <Spec label="Assembly plant" value={plant || null} />
                <Spec label="Vehicle type" value={titleCase(vehicle.vehicleType)} />
                <Spec label="GVWR" value={vehicle.gvwr} />
              </dl>
              <p className="mt-4 text-xs text-faint">
                Source: NHTSA vPIC. These specifications describe how the vehicle was built and may not reflect later
                modifications. {user && "This search was saved to your account."}
              </p>

              <section aria-labelledby="recalls-h" className="mt-12">
                <h2 id="recalls-h" className="text-xl font-bold">Recall campaigns for this model</h2>
                <p className="mt-2 rounded-xl bg-surface px-4 py-3 text-sm text-muted">
                  NHTSA campaigns are model-level, not VIN-specific. They don&apos;t show whether this exact vehicle was
                  repaired. Confirm open recalls at{" "}
                  <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer" className="font-semibold text-blue-600 underline">nhtsa.gov/recalls</a>.
                </p>
                {recallsFailed && <p className="mt-4 text-sm text-warn">Recall data is temporarily unavailable.</p>}
                {!recallsFailed && recalls.length === 0 && <p className="mt-4 text-sm text-muted">NHTSA lists no recall campaigns for this year, make and model.</p>}
                {recalls.length > 0 && (
                  <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
                    {recalls.slice(0, 8).map((r) => (
                      <li key={r.campaignNumber} className="p-4">
                        <p className="font-semibold">{titleCase(r.component.split(":")[0])}</p>
                        <p className="text-xs text-faint">Campaign {r.campaignNumber}{r.reportDate ? ` · ${r.reportDate}` : ""}{r.parkIt ? " · Park it — do not drive" : ""}</p>
                        <p className="mt-2 text-sm text-muted">{r.summary}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-card">
                <div className="bg-navy-900 p-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Free decode vs. history report</p>
                  <p className="font-display mt-2 text-2xl font-extrabold">What you&apos;re seeing is only the build sheet.</p>
                </div>
                <div className="p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-faint">Included free</h2>
                  <ul className="mt-3 space-y-2 text-sm text-navy-900">
                    {["Year, make, model and trim", "Engine, transmission and drivetrain", "Body style and assembly plant", "Model-level recall campaigns"].map((f) => <li key={f}>✓ {f}</li>)}
                  </ul>
                  <h2 className="mt-6 text-sm font-semibold uppercase tracking-[0.12em] text-faint">Needs a history report</h2>
                  <ul className="mt-3 space-y-2 text-sm text-muted">
                    {["Title brands (salvage, flood, lemon)", "Odometer readings and rollback checks", "Insurance total loss", "Theft and accident records", "Ownership and auction history"].map((f) => <li key={f}>🔒 {f}</li>)}
                  </ul>
                  <p className="mt-5 rounded-lg bg-warn-bg p-3 text-xs leading-relaxed text-warn">
                    Paid history reports aren&apos;t on sale yet — we&apos;re finalising licensed data partners. The free
                    decode above never implies a vehicle is clean.
                  </p>
                  <div className="mt-5 space-y-3">
                    <Link href="/pricing" className="block rounded-lg bg-navy-900 py-3 text-center text-sm font-semibold text-white hover:bg-navy-800">See planned pricing</Link>
                    {!user && <Link href="/register" className="block rounded-lg border border-line py-3 text-center text-sm font-semibold text-navy-900">Create a free account</Link>}
                    {!user && <Link href="/login" className="block text-center text-sm font-semibold text-blue-600 hover:underline">Sign in</Link>}
                    {user && <Link href="/account" className="block text-center text-sm font-semibold text-blue-600 hover:underline">Go to your account</Link>}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </PageShell>
  );
}
