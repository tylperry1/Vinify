"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { VinSearch } from "@/components/VinSearch";
import type { DecodedVehicle, RecallCampaign } from "@/lib/nhtsa";
import { validateVin } from "@/lib/vin";

type State =
  | { kind: "idle" }
  | { kind: "loading"; vin: string }
  | { kind: "error"; vin: string; message: string }
  | { kind: "done"; vehicle: DecodedVehicle };

type RecallState = { kind: "idle" | "loading" } | { kind: "error" } | { kind: "done"; items: RecallCampaign[] };

async function decodeVin(vin: string, init?: RequestInit): Promise<DecodedVehicle> {
  const response = await fetch(`/api/decode?vin=${encodeURIComponent(vin)}`, init);
  if (!response.ok) throw new Error("The decoder is temporarily unavailable. Please try again shortly.");
  return response.json();
}

async function fetchModelRecalls(make: string, model: string, year: string, signal: AbortSignal): Promise<RecallCampaign[]> {
  const query = new URLSearchParams({ make, model, year });
  const response = await fetch(`/api/recalls?${query}`, { signal });
  if (!response.ok) throw new Error("Recall data is temporarily unavailable");
  return response.json();
}

function Spec({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="border-b border-line py-3">
      <dt className="text-xs font-medium uppercase tracking-[0.1em] text-faint">{label}</dt>
      <dd className={`mt-1 font-semibold ${value ? "text-navy-900" : "text-faint"}`}>{value || "Not reported"}</dd>
    </div>
  );
}

const ACRONYMS = new Set(["USA", "US", "UK", "BMW", "GMC", "GM", "VW", "RAM", "LLC", "AG", "BYD", "MPV", "SUV", "CUV", "ABS", "II", "III", "IV", "AWD", "FWD", "RWD", "4WD", "LTD", "SRT", "AMG", "TRD", "GT", "HD"]);

/** "AMERICAN HONDA MOTOR CO., INC." → "American Honda Motor Co., Inc."; keeps short acronyms like BMW, GMC, (USA). */
function titleCase(s: string | null) {
  if (!s) return s;
  return s
    .split(/(\s+)/)
    .map((w) => {
      const core = w.replace(/[^A-Za-z]/g, "");
      if (ACRONYMS.has(core)) return w.replace(/[a-z]+/gi, (m) => m.toUpperCase());
      return w.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_, a, b) => a + b.toUpperCase());
    })
    .join("");
}

