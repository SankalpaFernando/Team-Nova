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

      {/* Background */}
      <div
        className="dashboard-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >

        <h2 className="dashboard-title">
          Mangrove Monitoring Dashboard
        </h2>

        {/* Summary Cards */}
        <div className="card-row">

          <div className="card">
            <h3>Battery Status</h3>
            <h2>92%</h2>
            <p>Average Battery Health</p>
          </div>

          <div className="card">
            <h3>Active Devices</h3>
            <h2>18</h2>
            <p>Devices Currently Online</p>
          </div>

          <div className="card">
            <h3>Total Alerts</h3>
            <h2>7</h2>
            <p>Alerts Requiring Attention</p>
          </div>

        </div>

        {/* Graph */}

        <div className="graph-box">

          <h3>Sensor Data Overview</h3>

          <div className="graph-placeholder">

            Temperature • Water Level • Salinity Graph

          </div>

        </div>

        {/* Recent Alerts */}

        <div className="alerts-box">

          <h3>Recent Alerts</h3>

          <table className="dashboard-table">

            <thead>

              <tr>
                <th>Site</th>
                <th>Alert</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>

              <tr>
                <td>Site A</td>
                <td>High Salinity</td>
                <td className="pending">Pending</td>
              </tr>

              <tr>
                <td>Site B</td>
                <td>Water Level Rising</td>
                <td className="resolved">Resolved</td>
              </tr>

              <tr>
                <td>Site C</td>
                <td>Low Battery</td>
                <td className="pending">Pending</td>
              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default UserDashboard;