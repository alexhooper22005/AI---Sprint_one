import { describe, expect, it } from "vitest";
import { parseTrailSearchInput } from "../../supabase/functions/_shared/parseTrailSearchInput";

describe("parseTrailSearchInput", () => {
  it("accepts a valid activity and local map area", () => {
    expect(
      parseTrailSearchInput({
        activity: "Hiking",
        bounds: { south: 39.6, west: -105.3, north: 39.9, east: -105 },
      }),
    ).toEqual({
      activity: "Hiking",
      bounds: { south: 39.6, west: -105.3, north: 39.9, east: -105 },
    });
  });

  it("rejects wide areas before sending them to public data services", () => {
    expect(
      parseTrailSearchInput({
        activity: "All activities",
        bounds: { south: 24, west: -125, north: 49, east: -66 },
      }),
    ).toEqual({
      error: "Zoom in to a smaller map area before searching.",
    });
  });

  it("rejects malformed bounds and unsupported activities", () => {
    expect(
      parseTrailSearchInput({
        activity: "Skiing",
        bounds: { south: 5, west: 10, north: 4, east: 11 },
      }),
    ).toEqual({
      error: "Search requires a supported activity and valid map bounds.",
    });
  });
});
