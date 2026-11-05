import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}

export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
        {eyebrow && <p className="text-sm font-semibold text-blue-600">{eyebrow}</p>}
        <h1 className="font-display mt-2 max-w-3xl text-[2.25rem] font-extrabold leading-[1.05] text-navy-900 sm:text-5xl">
          {title}
        </h1>
        {children && <div className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{children}</div>}
      </div>
    </section>
  );
}

export function DraftNotice({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="mb-8 rounded-xl border border-warn/25 bg-warn-bg px-4 py-3 text-sm text-warn">
      {children}
    </div>
  );
}
