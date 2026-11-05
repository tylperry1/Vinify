import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// STATIC_EXPORT=1 produces a static preview build (out/). Production on Vercel uses the normal server build.
const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(isStatic
    ? { output: "export", images: { unoptimized: true }, trailingSlash: true }
    : { headers: async () => [{ source: "/:path*", headers: securityHeaders }] }),
};

export default nextConfig;
