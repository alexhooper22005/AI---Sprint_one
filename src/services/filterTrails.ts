import type { Trail, TrailActivity } from "../domain/Trail";

type TrailFilters = {
  activity: TrailActivity | "All activities";
  query: string;
};

export function filterTrails(trails: Trail[], filters: TrailFilters): Trail[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return trails.filter((trail) => {
    const matchesActivity =
      filters.activity === "All activities" ||
      trail.activity === filters.activity;
    const matchesQuery =
      query.length === 0 ||
      trail.name.toLocaleLowerCase().includes(query) ||
      trail.location.toLocaleLowerCase().includes(query);

    return matchesActivity && matchesQuery;
  });
}
