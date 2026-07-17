import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./AdminAlerts.css";

function AdminAlerts() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");

  // which header dropdown is currently open: "severity" | "status" | null
  const [openFilter, setOpenFilter] = useState(null);
  const filterRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 160,
  });

  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ── close dropdown when clicking outside (table OR the portal popover) ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideTable = filterRef.current && filterRef.current.contains(e.target);
      const clickedInsideDropdown = e.target.closest(".am-th-pop");
      if (!clickedInsideTable && !clickedInsideDropdown) {
        setOpenFilter(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── fetch ─────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (siteFilter) params.site = siteFilter;
      const res = await api.get("/alerts", { params });
      setAlerts(res.data.data || []);
    } catch {
      setError("Could not load alerts. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async () => {
    try {
      const res = await api.get("/sites");
      setSites(res.data.data || []);
    } catch {
      // non-critical — site filter dropdown just stays empty
    }
  };

  useEffect(() => { loadSites(); }, []);
  useEffect(() => { load(); }, [statusFilter, severityFilter, siteFilter]);

  // ── counts ────────────────────────────────────────────
  const bySeverity = (s) => alerts.filter(a => a.severity_level === s).length;
  const byStatus = (s) => alerts.filter(a => a.status === s).length;

  // ── detail / status update ─────────────────────────────
  const openDetail = (alert) => { setSelected(alert); setShowDetail(true); };

  const updateStatus = async (newStatus) => {
    setSaving(true);
    try {
      await api.put(`/alerts/${selected._id}/status`, { status: newStatus });
      setShowDetail(false);
      load();
      showToast(`Alert marked as ${newStatus}.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update alert.", "delete");
    } finally {
      setSaving(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put("/alerts/markallread");
      load();
      showToast("All alerts marked as read.");
    } catch {
      showToast("Failed to mark alerts as read.", "delete");
    }
  };

  // ── helpers ───────────────────────────────────────────
  const severityClass = (s) => ({ low: "rn", medium: "rs", high: "re", critical: "rw" }[s] || "rn");
  const statusClass = (s) => ({ unread: "rw", read: "rs", resolved: "rn" }[s] || "rn");
  const formatTime = (d) => d ? new Date(d).toLocaleString() : "—";
  const handleLogout = () => { logout(); navigate("/"); };

  const toggleFilter = (name, event) => {
    if (openFilter === name) {
      setOpenFilter(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    setDropdownPos({
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width: rect.width + 40,
    });

    setOpenFilter(name);
  };

  const severityOptions = [
    { value: "", label: "All" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ];
  const statusOptions = [
    { value: "", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" },
    { value: "resolved", label: "Resolved" },
  ];

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
            { to: "/admin-dashboard", icon: "⬛", label: "Dashboard" },
            { to: "/manage-users",    icon: "👥", label: "Users"     },
            { to: "/manage-devices",  icon: "📡", label: "Devices"   },
            { to: "/admin-alerts",    icon: "🔔", label: "Alerts", active: true },
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
            <p className="am-breadcrumb">Admin › Alerts</p>
            <h1 className="am-title">Alert Management</h1>
            <p className="am-subtitle">Review sensor alerts and update their status.</p>
          </div>
          <button className="am-btn-sec" onClick={markAllRead}>✓ Mark All Read</button>
        </div>

        {/* Stats */}
        <div className="am-stats">
          {[
            { icon: "🚨", val: byStatus("unread"),        label: "Unread"   },
            { icon: "🔴", val: bySeverity("critical") + bySeverity("high"), label: "High / Critical" },
            { icon: "🟠", val: bySeverity("medium"),       label: "Medium"   },
            { icon: "✅", val: byStatus("resolved"),       label: "Resolved" },
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

        {/* Site filter — separate bar above the table */}
        <div className="am-card" style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", gap: "14px", alignItems: "center" }}>
          <label className="am-lbl" style={{ margin: 0 }}>Filter by Site:</label>
          <select className="am-inp" style={{ width: "auto" }} value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>

        {/* Error */}
        {error && <div className="am-error">{error}</div>}

        {/* Loading */}
        {loading ? (
          <div className="am-loading">
            <div className="am-spinner" />
            <p>Loading alerts…</p>
          </div>
        ) : (
          <div className="am-card">
            <table className="am-table" ref={filterRef}>
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Parameter</th>

                  {/* Severity header filter */}
                  <th className="am-th-rel">
                    <span
                      className="am-th-clickable"
                      onClick={(e) => toggleFilter("severity", e)}
                    >
                      Severity <span className="am-th-arrow">▾</span>
                    </span>

                    {openFilter === "severity" &&
                      createPortal(
                        <div
                          className="am-th-pop"
                          style={{
                            position: "absolute",
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                            zIndex: 99999,
                          }}
                        >
                          {severityOptions.map(opt => (
                            <div
                              key={opt.value}
                              className={`am-th-pop-item ${severityFilter === opt.value ? "am-th-pop-item--active" : ""}`}
                              onClick={() => { setSeverityFilter(opt.value); setOpenFilter(null); }}
                            >
                              {opt.label}
                            </div>
                          ))}
                        </div>,
                        document.body
                      )}
                  </th>

                  {/* Device/Site — display only, no filter */}
                  <th>Device / Site</th>

                  <th>Value</th>

                  {/* Status header filter */}
                  <th className="am-th-rel">
                    <span
                      className="am-th-clickable"
                      onClick={(e) => toggleFilter("status", e)}
                    >
                      Status <span className="am-th-arrow">▾</span>
                    </span>

                    {openFilter === "status" &&
                      createPortal(
                        <div
                          className="am-th-pop"
                          style={{
                            position: "absolute",
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                            zIndex: 99999,
                          }}
                        >
                          {statusOptions.map(opt => (
                            <div
                              key={opt.value}
                              className={`am-th-pop-item ${statusFilter === opt.value ? "am-th-pop-item--active" : ""}`}
                              onClick={() => { setStatusFilter(opt.value); setOpenFilter(null); }}
                            >
                              {opt.label}
                            </div>
                          ))}
                        </div>,
                        document.body
                      )}
                  </th>

                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="am-empty">No alerts found.</td>
                  </tr>
                ) : alerts.map((alert, i) => (
                  <tr key={alert._id} className="am-tr">
                    <td className="am-td-num">{i + 1}</td>
                    <td className="am-td-name">{alert.parameter_name}</td>
                    <td>
                      <span className={`am-badge am-badge--${severityClass(alert.severity_level)}`}>{alert.severity_level}</span>
                    </td>
                    <td className="am-td-loc">
                      {alert.device?.device_id || "—"}{alert.device?.site?.name ? ` · ${alert.device.site.name}` : ""}
                    </td>
                    <td className="am-td-data">{alert.measured_value}</td>
                    <td>
                      <span className={`am-badge am-badge--${statusClass(alert.status)}`}>{alert.status}</span>
                    </td>
                    <td className="am-td-dim">{formatTime(alert.created_at)}</td>
                    <td>
                      <div className="am-actions">
                        <button className="am-act am-act--edit" onClick={() => openDetail(alert)}>👁 View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Detail / Status Modal */}
      {showDetail && selected && (
        <div className="am-overlay" onClick={() => setShowDetail(false)}>
          <div className="am-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-head">
              <h2>Alert Details</h2>
              <button className="am-close" onClick={() => setShowDetail(false)}>✕</button>
            </div>
            <div className="am-modal-body">
              <p><strong>Parameter:</strong> {selected.parameter_name}</p>
              <p><strong>Severity:</strong> {selected.severity_level}</p>
              <p><strong>Measured Value:</strong> {selected.measured_value}</p>
              <p><strong>Device:</strong> {selected.device?.device_id || "—"}</p>
              <p><strong>Site:</strong> {selected.device?.site?.name || "—"}</p>
              <p><strong>Message:</strong> {selected.message}</p>
              <p><strong>Reported:</strong> {formatTime(selected.created_at)}</p>

              <div className="am-modal-foot">
                {selected.status !== "read" && (
                  <button className="am-btn-sec" onClick={() => updateStatus("read")} disabled={saving}>
                    Mark as Read
                  </button>
                )}
                {selected.status !== "resolved" && (
                  <button className="am-btn-primary" onClick={() => updateStatus("resolved")} disabled={saving}>
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`am-toast am-toast--${toast.type}`}>
          <span className="am-toast-icon">{toast.type === "delete" ? "⚠️" : "✅"}</span>
          {toast.message}
        </div>
      )}

    </div>
  );
}

export default AdminAlerts;