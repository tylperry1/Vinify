import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const indexable = process.env.VINIFY_INDEXABLE === "true";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vinify.example";
  return indexable
    ? { rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/api/"] }], sitemap: `${base}/sitemap.xml` }
    : { rules: [{ userAgent: "*", disallow: "/" }] };
}
