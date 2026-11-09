"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const NAV = [
  { href: "/decode", label: "Free VIN decoder" },
  { href: "/sample-report", label: "Sample report" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  const onDark = tone === "dark";

  return (
    <header className={`relative z-30 ${onDark ? "" : "border-b border-line bg-white/85 backdrop-blur"}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Vinify home" className="shrink-0">
          <Logo tone={onDark ? "light" : "dark"} />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  onDark
                    ? active ? "text-white" : "text-white/70 hover:text-white"
                    : active ? "text-navy-900" : "text-muted hover:text-navy-900"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/account/login"
            className={`rounded-full px-4 py-2 text-sm font-medium ${onDark ? "text-white/80 hover:text-white" : "text-muted hover:text-navy-900"}`}
          >
            Sign in
          </Link>
          <Link
            href="/decode"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              onDark ? "bg-white text-navy-900 hover:bg-sky-300/90" : "bg-navy-900 text-white hover:bg-navy-800"
            }`}
          >
            Check a VIN
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className={`-mr-2 grid h-11 w-11 place-items-center rounded-full lg:hidden ${onDark ? "text-white" : "text-navy-900"}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="absolute inset-x-0 top-16 border-b border-line bg-white px-5 pb-6 pt-2 shadow-lift lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="border-b border-line py-3.5 text-base font-medium text-navy-900">
                {n.label}
              </Link>
            ))}
            <Link href="/account/login" className="border-b border-line py-3.5 text-base font-medium text-navy-900">
              Sign in
            </Link>
          </nav>
          <Link href="/decode" className="mt-5 block rounded-full bg-navy-900 py-3 text-center font-semibold text-white">
            Check a VIN
          </Link>
        </div>
      )}
    </header>
  );
}
