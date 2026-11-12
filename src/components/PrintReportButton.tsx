"use client";

export function PrintReportButton() {
  return (
    <button type="button" className="admin-button print:hidden" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
