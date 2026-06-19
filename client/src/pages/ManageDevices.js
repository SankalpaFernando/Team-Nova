import { Link } from "react-router-dom";
import "./ManageDevices.css";
import mangrove from "../assests/mangrove.png";

function ManageDevices() {
  return (
    <div
      className="manage-devices-page"
      style={{ backgroundImage: `url(${mangrove})` }}
    >
      <div className="manage-devices-overlay">

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
            <Link to="/admin-profile">Profile</Link>
          </div>

        </div>

        <h1 className="title">Manage Devices</h1>

        <div className="table-container">

          <table>

            <thead>
              <tr>
                <th>Device ID</th>
                <th>Location</th>
                <th>Status</th>
                <th>Battery</th>
                <th>Last Updated</th>
              </tr>
            </thead>

            <tbody>

              <tr>
                <td>DEV-001</td>
                <td>Site A</td>
                <td>🟢 Online</td>
                <td>95%</td>
                <td>10:30 AM</td>
              </tr>

              <tr>
                <td>DEV-002</td>
                <td>Site B</td>
                <td>🟢 Online</td>
                <td>82%</td>
                <td>10:25 AM</td>
              </tr>

              <tr>
                <td>DEV-003</td>
                <td>Site C</td>
                <td>🔴 Offline</td>
                <td>12%</td>
                <td>09:15 AM</td>
              </tr>

              <tr>
                <td>DEV-004</td>
                <td>Site D</td>
                <td>🟢 Online</td>
                <td>67%</td>
                <td>10:28 AM</td>
              </tr>

            </tbody>

          </table>

        </div>

      </div>
    </div>
  );
}

export default ManageDevices;