import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/PageShell";
import { ReportView } from "@/components/ReportView";
import { SAMPLE_VIN, sampleReport } from "@/lib/providers/sample";

export const metadata: Metadata = { title: "Sample Vehicle History Report", description: "See what a Vinify vehicle history report looks like." };

export default function SampleReportPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Sample report" title="Here’s what you’ll get.">
        Every section shows its status, so you can see what was found, what came back clean, and what this report
        doesn’t cover.
      </PageIntro>
      <section className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <p role="note" className="mb-6 rounded-xl border border-warn/25 bg-warn-bg px-4 py-3 text-sm text-warn">
          <strong>Illustration only.</strong> The history events below are fictional and do not describe any real
          vehicle. The specifications match NHTSA’s decode of VIN {SAMPLE_VIN}.
        </p>
        <ReportView
          report={sampleReport()}
          vehicle={{ title: "2003 Honda Accord EX-V6", subtitle: "Coupe · 3.0L V6 · 240 hp · 5-speed automatic" }}
          reportNumber="VNF-SMPL-0001"
          generatedAt="Nov 5, 2026"
        />
      </section>
    </PageShell>
  );
}
