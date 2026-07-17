import "./home.css";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import mangrove from "../assests/mangrove.png";
import { useAuth } from "../context/AuthContext";

function About() {
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

  return (
    <div className="visitor-about-page">

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

      {/* Full Screen Background */}
      <section
        className="visitor-about-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >

        {/* Dark Overlay */}
        <div className="visitor-about-overlay">

          {/* Main Card */}
          <div className="visitor-about-container">

            {/* Mission */}
            <div className="visitor-about-mission">
              <h2>🌍 Our Mission</h2>
              <p>
                Protect mangrove ecosystems through real-time IoT monitoring
                and smart environmental management.
              </p>
            </div>

            {/* About */}
            <h2 className="visitor-about-title">
              🌿 About Mangrove Guard
            </h2>

            <p className="visitor-about-description">
              Mangrove Guard is an IoT-based monitoring platform that collects
              real-time environmental data from devices installed in mangrove
              forests and provides instant updates through a web dashboard.
            </p>

            {/* Monitoring */}
            <h3 className="visitor-monitor-title">
              What We Monitor
            </h3>

            <div className="visitor-monitor-grid">

              <div className="visitor-monitor-card">
                <h4>🌊 Water Level</h4>
                <p>Tracks tidal water level changes.</p>
              </div>

              <div className="visitor-monitor-card">
                <h4>🧂 Salinity</h4>
                <p>Measures salt concentration.</p>
              </div>

              <div className="visitor-monitor-card">
                <h4>🌡 Temperature</h4>
                <p>Monitors water temperature.</p>
              </div>

              <div className="visitor-monitor-card">
                <h4>🔋 Device Status</h4>
                <p>Displays battery health.</p>
              </div>

            </div>

            {/* Why */}
            <div className="visitor-about-why">
              <h3>Why Mangrove Guard?</h3>
              <p>
                The platform enables researchers and conservation teams to
                monitor multiple mangrove sites, detect environmental changes,
                and make informed decisions using real-time sensor data.
              </p>
            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

export default About;