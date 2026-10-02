import { describe, expect, it } from "vitest";
import { buildNominatimSearchUrl } from "../../supabase/functions/_shared/nominatimSearchUrl";

describe("buildNominatimSearchUrl", () => {
  it("includes the ZIP search and contact email in the request URL", () => {
    const url = buildNominatimSearchUrl(
      "https://nominatim.openstreetmap.org/search",
      "80202",
      "trails@example.org",
    );

    expect(url.searchParams.get("postalcode")).toBe("80202");
    expect(url.searchParams.get("email")).toBe("trails@example.org");
    expect(url.searchParams.get("country")).toBe("United States");
    expect(url.searchParams.get("countrycodes")).toBe("us");
  });
});
