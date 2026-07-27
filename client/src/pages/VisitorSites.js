import "./VisitorSites.css";
import Navbar from "../components/navbar";
import mangrove from "../assests/mangrove.png";
import { useEffect, useState } from "react";
import api from "../services/api";

const REGION_ICON = {
  Northern: "⬆️",
  Southern: "⬇️",
  Eastern: "➡️",
  Western: "⬅️",
};

function VisitorSites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSites = async () => {
      try {
        const sitesRes = await api.get("/sites");
        setSites(sitesRes.data.data || []);
      } catch (err) {
        setError("Couldn't load sites from the server.");
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, []);

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
                  return (
                    <div
                      className="visitor-site-card"
                      key={site._id}
                    >
                      <div className="visitor-site-card-header">
                        <h3>{site.name}</h3>
                      </div>

                      <p><strong>📍 Location:</strong> {site.location}</p>
                      <p>
                        <strong>{REGION_ICON[site.region] || "🧭"} Region:</strong> {site.region}
                      </p>
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