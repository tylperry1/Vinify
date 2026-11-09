import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchModelRecalls, mapVpicResult } from "../src/lib/nhtsa";

afterEach(() => vi.unstubAllGlobals());

describe("mapVpicResult", () => {
  it("maps a clean decode and rounds displacement", () => {
    const v = mapVpicResult("1HGCM82633A004352", {
      ModelYear: "2003", Make: "HONDA", Model: "Accord", DisplacementL: "2.998832712",
      EngineCylinders: "6", ErrorCode: "0", Trim: "", PlantCountry: "UNITED STATES (USA)",
    });
    expect(v.identified).toBe(true);
    expect(v.engine.displacementL).toBe("3");
    expect(v.trim).toBeNull();
    expect(v.source).toBe("NHTSA vPIC");
  });
  it("marks unidentified when make/model missing", () => {
    expect(mapVpicResult("X", { ModelYear: "", Make: "", Model: "" }).identified).toBe(false);
  });
});

it("distinguishes an empty recall result from an invalid upstream response", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ results: [] }))
    .mockResolvedValueOnce(Response.json({ message: "Upstream unavailable" }));
  vi.stubGlobal("fetch", fetch);
  await expect(fetchModelRecalls("Honda", "Accord", "2003")).resolves.toEqual([]);
  await expect(fetchModelRecalls("Honda", "Accord", "2003")).rejects.toThrow("invalid response");
});
