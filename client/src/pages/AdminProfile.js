import { Link } from "react-router-dom";
import { useState } from "react";
import "./AdminProfile.css";
import mangrove from "../assests/mangrove.png";

function AdminProfile() {
  // Profile Image
  const [profileImage, setProfileImage] = useState(null);

  // Admin Profile Data
  const [profile, setProfile] = useState({
    fullName: "Admin User",
    email: "admin@mangroveguard.com",
    status: "Active",
    memberSince: "2025-01",
    lastLogin: new Date().toLocaleString(),
    password: "",
    confirmPassword: "",
  });

  // Upload Profile Image
  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Handle Form Input Changes
  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  // Save Changes
  const handleSubmit = (e) => {
    e.preventDefault();

    if (profile.password !== profile.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    alert("Profile Updated Successfully!");
  };

  return (
    <div
      className="admin-profile-page"
      style={{ backgroundImage: `url(${mangrove})` }}
    >
      <div className="admin-profile-overlay">

        {/* ================= Navbar ================= */}

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

        {/* ================= Header ================= */}

        <div className="profile-header">
          <h1>Admin Profile</h1>
        </div>

        {/* ================= Main Content ================= */}

        <div className="profile-container">

          {/* ================= Left Profile Card ================= */}

          <div className="profile-card">

            <div className="profile-image">

              {profileImage ? (
                <img src={profileImage} alt="Admin Profile" />
              ) : (
                <div className="default-avatar">👨‍💼</div>
              )}

            </div>

            <label className="upload-btn">
              Upload Image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageUpload}
              />
            </label>

            <hr />

            <div className="profile-details">

              <div className="detail-row">
                <span>Full Name</span>
                <strong>{profile.fullName}</strong>
              </div>

              <div className="detail-row">
                <span>Email</span>
                <strong>{profile.email}</strong>
              </div>

              <div className="detail-row">
                <span>Status</span>
                <strong
                  className={
                    profile.status === "Active"
                      ? "status-active"
                      : "status-inactive"
                  }
                >
                  {profile.status}
                </strong>
              </div>

              <div className="detail-row">
                <span>Last Login</span>
                <strong>{profile.lastLogin}</strong>
              </div>

              <div className="detail-row">
                <span>Member Since</span>
                <strong>{profile.memberSince}</strong>
              </div>

            </div>

          </div>

          {/* ================= Edit Profile Card ================= */}

          <div className="edit-card">

            <h2>Edit Profile</h2>

            <form onSubmit={handleSubmit}>

              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={profile.fullName}
                onChange={handleChange}
              />

              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
              />

              <label>Status</label>
              <select
                name="status"
                value={profile.status}
                onChange={handleChange}
              >
                <option value="Active">🟢 Active</option>
                <option value="Inactive">🔴 Inactive</option>
              </select>

              <label>Member Since</label>
              <input
                type="month"
                name="memberSince"
                value={profile.memberSince}
                onChange={handleChange}
              />

              <label>New Password</label>
              <input
                type="password"
                name="password"
                value={profile.password}
                onChange={handleChange}
                placeholder="Enter New Password"
              />

              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={profile.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
              />

              <button type="submit">
                Save Changes
              </button>

            </form>

          </div>

        </div>

      </div>
    </div>
  );
}

export default AdminProfile;