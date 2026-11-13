import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import socket from "../services/socket";
import { MapPin, Compass, Waves, ArrowRight, ArrowLeft, Pencil, Sliders, Trash2, X, Plus } from 'lucide-react';
import "./AdminMaps.css";

const getParamRangeStr = (siteThresholds, paramKey) => {
  if (!Array.isArray(siteThresholds) || siteThresholds.length === 0) return "—";
  const targetKey = paramKey.toLowerCase();
  const entry = siteThresholds.find(t => {
    const pKey = (t.parameter?.key || "").toLowerCase();
    const pLabel = (t.parameter?.label || t.parameter_name || "").toLowerCase();
    if (pKey === targetKey) return true;
    if (targetKey === "ph" && (pKey === "ph" || pLabel.includes("ph"))) return true;
    if ((targetKey === "temperature" || targetKey === "temp") && (pKey === "temperature" || pKey === "temp" || pLabel.includes("temp"))) return true;
    return false;
  });
  if (!entry || entry.min === undefined || entry.max === undefined) return "—";
  const unitStr = entry.parameter?.unit ? ` ${entry.parameter.unit}` : (targetKey === 'temperature' || targetKey === 'temp' ? '°C' : '');
  return `${entry.min}–${entry.max}${unitStr}`;
};

function AdminMaps() {
  const { user, logout } = useAuth();
  const isEngineer = user?.role === 'site_engineer';
  const navigate = useNavigate();

  // Data
  const [sites, setSites] = useState([]);
  const [availableParameters, setAvailableParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showThresh, setShowThresh] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);

  // Forms
  const [form, setForm] = useState({ name: "", location: "", region: "Northern" });
  const [thresh, setThresh] = useState({
    pH: { min: 6.5, max: 8.5 },
    temperature: { min: 20, max: 35 },
    salinity: { min: 0, max: 45 },
    dissolved_o2: { min: 4, max: 15 },
  });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ── fetch ─────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [sitesRes, paramsRes] = await Promise.all([
        api.get("/sites"),
        api.get("/parameters").catch(() => ({ data: { data: [] } }))
      ]);
      setSites(sitesRes.data.data || []);
      setAvailableParameters(paramsRes.data.data || []);
    } catch {
      setError("Could not load sites. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handleSiteCreated = () => load();
    const handleSiteUpdated = () => load();
    const handleSiteDeleted = () => load();

    socket.on("site_created", handleSiteCreated);
    socket.on("site_updated", handleSiteUpdated);
    socket.on("site_deleted", handleSiteDeleted);

    return () => {
      socket.off("site_created", handleSiteCreated);
      socket.off("site_updated", handleSiteUpdated);
      socket.off("site_deleted", handleSiteDeleted);
    };
  }, []);

  // ── counts ────────────────────────────────────────────
  const byRegion = (r) => sites.filter(s => s.region === r).length;

  // ── add ───────────────────────────────────────────────
  const openAdd = () => {
    setForm({ name: "", location: "", region: "Northern" });
    setFormErr("");
    setShowAdd(true);
  };
  const doAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) { setFormErr("Name and location are required."); return; }
    setSaving(true);
    try {
      const res = await api.post("/sites", form);
      setShowAdd(false);
      if (res.data?.pendingApproval) {
        showToast("Site creation request submitted for admin approval.", "success");
      } else {
        load();
        showToast("Site created successfully!");
      }
    }
    catch (err) { setFormErr(err.response?.data?.message || "Failed to create site."); }
    finally { setSaving(false); }
  };

  // ── edit ──────────────────────────────────────────────
  const openEdit = (site) => {
    setSelected(site);
    setForm({ name: site.name, location: site.location, region: site.region });
    setFormErr("");
    setShowEdit(true);
  };
  const doEdit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) { setFormErr("Name and location are required."); return; }
    setSaving(true);
    try {
      const res = await api.put(`/sites/${selected._id}`, form);
      setShowEdit(false);
      if (res.data?.pendingApproval) {
        showToast("Site update request submitted for admin approval.", "success");
      } else {
        load();
        showToast("Site updated successfully!");
      }
    }
    catch (err) { setFormErr(err.response?.data?.message || "Failed to update site."); }
    finally { setSaving(false); }
  };

  // ── thresholds ────────────────────────────────────────
  const getExistingVal = (thresholdsArray, paramKey, field, defaultVal) => {
    if (!Array.isArray(thresholdsArray)) return defaultVal;
    const targetKey = paramKey.toLowerCase();
    const entry = thresholdsArray.find(t => {
      const pKey = (t.parameter?.key || t.parameter?.label || t.parameter || "").toString().toLowerCase();
      const pLabel = (t.parameter?.label || t.parameter_name || "").toString().toLowerCase();
      if (pKey === targetKey) return true;
      if (targetKey === "ph" && (pKey === "ph" || pLabel.includes("ph"))) return true;
      if ((targetKey === "temperature" || targetKey === "temp") && (pKey === "temperature" || pKey === "temp" || pLabel.includes("temp"))) return true;
      if (targetKey === "salinity" && (pKey === "salinity" || pLabel.includes("salin"))) return true;
      if ((targetKey === "dissolved_o2" || targetKey === "dissolved o2") && (pKey === "dissolved_o2" || pLabel.includes("dissolved"))) return true;
      return false;
    });
    return entry?.[field] ?? defaultVal;
  };

  const openThresh = (site) => {
    setSelected(site);
    setThresh({
      pH: { min: getExistingVal(site.thresholds, "ph", "min", 6.5), max: getExistingVal(site.thresholds, "ph", "max", 8.5) },
      temperature: { min: getExistingVal(site.thresholds, "temperature", "min", 20), max: getExistingVal(site.thresholds, "temperature", "max", 35) },
      salinity: { min: getExistingVal(site.thresholds, "salinity", "min", 0), max: getExistingVal(site.thresholds, "salinity", "max", 45) },
      dissolved_o2: { min: getExistingVal(site.thresholds, "dissolved_o2", "min", 4), max: getExistingVal(site.thresholds, "dissolved_o2", "max", 15) },
    });
    setFormErr("");
    setShowThresh(true);
  };

  const doThresh = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErr("");
    try {
      const keysMap = [
        { formKey: "pH", paramKey: "ph" },
        { formKey: "temperature", paramKey: "temperature" },
        { formKey: "salinity", paramKey: "salinity" },
        { formKey: "dissolved_o2", paramKey: "dissolved_o2" }
      ];

      const formattedThresholds = [];

      for (const { formKey, paramKey } of keysMap) {
        // Find matching Parameter document ID from availableParameters or selected.thresholds
        const paramDoc = availableParameters.find(p => {
          const k = (p.key || "").toLowerCase();
          const l = (p.label || "").toLowerCase();
          if (k === paramKey) return true;
          if (paramKey === "ph" && (k === "ph" || l.includes("ph"))) return true;
          if (paramKey === "temperature" && (k === "temperature" || k === "temp" || l.includes("temp"))) return true;
          if (paramKey === "salinity" && (k === "salinity" || l.includes("salin"))) return true;
          if (paramKey === "dissolved_o2" && (k === "dissolved_o2" || l.includes("dissolved"))) return true;
          return false;
        });

        const paramId = paramDoc?._id || selected?.thresholds?.find(t => {
          const k = (t.parameter?.key || "").toLowerCase();
          const l = (t.parameter?.label || "").toLowerCase();
          return k === paramKey || (paramKey === "ph" && k === "ph") || (paramKey === "temperature" && (k === "temperature" || k === "temp"));
        })?.parameter?._id;

        if (paramId) {
          formattedThresholds.push({
            parameter: paramId,
            min: Number(thresh[formKey].min),
            max: Number(thresh[formKey].max)
          });
        }
      }

      // Preserve any existing thresholds for other parameters not in the form (e.g. TDS, Turbidity)
      if (Array.isArray(selected?.thresholds)) {
        selected.thresholds.forEach(t => {
          const pId = t.parameter?._id || (typeof t.parameter === 'string' ? t.parameter : null);
          if (pId && !formattedThresholds.some(ft => ft.parameter.toString() === pId.toString())) {
            formattedThresholds.push({
              parameter: pId,
              min: Number(t.min),
              max: Number(t.max)
            });
          }
        });
      }

      const res = await api.put(`/sites/${selected._id}/thresholds`, { thresholds: formattedThresholds });
      setShowThresh(false);
      if (res.data?.pendingApproval) {
        showToast("Threshold update request submitted for admin approval.", "success");
      } else {
        load();
        showToast("Thresholds updated successfully!");
      }
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to update thresholds.");
    } finally {
      setSaving(false);
    }
  };
  const setT = (param, bound, val) =>
    setThresh(p => ({ ...p, [param]: { ...p[param], [bound]: parseFloat(val) || 0 } }));

  // ── delete ────────────────────────────────────────────
  const openDelete = (site) => {
    setSelected(site); setShowThresh(false);
    setShowEdit(false); setShowDelete(true);
  };
  const doDelete = async () => {
    setSaving(true);
    try {
      const res = await api.delete(`/sites/${selected._id}`);
      setShowDelete(false);
      if (res.data?.pendingApproval) {
        showToast("Site deletion request submitted for admin approval.", "success");
      } else {
        load();
        showToast("Site deleted successfully.", "delete");
      }
    }
    catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Failed to delete site.";
      setError(msg);
      showToast(msg, "delete");
    }
    finally { setSaving(false); }
  };

  // ── helpers ───────────────────────────────────────────
  const fc = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const regionClass = (r) => ({ Northern: "rn", Southern: "rs", Eastern: "re", Western: "rw" }[r] || "rn");

  const handleLogout = () => { logout(); navigate("/"); };

  //filter for site names
  const filteredSites = sites
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

  // ── render ────────────────────────────────────────────
  return (
    <div className="am-page">

      {/* ── Sidebar ── */}
      <AdminSidebar activePage="sites" />

      {/* ── Main ── */}
      <main className="am-main">

        {/* Header */}
        <div className="am-header">
          <div>
            <p className="am-breadcrumb">{isEngineer ? 'Site Engineer' : 'Admin'} › Sites</p>
            <h1 className="am-title">Monitoring Sites</h1>
            <p className="am-subtitle">Manage lagoon monitoring locations and alert thresholds.</p>
          </div>
          <button className="am-btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={16} /> Add New Site</button>
        </div>

        {/* Stats */}
        <div className="am-stats">
          {[
            { icon: <MapPin size={24} color="#3b82f6" />, val: sites.length, label: "Total Sites" },
            { icon: <Compass size={24} color="#f59e0b" />, val: byRegion("Northern"), label: "Northern Province" },
            { icon: <Waves size={24} color="#0ea5e9" />, val: byRegion("Southern"), label: "Southern Province" },
            { icon: <ArrowRight size={24} color="#10b981" />, val: byRegion("Eastern"), label: "Eastern Province" },
            { icon: <ArrowLeft size={24} color="#8b5cf6" />, val: byRegion("Western"), label: "Western Province" },
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

        {/* Site Filter */}
        <div className="am-card" style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", gap: "14px", alignItems: "center" }}>
          <label className="am-lbl" style={{ margin: 0 }}>Filter by Site Name:</label>
          <input
            type="text"
            className="am-inp"
            style={{ width: "300px", margin: 0 }}
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && <div className="am-error">{error}</div>}

        {/* Loading */}
        {loading ? (
          <div className="am-loading">
            <div className="am-spinner" />
            <p>Loading sites…</p>
          </div>
        ) : (

          /* Table */
          <div className="am-card">
            <table className="am-table">
              <thead>
                <tr>
                  <th></th>
                  <th
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Click to toggle sort order"
                  >
                    Site Name {sortOrder === "asc" ? "▲" : "▼"}
                  </th>
                  <th>Location</th>
                  <th>Region</th>
                  <th>pH Range</th>
                  <th>Temp Range</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSites.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="am-empty">
                      No sites found. Click <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Plus size={14} /> Add New Site</strong> to get started.
                    </td>
                  </tr>
                ) : filteredSites.map((site, i) => (
                  <tr key={site._id} className="am-tr">
                    <td className="am-td-num">{i + 1}</td>
                    <td className="am-td-name">
                      <Link to={`/sites/${site._id}`} state={{ fromAdmin: true }} style={{ color: "#007bff", textDecoration: "underline", cursor: "pointer" }}>
                        {site.name}
                      </Link>
                    </td>
                    <td className="am-td-loc">{site.location}</td>
                    <td>
                      <span className={`am-badge am-badge--${regionClass(site.region)}`}>{site.region}</span>
                    </td>
                    <td className="am-td-data">{getParamRangeStr(site.thresholds, "ph")}</td>
                    <td className="am-td-data">{getParamRangeStr(site.thresholds, "temperature")}</td>
                    <td className="am-td-dim">{site.createdBy?.name || "Admin"}</td>
                    <td>
                      <div className="am-actions">
                        <button className="am-act am-act--edit" onClick={() => openEdit(site)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Pencil size={14} /> Edit</button>
                        <button className="am-act am-act--thresh" onClick={() => openThresh(site)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sliders size={14} /> Thresholds</button>
                        <button className="am-act am-act--del" onClick={() => openDelete(site)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={14} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ═══════ MODALS ═══════ */}

      {/* Add */}
      {showAdd && (
        <div className="am-overlay" onClick={() => setShowAdd(false)}>
          <div className="am-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-head">
              <h2>Add New Site</h2>
              <button className="am-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form className="am-modal-body" onSubmit={doAdd}>
              {formErr && <p className="am-ferr">{formErr}</p>}
              <label className="am-lbl">Site Name</label>
              <input className="am-inp" name="name" value={form.name} onChange={fc} placeholder="e.g. Negombo Lagoon Site" />
              <label className="am-lbl">Location (Coordinates or Address)</label>
              <input className="am-inp" name="location" value={form.location} onChange={fc} placeholder="e.g. 7.2081° N, 79.8461° E" />
              <label className="am-lbl">Region</label>
              <select className="am-inp" name="region" value={form.region} onChange={fc}>
                <option>Northern</option><option>Southern</option><option>Eastern</option><option>Western</option>
              </select>
              <div className="am-modal-foot">
                <button type="button" className="am-btn-sec" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="am-btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Site"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit */}
      {showEdit && (
        <div className="am-overlay" onClick={() => setShowEdit(false)}>
          <div className="am-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-head">
              <h2>Edit Site</h2>
              <button className="am-close" onClick={() => setShowEdit(false)}><X size={18} /></button>
            </div>
            <form className="am-modal-body" onSubmit={doEdit}>
              {formErr && <p className="am-ferr">{formErr}</p>}
              <label className="am-lbl">Site Name</label>
              <input className="am-inp" name="name" value={form.name} onChange={fc} />
              <label className="am-lbl">Location</label>
              <input className="am-inp" name="location" value={form.location} onChange={fc} />
              <label className="am-lbl">Region</label>
              <select className="am-inp" name="region" value={form.region} onChange={fc}>
                <option>Northern</option><option>Southern</option><option>Eastern</option><option>Western</option>
              </select>
              <div className="am-modal-foot">
                <button type="button" className="am-btn-sec" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="am-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thresholds */}
      {showThresh && (
        <div className="am-overlay" onClick={() => setShowThresh(false)}>
          <div className="am-modal am-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="am-modal-head">
              <h2>Alert Thresholds</h2>
              <button className="am-close" onClick={() => setShowThresh(false)}>✕</button>
            </div>
            <p className="am-modal-hint">Site: <strong>{selected?.name}</strong> — readings outside these values will trigger alerts.</p>
            <form className="am-modal-body" onSubmit={doThresh}>
              {formErr && <p className="am-ferr">{formErr}</p>}
              {[
                { key: "pH", label: "pH Level", unit: "" },
                { key: "temperature", label: "Temperature", unit: "°C" },
                { key: "salinity", label: "Salinity", unit: "ppt" },
                { key: "dissolved_o2", label: "Dissolved O₂", unit: "mg/L" },
              ].map(({ key, label, unit }) => (
                <div className="am-trow" key={key}>
                  <span className="am-tlbl">{label} {unit && <small>({unit})</small>}</span>
                  <div className="am-tinputs">
                    <div className="am-tfield">
                      <label>Min</label>
                      <input type="number" step="0.1" className="am-inp am-inp--sm"
                        value={thresh[key].min} onChange={e => setT(key, "min", e.target.value)} />
                    </div>
                    <span className="am-tdash">—</span>
                    <div className="am-tfield">
                      <label>Max</label>
                      <input type="number" step="0.1" className="am-inp am-inp--sm"
                        value={thresh[key].max} onChange={e => setT(key, "max", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="am-modal-foot">
                <button type="button" className="am-btn-sec" onClick={() => setShowThresh(false)}>Cancel</button>
                <button type="submit" className="am-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Thresholds"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete */}
      {showDelete && (
        <div className="am-overlay" onClick={() => setShowDelete(false)}>
          <div className="am-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-head">
              <h2>Confirm Delete</h2>
              <button className="am-close" onClick={() => setShowDelete(false)}>✕</button>
            </div>

            <div className="am-modal-body">
              <p>Are you sure you want to delete <strong>{selected?.name}</strong>?</p>

              <div className="am-modal-foot">
                <button
                  type="button" className="am-btn-sec" onClick={() => setShowDelete(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="am-btn-danger"
                  onClick={doDelete}
                  disabled={saving}
                >
                  {saving ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`am-toast am-toast--${toast.type}`}>
          <span className="am-toast-icon">
            {toast.type === "delete" ? "🗑️" : "✅"}
          </span>
          {toast.message}
        </div>
      )}

    </div>
  );
}

export default AdminMaps;