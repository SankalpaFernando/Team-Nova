import "./Sites.css";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import mangrove from "../assests/mangrove.png";
import api from "../services/api";
import socket from "../services/socket";
import UserNavbar from "../components/UserNavbar";
import Footer from "../components/Footer";
import SriLankaMap from "../components/SriLankaMap";

function Sites() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedSiteId = searchParams.get("site");

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

  // Group devices by site once
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
    <div className="sites-page">
      {/* User Navbar */}
      <UserNavbar />

      {/* Hero Single-Page Section */}
      <div
        className="sites-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >
        <div className="sites-overlay">
          <div className="sites-content">
            <h2 className="sites-title">
              Mangrove Monitoring Sites
            </h2>

            {error && <div className="sites-error">{error}</div>}

            {/* Sri Lanka Map Section (Single-Page View) */}
            <div className="sites-map-section">
              {loading ? (
                <div className="sites-loading-box">
                  <p>Loading Sri Lanka Mangrove Map…</p>
                </div>
              ) : (
                <SriLankaMap
                  sites={sites}
                  devicesBySite={devicesBySite}
                  isUserPage={true}
                  selectedSiteId={selectedSiteId}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Sites;