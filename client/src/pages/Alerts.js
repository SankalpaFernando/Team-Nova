import { useEffect, useRef, useState } from "react";
import "./Alerts.css";
import { NavLink, Link, useNavigate } from "react-router-dom";
import mangrove from "../assests/mangrove.png";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUS_LABEL = {
  unread: "Pending",
  read: "Read",
  resolved: "Resolved",
};

const SEVERITY_LABEL = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const navClass = ({ isActive }) => (isActive ? "active" : "");

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-GB"); // dd/mm/yyyy, matches the old placeholder format
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Alerts() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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


  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const res = await api.get("/alerts", { params: { limit: 100 } });
        setAlerts(res.data.data || []);
      } catch (err) {
        setError("Couldn't load alerts from the server.");
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  return (
    <div>

      {/* Navbar */}
      <div className="dashboard-navbar">
        <div className="logo">🌿 MangroveGuard</div>

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
        className="alerts-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >

        <h2 className="alerts-title">
          Alerts & Notifications
        </h2>

        {error && <div className="alerts-error">{error}</div>}

        {/* Alerts Table */}

        <div className="alerts-table-container">

          <table className="alerts-table">

            <thead>

              <tr>
                <th>Site Name</th>
                <th>Alert</th>
                <th>Severity</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty-msg">Loading alerts…</td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty-msg">No alerts to show</td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert._id} className={`severity-row-${alert.severity_level}`}>
                    <td>{alert.device?.site?.name || "—"}</td>
                    <td className="alert-message-cell">{alert.message}</td>
                    <td>
                      <span className={`severity-badge severity-${alert.severity_level}`}>
                        {SEVERITY_LABEL[alert.severity_level] || alert.severity_level}
                      </span>
                    </td>
                    <td>{formatDate(alert.created_at)}</td>
                    <td>{formatTime(alert.created_at)}</td>
                    <td>
                      <span className={alert.status}>
                        {STATUS_LABEL[alert.status] || alert.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default Alerts;