import "./Alerts.css";
import { Link } from "react-router-dom";
import mangrove from "../assests/mangrove.png";

function Alerts() {
  return (
    <div>

      {/* Navbar */}
      <div className="dashboard-navbar">
        <div className="logo">🌿 MangroveGuard</div>

        <div className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/sites">Sites</Link>
          <Link to="/alerts">Alerts</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </div>

      {/* Background */}
      <div
        className="alerts-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >

        <h2 className="alerts-title">
          Alerts & Notifications
        </h2>

        {/* Alert Cards */}
        <div className="alerts-cards">

          <div className="alert-card high">
            <h3>High Salinity</h3>
            <p>Salinity levels have exceeded safe limits.</p>
            <span className="time">5 mins ago</span>
          </div>

          <div className="alert-card warning">
            <h3>Water Level Rising</h3>
            <p>Water level increasing rapidly in Site A.</p>
            <span className="time">15 mins ago</span>
          </div>

          <div className="alert-card normal">
            <h3>Temperature Stable</h3>
            <p>Temperature is within normal range.</p>
            <span className="time">30 mins ago</span>
          </div>

        </div>

        {/* Recent Alerts */}
        <div className="alerts-list">

          <h3>Recent Alerts</h3>

          <ul>
            <li>🚨 High salinity detected at Site B</li>
            <li>⚠️ Water level rising at Site A</li>
            <li>✅ All sensors active</li>
            <li>🔋 Battery low in Device #3</li>
          </ul>

        </div>

      </div>
    </div>
  );
}

export default Alerts;