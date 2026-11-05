"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { VIN_LENGTH, normalizeVin, validateVin } from "@/lib/vin";

const GROUPS = [
  { label: "Maker", span: 3 },
  { label: "Vehicle", span: 5 },
  { label: "Chk", span: 1 },
  { label: "Yr", span: 1 },
  { label: "Plt", span: 1 },
  { label: "Serial", span: 6 },
];

export function VinSearch({
  tone = "dark",
  initial = "",
  onSubmitVin,
  autoFocus = false,
}: {
  tone?: "dark" | "light";
  initial?: string;
  onSubmitVin?: (vin: string) => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [raw, setRaw] = useState(initial);
  const [touched, setTouched] = useState(false);
  const id = useId();
  const vin = normalizeVin(raw).slice(0, 20);
  const v = useMemo(() => validateVin(vin), [vin]);
  const onDark = tone === "dark";

  const showErrors = touched && v.errors.length > 0;
  const message = showErrors
    ? v.errors.find((e) => e.code !== "empty")?.message ?? v.errors[0].message
    : v.warnings[0]?.message;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!v.wellFormed) return;
    if (onSubmitVin) onSubmitVin(v.vin);
    else router.push(`/decode?vin=${v.vin}`);
  }

  const cells = Array.from({ length: VIN_LENGTH }, (_, i) => vin[i] ?? "");

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor={id} className={`mb-2 block text-sm font-medium ${onDark ? "text-white/70" : "text-muted"}`}>
        Vehicle Identification Number (VIN)
      </label>
      <div
        className={`flex flex-col gap-2 rounded-2xl p-2 sm:flex-row ${
          onDark ? "bg-white shadow-[0_20px_60px_-20px_rgb(37_99_255/0.6)]" : "border border-line bg-white shadow-card"
        }`}
      >
        <input
          id={id}
          name="vin"
          value={vin}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => vin && setTouched(true)}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          maxLength={24}
          placeholder="e.g. 1HGCM82633A004352"
          aria-invalid={showErrors || undefined}
          aria-describedby={`${id}-msg`}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3.5 font-mono text-lg font-semibold uppercase tracking-[0.14em] text-navy-900 placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-faint focus:outline-none sm:text-xl"
        />
        <button
          type="submit"
          className="bg-brand rounded-xl px-6 py-3.5 text-base font-semibold text-white transition hover:brightness-110 active:brightness-95"
        >
          Decode VIN
        </button>
      </div>

      {/* VIN anatomy strip — visual mirror of the input */}
      <div aria-hidden className="mt-4 hidden sm:block">
        <div className="grid grid-cols-17 gap-1" style={{ gridTemplateColumns: "repeat(17, minmax(0, 1fr))" }}>
          {cells.map((c, i) => {
            const bad = c && !/[A-HJ-NPR-Z0-9]/.test(c);
            const isCheck = i === 8;
            const checkState = isCheck && v.wellFormed ? (v.checkDigitValid ? "ok" : "warn") : null;
            return (
              <div
                key={i}
                className={`grid h-9 place-items-center rounded-md font-mono text-sm font-semibold transition-colors ${
                  bad
                    ? "bg-bad text-white"
                    : checkState === "ok"
                      ? "bg-good text-white"
                      : checkState === "warn"
                        ? "bg-warn text-white"
                        : c
                          ? onDark ? "bg-white/15 text-white" : "bg-navy-900 text-white"
                          : onDark ? "bg-white/[0.06] text-white/30" : "bg-surface text-faint"
                }`}
              >
                {c || "·"}
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 grid gap-1" style={{ gridTemplateColumns: "repeat(17, minmax(0, 1fr))" }}>
          {GROUPS.map((g) => (
            <div
              key={g.label}
              style={{ gridColumn: `span ${g.span} / span ${g.span}` }}
              className={`border-t pt-1 text-center text-[11px] font-medium uppercase tracking-wider ${
                onDark ? "border-white/20 text-white/50" : "border-line text-faint"
              }`}
            >
              {g.label}
            </div>
          ))}
        </div>
      </div>

      <p
        id={`${id}-msg`}
        role={showErrors ? "alert" : undefined}
        className={`mt-3 min-h-5 text-sm ${
          showErrors ? (onDark ? "text-[#ffb4ab]" : "text-bad") : message ? (onDark ? "text-amber-200" : "text-warn") : onDark ? "text-white/50" : "text-faint"
        }`}
      >
        {message ?? (
          <>
            <span className="tabular">{vin.length}</span>/17 characters · Find it on the driver-side dash, door jamb, title or
            insurance card.
          </>
        )}
      </p>
    </form>
  );
}
