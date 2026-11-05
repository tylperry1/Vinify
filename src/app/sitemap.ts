import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vinify.example";
const ROUTES = ["", "/decode", "/sample-report", "/pricing", "/how-it-works", "/about", "/contact", "/faq", "/data-coverage", "/legal/privacy", "/legal/terms", "/legal/refunds"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((r) => ({ url: `${BASE}${r}`, changeFrequency: "weekly", priority: r === "" ? 1 : 0.6 }));
}
