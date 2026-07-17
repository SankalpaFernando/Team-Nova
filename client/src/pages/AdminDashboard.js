import { Link } from "react-router-dom";
import "./AdminDashboard.css";
import mangrove from "../assests/mangrove.png";

function AdminDashboard() {
  return (
    <div
      className="admin-dashboard"
      style={{ backgroundImage: `url(${mangrove})` }}
    >
      <div className="dashboard-overlay">

        {/* Navbar */}
        <div className="admin-navbar">

          <div className="logo">
            🌿 MangroveGuard Admin
          </div>

          <div className="nav-links">
            <Link to="/admin-dashboard">Dashboard</Link>
            <Link to="/manage-users">Users</Link>
            <Link to="/manage-devices">Devices</Link>
            <Link to="/admin-alerts">Alerts</Link>
            <Link to="/admin-maps">Sites</Link>
            <Link to="/admin-messages">Messages</Link>
            <Link to="/profile">Profile</Link>
          </div>

        </div>

        <h1 className="title">Admin Dashboard</h1>

        {/* Top Cards */}
        <div className="card-row">

          <div className="card">
            <h3>Total Users</h3>
            <p>120</p>
          </div>

          <div className="card">
            <h3>Active Devices</h3>
            <p>18</p>
          </div>

          <div className="card">
            <h3>Total Alerts</h3>
            <p>7</p>
          </div>

        </div>

        <div className="card-row">

          <div className="card">
            <h3>Water Level</h3>
            <p>1.8 m</p>
          </div>

          <div className="card">
            <h3>Temperature</h3>
            <p>29°C</p>
          </div>

          <div className="card">
            <h3>Salinity</h3>
            <p>32 ppt</p>
          </div>

        </div>

        {/* Dashboard Sections */}
        <div className="section-grid">

          <div className="info-box">
            <h2>📡 Device Status Overview</h2>
            <p>🟢 Device 01 - Online</p>
            <p>🟢 Device 02 - Online</p>
            <p>🔴 Device 03 - Offline</p>
            <p>🟢 Device 04 - Online</p>
          </div>

          <div className="info-box">
            <h2>🚨 Recent Alerts</h2>
            <p>High salinity detected at Site A</p>
            <p>Water level rising at Site B</p>
            <p>Low battery detected on Device 03</p>
          </div>

          <div className="info-box">
            <h2>👥 Recently Registered Users</h2>
            <p>User 01</p>
            <p>User 02</p>
            <p>User 03</p>
          </div>

          <div className="info-box">
            <h2>📍 Site Summary</h2>
            <p>Total Monitoring Sites: 5</p>
            <p>Active Sites: 4</p>
            <p>Sites Under Maintenance: 1</p>
          </div>

        </div>

        {/* System Status */}
        <div className="full-width-box">

          <h2>⚙️ System Status</h2>

          <p>Database: Connected</p>
          <p>Server Status: Running</p>
          <p>Last Updated: Just Now</p>

        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;