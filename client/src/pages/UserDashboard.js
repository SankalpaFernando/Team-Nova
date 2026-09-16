import { useEffect, useRef, useState } from "react";
import "./UserDashboard.css";
import { NavLink, Link, useNavigate } from "react-router-dom";
import mangrove from "../assests/mangrove.png";
import api from "../services/api";
import socket from "../services/socket";
import { useAuth } from "../context/AuthContext";
import UserNavbar from "../components/UserNavbar";
import Footer from "../components/Footer";

// Sensor range (min assumed 0, matching server/models/SensorReading.js
// validation) and display info for each parameter.
const PARAM_META = {
  pH: { label: "pH", unit: "", max: 14 },
  temperature: { label: "Temperature", unit: "°C", max: 40 },
  salinity: { label: "Salinity", unit: " ppt", max: 60 },
  dissolved_o2: { label: "Dissolved O₂", unit: " mg/L", max: 15 },
};

const navClass = ({ isActive }) => (isActive ? "active" : "");

// -- Gauge geometry helpers -------------------------------------------
// A gauge sweeps from 180° (left, value = min) to 0° (right, value = max)
// over the top of the circle, matching a speedometer.
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(cx, cy, r, fracStart, fracEnd) {
  const angleStart = 180 - fracStart * 180;
  const angleEnd = 180 - fracEnd * 180;
  const p1 = polarToCartesian(cx, cy, r, angleStart);
  const p2 = polarToCartesian(cx, cy, r, angleEnd);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
}

// One gauge card for a single sensor parameter
function ParamGauge({ label, value, unit, max, threshold, isLive }) {
  const cx = 60, cy = 60, r = 48;
  const clamped = Math.max(0, Math.min(value, max));
  const valueFrac = clamped / max;

  const safeMinFrac = threshold ? Math.max(0, Math.min(threshold.min / max, 1)) : 0;
  const safeMaxFrac = threshold ? Math.max(0, Math.min(threshold.max / max, 1)) : 1;

  let status = "In safe range";
  let statusClass = "gauge-status-safe";
  if (threshold) {
    if (value < threshold.min) {
      status = "Below safe range";
      statusClass = "gauge-status-danger";
    } else if (value > threshold.max) {
      status = "Above safe range";
      statusClass = "gauge-status-danger";
    }
  }

  const needleAngle = 180 - valueFrac * 180;
  const needleTip = polarToCartesian(cx, cy, 38, needleAngle);

  return (
    <div className="gauge-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
        <p className="gauge-label" style={{ margin: 0 }}>{label}</p>
        {isLive && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "#e6f4ea",
            color: "#137333",
            border: "1px solid #ceead6",
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: "10px"
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1e8e3e" }} />
            LIVE
          </span>
        )}
      </div>
      <svg viewBox="0 0 120 68" className="gauge-svg">
        {safeMinFrac > 0 && (
          <path d={arcPath(cx, cy, r, 0, safeMinFrac)} className="gauge-arc gauge-arc-danger" />
        )}
        <path d={arcPath(cx, cy, r, safeMinFrac, safeMaxFrac)} className="gauge-arc gauge-arc-safe" />
        {safeMaxFrac < 1 && (
          <path d={arcPath(cx, cy, r, safeMaxFrac, 1)} className="gauge-arc gauge-arc-danger" />
        )}
        <line
          x1={cx} y1={cy}
          x2={needleTip.x} y2={needleTip.y}
          className="gauge-needle"
        />
        <circle cx={cx} cy={cy} r="4" className="gauge-pivot" />
      </svg>
      <p className="gauge-value">{value.toFixed(1)}{unit}</p>
      <p className={`gauge-status ${statusClass}`}>{status}</p>
    </div>
  );
}

// Relative time, e.g. "2h ago"
function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const SEVERITY_LABEL = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
const STATUS_LABEL = { unread: "Pending", read: "Read", resolved: "Resolved" };