export function DecodeClient() {
  const params = useSearchParams();
  const router = useRouter();
  const vinParam = (params.get("vin") ?? "").toUpperCase();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [recalls, setRecalls] = useState<RecallState>({ kind: "idle" });
  const [openRecall, setOpenRecall] = useState<string | null>(null);

  useEffect(() => {
    const v = validateVin(vinParam);
    if (!vinParam || !v.wellFormed) {
      setState({ kind: "idle" });
      return;
    }
    const ctrl = new AbortController();
    setState({ kind: "loading", vin: v.vin });
    setRecalls({ kind: "idle" });
    decodeVin(v.vin, { signal: ctrl.signal })
      .then((vehicle) => {
        setState({ kind: "done", vehicle });
        if (vehicle.identified) {
          setRecalls({ kind: "loading" });
          fetchModelRecalls(vehicle.make!, vehicle.model!, vehicle.year!, ctrl.signal)
            .then((items) => setRecalls({ kind: "done", items }))
            .catch((e) => e.name !== "AbortError" && setRecalls({ kind: "error" }));
        }
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setState({ kind: "error", vin: v.vin, message: "We couldn’t reach the NHTSA decoder. Please try again in a moment." });
      });
    return () => ctrl.abort();
  }, [vinParam]);

  const validation = validateVin(vinParam);

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-12 sm:px-8 sm:pt-16">
          <p className="text-sm font-semibold text-blue-600">Free VIN decoder</p>
          <h1 className="font-display mt-2 text-[2.1rem] font-extrabold leading-tight text-navy-900 sm:text-5xl">
            What car is this, exactly?
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Specifications and recall campaigns from the U.S. National Highway Traffic Safety Administration. Free, no
            account needed.
          </p>
          <div className="mt-8 max-w-3xl">
            <VinSearch
              key={vinParam}
              tone="light"
              initial={vinParam}
              autoFocus={!vinParam}
              onSubmitVin={(v) => router.push(`/decode?vin=${v}`)}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto min-h-[40vh] max-w-6xl px-5 py-12 sm:px-8" aria-live="polite">
        {state.kind === "idle" && !vinParam && (
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["Driver-side dashboard", "Look through the windshield at the bottom corner on the driver’s side."],
              ["Driver door jamb", "Open the door and check the sticker on the pillar or door edge."],
              ["Title, registration or insurance card", "The VIN is printed on all official vehicle documents."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-line p-6">
                <h2 className="font-bold text-navy-900">{t}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        )}

        {state.kind === "idle" && vinParam && !validation.wellFormed && (
          <p className="rounded-2xl border border-bad/20 bg-bad-bg p-5 text-bad">
            “{vinParam}” isn’t a valid VIN. {validation.errors[0]?.message}
          </p>
        )}

        {state.kind === "loading" && (
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]" aria-busy>
            <div className="space-y-4">
              <div className="h-9 w-2/3 animate-pulse rounded-lg bg-surface" />
              <div className="h-5 w-1/3 animate-pulse rounded bg-surface" />
              <div className="grid grid-cols-2 gap-4 pt-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
                ))}
              </div>
            </div>
            <div className="h-72 animate-pulse rounded-2xl bg-surface" />
            <span className="sr-only">Decoding {state.vin}…</span>
          </div>
        )}

        {state.kind === "error" && (
          <div className="rounded-2xl border border-warn/25 bg-warn-bg p-6 text-warn">
            <p className="font-semibold">{state.message}</p>
            <button onClick={() => router.refresh()} className="mt-3 text-sm font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {state.kind === "done" && !state.vehicle.identified && (
          <div className="rounded-2xl border border-line p-6">
            <h2 className="text-xl font-bold text-navy-900">We couldn’t identify this vehicle</h2>
            <p className="mt-2 text-muted">
              NHTSA didn’t return a year, make and model for <span className="font-mono">{state.vehicle.vin}</span>. Double-check
              the VIN. Vehicles built before 1981 or not sold in the U.S. may not decode.
            </p>
            {state.vehicle.errorText && <p className="mt-3 text-sm text-faint">NHTSA: {state.vehicle.errorText}</p>}
          </div>
        )}

        {state.kind === "done" && state.vehicle.identified && (
          <VehicleResult
            v={state.vehicle}
            checkDigitOk={validation.checkDigitValid}
            recalls={recalls}
            openRecall={openRecall}
            setOpenRecall={setOpenRecall}
          />
        )}
      </div>
    </>
  );
}

