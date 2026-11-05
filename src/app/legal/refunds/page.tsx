import type { Metadata } from "next";
import { DraftNotice, PageIntro, PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Refund Policy" };

export default function Refunds() {
  return (
    <PageShell>
      <PageIntro eyebrow="Legal" title="Refund Policy" />
      <section className="prose-vinify mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <DraftNotice>
          <strong>Working draft — not in effect.</strong> Final refund terms will be published before paid reports launch.
        </DraftNotice>
        <h2>Reports that fail</h2>
        <p>
          If a report can’t be generated because of a data source or system error, we automatically return the credit or
          refund the purchase.
        </p>
        <h2>Wrong VIN</h2>
        <p>
          We validate VINs and show the decoded vehicle before purchase to help prevent mistakes. If you bought a report
          for the wrong VIN, contact us — we’ll review requests case by case.
        </p>
        <h2>Subscriptions</h2>
        <p>
          You can cancel anytime; access continues to the end of the paid period. Partial-period refunds are under review
          and will be stated here.
        </p>
      </section>
    </PageShell>
  );
}
