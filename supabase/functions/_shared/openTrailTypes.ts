import type { Trail } from "../../../src/domain/Trail.ts";

export type OsmElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags: Record<string, string>;
};

export type CommonsPhoto = NonNullable<Trail["photo"]> & {
  latitude: number;
  longitude: number;
};

export type OpenTrail = Trail & {
  latitude: number;
  longitude: number;
  sourceUrl: string;
};
