import type { Metadata } from "next";
import { DraftNotice, PageIntro, PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <PageShell>
      <PageIntro eyebrow="Legal" title="Terms of Service" />
      <section className="prose-vinify mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <DraftNotice>
          <strong>Working draft — not in effect.</strong> These terms have not been reviewed by a lawyer and will be
          finalised before Vinify accepts accounts or payments.
        </DraftNotice>
        <h2>The service</h2>
        <p>
          Vinify provides VIN decoding and, once launched, vehicle history reports compiled from third-party data
          sources. Reports reflect only information reported to those sources and may be incomplete.
        </p>
        <h2>No guarantee of vehicle condition</h2>
        <p>
          A report is not a vehicle inspection, warranty or guarantee. Use it alongside an independent mechanical
          inspection and your own judgement.
        </p>
        <h2>Acceptable use</h2>
        <ul>
          <li>Use Vinify for lawful purposes related to evaluating vehicles.</li>
          <li>Don’t resell reports, run automated bulk lookups, or try to bypass usage limits without a business agreement.</li>
          <li>Don’t use Vinify to locate or identify individuals.</li>
        </ul>
        <h2>Subscriptions</h2>
        <p>
          Plan details, renewal terms, credit rollover and cancellation rules will be shown clearly before checkout.
        </p>
        <h2>Limitation of liability</h2>
        <p>To be completed following legal review.</p>
      </section>
    </PageShell>
  );
}
