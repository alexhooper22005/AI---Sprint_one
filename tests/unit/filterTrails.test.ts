import { describe, expect, it } from "vitest";
import { filterTrails } from "../../src/services/filterTrails";
import type { Trail } from "../../src/domain/Trail";

const trails: Trail[] = [
  {
    id: "pine-loop",
    name: "Pine Loop",
    activity: "Hiking",
    location: "Evergreen Valley",
    distanceMiles: 4.2,
    difficulty: "Moderate",
  },
  {
    id: "ridge-run",
    name: "Ridge Run",
    activity: "Mountain biking",
    location: "Granite Ridge",
    distanceMiles: 8.4,
    difficulty: "Hard",
  },
];

describe("filterTrails", () => {
  it("returns only trails in the selected activity", () => {
    expect(filterTrails(trails, { activity: "Hiking", query: "" })).toEqual([
      trails[0],
    ]);
  });

  it("matches a trail name without case sensitivity", () => {
    expect(filterTrails(trails, { activity: "All activities", query: "PINE" })).toEqual([
      trails[0],
    ]);
  });
});
