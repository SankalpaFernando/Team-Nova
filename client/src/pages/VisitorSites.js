import "./VisitorSites.css";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import mangrove from "../assests/mangrove.png";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";
import SriLankaMap from "../components/SriLankaMap";

function VisitorSites() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedSiteId = searchParams.get("site");

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

  useEffect(() => {
    const handleSiteCreated = (newSite) => {
      if (!newSite) return;
      setSites((prev) => {
        const exists = prev.some((s) => s._id === newSite._id);
        if (exists) return prev;
        return [newSite, ...prev];
      });
    };

    const handleSiteUpdated = (updatedSite) => {
      if (!updatedSite) return;
      setSites((prev) =>
        prev.map((s) => (s._id === updatedSite._id ? updatedSite : s))
      );
    };

    const handleSiteDeleted = (deletedId) => {
      if (!deletedId) return;
      setSites((prev) => prev.filter((s) => s._id !== deletedId));
    };

    socket.on("site_created", handleSiteCreated);
    socket.on("site_updated", handleSiteUpdated);
    socket.on("site_deleted", handleSiteDeleted);

    return () => {
      socket.off("site_created", handleSiteCreated);
      socket.off("site_updated", handleSiteUpdated);
      socket.off("site_deleted", handleSiteDeleted);
    };
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
                  selectedSiteId={selectedSiteId}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default VisitorSites;