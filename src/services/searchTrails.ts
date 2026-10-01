import type { TrailRepository } from "../domain/TrailRepository";

export function searchTrails(
  repository: TrailRepository,
  postalCode: string,
) {
  return repository.searchByPostalCode(postalCode);
}
