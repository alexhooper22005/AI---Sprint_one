import { trailActivities } from "../../../src/domain/Trail.ts";
import type { TrailActivity } from "../../../src/domain/Trail.ts";
import type { TrailBounds } from "../../../src/domain/TrailRepository.ts";

export type TrailSearchInput = {
  activity: TrailActivity | "All activities";
  bounds: TrailBounds;
};

type TrailSearchInputResult =
  | TrailSearchInput
  | { error: string };

const allActivities = ["All activities", ...trailActivities] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBounds(value: unknown): value is TrailBounds {
  if (!isRecord(value)) {
    return false;
  }

  const { south, west, north, east } = value;
  if (
    typeof south !== "number" ||
    typeof west !== "number" ||
    typeof north !== "number" ||
    typeof east !== "number" ||
    ![south, west, north, east].every(Number.isFinite) ||
    south < -90 ||
    north > 90 ||
    west < -180 ||
    east > 180 ||
    south >= north ||
    west >= east
  ) {
    return false;
  }

  const height = north - south;
  const width = east - west;
  return height <= 2 && width <= 2 && height * width <= 3;
}

function isActivity(
  value: unknown,
): value is TrailSearchInput["activity"] {
  return (
    typeof value === "string" &&
    allActivities.some((activity) => activity === value)
  );
}

export function parseTrailSearchInput(
  value: unknown,
): TrailSearchInputResult {
  if (!isRecord(value)) {
    return {
      error: "Search requires a supported activity and valid map bounds.",
    };
  }

  if (!isActivity(value.activity)) {
    return {
      error: "Search requires a supported activity and valid map bounds.",
    };
  }

  if (!isBounds(value.bounds)) {
    return {
      error: "Zoom in to a smaller map area before searching.",
    };
  }

  return {
    activity: value.activity,
    bounds: value.bounds,
  };
}
