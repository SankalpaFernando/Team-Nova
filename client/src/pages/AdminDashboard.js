import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import "./AdminAlerts.css";


function getStatus(min, max, value) {
  if (value === null || value === undefined) return "unknown";
  if (min === undefined && max === undefined) return "unknown"; 
  if (min !== undefined && min !== null && value < min) return "breach";
  if (max !== undefined && max !== null && value > max) return "breach";
  return "normal";
}

const PARAM_KEY_MAP = { pH: "pH", Temp: "temperature", Salinity: "salinity", "DO₂": "dissolved_o2" };

function SiteAverageChart({ avgData, siteThresholds }) {
  if (!avgData) return null;

  const data = [
    { name: "pH", value: avgData.pH },
    { name: "Temp", value: avgData.temperature },
    { name: "Salinity", value: avgData.salinity },
    { name: "DO₂", value: avgData.dissolved_o2 },
  ];

  const colorFor = (name, value) => {
    const key = PARAM_KEY_MAP[name];
    const t = siteThresholds?.[key];
    const status = getStatus(t?.min, t?.max, value);
    if (status === "breach") return "#e24b4a";
    if (status === "normal") return "#5a9c5a";
    return "#c9c9c9";
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => (v !== null && v !== undefined ? v : "—")} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={colorFor(d.name, d.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "#5a7a6c", marginTop: "6px" }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#5a9c5a", borderRadius: 2, marginRight: 4 }} />Normal</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#e24b4a", borderRadius: 2, marginRight: 4 }} />Breaching threshold</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#c9c9c9", borderRadius: 2, marginRight: 4 }} />No data</span>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sites, setSites] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [userCount, setUserCount] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Accordion: which site row is expanded. null = none open.
  const [expandedSiteId, setExpandedSiteId] = useState(null);

  const handleLogout = () => { logout(); navigate("/"); };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [devicesRes, alertsRes, sitesRes] = await Promise.all([
          api.get("/devices"),
          api.get("/alerts"),
          api.get("/sites"),
        ]);
        setDevices(devicesRes.data.data || []);
        setAlerts(alertsRes.data.data || []);
        setSites(sitesRes.data.data || []);

        try {
          const readingsRes = await api.get("/readings/latest");
          setReadings(readingsRes.data.data || []);
        } catch {
          setReadings([]);
        }

        try {
          const usersRes = await api.get("/users");
          setUserCount((usersRes.data.data || []).length);
        } catch {
          setUserCount(null);
        }
        try {
          const loginsRes = await api.get("/users/recent-logins");
          setRecentLogins(loginsRes.data.data || []);
        } catch {
          setRecentLogins([]);
        }
      } catch {
        setError("Could not load dashboard data. Check that the backend is running.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── derived stats ─────────────────────────────────────
  const activeDevices = devices.filter(d => d.status === "active").length;
  const attentionDevices = devices.filter(d => d.status === "faulty" || d.status === "inactive" || d.status === "maintenance");
  const unreadAlerts = alerts.filter(a => a.status === "unread").length;
  const recentAlerts = [...alerts]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const severityClass = (s) => ({ low: "rn", medium: "rs", high: "re", critical: "rw" }[s] || "rn");
  const statusClass = (s) => ({ active: "rn", inactive: "rs", maintenance: "re", faulty: "rw" }[s] || "rn");

  // ── ranked "needs attention" sites, worst severity first ──
  const severityRank = { critical: 3, high: 2, medium: 1, low: 0 };
  const activeAlerts = alerts.filter(a => a.status !== "resolved");

  const siteAttentionMap = {};
  activeAlerts.forEach(a => {
    const site = a.device?.site;
    if (!site?._id) return;
    if (!siteAttentionMap[site._id]) {
      siteAttentionMap[site._id] = { siteId: site._id, siteName: site.name, count: 0, worst: a.severity_level, alerts: [] };
    }
    const entry = siteAttentionMap[site._id];
    entry.count++;
    entry.alerts.push(a);
    if (severityRank[a.severity_level] > severityRank[entry.worst]) entry.worst = a.severity_level;
  });

  const rankedSites = Object.values(siteAttentionMap)
    .sort((a, b) => severityRank[b.worst] - severityRank[a.worst])
    .slice(0, 5); // dashboard shows top 5; full list lives on /admin-alerts

  const toggleSite = (siteId) => {
    setExpandedSiteId(prev => (prev === siteId ? null : siteId));
  };

  // ── average latest readings across every device at a site ──
  const round1 = (n) => Math.round(n * 10) / 10;
  const getSiteAverages = (siteId) => {
    const siteReadings = readings.filter(r => r.device?.site?._id === siteId);
    if (siteReadings.length === 0) return null;
    const sum = (key) => siteReadings.reduce((acc, r) => acc + (r[key] ?? 0), 0);
    const countValid = (key) => siteReadings.filter(r => r[key] !== undefined && r[key] !== null).length;
    const avg = (key) => {
      const n = countValid(key);
      return n ? round1(sum(key) / n) : null;
    };
    return {
      deviceCount: siteReadings.length,
      pH: avg("pH"),
      temperature: avg("temperature"),
      salinity: avg("salinity"),
      dissolved_o2: avg("dissolved_o2"),
    };
  };

  const getSiteThresholds = (siteId) => sites.find(s => s._id === siteId)?.thresholds || null;

  // ── relative time, e.g. "5m ago", "3h ago", "2d ago" ──
  const timeAgo = (d) => {
    if (!d) return "never";
    const diffMs = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const severityBg = { critical: "#fcebeb", high: "#faece7", medium: "#faeeda", low: "#eaf3de" };
  const severityBorder = { critical: "#e24b4a", high: "#d85a30", medium: "#efc97a", low: "#97c459" };
  const severityText = { critical: "#a32d2d", high: "#993c1d", medium: "#854f0b", low: "#3b6d11" };

  // ── render ────────────────────────────────────────────
  return (
    <div className="am-page">

      {/* ── Sidebar ── */}
      <aside className="am-sidebar">
        <div className="am-brand">
          <span className="am-brand-icon">🌿</span>
          <div>
            <div className="am-brand-name">MangroveGuard</div>
            <div className="am-brand-role">Admin Panel</div>
          </div>
        </div>

        <nav className="am-nav">
          {[
            { to: "/admin-dashboard", icon: "⬛", label: "Dashboard", active: true },
            { to: "/manage-users",    icon: "👥", label: "Users"     },
            { to: "/manage-devices",  icon: "📡", label: "Devices"   },
            { to: "/admin-alerts",    icon: "🔔", label: "Alerts"    },
            { to: "/admin-maps",      icon: "📍", label: "Sites"     },
            { to: "/admin-messages",  icon: "✉️", label: "Messages"  },
            { to: "/admin-profile",   icon: "👤", label: "Profile"   },
          ].map(({ to, icon, label, active }) => (
            <Link key={to} to={to} className={`am-nav-link ${active ? "am-nav-link--active" : ""}`}>
              <span className="am-nav-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="am-sidebar-bottom">
          <div className="am-user-card">
            <div className="am-user-avatar">{user?.name?.[0]?.toUpperCase() || "A"}</div>
            <div>
              <div className="am-user-name">{user?.name || "Admin"}</div>
              <div className="am-user-email">{user?.email || ""}</div>
            </div>
          </div>
          <button className="am-logout-btn" onClick={handleLogout}>⏻ Logout</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="am-main">

        {/* Header */}
        <div className="am-header">
          <div>
            <p className="am-breadcrumb">Admin › Dashboard</p>
            <h1 className="am-title">Admin Dashboard</h1>
            <p className="am-subtitle">Overview of devices, sites, alerts and users.</p>
          </div>
        </div>

        {/* Error */}
        {error && <div className="am-error">{error}</div>}

        {loading ? (
          <div className="am-loading">
            <div className="am-spinner" />
            <p>Loading dashboard…</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="am-stats">
              {[
                { icon: "🚨", val: unreadAlerts,          label: "Unread alerts"     },
                { icon: "📡", val: `${activeDevices}/${devices.length}`, label: "Devices active" },
                { icon: "📍", val: sites.length,          label: "Sites monitored"   },
                { icon: "👥", val: userCount ?? "—",       label: "Total users"       },
              ].map((s, i) => (
                <div className="am-stat-card" key={i}>
                  <span className="am-stat-icon">{s.icon}</span>
                  <div>
                    <div className="am-stat-val">{s.val}</div>
                    <div className="am-stat-lbl">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sites needing attention — ranked accordion, most urgent first */}
            <div className="am-card" style={{ padding: "18px 20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1c3a2a" }}>📍 Sites needing attention</h2>
                <Link to="/admin-alerts" style={{ fontSize: "12px", color: "#1c3a2a" }}>View all →</Link>
              </div>

              {rankedSites.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#3b6d11" }}>All sites normal — no active alerts.</p>
              ) : (
                <div style={{ border: "1px solid #deeae3", borderRadius: "10px", overflow: "hidden" }}>
                  {rankedSites.map((s, i) => {
                    const isOpen = expandedSiteId === s.siteId;
                    const avgData = getSiteAverages(s.siteId);
                    const thresholds = getSiteThresholds(s.siteId);

                    return (
                      <div key={s.siteId} style={{ borderTop: i > 0 ? "1px solid #deeae3" : "none" }}>
                        {/* Row header — click to expand/collapse this site only */}
                        <div
                          onClick={() => toggleSite(s.siteId)}
                          style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "12px 16px", cursor: "pointer", background: "#fff",
                            borderLeft: `3px solid ${severityBorder[s.worst]}`,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 500, color: "#1c3a2a" }}>{s.siteName}</div>
                            <div style={{ fontSize: "11px", color: "#8aaa98" }}>
                              {s.worst} · {s.count} active alert{s.count > 1 ? "s" : ""}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span className={`am-badge am-badge--${severityClass(s.worst)}`}>{s.worst}</span>
                            <span style={{
                              fontSize: "16px", color: "#8aaa98",
                              display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none",
                              transition: "transform 0.15s",
                            }}>›</span>
                          </div>
                        </div>

                        {/* Expanded detail — chart + alert list for this site only */}
                        {isOpen && (
                          <div style={{ padding: "14px 18px", background: "#fafcfb", borderTop: "1px solid #edf4ef" }}>
                            {s.alerts.map(a => (
                              <div key={a._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #edf4ef" }}>
                                <span style={{ fontSize: "13px", color: "#2d4a3e" }}>
                                  {a.parameter_name} <span style={{ color: "#8aaa98" }}>· {a.measured_value} · {a.device?.device_id || "—"}</span>
                                </span>
                                <span className={`am-badge am-badge--${severityClass(a.severity_level)}`}>{a.severity_level}</span>
                              </div>
                            ))}

                            <div style={{ fontSize: "12px", fontWeight: 500, color: "#1c3a2a", margin: "14px 0 4px" }}>
                              {avgData ? `Current average · ${avgData.deviceCount} device${avgData.deviceCount > 1 ? "s" : ""} reporting` : "No readings yet"}
                            </div>

                            {avgData ? (
                              <SiteAverageChart avgData={avgData} siteThresholds={thresholds} />
                            ) : (
                              <p style={{ fontSize: "11px", color: "#8aaa98" }}>No readings recorded yet for this site.</p>
                            )}

                            <p style={{ fontSize: "11px", color: "#8aaa98", marginTop: "8px" }}>
                              Bars use each device's latest reading, averaged. Red = breaching this site's configured threshold.
                              Once devices have reported for a few days, this upgrades to a time-trend chart.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sections */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

              <div className="am-card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1c3a2a" }}>📡 Devices needing attention</h2>
                  <Link to="/manage-devices" style={{ fontSize: "12px", color: "#1c3a2a" }}>View all →</Link>
                </div>
                {attentionDevices.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#3b6d11" }}>All devices online.</p>
                ) : attentionDevices.slice(0, 5).map(d => (
                  <div key={d._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #edf4ef" }}>
                    <span style={{ fontSize: "13px", color: "#2d4a3e" }}>{d.device_id} <span style={{ color: "#8aaa98" }}>· {d.site?.name || "—"}</span></span>
                    <span className={`am-badge am-badge--${statusClass(d.status)}`}>{d.status}</span>
                  </div>
                ))}
              </div>

              <div className="am-card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1c3a2a" }}>🚨 Recent alerts</h2>
                  <Link to="/admin-alerts" style={{ fontSize: "12px", color: "#1c3a2a" }}>View all →</Link>
                </div>
                {recentAlerts.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#8aaa98" }}>No alerts found.</p>
                ) : recentAlerts.map(a => (
                  <div key={a._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #edf4ef" }}>
                    <span style={{ fontSize: "13px", color: "#2d4a3e" }}>{a.parameter_name} <span style={{ color: "#8aaa98" }}>· {a.device?.device_id || "—"}</span></span>
                    <span className={`am-badge am-badge--${severityClass(a.severity_level)}`}>{a.severity_level}</span>
                  </div>
                ))}
              </div>

            </div>

            <div className="am-card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1c3a2a" }}>🕒 Recently logged in</h2>
                <Link to="/manage-users" style={{ fontSize: "12px", color: "#1c3a2a" }}>View all →</Link>
              </div>
              {recentLogins.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#8aaa98" }}>No login activity recorded yet.</p>
              ) : recentLogins.map(u => (
                <div key={u._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #edf4ef" }}>
                  <span style={{ fontSize: "13px", color: "#2d4a3e" }}>{u.name} <span style={{ color: "#8aaa98" }}>· {u.email}</span></span>
                  <span style={{ fontSize: "12px", color: "#8aaa98" }}>{timeAgo(u.lastLogin)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
