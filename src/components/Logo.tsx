/**
 * Vinify mark — DRAFT pending owner approval (Roadmap Phase 1).
 * A "V" whose right stroke rises past the left like a verified checkmark,
 * set on a rounded tile. Works mono via currentColor at 16px+.
 */
export function VMark({ size = 32, mono = false, className = "" }: { size?: number; mono?: boolean; className?: string }) {
  const id = "vinify-g";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Vinify" className={className}>
      {!mono && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1d4ed8" />
            <stop offset="0.55" stopColor="#2563ff" />
            <stop offset="1" stopColor="#38b6ff" />
          </linearGradient>
        </defs>
      )}
      <rect width="32" height="32" rx="9" fill={mono ? "currentColor" : `url(#${id})`} />
      <path
        d="M8.2 10.4 14.6 22.6a1.6 1.6 0 0 0 2.84-.02L24.9 7.6"
        fill="none"
        stroke={mono ? "var(--mark-knockout, #fff)" : "#fff"}
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ tone = "dark", size = 30 }: { tone?: "dark" | "light"; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <VMark size={size} />
      <span
        className={`font-display text-[1.375rem] font-extrabold leading-none tracking-tight ${
          tone === "light" ? "text-white" : "text-navy-900"
        }`}
      >
        vinify
      </span>
    </span>
  );
}
