import { describe, expect, it } from "vitest";
import { mapOsmTrails } from "../../supabase/functions/_shared/mapOsmTrails";
import type {
  CommonsPhoto,
  OsmElement,
} from "../../supabase/functions/_shared/openTrailTypes";

const osmElements: OsmElement[] = [
  {
    id: 901,
    type: "way",
    center: { lat: 39.75, lon: -105.2 },
    tags: {
      name: "Bear Creek Trail",
      highway: "path",
      sac_scale: "hiking",
      surface: "dirt",
    },
  },
  {
    id: 902,
    type: "node",
    lat: 39.8,
    lon: -105.1,
    tags: {
      tourism: "camp_site",
      name: "Bear Creek Camp",
    },
  },
  {
    id: 903,
    type: "way",
    center: { lat: 39.76, lon: -105.19 },
    tags: { highway: "path" },
  },
];

const commonsPhotos: CommonsPhoto[] = [
  {
    imageUrl: "https://upload.wikimedia.org/trail.jpg",
    pageUrl: "https://commons.wikimedia.org/wiki/File:Bear_Creek.jpg",
    latitude: 39.751,
    longitude: -105.201,
    creator: "Alex Photographer",
    licenseName: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
];

describe("mapOsmTrails", () => {
  it("maps trail and camp features and attaches nearby attributed photos", () => {
    const trails = mapOsmTrails(osmElements, commonsPhotos);

    expect(trails).toHaveLength(2);
    expect(trails[0]).toMatchObject({
      id: "way/901",
      name: "Bear Creek Trail",
      activity: "Hiking",
      latitude: 39.75,
      longitude: -105.2,
      photo: {
        creator: "Alex Photographer",
        licenseName: "CC BY-SA 4.0",
        pageUrl: "https://commons.wikimedia.org/wiki/File:Bear_Creek.jpg",
      },
    });
    expect(trails[1]).toMatchObject({
      id: "node/902",
      name: "Bear Creek Camp",
      activity: "Camping",
    });
    expect(trails[0].location).toBe("Map area");
  });

  it("does not attach a photo that is outside the nearby-photo radius", () => {
    const trails = mapOsmTrails(osmElements, [
      { ...commonsPhotos[0], latitude: 40.5 },
    ]);

    expect(trails[0].photo).toBeUndefined();
  });

  it("does not include unnamed or unsupported map features", () => {
    expect(
      mapOsmTrails(
        [
          { id: 904, type: "way", center: { lat: 39, lon: -105 }, tags: { highway: "path" } },
          { id: 905, type: "node", lat: 39, lon: -105, tags: { name: "Coffee Shop" } },
        ],
        [],
      ),
    ).toEqual([]);
  });

  it("does not return features with invalid map coordinates", () => {
    expect(
      mapOsmTrails(
        [
          {
            id: 906,
            type: "node",
            lat: 91,
            lon: -105,
            tags: { name: "Outside the map", highway: "path" },
          },
        ],
        [],
      ),
    ).toEqual([]);
  });

  it("uses the searched ZIP code when a trail has no address labels", () => {
    const [trail] = mapOsmTrails(osmElements.slice(0, 1), [], "80202");

    expect(trail.location).toBe("80202");
  });

  it("does not label mountain hiking as easy hiking", () => {
    const [trail] = mapOsmTrails(
      [
        {
          id: 907,
          type: "way",
          center: { lat: 39, lon: -105 },
          tags: {
            name: "High Country Trail",
            highway: "path",
            sac_scale: "mountain_hiking",
          },
        },
      ],
      [],
    );

    expect(trail.difficulty).toBe("Moderate");
  });
});
