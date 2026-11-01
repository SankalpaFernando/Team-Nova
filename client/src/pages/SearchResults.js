import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/navbar";
import UserNavbar from "../components/UserNavbar";
import AdminSidebar from "../components/AdminSidebar";
import UserLayout from "../components/UserLayout";
import Footer from "../components/Footer";
import mangrove from "../assests/mangrove.png";
import api from "../services/api";
import {
  MapPin,
  Radio,
  Sliders,
  AlertTriangle,
  FileText,
  Search,
  Thermometer
} from "lucide-react";
import "./SearchResults.css";

function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, isAdmin, isSiteEngineer } = useAuth();

  const query = new URLSearchParams(location.search).get("q")?.trim() || "";
  const [searchInput, setSearchInput] = useState(query);
  const [loading, setLoading] = useState(false);
  const [dbResults, setDbResults] = useState({
    sites: [],
    devices: [],
    sensors: [],
    parameters: [],
    alerts: []
  });

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Determine user level
  const isVisitor = !isLoggedIn;
  const isRegisteredUser = isLoggedIn && user?.role === "registered_user";
  const isAdminUser = isLoggedIn && isAdmin;
  const isEngineerUser = isLoggedIn && isSiteEngineer && !isAdmin;
  const isAdminShell = isAdminUser || isEngineerUser;

  // Pages customized for each user level
  const visitorPages = [
    {
      title: "Home",
      path: "/",
      description: "MangroveGuard overview, mission, and live monitoring highlights.",
      keywords: ["home", "mangrove", "guard", "mission", "telemetry", "landing"]
    },
    {
      title: "Mangrove Monitoring Sites",
      path: "/visitor-sites",
      description: "Interactive map and information about Sri Lanka mangrove plant locations.",
      keywords: ["site", "sites", "map", "jaffna", "negombo", "puttalam", "kalpitiya", "muthurajawela", "lagoon", "location"]
    },
    {
      title: "About MangroveGuard",
      path: "/visitor-about",
      description: "Project mission, IoT monitoring system, and mangrove conservation goals.",
      keywords: ["about", "mission", "iot", "conservation", "ecosystem", "sensor"]
    },
    {
      title: "Contact Us",
      path: "/visitor-contactus",
      description: "Get in touch with the MangroveGuard conservation team.",
      keywords: ["contact", "support", "help", "email", "message", "inquiry"]
    }
  ];

  const registeredUserPages = [
    {
      title: "Dashboard",
      path: "/dashboard",
      description: "Main mangrove monitoring dashboard and real-time sensor gauges.",
      keywords: ["dashboard", "home", "gauges", "overview", "sensors"]
    },
    {
      title: "Monitoring Sites",
      path: "/sites",
      description: "View all active lagoon and coastal monitoring sites with sensor telemetry.",
      keywords: ["site", "sites", "negombo", "puttalam", "jaffna", "kalpitiya", "lagoon"]
    },
    {
      title: "Telemetry Devices",
      path: "/devices",
      description: "View transmission devices and hardware online status.",
      keywords: ["device", "devices", "hardware", "online", "status"]
    },
    {
      title: "Sensor Probes",
      path: "/sensors",
      description: "View water chemistry sensor probes and calibration details.",
      keywords: ["sensor", "sensors", "probes", "calibration", "ph", "temperature"]
    },
    {
      title: "Alerts & Notifications",
      path: "/alerts",
      description: "Review environmental alert breaches and notifications.",
      keywords: ["alert", "alerts", "breach", "warning", "critical", "notification"]
    },
    {
      title: "About MangroveGuard",
      path: "/about",
      description: "Project mission, IoT monitoring system details, and team info.",
      keywords: ["about", "mission", "iot", "mangrove"]
    },
    {
      title: "Contact Us",
      path: "/contact",
      description: "Send messages to site engineers and platform admins.",
      keywords: ["contact", "support", "help", "email", "message"]
    }
  ];

  const engineerPages = [
    {
      title: "Site Engineer Dashboard",
      path: "/site-engineer-dashboard",
      description: "Telemetry status, site assignments, and device health.",
      keywords: ["dashboard", "engineer", "telemetry", "overview"]
    },
    {
      title: "My Change Requests",
      path: "/my-requests",
      description: "Track your parameter threshold change requests and approval status.",
      keywords: ["requests", "my requests", "status", "threshold"]
    },
    {
      title: "Monitoring Sites",
      path: "/admin-maps",
      description: "Configure sites, coordinates, regions, and parameter threshold boundaries.",
      keywords: ["sites", "maps", "boundaries", "locations", "jaffna", "negombo"]
    },
    {
      title: "Manage Devices",
      path: "/manage-devices",
      description: "Register, monitor, and assign IoT transmission devices to sites.",
      keywords: ["devices", "hardware", "transmission"]
    },
    {
      title: "Manage Sensors",
      path: "/manage-sensors",
      description: "Configure sensor probes, models, and parameter telemetry mappings.",
      keywords: ["sensors", "probes", "telemetry"]
    },
    {
      title: "Parameter Configuration",
      path: "/parameter-admin",
      description: "Define water quality parameters, safe ranges, and measurement units.",
      keywords: ["parameters", "ranges", "units", "ph", "salinity"]
    },
    {
      title: "System Alerts",
      path: "/admin-alerts",
      description: "Manage environmental threshold violations and notifications.",
      keywords: ["alerts", "violations", "notifications"]
    },
    {
      title: "Messages",
      path: "/admin-messages",
      description: "Inquiries submitted through the contact page.",
      keywords: ["messages", "inbox", "inquiries"]
    }
  ];

  const adminPagesList = [
    {
      title: "Admin Dashboard",
      path: "/admin-dashboard",
      description: "System operational overview, key metrics, and platform health.",
      keywords: ["dashboard", "admin", "metrics", "overview"]
    },
    {
      title: "Pending Change Requests",
      path: "/pending-requests",
      description: "Review and approve/reject parameter threshold change requests.",
      keywords: ["requests", "pending", "thresholds", "approvals"]
    },
    {
      title: "Manage Users",
      path: "/manage-users",
      description: "Create, view, and update user accounts and role assignments.",
      keywords: ["users", "manage", "accounts", "roles", "admin", "engineer"]
    },
    {
      title: "Recent Logins",
      path: "/recent-logins",
      description: "View recent user authentication and activity logs.",
      keywords: ["logins", "security", "activity", "audit"]
    },
    {
      title: "Monitoring Sites",
      path: "/admin-maps",
      description: "Configure sites, coordinates, regions, and parameter threshold boundaries.",
      keywords: ["sites", "maps", "boundaries", "locations", "jaffna", "negombo"]
    },
    {
      title: "Manage Devices",
      path: "/manage-devices",
      description: "Register, monitor, and assign IoT transmission devices to sites.",
      keywords: ["devices", "hardware", "transmission"]
    },
    {
      title: "Manage Sensors",
      path: "/manage-sensors",
      description: "Configure sensor probes, models, and parameter telemetry mappings.",
      keywords: ["sensors", "probes", "telemetry"]
    },
    {
      title: "Parameter Configuration",
      path: "/parameter-admin",
      description: "Define water quality parameters, safe ranges, and measurement units.",
      keywords: ["parameters", "ranges", "units", "ph", "salinity"]
    },
    {
      title: "System Alerts",
      path: "/admin-alerts",
      description: "Manage environmental threshold violations and notifications.",
      keywords: ["alerts", "violations", "notifications"]
    },
    {
      title: "Messages",
      path: "/admin-messages",
      description: "Inquiries submitted through the contact page.",
      keywords: ["messages", "inbox", "inquiries"]
    }
  ];

  const rolePages = isVisitor
    ? visitorPages
    : isRegisteredUser
    ? registeredUserPages
    : isEngineerUser
    ? engineerPages
    : adminPagesList;

  const matchedStaticPages = rolePages.filter((p) => {
    if (!query) return false;
    const qLower = query.toLowerCase();
    return (
      p.title.toLowerCase().includes(qLower) ||
      p.description.toLowerCase().includes(qLower) ||
      p.keywords.some((k) => k.includes(qLower))
    );
  });

  useEffect(() => {
    if (!query) {
      setDbResults({ sites: [], devices: [], sensors: [], parameters: [], alerts: [] });
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search`, { params: { q: query } });
        setDbResults(
          res.data.results || {
            sites: [],
            devices: [],
            sensors: [],
            parameters: [],
            alerts: []
          }
        );
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const handleInlineSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
  };

  const getSiteLink = (site) => {
    if (isVisitor) {
      return `/visitor-sites?site=${site._id}`;
    }
    return `/sites/${site._id}`;
  };

  const getSiteLinkState = () => {
    if (isAdminShell) {
      return { fromAdmin: true };
    }
    return undefined;
  };

  const getAlertLink = () => {
    if (isAdminShell) {
      return "/admin-alerts";
    }
    return "/alerts";
  };

  const totalCount =
    (matchedStaticPages.length || 0) +
    (dbResults.sites?.length || 0) +
    (dbResults.devices?.length || 0) +
    (dbResults.sensors?.length || 0) +
    (dbResults.parameters?.length || 0) +
    (dbResults.alerts?.length || 0);

  // Suggestion keywords based on role
  const suggestionsText = isVisitor
    ? "Jaffna, Negombo, Sites, About, or Contact"
    : isRegisteredUser
    ? "Dashboard, Sites, Devices, Sensors, Jaffna, Alerts, pH, or Temperature"
    : "Dashboard, Sites, Devices, Sensors, Parameters, Jaffna, or Alerts";

  // Reusable results content
  const renderResultsList = () => {
    if (loading) {
      return (
        <div className="no-results">
          <h2>Searching system database…</h2>
        </div>
      );
    }

    if (totalCount === 0) {
      return (
        <div className="no-results">
          <h2>No Results Found</h2>
          <p>
            Try searching using keywords such as <strong>{suggestionsText}</strong>.
          </p>
        </div>
      );
    }

    return (
      <div className="search-results-sections">
        {/* 1. Sites */}
        {dbResults.sites?.length > 0 && (
          <div className="results-group">
            <h2 className="group-title">
              <MapPin size={20} color="#ffd166" />
              <span>Mangrove Monitoring Sites ({dbResults.sites.length})</span>
            </h2>
            <div className="results-grid">
              {dbResults.sites.map((s) => (
                <Link
                  key={s._id}
                  to={getSiteLink(s)}
                  state={getSiteLinkState()}
                  className="result-card"
                >
                  <div className="card-badge">Mangrove Site</div>
                  <h2>{s.name}</h2>
                  <p>
                    <strong>Location:</strong> {s.location}
                  </p>
                  <p>
                    <strong>Region:</strong> {s.region} Region
                  </p>
                  <span className="card-action-hint">
                    {isVisitor
                      ? "View on Sri Lanka Mangrove Map →"
                      : "View Sensor Telemetry & Details →"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 2. Devices (Admin / Site Engineer only) */}
        {isAdminShell && dbResults.devices?.length > 0 && (
          <div className="results-group">
            <h2 className="group-title">
              <Radio size={20} color="#ffd166" />
              <span>IoT Transmission Devices ({dbResults.devices.length})</span>
            </h2>
            <div className="results-grid">
              {dbResults.devices.map((d) => (
                <Link key={d._id} to="/manage-devices" className="result-card">
                  <div className="card-badge hardware-badge">Hardware Device</div>
                  <h2>Device: {d.device_id}</h2>
                  <p>
                    <strong>Status:</strong> {d.status}
                  </p>
                  {d.site?.name && (
                    <p>
                      <strong>Assigned Site:</strong> {d.site.name}
                    </p>
                  )}
                  <span className="card-action-hint">Manage in Device Registry →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 3. Sensors (Admin / Site Engineer only) */}
        {isAdminShell && dbResults.sensors?.length > 0 && (
          <div className="results-group">
            <h2 className="group-title">
              <Thermometer size={20} color="#ffd166" />
              <span>Sensor Probes ({dbResults.sensors.length})</span>
            </h2>
            <div className="results-grid">
              {dbResults.sensors.map((sn) => (
                <Link key={sn._id} to="/manage-sensors" className="result-card">
                  <div className="card-badge sensor-badge">Sensor Probe</div>
                  <h2>{sn.model_name || "Sensor Probe"}</h2>
                  <p>
                    <strong>Serial:</strong> {sn.serial_number}
                  </p>
                  {sn.parameter && (
                    <p>
                      <strong>Parameter:</strong> {sn.parameter.label} ({sn.parameter.unit})
                    </p>
                  )}
                  <span className="card-action-hint">Configure Sensor Probe →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 4. Parameters (Admin / Site Engineer only) */}
        {isAdminShell && dbResults.parameters?.length > 0 && (
          <div className="results-group">
            <h2 className="group-title">
              <Sliders size={20} color="#ffd166" />
              <span>Parameters & Safe Thresholds ({dbResults.parameters.length})</span>
            </h2>
            <div className="results-grid">
              {dbResults.parameters.map((p) => (
                <Link key={p._id} to="/parameter-admin" className="result-card">
                  <div className="card-badge param-badge">Parameter</div>
                  <h2>
                    {p.label} ({p.key})
                  </h2>
                  <p>
                    <strong>Unit:</strong> {p.unit || "N/A"}
                  </p>
                  <p>
                    <strong>Safe Range:</strong> {p.valid_min} - {p.valid_max}
                  </p>
                  <span className="card-action-hint">Edit Range Thresholds →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 5. Alerts (Registered User, Admin, Site Engineer) */}
        {!isVisitor && dbResults.alerts?.length > 0 && (
          <div className="results-group">
            <h2 className="group-title">
              <AlertTriangle size={20} color="#ffd166" />
              <span>Environmental Alerts ({dbResults.alerts.length})</span>
            </h2>
            <div className="results-grid">
              {dbResults.alerts.map((a) => (
                <Link key={a._id} to={getAlertLink()} className="result-card alert-card">
                  <div className="card-badge alert-badge">Alert Event</div>
                  <h2>
                    {a.parameter_name}: {a.measured_value} {a.unit}
                  </h2>
                  <p>{a.message}</p>
                  <span className="card-action-hint">Review Alert Incident →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 6. Matched App Pages */}
        {matchedStaticPages.length > 0 && (
          <div className="results-group">
            <h2 className="group-title">
              <FileText size={20} color="#ffd166" />
              <span>Application Navigation Pages ({matchedStaticPages.length})</span>
            </h2>
            <div className="results-grid">
              {matchedStaticPages.map((item, idx) => (
                <Link key={idx} to={item.path} className="result-card page-card">
                  <div className="card-badge page-badge">Page</div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <span className="card-action-hint">Navigate to Page →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ADMIN / SITE ENGINEER SHELL LAYOUT
  if (isAdminShell) {
    return (
      <div className="am-page">
        <AdminSidebar activePage="search" />

        <main className="am-main admin-search-main">
          <div className="am-header">
            <div>
              <p className="am-breadcrumb">
                {isAdminUser ? "Admin" : "Site Engineer"} › Search
              </p>
              <h1 className="am-title">Search Results</h1>
              <p className="am-subtitle">
                System-wide results for <strong style={{ color: "#1d7068" }}>"{query}"</strong>
                {totalCount > 0 && ` (${totalCount} matches)`}
              </p>
            </div>
          </div>

          <form className="admin-search-form" onSubmit={handleInlineSearch}>
            <div className="admin-search-box">
              <Search size={18} color="#666" />
              <input
                type="text"
                placeholder="Search sites, hardware, sensors, parameters, alerts..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit">Search</button>
            </div>
          </form>

          <div className="admin-search-body">{renderResultsList()}</div>
        </main>
      </div>
    );
  }

  // REGISTERED USER SHELL LAYOUT
  if (isRegisteredUser) {
    return (
      <UserLayout activePage="dashboard">
        <div className="ul-header">
          <div>
            <p className="ul-breadcrumb">Member &rsaquo; Search</p>
            <h1 className="ul-title">Search Results</h1>
            <p className="ul-subtitle">
              System-wide results for <strong style={{ color: "#1d7068" }}>"{query}"</strong>
              {totalCount > 0 && ` (${totalCount} matches)`}
            </p>
          </div>
        </div>

        <form className="ul-filter-bar" onSubmit={handleInlineSearch} style={{ gap: "12px", marginBottom: "24px" }}>
          <input
            type="text"
            className="ul-select"
            style={{ flex: 1, minWidth: "240px" }}
            placeholder="Search sites, devices, gauges, alerts, locations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="ul-btn-sec">Search</button>
        </form>

        <div style={{ marginTop: "16px" }}>
          {renderResultsList()}
        </div>
      </UserLayout>
    );
  }

  // PUBLIC VISITOR LAYOUT
  return (
    <div className="search-page">
      <Navbar showBackHome={true} />

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

            {/* In-page Search Bar */}
            <form className="search-inline-form" onSubmit={handleInlineSearch}>
              <div className="search-inline-box">
                <input
                  type="text"
                  placeholder="Search mangrove locations, sites, Jaffna, Negombo..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="search-inline-btn" title="Search">
                  <Search size={18} />
                  <span>Search</span>
                </button>
              </div>
            </form>

            {renderResultsList()}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default SearchResults;
