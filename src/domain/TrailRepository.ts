import type { Trail } from "./Trail";

export type TrailBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type TrailSearchResult = {
  trails: Trail[];
  bounds: TrailBounds;
  warnings: string[];
};

export interface TrailRepository {
  searchByPostalCode(postalCode: string): Promise<TrailSearchResult>;
}
