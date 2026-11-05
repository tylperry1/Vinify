import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function Account() {
  return (
    <PageShell>
      <section className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-5 py-16">
        <div className="w-full rounded-[var(--radius-card)] border border-line p-8 text-center shadow-card">
          <h1 className="font-display text-2xl font-extrabold text-navy-900">Accounts open at launch</h1>
          <p className="mt-3 text-muted">
            Sign-in, saved vehicles and your report library will be available when paid reports go live.
          </p>
          <Link href="/decode" className="mt-6 inline-flex rounded-full bg-navy-900 px-6 py-3 text-sm font-semibold text-white">
            Use the free decoder
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
