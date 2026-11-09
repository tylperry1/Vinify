import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { ReportView } from "@/components/ReportView";
import { PageShell } from "@/components/PageShell";
import { PrintReportButton } from "@/components/PrintReportButton";
import type { NormalizedReport } from "@/lib/providers/types";
export const dynamic = "force-dynamic";
export default async function Report({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) redirect("/account/login");
  const { id } = await params;
  const report = await db.report.findFirst({ where: { publicId: id, userId: user.id } });
  if (!report) notFound();
  return (
    <PageShell>
      <section aria-label="Vehicle history report" className="report-print mx-auto max-w-5xl px-6 py-12 print:max-w-none print:p-0">
        <div className="mb-5 flex justify-end print:hidden">
          <PrintReportButton />
        </div>
        <ReportView
          report={report.data as unknown as NormalizedReport}
          vehicle={{ title: report.vin, subtitle: report.provider }}
          reportNumber={report.publicId}
          generatedAt={report.generatedAt.toISOString()}
        />
      </section>
    </PageShell>
  );
}
