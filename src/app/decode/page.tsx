import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { DecodeClient } from "./DecodeClient";

export const metadata: Metadata = {
  title: "Free VIN Decoder",
  description: "Decode any 17-character VIN for free: year, make, model, engine, transmission, plant and NHTSA recall campaigns.",
};

export default function DecodePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-6xl px-5 py-16 sm:px-8" />}>
        <DecodeClient />
      </Suspense>
    </PageShell>
  );
}
