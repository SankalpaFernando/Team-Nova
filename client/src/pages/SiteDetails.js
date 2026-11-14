import "./SiteDetails.css";
import "./AdminMaps.css";
import { Link, useParams, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import socket from "../services/socket";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext";
import { buildSeriesWithGaps } from "../utils/chartGaps";
import { getDayTicks, makeDayAwareTick, formatTooltipTime } from "../utils/timeAxis";
import UserNavbar from "../components/UserNavbar";
import AdminSidebar from "../components/AdminSidebar";
import UserLayout from "../components/UserLayout";
import Footer from "../components/Footer";
import { ChevronDown, ChevronUp, Cpu } from "lucide-react";

function SiteDetails() {
  const { id } = useParams();
  const location = useLocation();
  const { user, isAdmin, isSiteEngineer } = useAuth();
  
  const isFromAdmin = location.state?.fromAdmin;
  const isAdminView = isAdmin || isSiteEngineer || isFromAdmin;

  const [site, setSite] = useState(null);
  const [devices, setDevices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [latestReadings, setLatestReadings] = useState([]);
  const [expandedDevices, setExpandedDevices] = useState({});

  // Chart states
  const [timeRange, setTimeRange] = useState(24); // hours: 1, 24, 168 (7d), 720 (1m)
  const [selectedParam, setSelectedParam] = useState("pH");
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper to determine status for green/red threshold styling
  const getStatusFor = (val, paramKey, siteThresholds) => {
    if (val === null || val === undefined) return "unknown";
    if (!siteThresholds || !Array.isArray(siteThresholds)) return "unknown";

    const targetKey = paramKey.toLowerCase();
    const entry = siteThresholds.find(t => {
      const k = (t.parameter?.key || "").toLowerCase();
      const lbl = (t.parameter?.label || t.parameter_name || "").toLowerCase();
      if (k === targetKey) return true;
      if (targetKey === "ph" && (k === "ph" || lbl.includes("ph"))) return true;
      if (targetKey === "temperature" && (k === "temperature" || k === "temp" || lbl.includes("temp"))) return true;
      if (targetKey === "salinity" && (k === "salinity" || lbl.includes("salin"))) return true;
      if (targetKey === "dissolved_o2" && (k === "dissolved_o2" || k === "do2" || lbl.includes("o2") || lbl.includes("oxygen"))) return true;
      return false;
    });

    if (!entry || (entry.min === undefined && entry.max === undefined)) return "unknown";
    if (entry.min !== null && entry.min !== undefined && val < entry.min) return "breach";
    if (entry.max !== null && entry.max !== undefined && val > entry.max) return "breach";
    return "normal";
  };

  const loadSite = async () => {
    setLoading(true);
    setError("");
    try {
      const [siteRes, readingsRes, sensorsRes] = await Promise.all([
        api.get(`/sites/${id}`),
        api.get("/readings/latest"),
        api.get("/sensors", { params: { site: id } }).catch(() => ({ data: { data: [] } }))
      ]);

      setSite(siteRes.data.data.site);
      setDevices(siteRes.data.data.devices || []);
      setLatestReadings(readingsRes.data.data || []);
      setSensors(sensorsRes.data.data || []);
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

  useEffect(() => {
    loadSite();
  }, [id]);

  useEffect(() => {
    const handleSensorChange = () => {
      api.get("/sensors", { params: { site: id } })
        .then(res => setSensors(res.data.data || []))
        .catch(() => {});
    };

    socket.on("sensor_created", handleSensorChange);
    socket.on("sensor_updated", handleSensorChange);
    socket.on("sensor_deleted", handleSensorChange);

    return () => {
      socket.off("sensor_created", handleSensorChange);
      socket.off("sensor_updated", handleSensorChange);
      socket.off("sensor_deleted", handleSensorChange);
    };
  }, [id]);

  // Group sensors by device ID
  const sensorsByDevice = useMemo(() => {
    const map = {};
    sensors.forEach((s) => {
      const devId = s.device?._id || s.device;
      if (!devId) return;
      if (!map[devId]) map[devId] = [];
      map[devId].push(s);
    });
    return map;
  }, [sensors]);

  const toggleDevice = (devId) => {
    setExpandedDevices((prev) => ({
      ...prev,
      [devId]: !prev[devId],
    }));
  };

  // Fetch Historical Data
  useEffect(() => {
    const loadHistory = async () => {
      if (!devices || devices.length === 0) {
        setHistoryData([]);
        return;
      }
      setHistoryLoading(true);
      try {
        const fromDate = new Date(Date.now() - timeRange * 60 * 60 * 1000).toISOString();

        // Fetch up to 2000 readings per device for the selected time range
        const deviceRequests = devices.map(d =>
          api.get(`/readings?device=${d._id}&limit=2000&from=${fromDate}`)
        );
        const responses = await Promise.all(deviceRequests);

        let allReadings = [];
        responses.forEach(res => {
          if (res.data && res.data.data) {
            allReadings = allReadings.concat(res.data.data);
          }
        });

        // Sort by time
        allReadings.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

        const dataMap = {};
        allReadings.forEach(r => {
          // bucket to nearest minute
          const timeKey = new Date(r.recorded_at).setSeconds(0, 0);

          let formatOptions = { hour: '2-digit', minute: '2-digit' };
          if (timeRange > 24) {
            formatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
          }

          if (!dataMap[timeKey]) {
            dataMap[timeKey] = {
              timeKey,
              timeLabel: new Date(timeKey).toLocaleString([], formatOptions)
            };
          }

          const k = r.sensor?.parameter?.key?.toLowerCase() || "";
          const lbl = (r.sensor?.parameter?.label || r.parameter_name || "").toLowerCase();

          if (k === "ph" || lbl.includes("ph")) dataMap[timeKey].pH = r.value !== undefined ? r.value : r.pH;
          else if (k === "temperature" || k === "temp" || lbl.includes("temp")) dataMap[timeKey].temperature = r.value !== undefined ? r.value : r.temperature;
          else if (k === "salinity" || lbl.includes("salin")) dataMap[timeKey].salinity = r.value !== undefined ? r.value : r.salinity;
          else if (k === "dissolved_o2" || k === "do2" || lbl.includes("o2") || lbl.includes("oxygen")) dataMap[timeKey].dissolved_o2 = r.value !== undefined ? r.value : r.dissolved_o2;
        });

        const chartPoints = Object.values(dataMap).sort((a, b) => a.timeKey - b.timeKey);
        setHistoryData(chartPoints);
      } catch (err) {
        console.error("Failed to load history data", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [timeRange, devices]);

  // Real-time socket subscription
  useEffect(() => {
    const handleNewReading = (newReading) => {
      if (!newReading) return;

      const rSiteId = newReading.device?.site?._id || newReading.device?.site;
      if (rSiteId !== id) return;

      // Update Latest Readings
      setLatestReadings((prev) => {
        const getSensorId = (r) => (r.sensor?._id ? r.sensor._id.toString() : r.sensor ? r.sensor.toString() : null);
        const newSensorId = getSensorId(newReading);
        const exists = prev.some((r) => getSensorId(r) === newSensorId);
        if (exists) {
          return prev.map((r) => (getSensorId(r) === newSensorId ? newReading : r));
        }
        return [newReading, ...prev];
      });

      // Update Chart History Data
      setHistoryData(prev => {
        const timeKey = new Date(newReading.recorded_at).setSeconds(0, 0);

        let formatOptions = { hour: '2-digit', minute: '2-digit' };
        if (timeRange > 24) {
          formatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        }
        const timeLabel = new Date(timeKey).toLocaleString([], formatOptions);

        const k = newReading.sensor?.parameter?.key?.toLowerCase() || "";
        const lbl = (newReading.sensor?.parameter?.label || newReading.parameter_name || "").toLowerCase();

        let pName = null;
        if (k === "ph" || lbl.includes("ph")) pName = "pH";
        else if (k === "temperature" || k === "temp" || lbl.includes("temp")) pName = "temperature";
        else if (k === "salinity" || lbl.includes("salin")) pName = "salinity";
        else if (k === "dissolved_o2" || k === "do2" || lbl.includes("o2") || lbl.includes("oxygen")) pName = "dissolved_o2";

        if (!pName) return prev;

        const val = newReading.value !== undefined ? newReading.value : newReading[pName];
        const lastItem = prev.length > 0 ? prev[prev.length - 1] : null;

        if (lastItem && lastItem.timeKey === timeKey) {
          const updated = { ...lastItem, [pName]: val };
          return [...prev.slice(0, -1), updated];
        } else {
          const newItem = { timeKey, timeLabel, [pName]: val };
          return [...prev, newItem];
        }
      });
    };

    socket.on("new_reading", handleNewReading);
    return () => socket.off("new_reading", handleNewReading);
  }, [id, timeRange]);

  // Average Calculations
  const siteReadings = latestReadings.filter(
    (r) => (r.device?.site?._id || r.device?.site) === id
  );

  const avg = (pKey) => {
    if (siteReadings.length === 0) return null;
    const extractValue = (r) => {
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
    const valid = siteReadings.map(extractValue).filter(v => v !== null && v !== undefined);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };

  const avgSalinity = avg("salinity");
  const avgTemperature = avg("temperature");
  const avgPH = avg("pH");
  const avgDO2 = avg("dissolved_o2");

  const activeCount = devices.filter((d) => d.status === "active").length;

  // Custom Dot renderer for Recharts to show green/red threshold status
  const chartData = buildSeriesWithGaps(historyData, selectedParam);
  const xTicks = getDayTicks(chartData);

  const renderCustomDot = (props, paramKey) => {
    const { cx, cy, value } = props;
    if (value === null || value === undefined) return null;
    const status = getStatusFor(value, paramKey, site?.thresholds);
    const fill = status === "breach" ? "#e24b4a" : status === "normal" ? "#5a9c5a" : "#c9c9c9";
    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} stroke="none" fill={fill} />;
  };

  // Custom Tooltip renderer for Recharts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length && !payload[0].payload?.isGap) {
      const val = payload[0].value;
      const paramKey = selectedParam;
      const status = getStatusFor(val, paramKey, site?.thresholds);
      const isBreach = status === "breach";

      return (
        <div style={{
          backgroundColor: isBreach ? "#fdecea" : "#fff",
          border: `1px solid ${isBreach ? "#e24b4a" : "#ccc"}`,
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          color: isBreach ? "#a32d2d" : "#333"
        }}>
          <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>{formatTooltipTime(payload[0].payload.timeKey)}</p>
          <p style={{ margin: 0 }}>
            {payload[0].name}: {val}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => (
    <>
      {/* Sensor Average Cards */}
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

      {/* Historical Chart Section */}
      <div className="map-box" style={{ padding: "25px 25px 40px", marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
          <h3 style={{ margin: 0 }}>Parameter History</h3>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {/* Parameter switch controls */}
            <div className="param-controls" style={{ display: "flex", gap: "5px" }}>
              {[
                { label: "pH", val: "pH" },
                { label: "Temp", val: "temperature" },
                { label: "Salinity", val: "salinity" },
                { label: "DO₂", val: "dissolved_o2" }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setSelectedParam(opt.val)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #c2d6cb",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: selectedParam === opt.val ? "bold" : "normal",
                    backgroundColor: selectedParam === opt.val ? "#c8e2d4" : "#fff",
                    color: selectedParam === opt.val ? "#1f4d3a" : "#555",
                    transition: "0.2s"
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Time range controls */}
            <div className="time-controls" style={{ display: "flex", gap: "5px" }}>
              {[
                { label: "1h", val: 1 },
                { label: "24h", val: 24 },
                { label: "7d", val: 168 },
                { label: "1m", val: 720 }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setTimeRange(opt.val)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: timeRange === opt.val ? "bold" : "normal",
                    backgroundColor: timeRange === opt.val ? "#1f4d3a" : "#e0e0e0",
                    color: timeRange === opt.val ? "#fff" : "#333",
                    transition: "0.2s"
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {historyLoading ? (
          <p style={{ textAlign: "center", color: "#666", margin: "50px 0" }}>Loading history...</p>
        ) : historyData.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666", margin: "50px 0" }}>No historical data available for this time range.</p>
        ) : (
          <div style={{ height: "400px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                <XAxis dataKey="timeKey" height={40} ticks={xTicks} interval={0} tick={makeDayAwareTick(xTicks, { fontSize: 12, fill: "#666" })} />
                <YAxis tick={{ fontSize: 12, fill: "#666" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />

                {selectedParam === "pH" && <Line type="monotone" name="pH" dataKey="pH" stroke="#b0b0b0" strokeWidth={2} dot={(p) => renderCustomDot(p, "pH")} activeDot={{ r: 6 }} connectNulls={false} />}
                {selectedParam === "temperature" && <Line type="monotone" name="Temperature (°C)" dataKey="temperature" stroke="#b0b0b0" strokeWidth={2} dot={(p) => renderCustomDot(p, "temperature")} activeDot={{ r: 6 }} connectNulls={false} />}
                {selectedParam === "salinity" && <Line type="monotone" name="Salinity (ppt)" dataKey="salinity" stroke="#b0b0b0" strokeWidth={2} dot={(p) => renderCustomDot(p, "salinity")} activeDot={{ r: 6 }} connectNulls={false} />}
                {selectedParam === "dissolved_o2" && <Line type="monotone" name="Dissolved O₂ (mg/L)" dataKey="dissolved_o2" stroke="#b0b0b0" strokeWidth={2} dot={(p) => renderCustomDot(p, "dissolved_o2")} activeDot={{ r: 6 }} connectNulls={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: "14px", fontSize: "12px", color: "#5a7a6c", marginTop: "15px" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#5a9c5a", borderRadius: "50%", marginRight: 5 }} />Normal</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#e24b4a", borderRadius: "50%", marginRight: 5 }} />Breaching threshold</span>
        </div>
      </div>

      {siteReadings.length === 0 && (
        <p className="no-readings-note">
          No sensor readings have been submitted for this site's devices yet.
        </p>
      )}

      {/* Devices & Sensors (Touchable / Clickable to view sensors with Model Name) */}
      <div className="devices-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "8px" }}>
          <h3 style={{ margin: 0, color: "#2f5d50" }}>Devices at this Site</h3>
          <span style={{ fontSize: "12px", color: "#666" }}>Touch / click a device to view its sensors</span>
        </div>

        {devices.length === 0 ? (
          <p className="no-devices">No devices installed at this site yet</p>
        ) : (
          <ul className="device-list">
            {devices.map((d) => {
              const devSensors = sensorsByDevice[d._id] || [];
              const isExpanded = !!expandedDevices[d._id];

              return (
                <li key={d._id} style={{ listStyle: "none", marginBottom: "8px" }}>
                  <div
                    className={`device-item device-${d.status} device-item-clickable`}
                    onClick={() => toggleDevice(d._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleDevice(d._id);
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      userSelect: "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                    title="Touch / click to view sensors"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="device-id">{d.device_id}</span>
                      <span style={{
                        fontSize: "11px",
                        background: "#e8f0ec",
                        color: "#2f5d50",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontWeight: 600
                      }}>
                        {devSensors.length} {devSensors.length === 1 ? "sensor" : "sensors"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className={`device-status device-status-${d.status}`}>
                        {d.status}
                      </span>
                      <span style={{ color: "#777", display: "flex", alignItems: "center" }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      margin: "4px 0 8px 12px",
                      padding: "12px 16px",
                      background: "#f4f8f6",
                      borderRadius: "8px",
                      borderLeft: "3px solid #2f5d50"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1c3a2a",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        <Cpu size={14} color="#1d7068" />
                        <span>Installed Sensors ({devSensors.length})</span>
                      </div>

                      {devSensors.length === 0 ? (
                        <p style={{ margin: 0, fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                          No sensors attached to this device.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {devSensors.map((s) => (
                            <div
                              key={s._id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                background: "#ffffff",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                border: "1px solid #dce8e2",
                                fontSize: "13px"
                              }}
                            >
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <strong style={{ color: "#1f4d3a", fontSize: "13px" }}>
                                    {s.model_name ? s.model_name : (s.sensor_id || "Sensor Probe")}
                                  </strong>
                                  <span style={{
                                    fontSize: "11px",
                                    background: "#eaf3ee",
                                    color: "#1d7068",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontWeight: 600
                                  }}>
                                    {s.parameter?.label || s.parameter?.name || s.type || "Parameter"}
                                  </span>
                                </div>
                                <div style={{ fontSize: "11px", color: "#666", marginTop: "3px" }}>
                                  {s.sensor_id && <span>ID: {s.sensor_id} &nbsp;•&nbsp; </span>}
                                  {s.parameter?.unit && <span>Unit: {s.parameter.unit} &nbsp;•&nbsp; </span>}
                                  {s.parameter?.valid_min !== undefined && s.parameter?.valid_max !== undefined && (
                                    <span>Range: {s.parameter.valid_min}–{s.parameter.valid_max}</span>
                                  )}
                                </div>
                              </div>

                              <span className={`device-status device-status-${s.status}`} style={{ fontSize: "11px", padding: "3px 10px" }}>
                                {s.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Map */}
      {site?.location && (
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
      )}
    </>
  );

  // If viewed in Admin Mode
  if (isAdminView) {
    return (
      <div className="am-page">
        <AdminSidebar activePage="sites" />

        <main className="am-main">
          <div className="am-header">
            <div>
              <p className="am-breadcrumb">{isSiteEngineer ? 'Site Engineer' : 'Admin'} › Sites › {site?.name || "Details"}</p>
              <h1 className="am-title">{site?.name || "Site Details"}</h1>
              {site && (
                <p className="am-subtitle">
                  📍 {site.location} &nbsp;•&nbsp; {site.region} Region &nbsp;•&nbsp;{" "}
                  {activeCount}/{devices.length} devices active
                </p>
              )}
            </div>
            <Link to="/admin-maps" className="am-btn-sec" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              ← Back to Sites
            </Link>
          </div>

          {loading ? (
            <div className="am-loading">
              <div className="am-spinner" />
              <p>Loading site data…</p>
            </div>
          ) : error ? (
            <div className="am-error">
              <p>{error}</p>
              <Link to="/admin-maps" className="am-btn-sec" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '10px' }}>
                ← Back to Sites
              </Link>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>
    );
  }

  // Regular Registered User Mode
  if (user && user.role === 'registered_user') {
    return (
      <UserLayout activePage="sites">
        <div className="ul-header">
          <div>
            <p className="ul-breadcrumb">Monitoring › Sites › {site?.name || "Details"}</p>
            <h1 className="ul-title">{site?.name || "Site Details"}</h1>
            {site && (
              <p className="ul-subtitle">
                📍 {site.location} &nbsp;•&nbsp; {site.region} Region &nbsp;•&nbsp;{" "}
                {activeCount}/{devices.length} devices active
              </p>
            )}
          </div>
          <Link to="/sites" className="ul-btn-sec">
            ← Back to Sites
          </Link>
        </div>

        {loading ? (
          <div className="ul-loading">Loading site data…</div>
        ) : error ? (
          <div className="ul-error">
            <p>{error}</p>
            <Link to="/sites" className="ul-btn-sec" style={{ marginTop: "10px" }}>
              ← Back to Sites
            </Link>
          </div>
        ) : (
          renderContent()
        )}
      </UserLayout>
    );
  }

  // Visitor Mode
  return (
    <div className="site-page">
      <UserNavbar />

      {loading ? (
        <p className="site-status-msg">Loading site…</p>
      ) : error ? (
        <div className="site-status-msg">
          <p className="site-error">{error}</p>
          <Link to="/visitor-sites" className="back-link">
            ← Back to Sites
          </Link>
        </div>
      ) : (
        <>
          <Link to="/visitor-sites" className="back-link">
            ← Back to Sites
          </Link>

          <h2 className="site-title">
            {site.name}
          </h2>
          <p className="site-subtitle">
            📍 {site.location} &nbsp;•&nbsp; {site.region} Region &nbsp;•&nbsp;
            {" "}{activeCount}/{devices.length} devices active
          </p>

          {renderContent()}
        </>
      )}
      <Footer />
    </div>
  );
}

export default SiteDetails;