function VehicleResult({
  v,
  checkDigitOk,
  recalls,
  openRecall,
  setOpenRecall,
}: {
  v: DecodedVehicle;
  checkDigitOk: boolean | null;
  recalls: RecallState;
  openRecall: string | null;
  setOpenRecall: (id: string | null) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  // Non-breaking hyphen keeps trims like "EX-V6" together on narrow screens.
  const title = [v.year, titleCase(v.make), v.model, v.trim].filter(Boolean).join(" ").replace(/-/g, "\u2011");
  const engine = [
    v.engine.displacementL && `${v.engine.displacementL}L`,
    v.engine.configuration && v.engine.cylinders ? `${v.engine.configuration.replace(/-Shaped/i, "")}${v.engine.cylinders}` : v.engine.cylinders && `${v.engine.cylinders}-cyl`,
    v.engine.horsepower && `${Math.round(Number(v.engine.horsepower))} hp`,
  ]
    .filter(Boolean)
    .join(" · ");
  const trans = [v.transmission.speeds && `${v.transmission.speeds}-speed`, v.transmission.style].filter(Boolean).join(" ");
  const plant = [titleCase(v.plant.city), titleCase(v.plant.state), titleCase(v.plant.country)].filter(Boolean).join(", ");

  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-good-bg px-2.5 py-1 text-xs font-semibold text-good">Decoded</span>
          {checkDigitOk === false && (
            <span className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-semibold text-warn">Check digit mismatch</span>
          )}
          <span className="font-mono text-sm tracking-[0.12em] text-muted">{v.vin}</span>
        </div>
        <h2 className="font-display mt-3 text-3xl font-extrabold text-navy-900 sm:text-4xl">{title}</h2>
        {(v.bodyClass || v.series) && <p className="mt-1 text-muted">{[v.series, v.bodyClass].filter(Boolean).join(" · ")}</p>}

        <dl className="mt-8 grid gap-x-8 sm:grid-cols-2">
          <Spec label="Engine" value={engine || null} />
          <Spec label="Fuel" value={v.engine.fuelType} />
          <Spec label="Transmission" value={trans || null} />
          <Spec label="Drive type" value={v.driveType} />
          <Spec label="Body" value={v.bodyClass} />
          <Spec label="Doors" value={v.doors} />
          <Spec label="Manufacturer" value={titleCase(v.manufacturer)} />
          <Spec label="Assembly plant" value={plant || null} />
          <Spec label="Vehicle type" value={titleCase(v.vehicleType)} />
          <Spec label="GVWR" value={v.gvwr} />
        </dl>
        <p className="mt-4 text-xs text-faint">
          Source: NHTSA vPIC, retrieved {new Date(v.retrievedAt).toLocaleString()}. Decoded values describe how the vehicle
          was built and may not reflect later modifications.
        </p>

        <section aria-labelledby="recalls-h" className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="recalls-h" className="text-xl font-bold text-navy-900">
              Recall campaigns for this model
            </h3>
            {recalls.kind === "done" && (
              <span className="text-sm text-muted">
                {recalls.items.length} campaign{recalls.items.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="mt-2 rounded-xl bg-surface px-4 py-3 text-sm leading-relaxed text-muted">
            These are NHTSA campaigns for the {v.year} {titleCase(v.make)} {v.model} as a whole. Not every vehicle of this
            model is affected, and this does not show whether repairs were completed. Confirm open recalls for this exact
            VIN with the manufacturer or at{" "}
            <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer" className="font-semibold text-blue-600 underline">
              nhtsa.gov/recalls
            </a>
            .
          </p>
          {recalls.kind === "loading" && <div className="mt-4 h-24 animate-pulse rounded-xl bg-surface" />}
          {recalls.kind === "error" && <p className="mt-4 text-sm text-warn">Recall data is temporarily unavailable.</p>}
          {recalls.kind === "done" && recalls.items.length === 0 && (
            <p className="mt-4 text-sm text-muted">NHTSA lists no recall campaigns for this year, make and model.</p>
          )}
          {recalls.kind === "done" && recalls.items.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
              {(showAll ? recalls.items : recalls.items.slice(0, 6)).map((r) => {
                const open = openRecall === r.campaignNumber;
                return (
                  <li key={r.campaignNumber}>
                    <button
                      type="button"
                      onClick={() => setOpenRecall(open ? null : r.campaignNumber)}
                      aria-expanded={open}
                      className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-navy-900">{titleCase(r.component.split(":")[0])}</span>
                        <span className="mt-0.5 block text-xs text-faint">
                          Campaign {r.campaignNumber}
                          {r.reportDate ? ` · ${r.reportDate}` : ""}
                          {r.parkIt ? " · Park it — do not drive" : ""}
                        </span>
                      </span>
                      <span aria-hidden className={`mt-1 text-faint transition-transform ${open ? "rotate-45" : ""}`}>
                        +
                      </span>
                    </button>
                    {open && (
                      <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-muted">
                        <p>{r.summary}</p>
                        {r.consequence && (
                          <p>
                            <strong className="text-navy-900">Risk: </strong>
                            {r.consequence}
                          </p>
                        )}
                        {r.remedy && (
                          <p>
                            <strong className="text-navy-900">Remedy: </strong>
                            {r.remedy}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {recalls.kind === "done" && recalls.items.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="mt-4 text-sm font-semibold text-blue-600 hover:underline"
            >
              {showAll ? "Show fewer" : `Show all ${recalls.items.length} campaigns`}
            </button>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line shadow-card">
          <div className="bg-navy-900 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Vehicle history report</p>
            <p className="font-display mt-2 text-2xl font-extrabold">Check its past before you buy.</p>
          </div>
          <ul className="divide-y divide-line px-6">
            {["Title brands", "Odometer readings", "Insurance total loss", "Theft records"].map((s) => (
              <li key={s} className="flex items-center justify-between py-3.5 text-sm">
                <span className="font-medium text-navy-900">{s}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faint" aria-label="Locked">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </li>
            ))}
          </ul>
          <div className="space-y-3 border-t border-line bg-surface p-6">
            <p className="text-sm text-muted">
              Paid reports aren’t available yet. We’re finalising our data partners so every section is backed by real,
              licensed records.
            </p>
            <Link href="/sample-report" className="block rounded-full bg-navy-900 py-3 text-center text-sm font-semibold text-white hover:bg-navy-800">
              See a sample report
            </Link>
            <Link href="/pricing" className="block text-center text-sm font-semibold text-blue-600 hover:underline">
              View planned pricing
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
