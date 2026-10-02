import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { mapOsmTrails } from "../_shared/mapOsmTrails.ts";
import { buildNominatimSearchUrl } from "../_shared/nominatimSearchUrl.ts";
import type {
  CommonsPhoto,
  OsmElement,
} from "../_shared/openTrailTypes.ts";
import { parseTrailSearchInput } from "../_shared/parseTrailSearchInput.ts";
import { parseZipSearchInput } from "../_shared/parseZipSearchInput.ts";
import type { TrailBounds } from "../../../src/domain/TrailRepository.ts";

const cacheLifetimeMilliseconds = 12 * 60 * 60 * 1000;
const geocodeCacheLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1000;
function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

function isCoordinate(value: unknown): value is { lat: number; lon: number } {
  return (
    isRecord(value) &&
    typeof value.lat === "number" &&
    Number.isFinite(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    typeof value.lon === "number" &&
    Number.isFinite(value.lon) &&
    value.lon >= -180 &&
    value.lon <= 180
  );
}

function isOsmElement(value: unknown): value is OsmElement {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    (value.type !== "node" &&
      value.type !== "way" &&
      value.type !== "relation") ||
    !isStringRecord(value.tags)
  ) {
    return false;
  }

  return isCoordinate(value.center) || isCoordinate(value);
}

function overpassSelectors(): string[] {
  const hiking = [
    'way["highway"~"^(path|footway|bridleway|track)$"]',
    'nwr["route"="hiking"]',
  ];
  const camping = ['nwr["tourism"~"^(camp_site|caravan_site)$"]'];
  const mountainBiking = [
    'nwr["route"="mtb"]',
    'way["mtb:scale"]',
    'way["bicycle"="designated"]',
  ];
  const dirtBiking = [
    'nwr["motorcycle"~"^(designated|yes)$"]',
    'way["dirtbike:scale"]',
  ];
  const snowmobiling = [
    'nwr["route"="snowmobile"]',
    'nwr["snowmobile"~"^(designated|yes)$"]',
  ];

  return [
    ...hiking,
    ...camping,
    ...mountainBiking,
    ...dirtBiking,
    ...snowmobiling,
  ];
}

function buildOverpassQuery(bounds: TrailBounds) {
  const bbox = [
    bounds.south,
    bounds.west,
    bounds.north,
    bounds.east,
  ].join(",");
  const selectors = overpassSelectors()
    .map((selector) => `${selector}(${bbox});`)
    .join("\n");

  return `[out:json][timeout:45];\n(\n${selectors}\n);\nout center;`;
}

