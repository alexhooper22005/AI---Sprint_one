import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trail, TrailActivity, TrailDifficulty } from "../domain/Trail";
import type {
  TrailBounds,
  TrailRepository,
  TrailSearchResult,
} from "../domain/TrailRepository";

const activities: TrailActivity[] = [
  "Hiking",
  "Camping",
  "Dirt biking",
  "Mountain biking",
  "Snowmobiling",
];
const difficulties: TrailDifficulty[] = ["Easy", "Moderate", "Hard"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTrailActivity(value: unknown): value is TrailActivity {
  return typeof value === "string" && activities.some((item) => item === value);
}

function isTrailDifficulty(value: unknown): value is TrailDifficulty {
  return typeof value === "string" && difficulties.some((item) => item === value);
}

function isPhoto(value: unknown): boolean {
  return (
    value === undefined ||
    (isRecord(value) &&
      typeof value.imageUrl === "string" &&
      value.imageUrl.startsWith("https://") &&
      typeof value.pageUrl === "string" &&
      value.pageUrl.startsWith("https://") &&
      typeof value.creator === "string" &&
      typeof value.licenseName === "string" &&
      typeof value.licenseUrl === "string" &&
      value.licenseUrl.startsWith("https://"))
  );
}

function isTrail(value: unknown): value is Trail {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isTrailActivity(value.activity) &&
    typeof value.location === "string" &&
    (value.distanceMiles === null ||
      (typeof value.distanceMiles === "number" &&
        Number.isFinite(value.distanceMiles) &&
        value.distanceMiles >= 0)) &&
    isTrailDifficulty(value.difficulty) &&
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180 &&
    typeof value.sourceUrl === "string" &&
    value.sourceUrl.startsWith("https://") &&
    isPhoto(value.photo)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isBounds(value: unknown): value is TrailBounds {
  return (
    isRecord(value) &&
    typeof value.south === "number" &&
    Number.isFinite(value.south) &&
    value.south >= -90 &&
    typeof value.west === "number" &&
    Number.isFinite(value.west) &&
    value.west >= -180 &&
    typeof value.north === "number" &&
    Number.isFinite(value.north) &&
    value.north <= 90 &&
    typeof value.east === "number" &&
    Number.isFinite(value.east) &&
    value.east <= 180 &&
    value.south < value.north &&
    value.west < value.east &&
    value.north - value.south <= 2 &&
    value.east - value.west <= 2 &&
    (value.north - value.south) * (value.east - value.west) <= 3
  );
}

function parseSearchResult(value: unknown): TrailSearchResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.trails) ||
    !value.trails.every(isTrail) ||
    !isStringArray(value.warnings) ||
    !isBounds(value.bounds)
  ) {
    throw new Error("The trail service returned data in an unexpected format.");
  }

  return {
    trails: value.trails,
    bounds: value.bounds,
    warnings: value.warnings,
  };
}

export function createSupabaseTrailRepository(
  client: SupabaseClient,
): TrailRepository {
  return {
    async searchByPostalCode(postalCode: string) {
      const { data, error } = await client.functions.invoke("search-trails", {
        body: { postalCode },
      });

      if (error) {
        throw new Error(`Trail search failed: ${error.message}`);
      }

      return parseSearchResult(data);
    },
  };
}
