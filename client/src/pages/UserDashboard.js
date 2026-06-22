import "./UserDashboard.css";
import { Link } from "react-router-dom";
import mangrove from "../assests/mangrove.png";

function UserDashboard() {
  return (
    <div className="dashboard">

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

      {/* Background Image */}
      <div
        className="dashboard-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >

        {/* Title */}
        <h2 className="dashboard-title">
          Mangrove Monitoring Dashboard
        </h2>

        {/* First Row */}
        <div className="card-row">

          <div className="card">
            <h3>Water Level</h3>
          </div>

          <div className="card">
            <h3>Temperature</h3>
          </div>

          <div className="card">
            <h3>Salinity</h3>
          </div>

        </div>

        {/* Second Row */}
        <div className="card-row">

          <div className="card">
            <h3>Battery Status</h3>
          </div>

          <div className="card">
            <h3>Active Devices</h3>
          </div>

          <div className="card">
            <h3>Alerts</h3>
          </div>

        </div>

        {/* Graph */}

        <div className="graph-box">

          <h3>Sensor Data Graph</h3>

          <div className="graph-placeholder">
            Temperature / Salinity
          </div>

        </div>

        {/* Alerts */}

        <div className="alerts-box">

          <h3>Recent Alerts</h3>

          <p>• High salinity detected</p>
          <p>• Water level rising</p>

        </div>

      </div>

    </div>
  );
}

export default UserDashboard;