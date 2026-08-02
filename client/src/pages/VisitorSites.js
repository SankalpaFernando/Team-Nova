import "./VisitorSites.css";
import Navbar from "../components/navbar";
import mangrove from "../assests/mangrove.png";
import { useEffect, useState } from "react";
import api from "../services/api";
import SriLankaMap from "../components/SriLankaMap";

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

      {/* Hero Single-Page Section */}
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

            {/* Sri Lanka Map Container (Single-Page View) */}
            <div className="visitor-map-section">
              {loading ? (
                <div className="map-loading-box">
                  <p>Loading Sri Lanka Mangrove Map…</p>
                </div>
              ) : (
                <SriLankaMap
                  sites={sites}
                  isUserPage={false}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default VisitorSites;