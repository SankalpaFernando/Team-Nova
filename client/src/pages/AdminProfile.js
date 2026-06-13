import { Link } from "react-router-dom";
import "./AdminProfile.css";

function AdminProfile() {
  return (
    <div>

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

      <h1 className="title">Admin Profile</h1>

      <div className="profile-container">

        <div className="profile-card">

          <div className="profile-image">
            👤
          </div>

          <h2>Admin User</h2>

          <p>Email: admin@mangroveguard.com</p>
          <p>Role: Administrator</p>

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

            <button>
              Update Profile
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}

export default AdminProfile;