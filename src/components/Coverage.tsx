import type { CoverageStatus } from "@/lib/providers/types";

export const COVERAGE_META: Record<CoverageStatus, { label: string; cls: string; dot: string; help: string }> = {
  reported: {
    label: "Records found",
    cls: "bg-[#e8efff] text-blue-600",
    dot: "bg-blue-500",
    help: "The data source returned records for this section.",
  },
  no_records: {
    label: "No records found",
    cls: "bg-good-bg text-good",
    dot: "bg-good",
    help: "The source was checked and returned nothing. That is not a guarantee nothing happened.",
  },
  not_covered: {
    label: "Not included",
    cls: "bg-surface text-muted",
    dot: "bg-faint",
    help: "This report’s data sources don’t cover this category.",
  },
  unavailable: {
    label: "Temporarily unavailable",
    cls: "bg-warn-bg text-warn",
    dot: "bg-warn",
    help: "The source didn’t respond. We’ll retry or restore your credit.",
  },
};

export function CoverageBadge({ status }: { status: CoverageStatus }) {
  const m = COVERAGE_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden />
      {m.label}
    </span>
  );
}