function stripHtml(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function commonsPhotosFromResponse(value: unknown): CommonsPhoto[] {
  if (!isRecord(value) || !isRecord(value.query) || !isRecord(value.query.pages)) {
    return [];
  }

  return Object.values(value.query.pages)
    .filter(isRecord)
    .flatMap((page): CommonsPhoto[] => {
      const imageInfo = Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
      const coordinate = Array.isArray(page.coordinates)
        ? page.coordinates[0]
        : null;
      if (!isRecord(imageInfo) || !isRecord(coordinate)) {
        return [];
      }

      const metadata = isRecord(imageInfo.extmetadata)
        ? imageInfo.extmetadata
        : {};
      const imageUrl =
        typeof imageInfo.thumburl === "string"
          ? imageInfo.thumburl
          : imageInfo.url;
      const pageUrl = imageInfo.descriptionurl;
      const creator = stripHtml(
        isRecord(metadata.Artist) ? metadata.Artist.value : "",
      );
      const licenseName = stripHtml(
        isRecord(metadata.LicenseShortName)
          ? metadata.LicenseShortName.value
          : "",
      );
      const licenseUrl =
        isRecord(metadata.LicenseUrl) &&
        typeof metadata.LicenseUrl.value === "string"
          ? metadata.LicenseUrl.value
          : "";

      if (
        typeof imageUrl !== "string" ||
        typeof pageUrl !== "string" ||
        typeof coordinate.lat !== "number" ||
        typeof coordinate.lon !== "number" ||
        !creator ||
        !licenseName ||
        !licenseUrl
      ) {
        return [];
      }

      return [
        {
          imageUrl,
          pageUrl,
          latitude: coordinate.lat,
          longitude: coordinate.lon,
          creator,
          licenseName,
          licenseUrl,
        },
      ];
    });
}

async function cacheKey(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function getOsmElements(
  bounds: TrailBounds,
): Promise<OsmElement[]> {
  const overpassUrl =
    Deno.env.get("OVERPASS_URL") ??
    "https://overpass-api.de/api/interpreter";
  const response = await fetch(overpassUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "TrailFinder/0.1 (student trail discovery project)",
    },
    body: new URLSearchParams({ data: buildOverpassQuery(bounds) }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    console.error("OpenStreetMap trail query failed", response.status);
    throw new Error("OpenStreetMap trail search is temporarily unavailable.");
  }

  const value: unknown = await response.json();
  if (!isRecord(value) || !Array.isArray(value.elements)) {
    throw new Error("OpenStreetMap returned an unexpected response.");
  }

  return value.elements.filter(
    isOsmElement,
  );
}

async function getCommonsPhotos(bounds: TrailBounds): Promise<CommonsPhoto[]> {
  const latitude = (bounds.south + bounds.north) / 2;
  const longitude = (bounds.west + bounds.east) / 2;
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "geosearch",
    ggscoord: `${latitude}|${longitude}`,
    ggsradius: "10000",
    ggslimit: "25",
    prop: "imageinfo|coordinates",
    iiprop: "url|extmetadata",
    iiurlwidth: "640",
    format: "json",
    origin: "*",
  }).toString();

  const response = await fetch(url, {
    headers: {
      "user-agent": "TrailFinder/0.1 (student trail discovery project)",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Wikimedia Commons returned ${response.status}.`);
  }

  return commonsPhotosFromResponse(await response.json());
}

function isValidBounds(value: unknown): value is TrailBounds {
  if (!isRecord(value)) {
    return false;
  }
  const { south, west, north, east } = value;
  return (
    typeof south === "number" &&
    typeof west === "number" &&
    typeof north === "number" &&
    typeof east === "number" &&
    Number.isFinite(south) &&
    Number.isFinite(west) &&
    Number.isFinite(north) &&
    Number.isFinite(east) &&
    south < north &&
    west < east
  );
}

async function geocodePostalCode(
  postalCode: string,
  supabase: ReturnType<typeof createClient>,
): Promise<TrailBounds> {
  const geocodeKey = await cacheKey(`geocode:${postalCode}`);
  const cachedResult = await supabase
    .from("trail_search_cache")
    .select("response")
    .eq("cache_key", geocodeKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cachedResult.error) {
    console.error("Could not read the ZIP-code cache", cachedResult.error);
    throw new Error("Saved ZIP-code search is temporarily unavailable.");
  }
  if (cachedResult.data?.response) {
    const cachedResponse: unknown = cachedResult.data.response;
    if (isRecord(cachedResponse) && isValidBounds(cachedResponse.bounds)) {
      const validatedBounds = parseTrailSearchInput({
        activity: "Hiking",
        bounds: cachedResponse.bounds,
      });
      if (!("error" in validatedBounds)) {
        return validatedBounds.bounds;
      }
    }
    console.error("The cached ZIP-code bounds are invalid.");
  }

  const { data: waitMilliseconds, error: rateLimitError } = await supabase.rpc(
    "reserve_nominatim_slot",
  );
  if (rateLimitError || typeof waitMilliseconds !== "number") {
    console.error("Could not reserve a Nominatim request slot", rateLimitError);
    throw new Error("ZIP-code lookup is temporarily unavailable.");
  }
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, waitMilliseconds)),
  );

  const contactEmail = Deno.env.get("NOMINATIM_EMAIL")?.trim();
  if (!contactEmail) {
    throw new Error("The NOMINATIM_EMAIL Edge Function secret is not configured.");
  }
  const url = buildNominatimSearchUrl(
    Deno.env.get("NOMINATIM_URL") ??
      "https://nominatim.openstreetmap.org/search",
    postalCode,
    contactEmail,
  );

  const response = await fetch(url, {
    headers: {
      "user-agent": "TrailFinder/0.1 (US trail discovery web application)",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    console.error("OpenStreetMap ZIP-code lookup failed", response.status);
    throw new Error("ZIP-code lookup is temporarily unavailable.");
  }

  const value: unknown = await response.json();
  if (!Array.isArray(value) || !isRecord(value[0])) {
    throw new Error("No map area was found for that ZIP code.");
  }

  const geocodeResult = value[0];
  const address = isRecord(geocodeResult.address)
    ? geocodeResult.address
    : {};
  if (
    address.country_code !== "us" ||
    typeof address.postcode !== "string" ||
    !address.postcode.startsWith(postalCode)
  ) {
    throw new Error("No U.S. map area was found for that ZIP code.");
  }
  if (
    !Array.isArray(geocodeResult.boundingbox) ||
    geocodeResult.boundingbox.length !== 4
  ) {
    throw new Error("OpenStreetMap did not return a usable area for that ZIP code.");
  }

  const [south, north, west, east] = geocodeResult.boundingbox.map(Number);
  const validatedBounds = parseTrailSearchInput({
    activity: "Hiking",
    bounds: { south, west, north, east },
  });
  if ("error" in validatedBounds) {
    throw new Error(
      "That ZIP code covers too large an area to search safely. Try a nearby ZIP code.",
    );
  }

  const now = new Date();
  const cacheWrite = await supabase.from("trail_search_cache").upsert({
    cache_key: geocodeKey,
    response: { bounds: validatedBounds.bounds },
    expires_at: new Date(
      now.getTime() + geocodeCacheLifetimeMilliseconds,
    ).toISOString(),
    created_at: now.toISOString(),
  });
  if (cacheWrite.error) {
    console.error("Could not save ZIP-code bounds", cacheWrite.error);
  }

  return validatedBounds.bounds;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST to search by ZIP code." }, 405);
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "The request body must be valid JSON." }, 400);
    }
    if (!isRecord(body)) {
      return jsonResponse({ error: "A JSON search request is required." }, 400);
    }

    const parsedRequest = parseZipSearchInput(body);
    if ("error" in parsedRequest) {
      return jsonResponse({ error: parsedRequest.error }, 400);
    }
    const { postalCode } = parsedRequest;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase Edge Function secrets are not configured.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const bounds = await geocodePostalCode(postalCode, supabase);
    const searchKey = await cacheKey(`trails:${postalCode}`);
    const cacheResult = await supabase
      .from("trail_search_cache")
      .select("response")
      .eq("cache_key", searchKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    const warnings: string[] = [];

    if (cacheResult.error) {
      console.error("Could not read the trail search cache", cacheResult.error);
      warnings.push("This search could not use the saved results cache.");
    } else if (cacheResult.data?.response) {
      const cachedResponse: unknown = cacheResult.data.response;
      if (
        isRecord(cachedResponse) &&
        Array.isArray(cachedResponse.trails) &&
        Array.isArray(cachedResponse.warnings)
      ) {
        return jsonResponse(cachedResponse);
      }
      console.error("The trail search cache contains an invalid response.");
      warnings.push("Saved search data was invalid; fresh results are being loaded.");
    }

    const [osmResult, commonsResult] = await Promise.allSettled([
      getOsmElements(bounds),
      getCommonsPhotos(bounds),
    ]);
    if (osmResult.status === "rejected") {
      throw osmResult.reason;
    }

    let photos: CommonsPhoto[] = [];
    if (commonsResult.status === "fulfilled") {
      photos = commonsResult.value;
    } else {
      const error: unknown = commonsResult.reason;
      console.error("Wikimedia Commons photo search failed", error);
      warnings.push(
        "Nearby Commons photos are temporarily unavailable; trail results are still shown.",
      );
    }

    const trails = mapOsmTrails(osmResult.value, photos, postalCode);
    const updatedAt = new Date();
    if (trails.length > 0) {
      const trailWrite = await supabase.from("trails").upsert(
        trails.map((trail) => ({
          id: trail.id,
          name: trail.name,
          activity: trail.activity,
          location: trail.location,
          distance_miles: trail.distanceMiles,
          difficulty: trail.difficulty,
          latitude: trail.latitude,
          longitude: trail.longitude,
          source_url: trail.sourceUrl,
          photo: trail.photo ?? null,
          updated_at: updatedAt.toISOString(),
        })),
      );
      if (trailWrite.error) {
        console.error("Could not save trail records", trailWrite.error);
        warnings.push("Some trail results could not be added to the catalog.");
      }
    }

    const result = {
      trails,
      bounds,
      postalCode,
      warnings,
      attribution: {
        map: "© OpenStreetMap contributors",
        photos: "Wikimedia Commons",
      },
    };
    const cacheWrite = await supabase.from("trail_search_cache").upsert({
      cache_key: searchKey,
      response: result,
      expires_at: new Date(
        updatedAt.getTime() + cacheLifetimeMilliseconds,
      ).toISOString(),
      created_at: updatedAt.toISOString(),
    });

    if (cacheWrite.error) {
      console.error("Could not save the trail search cache", cacheWrite.error);
      warnings.push("These results could not be saved for faster future searches.");
    }

    return jsonResponse(result);
  } catch (error) {
    console.error("Trail search failed", error);
    return jsonResponse(
      { error: "Trail search failed. Please try again in a moment." },
      500,
    );
  }
});
