import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Vinify",
    short_name: "Vinify",
    description: "Decode a VIN and access your Vinify account.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a1733",
    icons: [
      { src: "/icons/vinify-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/vinify-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/vinify-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
