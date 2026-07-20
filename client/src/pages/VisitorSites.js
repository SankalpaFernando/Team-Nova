import "./VisitorSites.css";
import Navbar from "../components/navbar";
import mangrove from "../assests/mangrove.png";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const REGION_ICON = {
  Northern: "⬆️",
  Southern: "⬇️",
  Eastern: "➡️",
  Western: "⬅️",
};

function VisitorSites() {
  const [sites, setSites] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSites = async () => {
      try {
        const [sitesRes, devicesRes] = await Promise.all([
          api.get("/sites"),
          api.get("/devices"),
        ]);
        setSites(sitesRes.data.data || []);
        setDevices(devicesRes.data.data || []);
      } catch (err) {
        setError("Couldn't load sites from the server.");
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, []);

  const devicesBySite = useMemo(() => {
    const map = {};
    devices.forEach((d) => {
      const siteId = d.site?._id;
      if (!siteId) return;
      if (!map[siteId]) map[siteId] = [];
      map[siteId].push(d);
    });
    return map;
  }, [devices]);

  return (
    <div className="visitor-sites-page">

      {/* Navbar */}
      <Navbar showBackHome={true} />

      {/* Hero Section */}
      <section
        className="visitor-sites-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >

        <div className="visitor-sites-overlay">

          <div className="visitor-sites-content">

            <h2 className="visitor-sites-title">
              Mangrove Monitoring Sites
            </h2>

            {error && <p className="visitor-sites-error">{error}</p>}

            <div className="visitor-sites-container">

              {loading ? (
                <p className="visitor-sites-status-msg">Loading sites…</p>
              ) : sites.length === 0 ? (
                <p className="visitor-sites-status-msg">No sites registered yet</p>
              ) : (
                sites.map((site) => {
                  const siteDevices = devicesBySite[site._id] || [];
                  const activeCount = siteDevices.filter((d) => d.status === "active").length;

                  let statusLabel = "No Devices";
                  let statusClass = "status-none";
                  if (siteDevices.length > 0) {
                    if (activeCount === siteDevices.length) {
                      statusLabel = "Active";
                      statusClass = "status-active";
                    } else if (activeCount > 0) {
                      statusLabel = "Partially Active";
                      statusClass = "status-partial";
                    } else {
                      statusLabel = "Inactive";
                      statusClass = "status-inactive";
                    }
                  }

                  return (
                    <div
                      className="visitor-site-card"
                      key={site._id}
                    >
                      <div className="visitor-site-card-header">
                        <h3>{site.name}</h3>
                        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                      </div>

                      <p><strong>📍 Location:</strong> {site.location}</p>
                      <p>
                        <strong>{REGION_ICON[site.region] || "🧭"} Region:</strong> {site.region}
                      </p>
                      <p><strong>🔌 Devices Installed:</strong> {siteDevices.length}</p>
                    </div>
                  );
                })
              )}

            </div>

            {!loading && sites.length > 0 && (
              <p className="visitor-sites-hint">
                Log in to see live sensor readings for each site
              </p>
            )}

          </div>

        </div>

      </section>

    </div>
  );
}

export default VisitorSites;