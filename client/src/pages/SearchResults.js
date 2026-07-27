import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import UserNavbar from "../components/UserNavbar";
import mangrove from "../assests/mangrove.png";
import api from "../services/api";
import "./SearchResults.css";

function SearchResults() {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("q")?.trim() || "";

  const [loading, setLoading] = useState(false);
  const [dbResults, setDbResults] = useState({
    sites: [],
    devices: [],
    sensors: [],
    parameters: [],
    alerts: []
  });

  const staticPages = [
    { title: "Dashboard", path: "/dashboard", description: "Main mangrove monitoring dashboard and real-time sensor gauges.", keywords: ["dashboard", "home", "gauges", "overview"] },
    { title: "Monitoring Sites", path: "/sites", description: "View all active lagoon and coastal monitoring sites.", keywords: ["site", "sites", "negombo", "puttalam", "kalpitiya"] },
    { title: "Alerts & Notifications", path: "/alerts", description: "Review environmental alert breaches and notifications.", keywords: ["alert", "alerts", "breach", "warning", "critical"] },
    { title: "About MangroveGuard", path: "/about", description: "Project mission, IoT monitoring system details, and team info.", keywords: ["about", "mission", "iot", "mangrove"] },
    { title: "Contact Us", path: "/contact", description: "Send messages to site engineers and platform admins.", keywords: ["contact", "support", "help", "email", "message"] }
  ];

  const matchedStaticPages = staticPages.filter(p => {
    const qLower = query.toLowerCase();
    return (
      p.title.toLowerCase().includes(qLower) ||
      p.description.toLowerCase().includes(qLower) ||
      p.keywords.some(k => k.includes(qLower))
    );
  });

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search`, { params: { q: query } });
        setDbResults(res.data.results || { sites: [], devices: [], sensors: [], parameters: [], alerts: [] });
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const hasDbResults =
    (dbResults.sites?.length || 0) > 0 ||
    (dbResults.devices?.length || 0) > 0 ||
    (dbResults.sensors?.length || 0) > 0 ||
    (dbResults.parameters?.length || 0) > 0 ||
    (dbResults.alerts?.length || 0) > 0;

  const totalCount =
    (matchedStaticPages.length || 0) +
    (dbResults.sites?.length || 0) +
    (dbResults.devices?.length || 0) +
    (dbResults.sensors?.length || 0) +
    (dbResults.parameters?.length || 0) +
    (dbResults.alerts?.length || 0);

  return (
    <div className="search-page">
      <UserNavbar />

      <section
        className="search-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >
        <div className="search-overlay">
          <div className="search-container">
            <h1>Search Results</h1>
            <p className="search-text">
              Results for <span className="search-query">"{query}"</span>
              {totalCount > 0 && <span> ({totalCount} matches)</span>}
            </p>

            {loading ? (
              <div className="no-results">
                <h2>Searching system database…</h2>
              </div>
            ) : totalCount > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* 1. Sites */}
                {dbResults.sites?.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: "18px", color: "#ffd166", marginBottom: "12px" }}>📍 Sites ({dbResults.sites.length})</h2>
                    <div className="results-grid">
                      {dbResults.sites.map(s => (
                        <Link key={s._id} to={`/sites/${s._id}`} className="result-card">
                          <h2>{s.name}</h2>
                          <p>Location: <strong>{s.location}</strong> ({s.region} Region)</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Devices */}
                {dbResults.devices?.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: "18px", color: "#ffd166", marginBottom: "12px" }}>📡 Devices ({dbResults.devices.length})</h2>
                    <div className="results-grid">
                      {dbResults.devices.map(d => (
                        <Link key={d._id} to="/manage-devices" className="result-card">
                          <h2>Device ID: {d.device_id}</h2>
                          <p>Status: {d.status} {d.site?.name ? `· Site: ${d.site.name}` : ""}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Parameters */}
                {dbResults.parameters?.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: "18px", color: "#ffd166", marginBottom: "12px" }}>⚙️ Parameters ({dbResults.parameters.length})</h2>
                    <div className="results-grid">
                      {dbResults.parameters.map(p => (
                        <Link key={p._id} to="/parameter-admin" className="result-card">
                          <h2>{p.label} ({p.key})</h2>
                          <p>Unit: {p.unit || "N/A"} · Range: {p.valid_min} - {p.valid_max}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Alerts */}
                {dbResults.alerts?.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: "18px", color: "#ffd166", marginBottom: "12px" }}>🚨 Alerts ({dbResults.alerts.length})</h2>
                    <div className="results-grid">
                      {dbResults.alerts.map(a => (
                        <Link key={a._id} to="/admin-alerts" className="result-card">
                          <h2>{a.parameter_name}: {a.measured_value} {a.unit}</h2>
                          <p>{a.message} ({a.severity_level})</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. App Pages */}
                {matchedStaticPages.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: "18px", color: "#ffd166", marginBottom: "12px" }}>📄 App Pages ({matchedStaticPages.length})</h2>
                    <div className="results-grid">
                      {matchedStaticPages.map((item, idx) => (
                        <Link key={idx} to={item.path} className="result-card">
                          <h2>{item.title}</h2>
                          <p>{item.description}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-results">
                <h2>No Results Found</h2>
                <p>
                  Try searching using keywords such as <strong>Dashboard</strong>, <strong>Sites</strong>, <strong>pH</strong>, <strong>Salinity</strong>, <strong>Negombo</strong>, or <strong>Alert</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default SearchResults;