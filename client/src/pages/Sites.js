import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";
import UserLayout from "../components/UserLayout";
import "./AdminMaps.css";
import { MapPin, Compass, Waves, ArrowRight, ArrowLeft, Eye } from "lucide-react";

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

function Sites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const loadSites = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/sites");
      setSites(res.data.data || []);
    } catch {
      setError("Could not load sites. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    const handleSiteChange = () => loadSites();
    socket.on("site_created", handleSiteChange);
    socket.on("site_updated", handleSiteChange);
    socket.on("site_deleted", handleSiteChange);

    return () => {
      socket.off("site_created", handleSiteChange);
      socket.off("site_updated", handleSiteChange);
      socket.off("site_deleted", handleSiteChange);
    };
  }, []);

  const byRegion = (r) => sites.filter(s => s.region === r).length;
  const regionClass = (r) => ({ Northern: "rn", Southern: "rs", Eastern: "re", Western: "rw" }[r] || "rn");

  const filteredSites = sites
    .filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.location?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortOrder === "asc"
        ? (a.name || "").localeCompare(b.name || "")
        : (b.name || "").localeCompare(a.name || "")
    );

  return (
    <UserLayout activePage="sites">
      {/* Header */}
      <div className="ul-header">
        <div>
          <p className="ul-breadcrumb">Monitoring › Sites</p>
          <h1 className="ul-title">Monitoring Sites</h1>
          <p className="ul-subtitle">Lagoon and wetland monitoring locations across Sri Lanka.</p>
        </div>
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

      {/* Filter by Site Name */}
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

      {/* Table */}
      {loading ? (
        <div className="am-loading">
          <div className="am-spinner" />
          <p>Loading sites…</p>
        </div>
      ) : (
        <div className="am-card" style={{ overflowX: "auto" }}>
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan="7" className="am-empty">
                    No sites found matching your search.
                  </td>
                </tr>
              ) : (
                filteredSites.map((site, i) => (
                  <tr key={site._id} className="am-tr">
                    <td className="am-td-num">{i + 1}</td>
                    <td className="am-td-name">
                      <Link to={`/sites/${site._id}`} style={{ color: "#007bff", textDecoration: "underline", cursor: "pointer" }}>
                        {site.name}
                      </Link>
                    </td>
                    <td>{site.location}</td>
                    <td>
                      <span className={`am-badge am-badge-${regionClass(site.region)}`}>
                        {site.region}
                      </span>
                    </td>
                    <td>{getParamRangeStr(site.thresholds, "ph")}</td>
                    <td>{getParamRangeStr(site.thresholds, "temperature")}</td>
                    <td>
                      <Link
                        to={`/sites/${site._id}`}
                        className="am-btn-sec"
                        style={{
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          fontSize: "12px"
                        }}
                      >
                        <Eye size={13} />
                        <span>View Details</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </UserLayout>
  );
}

export default Sites;
