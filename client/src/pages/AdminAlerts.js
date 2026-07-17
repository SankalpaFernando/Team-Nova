import { Link } from "react-router-dom";
import "./AdminAlerts.css";
import mangrove from "../assests/mangrove.png";

function AdminAlerts() {
  return (
    <div
      className="admin-alerts-page"
      style={{ backgroundImage: `url(${mangrove})` }}
    >
      <div className="admin-alerts-overlay">

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
            <Link to="/profile">Profile</Link>
          </div>

        </div>

        <h1 className="title">Alert Management</h1>

        <div className="alerts-container">

          <div className="alert-card high">
            <h3>⚠ High Salinity Alert</h3>
            <p>Site A</p>
            <p>Salinity Level: 38 ppt</p>
            <p>Time: 10:30 AM</p>
          </div>

          <div className="alert-card medium">
            <h3>🌊 Water Level Rising</h3>
            <p>Site B</p>
            <p>Water Level: 2.5m</p>
            <p>Time: 09:45 AM</p>
          </div>

          <div className="alert-card low">
            <h3>🔋 Low Battery Warning</h3>
            <p>Device DEV-003</p>
            <p>Battery Level: 12%</p>
            <p>Time: 09:10 AM</p>
          </div>

          <div className="alert-card high">
            <h3>🚨 Device Offline</h3>
            <p>Device DEV-005</p>
            <p>Status: Offline</p>
            <p>Time: 08:50 AM</p>
          </div>

        </div>

      </div>
    </div>
  );
}

export default AdminAlerts;