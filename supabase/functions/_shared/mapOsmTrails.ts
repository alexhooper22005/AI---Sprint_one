import type { TrailActivity, TrailDifficulty } from "../../../src/domain/Trail.ts";
import type { CommonsPhoto, OsmElement } from "./openTrailTypes.ts";

const photoRadiusKilometers = 8;

function distanceKilometers(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (second.latitude - first.latitude) * radians;
  const longitudeDelta = (second.longitude - first.longitude) * radians;
  const firstLatitude = first.latitude * radians;
  const secondLatitude = second.latitude * radians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.asin(Math.sqrt(haversine));
}

function activityFromTags(tags: Record<string, string>): TrailActivity | null {
  if (tags.tourism === "camp_site" || tags.tourism === "caravan_site") {
    return "Camping";
  }
  if (tags.route === "snowmobile" || tags.snowmobile === "designated") {
    return "Snowmobiling";
  }
  if (
    tags.route === "mtb" ||
    tags["mtb:scale"] ||
    tags.bicycle === "designated"
  ) {
    return "Mountain biking";
  }
  if (
    tags.motorcycle === "designated" ||
    tags["motorcycle:scale"] ||
    tags["dirtbike:scale"]
  ) {
    return "Dirt biking";
  }
  if (
    tags.route === "hiking" ||
    tags.highway === "path" ||
    tags.highway === "footway" ||
    tags.highway === "bridleway" ||
    tags.highway === "track"
  ) {
    return "Hiking";
  }

  return null;
}

function difficultyFromTags(tags: Record<string, string>): TrailDifficulty {
  const difficulty =
    tags.sac_scale ??
    tags["mtb:scale"] ??
    tags["motorcycle:scale"] ??
    tags["dirtbike:scale"] ??
    "";

  if (
    /difficult|advanced|expert|black|demanding|alpine_hiking/i.test(difficulty)
  ) {
    return "Hard";
  }
  if (/^(easy|hiking|green|0|1)$/i.test(difficulty)) {
    return "Easy";
  }
  return "Moderate";
}

function distanceMilesFromTags(tags: Record<string, string>): number | null {
  const rawDistance = tags.distance ?? tags.length;
  if (!rawDistance) {
    return null;
  }

  const value = Number.parseFloat(rawDistance);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  if (/km|kilomet/i.test(rawDistance)) {
    return Math.round(value * 0.621371 * 10) / 10;
  }
  if (/miles?|mi\b/i.test(rawDistance)) {
    return Math.round(value * 10) / 10;
  }
  if (/^\s*\d+(?:\.\d+)?\s*m\s*$/i.test(rawDistance)) {
    return Math.round((value / 1609.344) * 10) / 10;
  }
  return value;
}

function nearestPhoto(
  center: { latitude: number; longitude: number },
  photos: CommonsPhoto[],
): CommonsPhoto | undefined {
  return photos
    .map((photo) => ({
      photo,
      distance: distanceKilometers(center, photo),
    }))
    .filter(
      ({ photo, distance }) =>
        distance <= photoRadiusKilometers &&
        /^https:\/\//i.test(photo.imageUrl) &&
        /^https:\/\//i.test(photo.pageUrl) &&
        /^https:\/\//i.test(photo.licenseUrl) &&
        photo.creator.trim().length > 0 &&
        photo.licenseName.trim().length > 0,
    )
    .sort((first, second) => first.distance - second.distance)[0]?.photo;
}

export function mapOsmTrails(
  elements: OsmElement[],
  photos: CommonsPhoto[],
  defaultLocation = "Map area",
): OpenTrail[] {
  const trails: OpenTrail[] = [];

  for (const element of elements) {
    const name = element.tags.name?.trim();
    const activity = activityFromTags(element.tags);
    const latitude = element.center?.lat ?? element.lat;
    const longitude = element.center?.lon ?? element.lon;

    if (
      !name ||
      !activity ||
      latitude === undefined ||
      longitude === undefined ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      continue;
    }

    const photo = nearestPhoto({ latitude, longitude }, photos);
    const location =
      element.tags["addr:city"] ??
      element.tags["addr:town"] ??
      element.tags["addr:state"] ??
      element.tags.county ??
      defaultLocation;

    trails.push({
      id: `${element.type}/${element.id}`,
      name,
      activity,
      location,
      distanceMiles: distanceMilesFromTags(element.tags),
      difficulty: difficultyFromTags(element.tags),
      latitude,
      longitude,
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      ...(photo ? { photo } : {}),
    });
  }

  return trails;
}
