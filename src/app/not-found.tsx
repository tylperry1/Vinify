import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-5 text-center">
        <div>
          <p className="font-mono text-sm font-semibold text-blue-500">404</p>
          <h1 className="font-display mt-2 text-4xl font-extrabold text-navy-900">This page took a wrong turn.</h1>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-navy-900 px-6 py-3 text-sm font-semibold text-white">
            Back to home
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
