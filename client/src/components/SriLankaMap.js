import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Helper function to parse latitude & longitude from location strings like "8.0362° N, 79.8428° E"
export const parseCoordinates = (locationStr, regionStr) => {
  if (!locationStr || typeof locationStr !== "string") {
    return getRegionFallback(regionStr);
  }

  // Clean location string (remove "📍 Location:" if present)
  const cleanStr = locationStr.replace(/^📍\s*Location:\s*/i, "").trim();

  // Regex pattern for DMS (Degrees, Minutes, Seconds): e.g. "9°41′05″N 80°01′19″E" or "9°41'05"N 80°01'19"E"
  const dmsMatch1 = cleanStr.match(/(\d+)\s*°\s*(\d+)\s*[′']\s*(\d+\.?\d*)?\s*[″"]?\s*([NS])[\s,]+(\d+)\s*°\s*(\d+)\s*[′']\s*(\d+\.?\d*)?\s*[″"]?\s*([EW])/i);
  if (dmsMatch1) {
    let lat = parseInt(dmsMatch1[1], 10) + parseInt(dmsMatch1[2], 10) / 60 + (parseFloat(dmsMatch1[3] || 0) / 3600);
    let lng = parseInt(dmsMatch1[5], 10) + parseInt(dmsMatch1[6], 10) / 60 + (parseFloat(dmsMatch1[7] || 0) / 3600);
    if (dmsMatch1[4].toUpperCase() === "S") lat = -lat;
    if (dmsMatch1[8].toUpperCase() === "W") lng = -lng;
    return { lat, lng };
  }

  // Inverse DMS: e.g. "80°01′19″E 9°41′05″N"
  const dmsMatch2 = cleanStr.match(/(\d+)\s*°\s*(\d+)\s*[′']\s*(\d+\.?\d*)?\s*[″"]?\s*([EW])[\s,]+(\d+)\s*°\s*(\d+)\s*[′']\s*(\d+\.?\d*)?\s*[″"]?\s*([NS])/i);
  if (dmsMatch2) {
    let lng = parseInt(dmsMatch2[1], 10) + parseInt(dmsMatch2[2], 10) / 60 + (parseFloat(dmsMatch2[3] || 0) / 3600);
    let lat = parseInt(dmsMatch2[5], 10) + parseInt(dmsMatch2[6], 10) / 60 + (parseFloat(dmsMatch2[7] || 0) / 3600);
    if (dmsMatch2[4].toUpperCase() === "W") lng = -lng;
    if (dmsMatch2[8].toUpperCase() === "S") lat = -lat;
    return { lat, lng };
  }

  // Regex pattern for decimal degrees: e.g. "8.0362° N, 79.8428° E" or "8.0362 N, 79.8428 E"
  const degMatch1 = cleanStr.match(/(\d+\.?\d*)\s*°?\s*([NS])[\s,]+(\d+\.?\d*)\s*°?\s*([EW])/i);
  if (degMatch1) {
    let lat = parseFloat(degMatch1[1]);
    let lng = parseFloat(degMatch1[3]);
    if (degMatch1[2].toUpperCase() === "S") lat = -lat;
    if (degMatch1[4].toUpperCase() === "W") lng = -lng;
    return { lat, lng };
  }

  // Inverse decimal degrees: e.g. "79.8428° E, 8.0362° N"
  const degMatch2 = cleanStr.match(/(\d+\.?\d*)\s*°?\s*([EW])[\s,]+(\d+\.?\d*)\s*°?\s*([NS])/i);
  if (degMatch2) {
    let lng = parseFloat(degMatch2[1]);
    let lat = parseFloat(degMatch2[3]);
    if (degMatch2[2].toUpperCase() === "W") lng = -lng;
    if (degMatch2[4].toUpperCase() === "S") lat = -lat;
    return { lat, lng };
  }

  // Regex pattern for plain numbers in string
  const numbers = cleanStr.match(/-?\d+\.?\d*/g);
  if (numbers && numbers.length >= 2) {
    const n1 = parseFloat(numbers[0]);
    const n2 = parseFloat(numbers[1]);
    if (!isNaN(n1) && !isNaN(n2)) {
      if (n1 >= 5 && n1 <= 10 && n2 >= 78 && n2 <= 83) {
        return { lat: n1, lng: n2 };
      }
      if (n2 >= 5 && n2 <= 10 && n1 >= 78 && n1 <= 83) {
        return { lat: n2, lng: n1 };
      }
    }
  }

  return getRegionFallback(regionStr);
};

const getRegionFallback = (regionStr) => {
  switch (regionStr) {
    case "Northern":
      return { lat: 8.8, lng: 80.1 };
    case "Southern":
      return { lat: 6.1, lng: 80.5 };
    case "Eastern":
      return { lat: 7.7, lng: 81.6 };
    case "Western":
      return { lat: 7.15, lng: 79.88 };
    default:
      return { lat: 7.8731, lng: 80.7718 };
  }
};

const REGION_ICON = {
  Northern: "⬆️",
  Southern: "⬇️",
  Eastern: "➡️",
  Western: "⬅️",
};

// Create a custom red dot marker icon for Leaflet
const createRedDotIcon = (isSelected) => {
  return L.divIcon({
    className: "custom-red-dot-wrapper",
    html: `
      <div class="red-dot-container ${isSelected ? "selected" : ""}">
        <div class="red-dot-pulse"></div>
        <div class="red-dot-core"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

function SriLankaMap({
  sites = [],
  devicesBySite = {},
  isUserPage = false,
  selectedSiteId = null,
  onSelectSite,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [activeSite, setActiveSite] = useState(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [7.8731, 80.7718],
        zoom: 7.5,
        minZoom: 6.5,
        maxZoom: 14,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers when sites change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    if (!sites || sites.length === 0) return;

    const bounds = [];

    sites.forEach((site) => {
      const { lat, lng } = parseCoordinates(site.location, site.region);
      const isSelected = (activeSite && activeSite._id === site._id) || selectedSiteId === site._id;

      bounds.push([lat, lng]);

      const icon = createRedDotIcon(isSelected);
      const marker = L.marker([lat, lng], { icon, title: site.name }).addTo(map);

      // Single Red Dot click opens the flashcard overlay and centers map
      marker.on("click", () => {
        setActiveSite(site);
        map.flyTo([lat, lng], 10, { animate: true, duration: 1 });
        if (onSelectSite) {
          onSelectSite(site);
        }
      });

      markersRef.current[site._id] = marker;
    });

    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 9);
      } else {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
      }
    }
  }, [sites, activeSite, selectedSiteId, onSelectSite]);

  // Helper for status badge
  const getStatusPill = (siteId) => {
    const siteDevices = devicesBySite[siteId] || [];
    const activeCount = siteDevices.filter((d) => d.status === "active").length;

    if (siteDevices.length === 0) return { label: "No Devices", cls: "status-none" };
    if (activeCount === siteDevices.length) return { label: "Active", cls: "status-active" };
    if (activeCount > 0) return { label: "Partially Active", cls: "status-partial" };
    return { label: "Inactive", cls: "status-inactive" };
  };

  return (
    <div className="sri-lanka-map-wrapper">
      <div className="sri-lanka-map-header">
        <div className="map-title-area">
          <span className="map-live-badge">🔴 Sri Lanka Mangrove Map</span>
          <span className="map-instruction">Click any red dot to view mangrove details</span>
        </div>
        <span className="map-count">
          {sites.length} Mangrove Plant Location{sites.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="map-viewport-container">
        <div ref={mapContainerRef} className="sri-lanka-map-container" />

        {/* Single Pop-up Flash Card Modal Overlay when a Red Dot is Clicked */}
        {activeSite && (
          <div className="map-popup-flashcard-overlay">
            <div className="flashcard-card-content">
              <button
                className="flashcard-close-btn"
                onClick={() => setActiveSite(null)}
                title="Close Flash Card"
              >
                ✕
              </button>

              <div className="flashcard-header">
                <span className="flashcard-badge">📍 Mangrove Plant Location</span>
                {isUserPage && (
                  <span className={`status-pill ${getStatusPill(activeSite._id).cls}`}>
                    {getStatusPill(activeSite._id).label}
                  </span>
                )}
              </div>

              <h3 className="flashcard-site-name">{activeSite.name}</h3>

              <div className="flashcard-body">
                <p>
                  <strong>📍 Exact Location:</strong> {activeSite.location}
                </p>
                <p>
                  <strong>
                    {REGION_ICON[activeSite.region] || "🧭"} Region:
                  </strong>{" "}
                  {activeSite.region}
                </p>

                {isUserPage && (
                  <p>
                    <strong>🔌 Devices Installed:</strong>{" "}
                    {(devicesBySite[activeSite._id] || []).length}
                  </p>
                )}
              </div>

              <div className="flashcard-footer">
                {isUserPage ? (
                  <Link
                    to={`/sites/${activeSite._id}`}
                    className="flashcard-action-btn"
                  >
                    View Details & Sensor Readings →
                  </Link>
                ) : (
                  <span className="flashcard-visitor-hint">
                    🔒 Log in to view live sensor readings for this mangrove site
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SriLankaMap;
