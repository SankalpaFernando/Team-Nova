import "./SiteDetails.css";
import { NavLink, Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const navClass = ({ isActive }) => (isActive ? "active" : "");

function SiteDetails() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const menuRef = useRef(null);

  const [site, setSite] = useState(null);
  const [devices, setDevices] = useState([]);
  const [latestReadings, setLatestReadings] = useState([]);
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
    const loadSite = async () => {
      setLoading(true);
      setError("");
      try {
        const [siteRes, readingsRes] = await Promise.all([
          api.get(`/sites/${id}`),
          api.get("/readings/latest"),
        ]);

        setSite(siteRes.data.data.site);
        setDevices(siteRes.data.data.devices || []);
        setLatestReadings(readingsRes.data.data || []);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? "This site couldn't be found."
            : "Couldn't load this site's data from the server."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSite();
  }, [id]);


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


  // This site's devices' latest readings, averaged (same approach as
  // the main dashboard's Sensor Data Overview)
  const siteReadings = latestReadings.filter(
    (r) => r.device?.site?._id === id
  );

  const avg = (param) => {
    if (siteReadings.length === 0) return null;
    const sum = siteReadings.reduce((s, r) => s + (r[param] ?? 0), 0);
    return sum / siteReadings.length;
  };

  const avgSalinity = avg("salinity");
  const avgTemperature = avg("temperature");
  const avgPH = avg("pH");
  const avgDO2 = avg("dissolved_o2");

  const activeCount = devices.filter((d) => d.status === "active").length;

  return (
    <div className="site-page">

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

      {loading ? (
        <p className="site-status-msg">Loading site…</p>
      ) : error ? (
        <div className="site-status-msg">
          <p className="site-error">{error}</p>
          <Link to="/sites" className="back-link">← Back to Sites</Link>
        </div>
      ) : (
        <>
          <Link to="/sites" className="back-link">← Back to Sites</Link>

          <h2 className="site-title">
            {site.name}
          </h2>
          <p className="site-subtitle">
            📍 {site.location} &nbsp;•&nbsp; {site.region} Region &nbsp;•&nbsp;
            {" "}{activeCount}/{devices.length} devices active
          </p>

          <div className="details-container">

            <div className="detail-card">
              <h3>pH Level</h3>
              <h2>{avgPH !== null ? avgPH.toFixed(1) : "—"}</h2>
            </div>

            <div className="detail-card">
              <h3>Salinity</h3>
              <h2>{avgSalinity !== null ? `${avgSalinity.toFixed(1)} ppt` : "—"}</h2>
            </div>

            <div className="detail-card">
              <h3>Temperature</h3>
              <h2>{avgTemperature !== null ? `${avgTemperature.toFixed(1)} °C` : "—"}</h2>
            </div>

            <div className="detail-card">
              <h3>Dissolved O₂</h3>
              <h2>{avgDO2 !== null ? `${avgDO2.toFixed(1)} mg/L` : "—"}</h2>
            </div>

          </div>

          {siteReadings.length === 0 && (
            <p className="no-readings-note">
              No sensor readings have been submitted for this site's devices yet.
            </p>
          )}

          {/* Devices */}
          <div className="devices-section">
            <h3>Devices at this Site</h3>

            {devices.length === 0 ? (
              <p className="no-devices">No devices installed at this site yet</p>
            ) : (
              <ul className="device-list">
                {devices.map((d) => (
                  <li key={d._id} className={`device-item device-${d.status}`}>
                    <span className="device-id">{d.device_id}</span>
                    <span className={`device-status device-status-${d.status}`}>
                      {d.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Map */}
          <div className="map-box">
            <h3>Location</h3>
            <iframe
              title={site.name}
              src={`https://www.google.com/maps?q=${encodeURIComponent(site.location)}&output=embed`}
              width="100%"
              height="400"
              loading="lazy"
            ></iframe>
          </div>
        </>
      )}

    </div>
  );
}

export default SiteDetails;