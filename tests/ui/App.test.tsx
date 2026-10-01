import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Trail } from "../../src/domain/Trail";
import type { TrailRepository } from "../../src/domain/TrailRepository";
import App from "../../src/ui/App";

vi.mock("../../src/ui/TrailMap", () => ({
  default: ({ trails }: { trails: Trail[] }) => (
    <div aria-label="Map results">
      {trails.map((trail) => (
        <span key={trail.id}>{trail.name}</span>
      ))}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const trails: Trail[] = [
  {
    id: "way/901",
    name: "Bear Creek Trail",
    activity: "Hiking",
    location: "Colorado",
    distanceMiles: 3.2,
    difficulty: "Moderate",
    latitude: 39.75,
    longitude: -105.2,
    sourceUrl: "https://www.openstreetmap.org/way/901",
    photo: {
      imageUrl: "https://upload.wikimedia.org/trail.jpg",
      pageUrl: "https://commons.wikimedia.org/wiki/File:Bear_Creek.jpg",
      creator: "Alex Photographer",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  {
    id: "way/902",
    name: "Ridge Run",
    activity: "Mountain biking",
    location: "Colorado",
    distanceMiles: 8.4,
    difficulty: "Hard",
    latitude: 39.76,
    longitude: -105.19,
    sourceUrl: "https://www.openstreetmap.org/way/902",
  },
];

function makeRepository(
  searchByPostalCode: TrailRepository["searchByPostalCode"] = vi.fn().mockResolvedValue({
    trails,
    bounds: { south: 39.6, west: -105.3, north: 39.9, east: -105 },
    warnings: [],
  }),
): TrailRepository {
  return { searchByPostalCode };
}

describe("App", () => {
  it("searches a ZIP code and puts all returned trails on the map", async () => {
    const repository = makeRepository();
    render(<App repository={repository} configurationError={null} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ZIP code" }), {
      target: { value: "80202" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search ZIP code" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Bear Creek Trail" }),
      ).toBeTruthy();
    });
    expect(repository.searchByPostalCode).toHaveBeenCalledWith("80202");
    expect(screen.getByLabelText("Map results").textContent).toContain(
      "Bear Creek Trail",
    );
    expect(screen.getByLabelText("Map results").textContent).toContain(
      "Ridge Run",
    );
  });

  it("filters the ZIP code results by activity without searching again", async () => {
    const repository = makeRepository();
    render(<App repository={repository} configurationError={null} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ZIP code" }), {
      target: { value: "80202" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search ZIP code" }));
    await screen.findByRole("heading", { name: "Bear Creek Trail" });

    fireEvent.click(screen.getByRole("button", { name: "Mountain biking" }));

    expect(screen.getByRole("heading", { name: "Ridge Run" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Bear Creek Trail" })).toBeNull();
    expect(screen.getByLabelText("Map results").textContent).toContain("Ridge Run");
    expect(screen.getByLabelText("Map results").textContent).not.toContain(
      "Bear Creek Trail",
    );
    expect(repository.searchByPostalCode).toHaveBeenCalledTimes(1);
  });

  it("filters loaded trails by name and can clear that filter", async () => {
    render(<App repository={makeRepository()} configurationError={null} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ZIP code" }), {
      target: { value: "80202" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search ZIP code" }));
    await screen.findByRole("heading", { name: "Bear Creek Trail" });

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Filter trails by name" }),
      { target: { value: "Bear" } },
    );

    expect(screen.getByRole("heading", { name: "Bear Creek Trail" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Ridge Run" })).toBeNull();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Filter trails by name" }),
      { target: { value: "Atlantis" } },
    );
    expect(
      screen.getByRole("heading", { name: "No trails match your search" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("heading", { name: "Bear Creek Trail" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ridge Run" })).toBeTruthy();
  });

  it("rejects an invalid ZIP code without calling the trail service", () => {
    const repository = makeRepository();
    render(<App repository={repository} configurationError={null} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ZIP code" }), {
      target: { value: "ABCDE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search ZIP code" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "Enter a valid five-digit U.S. ZIP code.",
    );
    expect(repository.searchByPostalCode).not.toHaveBeenCalled();
  });

  it("explains when the live trail service is not configured", () => {
    render(<App repository={null} configurationError={null} />);

    expect(
      screen.getByRole("heading", { name: "Find your next trail" }),
    ).toBeTruthy();
    expect(screen.getByText(/Connect Supabase to explore live trails/)).toBeTruthy();
    expect(screen.queryByText(/0 places to explore/)).toBeNull();
  });

  it("keeps search clickable without Supabase and explains how to connect", () => {
    render(<App repository={null} configurationError={null} />);

    expect(
      (screen.getByRole("button", { name: "Search ZIP code" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    fireEvent.change(screen.getByRole("searchbox", { name: "ZIP code" }), {
      target: { value: "80202" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search ZIP code" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "Connect a hosted Supabase project",
    );
    expect(screen.queryByText(/0 places to explore/)).toBeNull();
  });

  it("shows trail service failures instead of hiding them", async () => {
    const repository = makeRepository(
      vi.fn().mockRejectedValue(new Error("Trail search is unavailable.")),
    );
    render(<App repository={repository} configurationError={null} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ZIP code" }), {
      target: { value: "80202" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search ZIP code" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Trail search is unavailable.",
    );
  });
});
