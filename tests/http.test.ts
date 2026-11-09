import { afterEach, describe, it, expect, vi } from "vitest";
import { readJson, sameOrigin, trustedOrigin } from "../src/lib/server/http";
afterEach(() => vi.unstubAllEnvs());
describe("request protection", () => {
  it("rejects cross-site and absent origins", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://vinify.example");
    expect(sameOrigin(new Request("https://vinify.example", { headers: { origin: "https://evil.example" } }))).toBe(false);
    expect(sameOrigin(new Request("https://vinify.example"))).toBe(false);
    expect(sameOrigin(new Request("https://vinify.example", { headers: { origin: "https://vinify.example" } }))).toBe(true);
  });
  it("accepts exact Vercel preview origins and rejects lookalikes and production aliases", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    vi.stubEnv("VERCEL_URL", "vinify-preview.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "vinify-branch.vercel.app");
    vi.stubEnv("VERCEL_ENV", "preview");
    const request = (origin: string) => new Request("https://vinify-preview.vercel.app", { headers: { origin } });
    expect(trustedOrigin(request("https://vinify-preview.vercel.app"))).toBe("https://vinify-preview.vercel.app");
    expect(trustedOrigin(request("https://vinify-branch.vercel.app"))).toBe("https://vinify-branch.vercel.app");
    expect(trustedOrigin(request("https://vinify-preview.vercel.app.evil.example"))).toBeNull();
    vi.stubEnv("VERCEL_ENV", "production");
    expect(trustedOrigin(request("https://vinify-preview.vercel.app"))).toBeNull();
  });
  it("bounds request bodies and requires an object", async () => {
    await expect(readJson(new Request("http://test", { method: "POST", body: JSON.stringify({ a: "x".repeat(100) }) }), 20)).rejects.toThrow("large");
    await expect(readJson(new Request("http://test", { method: "POST", body: "[]" }))).rejects.toThrow("Invalid");
  });
});
