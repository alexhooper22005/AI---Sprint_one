import { useEffect, useRef, useState, type FormEvent } from "react";
import { trailActivities, type Trail, type TrailActivity } from "../domain/Trail";
import type { TrailBounds, TrailRepository } from "../domain/TrailRepository";
import { filterTrails } from "../services/filterTrails";
import { searchTrails } from "../services/searchTrails";
import TrailMap from "./TrailMap";

type AppProps = {
  repository: TrailRepository | null;
  configurationError: string | null;
};

const activityStyles: Record<TrailActivity, string> = {
  Hiking: "hiking",
  Camping: "camping",
  "Dirt biking": "dirt-biking",
  "Mountain biking": "mountain-biking",
  Snowmobiling: "snowmobiling",
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Trail search failed. Please try again.";
}

export default function App({ repository, configurationError }: AppProps) {
  const [activity, setActivity] = useState<TrailActivity | "All activities">(
    "All activities",
  );
  const [query, setQuery] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [searchedPostalCode, setSearchedPostalCode] = useState<string | null>(
    null,
  );
  const [trails, setTrails] = useState<Trail[]>([]);
  const [searchBounds, setSearchBounds] = useState<TrailBounds | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const requestId = useRef(0);
  const filteredTrails = filterTrails(trails, { activity, query });

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPostalCode = postalCode.trim();

    if (!/^\d{5}(?:-\d{4})?$/.test(normalizedPostalCode)) {
      setSearchError("Enter a valid five-digit U.S. ZIP code.");
      return;
    }
    if (!repository) {
      setSearchError(
        configurationError ??
          "Live search is not connected yet. Follow the “Connect a hosted Supabase project” steps in README.md, then restart the app.",
      );
      return;
    }

    const currentRequestId = ++requestId.current;
    setIsSearching(true);
    setSearchError(null);
    setWarnings([]);
    setTrails([]);
    setSearchBounds(null);
    setSearchedPostalCode(null);

    void searchTrails(repository, normalizedPostalCode)
      .then((result) => {
        if (requestId.current !== currentRequestId) {
          return;
        }
        setTrails(result.trails);
        setSearchBounds(result.bounds);
        setWarnings(result.warnings);
        setSearchedPostalCode(normalizedPostalCode.slice(0, 5));
      })
      .catch((error: unknown) => {
        if (requestId.current !== currentRequestId) {
          return;
        }
        setTrails([]);
        setSearchBounds(null);
        setSearchedPostalCode(null);
        setSearchError(getErrorMessage(error));
      })
      .finally(() => {
        if (requestId.current === currentRequestId) {
          setIsSearching(false);
        }
      });
  }

  function clearFilters() {
    setActivity("All activities");
    setQuery("");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Trail Finder home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M4 25 13 8l5 9 3-5 7 13H4Z" />
              <path d="m10 25 6-11 7 11" />
            </svg>
          </span>
          <span>trailfinder</span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a className="site-nav__link site-nav__link--active" href="#explore">
            Explore
          </a>
          <a className="site-nav__link" href="#about">
            About
          </a>
        </nav>
        <a className="header-action" href="#explore">
          Find a trail <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        <section className="hero" id="explore">
          <div className="hero__content">
            <p className="eyebrow">
              <span className="eyebrow__line" />
              YOUR NEXT GREAT OUTDOORS DAY
            </p>
            <h1>
              Find your
              <br />
              <span>kind of wild.</span>
            </h1>
            <p className="hero__description">
              Enter a ZIP code to find nearby places to hike, camp, bike, and
              ride.
            </p>
          </div>
          <div className="hero__art" aria-hidden="true">
            <div className="sun" />
            <div className="mountain mountain--back" />
            <div className="mountain mountain--middle" />
            <div className="mountain mountain--front" />
            <div className="hero__art-label">
              <span className="hero__art-dot" />
              THE OUTSIDE IS CALLING
            </div>
          </div>
        </section>

        <section className="discovery" aria-labelledby="discovery-title">
          <div className="discovery__intro">
            <div>
              <p className="section-kicker">GET OUT THERE</p>
              <h2 id="discovery-title">Find your next trail</h2>
            </div>
            <p className="demo-notice">
              <span aria-hidden="true">i</span>
              OpenStreetMap trails · Wikimedia Commons photos
            </p>
          </div>

          {!repository && (
            <div className="setup-notice" role="status">
              <strong>
                {configurationError
                  ? "Supabase setup needs attention"
                  : "Connect Supabase to explore live trails"}
              </strong>
              <span>
                {configurationError ??
                  "Create a Supabase project, then follow the setup steps in README.md."}
              </span>
            </div>
          )}

          <form className="zip-search" onSubmit={handleSearch}>
            <label className="search-box">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                type="search"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={10}
                aria-label="ZIP code"
                placeholder="Enter a ZIP code (e.g. 80202)"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
              />
            </label>
            <button
              className="zip-search__button"
              type="submit"
              disabled={isSearching}
            >
              {isSearching ? "Searching…" : "Search ZIP code"}
            </button>
          </form>
          <p className="zip-search__hint">
            Search trails around a U.S. ZIP code. ZIP areas are approximate.
          </p>

          <label className="search-box trail-name-search">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              aria-label="Filter trails by name"
              placeholder="Filter loaded trails by name or location"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="activity-filters" aria-label="Filter by activity">
            <button
              className={`filter-chip${activity === "All activities" ? " filter-chip--active" : ""}`}
              type="button"
              aria-pressed={activity === "All activities"}
              onClick={() => setActivity("All activities")}
            >
              All trails
            </button>
            {trailActivities.map((trailActivity) => (
              <button
                className={`filter-chip${activity === trailActivity ? " filter-chip--active" : ""}`}
                type="button"
                aria-pressed={activity === trailActivity}
                key={trailActivity}
                onClick={() => setActivity(trailActivity)}
              >
                {trailActivity}
              </button>
            ))}
          </div>

          <div className="map-heading">
            <div>
              <h3>
                {searchedPostalCode
                  ? `Trails near ${searchedPostalCode}`
                  : "Explore the map"}
              </h3>
              <p>
                {searchedPostalCode
                  ? "Choose a filter to narrow the trails shown."
                  : "Enter a ZIP code to find and map nearby trails."}
              </p>
            </div>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              © OpenStreetMap contributors
            </a>
          </div>
          <div className="map-frame">
            <TrailMap trails={filteredTrails} searchBounds={searchBounds} />
          </div>

          {searchError && (
            <p className="error-notice" role="alert">
              {searchError}
            </p>
          )}
          {warnings.map((warning) => (
            <p className="warning-notice" role="status" key={warning}>
              {warning}
            </p>
          ))}

          {(searchedPostalCode || isSearching) && (
            <div className="results-summary" aria-live="polite">
              <p>
                <strong>{filteredTrails.length}</strong>{" "}
                {filteredTrails.length === 1 ? "place" : "places"} to explore
              </p>
              <span>
                {isSearching
                  ? "SEARCHING THIS ZIP CODE"
                  : "FRESH AIR, YOUR WAY"}
              </span>
            </div>
          )}

          {filteredTrails.length > 0 ? (
            <div className="trail-grid">
              {filteredTrails.map((trail, index) => (
                <article
                  className="trail-card"
                  key={trail.id}
                  aria-labelledby={`trail-${trail.id}`}
                >
                  <div
                    className={`trail-card__landscape trail-card__landscape--${activityStyles[trail.activity]} trail-card__landscape--${index % 3}`}
                  >
                    {trail.photo ? (
                      <a
                        href={trail.photo.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View photo near ${trail.name} on Wikimedia Commons`}
                      >
                        <img
                          className="trail-card__photo"
                          src={trail.photo.imageUrl}
                          alt={`Photo near ${trail.name}`}
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <>
                        <span className="trail-card__category">
                          {trail.activity}
                        </span>
                        <span className="trail-card__landscape-caption">
                          TAKE THE SCENIC ROUTE
                        </span>
                      </>
                    )}
                    {trail.photo && (
                      <span className="trail-card__category">
                        {trail.activity}
                      </span>
                    )}
                  </div>
                  <div className="trail-card__body">
                    <p className="trail-card__location">
                      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M13 6.7c0 3.6-5 7.3-5 7.3S3 10.3 3 6.7a5 5 0 1 1 10 0Z" />
                        <circle cx="8" cy="6.5" r="1.5" />
                      </svg>
                      {trail.location}
                    </p>
                    <h3 id={`trail-${trail.id}`}>{trail.name}</h3>
                    <div className="trail-card__details">
                      <span>
                        {trail.distanceMiles === null
                          ? "Distance unavailable"
                          : `${trail.distanceMiles} mi`}
                      </span>
                      <span className="detail-divider" aria-hidden="true" />
                      <span>{trail.difficulty}</span>
                    </div>
                    <a
                      className="trail-card__source"
                      href={trail.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      OpenStreetMap data
                    </a>
                    {trail.photo && (
                      <p className="trail-card__photo-credit">
                        Nearby photo by {trail.photo.creator} · Wikimedia
                        Commons ·{" "}
                        <a
                          href={trail.photo.licenseUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {trail.photo.licenseName}
                        </a>
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state__icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="none">
                  <circle cx="14" cy="14" r="8" />
                  <path d="m20 20 7 7M10 14h8" />
                </svg>
              </span>
              <h3>
                {isSearching
                  ? "Finding trails near your ZIP code"
                  : searchError
                    ? "We could not search this ZIP code"
                    : searchedPostalCode
                      ? query
                        ? "No trails match your search"
                        : "No trails found near this ZIP code"
                      : "Enter a ZIP code to get started"}
              </h3>
              <p>
                {isSearching
                  ? "Loading the map and trails for the selected area."
                  : searchedPostalCode
                    ? "Try another ZIP code, search term, or activity filter."
                    : "We’ll show trails on the map, ready for you to filter."}
              </p>
              {query && (
                <button
                  className="clear-button"
                  type="button"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </section>

        <section className="closing-note" id="about">
          <span className="closing-note__mark" aria-hidden="true">
            ✳
          </span>
          <p>Good days start outside.</p>
          <span>WHEREVER YOU ROAM</span>
        </section>
      </main>

      <footer className="site-footer">
        <span>© Trail Finder</span>
        <span>MAP DATA © OPENSTREETMAP CONTRIBUTORS</span>
      </footer>
    </div>
  );
}
