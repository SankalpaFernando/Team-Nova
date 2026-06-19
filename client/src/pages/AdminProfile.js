import { Link } from "react-router-dom";
import "./AdminProfile.css";
import mangrove from "../assests/mangrove.png";

function AdminProfile() {
  return (
    <div
      className="admin-profile-page"
      style={{ backgroundImage: `url(${mangrove})` }}
    >
      <div className="admin-profile-overlay">

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

        {/* Page Title */}
        <h1 className="title">Admin Profile</h1>

        {/* Profile Card */}
        <div className="profile-container">

          <div className="profile-card">

            <div className="profile-image">
              👤
            </div>

            <h2>Admin User</h2>

            <p><strong>Email:</strong> admin@mangroveguard.com</p>
            <p><strong>Role:</strong> Administrator</p>

            <form>

              <input
                type="text"
                placeholder="Full Name"
              />

              <input
                type="email"
                placeholder="Email Address"
              />

              <input
                type="password"
                placeholder="New Password"
              />

              <button type="submit">
                Update Profile
              </button>

            </form>

          </div>

        </div>

      </div>
    </div>
  );
}

export default AdminProfile;