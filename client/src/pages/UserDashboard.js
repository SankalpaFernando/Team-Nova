import { useEffect, useRef, useState } from "react";
import "./UserDashboard.css";
import { Link, useNavigate } from "react-router-dom";
import mangrove from "../assests/mangrove.png";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// How each sensor parameter should be labeled/scaled on the bar graph.
// "max" is only used to size the bar width (based on the valid ranges
// already enforced in server/models/SensorReading.js).
const PARAM_META = {
  pH: { label: "pH", unit: "", max: 14 },
  temperature: { label: "Temperature", unit: "°C", max: 40 },
  salinity: { label: "Salinity", unit: " ppt", max: 60 },
  dissolved_o2: { label: "Dissolved O₂", unit: " mg/L", max: 15 },
};

function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sites, setSites] = useState([]);
  const [devices, setDevices] = useState([]);
  const [latestReadings, setLatestReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [attentionCount, setAttentionCount] = useState(0);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the navbar profile dropdown on outside click
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

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [sitesRes, devicesRes, readingsRes, alertsRes, unreadRes] = await Promise.all([
          api.get("/sites"),
          api.get("/devices"),
          api.get("/readings/latest"),
          api.get("/alerts", { params: { limit: 5 } }),
          api.get("/alerts/unread-count"),
        ]);

        const siteList = sitesRes.data.data || [];
        setSites(siteList);
        setDevices(devicesRes.data.data || []);
        setLatestReadings(readingsRes.data.data || []);
        setAlerts(alertsRes.data.data || []);
        setAttentionCount(unreadRes.data.count || 0);

        if (siteList.length > 0) {
          setSelectedSiteId(siteList[0]._id);
        }
      } catch (err) {
        setError("Couldn't load live data from the server. Showing an empty dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // "Active Devices" = every device whose status is "active", straight
  // from the devices collection — not just the ones that happen to have
  // a reading yet, so newly-installed devices still count correctly.
  const activeDeviceCount = devices.filter((d) => d.status === "active").length;

  // Readings that belong to whichever site is selected in the dropdown
  const siteReadings = latestReadings.filter(
    (r) => r.device?.site?._id === selectedSiteId
  );
  const selectedSite = sites.find((s) => s._id === selectedSiteId);

  return (
    <div className="dashboard">
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
        className="dashboard-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >
        <h2 className="dashboard-title">Mangrove Monitoring Dashboard</h2>

        {error && <div className="dashboard-error">{error}</div>}

        {/* Summary Cards */}
        <div className="card-row">
          <div className="card">
            <h3>No. of Sites</h3>
            <h2>{loading ? "…" : sites.length}</h2>
            <p>Monitoring Sites Registered</p>
          </div>

          <div className="card">
            <h3>Active Devices</h3>
            <h2>{loading ? "…" : activeDeviceCount}</h2>
            <p>Devices Currently Online</p>
          </div>

          <div className="card">
            <h3>Total Alerts</h3>
            <h2>{loading ? "…" : attentionCount}</h2>
            <p>Alerts Requiring Attention</p>
          </div>
        </div>

        {/* Graph (left) + Recent Alerts (right) */}
        <div className="dashboard-main-grid">
          {/* Graph */}
          <div className="graph-box">
            <div className="graph-header">
              <h3>Sensor Data Overview</h3>

              <select
                className="site-select"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                disabled={loading || sites.length === 0}
              >
                {sites.map((site) => (
                  <option key={site._id} value={site._id}>
                    {site.name} — {site.location}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="graph-placeholder">Loading sensor data…</div>
            ) : siteReadings.length === 0 ? (
              <div className="graph-placeholder">
                No readings yet for {selectedSite?.name || "this site"}
              </div>
            ) : (
              <div className="param-bars">
                {Object.keys(PARAM_META).map((param) => {
                  const meta = PARAM_META[param];
                  const avg =
                    siteReadings.reduce((sum, r) => sum + (r[param] ?? 0), 0) /
                    siteReadings.length;
                  const widthPct = Math.min((avg / meta.max) * 100, 100);

                  return (
                    <div className="param-bar-row" key={param}>
                      <span className="param-label">{meta.label}</span>
                      <div className="param-bar-track">
                        <div
                          className="param-bar-fill"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="param-value">
                        {avg.toFixed(1)}
                        {meta.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Alerts */}
          <div className="alerts-box">
            <h3>Recent Alerts</h3>

            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Alert</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3">Loading alerts…</td>
                  </tr>
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan="3">No recent alerts</td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert._id}>
                      <td>{alert.device?.site?.name || "—"}</td>
                      <td>{alert.message}</td>
                      <td className={alert.status === "resolved" ? "resolved" : "pending"}>
                        {alert.status === "resolved" ? "Resolved" : "Pending"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;