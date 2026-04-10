import "./UserDashboard.css";
import { Link } from "react-router-dom";

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

      {/* Title */}
      <h2 className="dashboard-title">Mangrove Monitoring Dashboard</h2>

      {/* First Row */}
      <div className="card-row">
        <div className="card">Water Level</div>
        <div className="card">Temperature</div>
        <div className="card">Salinity</div>
      </div>

      {/* Second Row */}
      <div className="card-row">
        <div className="card">Battery Status</div>
        <div className="card">Active Devices</div>
        <div className="card">Alerts</div>
      </div>

      {/* Graph Section */}
      <div className="graph-box">
        Sensor Data Graph  
        <br/>
        (Temperature / Salinity)
      </div>

      {/* Alerts */}
      <div className="alerts-box">
        <h3>Recent Alerts</h3>
        <p>- High salinity detected</p>
        <p>- Water level rising</p>
      </div>

    </div>
  );
}

export default UserDashboard;