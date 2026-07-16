import { useEffect, useRef, useState } from "react";
import "./Alerts.css";
import { Link, useNavigate } from "react-router-dom";
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
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/sites">Sites</Link>
          <Link to="/alerts">Alerts</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>

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
                  <td colSpan="6">Loading alerts…</td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="6">No alerts to show</td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert._id}>
                    <td>{alert.device?.site?.name || "—"}</td>
                    <td>{alert.message}</td>
                    <td>{SEVERITY_LABEL[alert.severity_level] || alert.severity_level}</td>
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