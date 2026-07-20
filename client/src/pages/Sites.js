import "./Sites.css";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import mangrove from "../assests/mangrove.png";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const REGION_ICON = {
  Northern: "⬆️",
  Southern: "⬇️",
  Eastern: "➡️",
  Western: "⬅️",
};

const navClass = ({ isActive }) => (isActive ? "active" : "");

function Sites() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const menuRef = useRef(null);

  const [sites, setSites] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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


  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim() === "") return;
    navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    setSearchTerm("");
  };

const handleLogout = () => {
    logout();
    navigate("/");
  };


  // Group devices by site once, instead of filtering the whole devices
  // array again for every card on every render
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

      {/* Navbar */}
      <div className="dashboard-navbar">

        <div className="logo">
          🌿 MangroveGuard
        </div>

        <div className="nav-links">
          <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
          <NavLink to="/sites" className={navClass}>Sites</NavLink>
          <NavLink to="/alerts" className={navClass}>Alerts</NavLink>
          <NavLink to="/about" className={navClass}>About</NavLink>
          <NavLink to="/contact" className={navClass}>Contact</NavLink>

          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="search-icon-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </form>

          <div className="profile-menu" ref={menuRef}>
            <button
              className="avatar-btn"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "👤"}
            </button>

            {menuOpen && (
              <div className="profile-dropdown">
                <Link to="/profile" onClick={() => setMenuOpen(false)}>
                  👤 Profile
                </Link>
                <button onClick={handleLogout}>🚪 Logout</button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Background */}
      <div
        className="sites-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >

        <div className="sites-overlay">

          <h2 className="sites-title">
            Mangrove Monitoring Sites
          </h2>

          {error && <div className="sites-error">{error}</div>}

          <div className="sites-container">

            {loading ? (
              <p className="sites-status-msg">Loading sites…</p>
            ) : sites.length === 0 ? (
              <p className="sites-status-msg">No sites registered yet</p>
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
                  <Link
                    to={`/sites/${site._id}`}
                    className="site-link"
                    key={site._id}
                  >
                    <div className="site-card">
                      <div className="site-card-header">
                        <h3>{site.name}</h3>
                        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                      </div>

                      <p><strong>📍 Location:</strong> {site.location}</p>
                      <p>
                        <strong>{REGION_ICON[site.region] || "🧭"} Region:</strong> {site.region}
                      </p>
                      <p><strong>🔌 Devices Installed:</strong> {siteDevices.length}</p>

                      <span className="view-details-hint">View Details →</span>
                    </div>
                  </Link>
                );
              })
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default Sites;