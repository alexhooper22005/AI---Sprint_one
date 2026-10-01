export const trailActivities = [
  "Hiking",
  "Camping",
  "Dirt biking",
  "Mountain biking",
  "Snowmobiling",
] as const;

export type TrailActivity = (typeof trailActivities)[number];
export type TrailDifficulty = "Easy" | "Moderate" | "Hard";

export type Trail = {
  id: string;
  name: string;
  activity: TrailActivity;
  location: string;
  distanceMiles: number | null;
  difficulty: TrailDifficulty;
  latitude?: number;
  longitude?: number;
  sourceUrl?: string;
  photo?: {
    imageUrl: string;
    pageUrl: string;
    creator: string;
    licenseName: string;
    licenseUrl: string;
  };
};