function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sites, setSites] = useState([]);
  const [devices, setDevices] = useState([]);
  const [latestReadings, setLatestReadings] = useState([]);
  const [liveSensors, setLiveSensors] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [attentionCount, setAttentionCount] = useState(0);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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

  useEffect(() => {
    const handleNewReading = (newReading) => {
      if (!newReading) return;
      const getSensorId = (r) => (r.sensor?._id ? r.sensor._id.toString() : r.sensor ? r.sensor.toString() : null);
      const newSensorId = getSensorId(newReading);

      setLatestReadings((prev) => {
        const exists = prev.some((r) => getSensorId(r) === newSensorId);
        if (exists) {
          return prev.map((r) => (getSensorId(r) === newSensorId ? newReading : r));
        } else {
          return [newReading, ...prev];
        }
      });

      if (newSensorId) {
        setLiveSensors((prev) => ({ ...prev, [newSensorId]: true }));
        setTimeout(() => {
          setLiveSensors((prev) => {
            const copy = { ...prev };
            delete copy[newSensorId];
            return copy;
          });
        }, 4000);
      }
    };

    socket.on("new_reading", handleNewReading);
    return () => {
      socket.off("new_reading", handleNewReading);
    };
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
      <UserNavbar />

      {/* Background */}
      <div
        className="dashboard-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >
        <h2 className="dashboard-title">Mangrove Monitoring Dashboard</h2>

        {error && <div className="dashboard-error">{error}</div>}

        {/* Summary Cards */}
        <div className="card-row">
          <div className="card card-sites">
            <div className="card-icon">🌍</div>
            <div className="card-body">
              <h3>No. of Sites</h3>
              <h2>{loading ? "…" : sites.length}</h2>
              <p>Monitoring sites registered</p>
            </div>
          </div>

          <div className="card card-devices">
            <div className="card-icon">🔌</div>
            <div className="card-body">
              <h3>Active Devices</h3>
              <h2>{loading ? "…" : activeDeviceCount}</h2>
              <p>Devices currently online</p>
            </div>
          </div>

          <div className="card card-alerts">
            <div className="card-icon">🚨</div>
            <div className="card-body">
              <h3>Total Alerts</h3>
              <h2>{loading ? "…" : attentionCount}</h2>
              <p>Alerts requiring attention</p>
            </div>
          </div>
        </div>

        {/* Graph (left) + Recent Alerts (right) */}
        <div className="dashboard-main-grid">
          {/* Sensor Data Overview */}
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
              <div className="param-gauges">
                {Object.keys(PARAM_META).map((param) => {
                  const meta = PARAM_META[param];

                  const extractValue = (r, pKey) => {
                    if (!r) return null;
                    if (r[pKey] !== undefined && r[pKey] !== null) return r[pKey];
                    const k = r.sensor?.parameter?.key || "";
                    const lbl = (r.sensor?.parameter?.label || r.parameter_name || "").toLowerCase();
                    if (k === pKey || (pKey === "pH" && (k === "pH" || lbl.includes("ph"))) ||
                        (pKey === "temperature" && (k === "temperature" || k === "temp" || lbl.includes("temp"))) ||
                        (pKey === "salinity" && (k === "salinity" || lbl.includes("salin"))) ||
                        (pKey === "dissolved_o2" && (k === "dissolved_o2" || k === "do2" || lbl.includes("o2") || lbl.includes("oxygen")))) {
                      return r.value;
                    }
                    return null;
                  };

                  const validValues = siteReadings
                    .map(r => extractValue(r, param))
                    .filter(v => v !== null && v !== undefined);

                  const avg = validValues.length > 0
                    ? validValues.reduce((a, b) => a + b, 0) / validValues.length
                    : 0;

                  const isParamLive = siteReadings.some((r) => {
                    const sId = r.sensor?._id?.toString() || r.sensor?.toString();
                    const pKey = r.sensor?.parameter?.key || "";
                    const pLabel = (r.sensor?.parameter?.label || r.parameter_name || "").toLowerCase();
                    const matchesParam = pKey === param ||
                      (param === "pH" && (pKey === "pH" || pLabel.includes("ph"))) ||
                      (param === "temperature" && (pKey === "temperature" || pKey === "temp" || pLabel.includes("temp"))) ||
                      (param === "salinity" && (pKey === "salinity" || pLabel.includes("salin"))) ||
                      (param === "dissolved_o2" && (pKey === "dissolved_o2" || pKey === "do2" || pLabel.includes("o2") || pLabel.includes("oxygen")));
                    return matchesParam && liveSensors[sId];
                  });

                  const getThresholdForParam = (thresholdsArray, pName) => {
                    if (!Array.isArray(thresholdsArray)) return null;
                    const targetKey = pName.toLowerCase();
                    return thresholdsArray.find(t => {
                      const k = (t.parameter?.key || "").toLowerCase();
                      const lbl = (t.parameter?.label || t.parameter_name || "").toLowerCase();
                      if (k === targetKey) return true;
                      if (targetKey === "ph" && (k === "ph" || lbl.includes("ph"))) return true;
                      if (targetKey === "temperature" && (k === "temperature" || k === "temp" || lbl.includes("temp"))) return true;
                      if (targetKey === "salinity" && (k === "salinity" || lbl.includes("salin"))) return true;
                      if ((targetKey === "dissolved_o2" || targetKey === "dissolved o2") && (k === "dissolved_o2" || k === "do2" || lbl.includes("o2") || lbl.includes("oxygen"))) return true;
                      return false;
                    });
                  };

                  return (
                    <ParamGauge
                      key={param}
                      label={meta.label}
                      value={avg}
                      unit={meta.unit}
                      max={meta.max}
                      threshold={getThresholdForParam(selectedSite?.thresholds, param)}
                      isLive={isParamLive}
                    />
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
                  <th>Severity</th>
                  <th>When</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="table-empty-msg">Loading alerts…</td>
                  </tr>
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="table-empty-msg">No recent alerts</td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert._id} className={`severity-row-${alert.severity_level}`}>
                      <td>{alert.device?.site?.name || "—"}</td>
                      <td>
                        <span className={`severity-badge severity-${alert.severity_level}`}>
                          {SEVERITY_LABEL[alert.severity_level] || alert.severity_level}
                        </span>
                      </td>
                      <td className="alert-time-cell">{timeAgo(alert.created_at)}</td>
                      <td className={alert.status === "resolved" ? "resolved" : "pending"}>
                        {STATUS_LABEL[alert.status] || (alert.status === "resolved" ? "Resolved" : "Pending")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default UserDashboard;