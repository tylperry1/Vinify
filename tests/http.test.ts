import { describe, it, expect } from "vitest";
import { readJson, sameOrigin } from "../src/lib/server/http";
describe("request protection", () => {
  it("rejects cross-site and absent origins", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://vinify.example";
    expect(sameOrigin(new Request("https://vinify.example", { headers: { origin: "https://evil.example" } }))).toBe(false);
    expect(sameOrigin(new Request("https://vinify.example"))).toBe(false);
    expect(sameOrigin(new Request("https://vinify.example", { headers: { origin: "https://vinify.example" } }))).toBe(true);
  });
  it("bounds request bodies and requires an object", async () => {
    await expect(readJson(new Request("http://test", { method: "POST", body: JSON.stringify({ a: "x".repeat(100) }) }), 20)).rejects.toThrow("large");
    await expect(readJson(new Request("http://test", { method: "POST", body: "[]" }))).rejects.toThrow("Invalid");
  });
});
