import Link from "next/link";
import { Logo } from "./Logo";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/decode", label: "Free VIN decoder" },
      { href: "/sample-report", label: "Sample report" },
      { href: "/pricing", label: "Pricing" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Vinify" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
      { href: "/data-coverage", label: "Data coverage" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/refunds", label: "Refund Policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">Vehicle History. Made Simple.</p>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            Free vehicle specifications and recall campaigns come from the U.S. National Highway Traffic Safety
            Administration (NHTSA). Vinify is not affiliated with NHTSA or CARFAX.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">{c.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted transition-colors hover:text-navy-900">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} Vinify. All rights reserved.</span>
          <span>Pre-launch preview · paid reports are not yet available</span>
        </div>
      </div>
    </footer>
  );
}
