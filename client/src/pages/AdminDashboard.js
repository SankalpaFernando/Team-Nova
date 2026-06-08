import { Link } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  return (
    <div>

      <div className="admin-navbar">
        <div className="logo">🌿 MangroveGuard Admin</div>

        <div className="nav-links">
          <Link to="/admin-dashboard">Dashboard</Link>
          <Link to="/manage-users">Users</Link>
          <Link to="/manage-devices">Devices</Link>
          <Link to="/admin-alerts">Alerts</Link>
          <Link to="/admin-maps">Maps</Link>
          <Link to="/admin-profile">Profile</Link>
        </div>
      </div>

      <h1 className="title">Admin Dashboard</h1>

      <div className="card-row">
        <div className="card">Total Users</div>
        <div className="card">Active Devices</div>
        <div className="card">Alerts</div>
      </div>

      <div className="card-row">
        <div className="card">Water Level</div>
        <div className="card">Temperature</div>
        <div className="card">Salinity</div>
      </div>

    </div>
  );
}

export default AdminDashboard;