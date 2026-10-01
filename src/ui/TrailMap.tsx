import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Trail } from "../domain/Trail";
import type { TrailBounds } from "../domain/TrailRepository";

type TrailMapProps = {
  trails: Trail[];
  searchBounds: TrailBounds | null;
};

function ZoomToSearchArea({ bounds }: { bounds: TrailBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) {
      return;
    }

    map.fitBounds(
      [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ],
      { padding: [24, 24], maxZoom: 13 },
    );
  }, [bounds, map]);

  return null;
}

export default function TrailMap({ trails, searchBounds }: TrailMapProps) {
  const mappableTrails = trails.filter(
    (
      trail,
    ): trail is Trail & { latitude: number; longitude: number } =>
      typeof trail.latitude === "number" &&
      typeof trail.longitude === "number",
  );

  return (
    <div
      className="trail-map"
      role="region"
      aria-label="Map of trails in the selected ZIP code"
    >
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        minZoom={3}
        maxZoom={17}
        scrollWheelZoom
        className="trail-map__leaflet"
      >
        <ZoomToSearchArea bounds={searchBounds} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappableTrails.map((trail) => (
          <CircleMarker
            key={trail.id}
            center={[trail.latitude, trail.longitude]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#58734d",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <strong>{trail.name}</strong>
              <br />
              {trail.activity} · {trail.location}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
