import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./Profile.css";
import mangrove from "../assests/mangrove.png";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Profile() {
  const { user, logout } = useAuth();
  console.log(user);
  const navigate = useNavigate();

  const [avatarPreview, setAvatarPreview] = useState(null);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editingField, setEditingField] = useState(null); // "name" | "email" | "password" | null
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the navbar dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const startEdit = (field) => {
    setFieldError("");
    setEditingField(field);
    // Reset password fields fresh every time that editor opens
    if (field === "password") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setFieldError("");
    setName(user?.name || "");
    setEmail(user?.email || "");
  };

  const saveNameOrEmail = async () => {
    setFieldError("");
    setSaving(true);
    try {
      const res = await api.put("/users/profile", { name, email });
      const updatedUser = res.data.data;
      localStorage.setItem("mg_user", JSON.stringify({ ...user, ...updatedUser }));
      setEditingField(null);
      // Reflects instantly here; a page refresh will also pick it up
      // via AuthContext reading mg_user on next load.
      window.location.reload();
    } catch (err) {
      setFieldError(err.response?.data?.message || "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setFieldError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFieldError("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError("New passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setFieldError("New password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/auth/updatepassword", {
        currentPassword,
        newPassword,
      });
      // Backend issues a fresh token on password change
      localStorage.setItem("mg_token", res.data.token);
      setEditingField(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setFieldError(err.response?.data?.message || "Couldn't update password.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : null;

  return (
    <div
      className="profile-page"
      style={{ backgroundImage: `url(${mangrove})` }}
    >
      <div className="profile-overlay">

        {/* Navbar */}
        <div className="dashboard-navbar">

          <div className="logo">🌿 MangroveGuard</div>

          <div className="nav-links">
            {user?.role === "admin" ? (
              <>
                <Link to="/admin-dashboard">Dashboard</Link>
                <Link to="/manage-users">Users</Link>
                <Link to="/manage-devices">Devices</Link>
                <Link to="/admin-alerts">Alerts</Link>
                <Link to="/admin-maps">Sites</Link>
              </>
            ) : (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/sites">Sites</Link>
                <Link to="/alerts">Alerts</Link>
                <Link to="/about">About</Link>
                <Link to="/contact">Contact</Link>
              </>
            )}
            
            <div className="profile-menu" ref={menuRef}>
              <button
                className="avatar-btn"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" />
                ) : initial ? (
                  <span>{initial}</span>
                ) : (
                  <span>👤</span>
                )}
              </button>

              {menuOpen && (
                <div className="profile-dropdown">
                  <Link to="/profile" onClick={() => setMenuOpen(false)}>
                    👤 Profile
                  </Link>
                  <button onClick={handleLogout}>🚪 Logout</button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Header */}
        <div className="profile-header">
          <h1>User Profile</h1>
        </div>

        {/* Centered Profile Card */}
        <div className="profile-container">

          <div className="profile-card">

            <div className="profile-image">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" />
              ) : (
                <div className="default-avatar">👤</div>
              )}
            </div>

            <label className="upload-btn">
              Upload Image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                hidden
              />
            </label>

            <hr />

            {fieldError && <p className="field-error">{fieldError}</p>}

            <div className="profile-details">

              {/* Name */}
              <div className="detail-row">
                <span>Full Name</span>

                {editingField === "name" ? (
                  <div className="edit-inline">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                    <button className="save-btn" onClick={saveNameOrEmail} disabled={saving}>✓</button>
                    <button className="cancel-btn" onClick={cancelEdit} disabled={saving}>✕</button>
                  </div>
                ) : (
                  <div className="value-inline">
                    <strong>{user?.name}</strong>
                    <button className="pencil-btn" onClick={() => startEdit("name")}>✎</button>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="detail-row">
                <span>Email</span>

                {editingField === "email" ? (
                  <div className="edit-inline">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                    <button className="save-btn" onClick={saveNameOrEmail} disabled={saving}>✓</button>
                    <button className="cancel-btn" onClick={cancelEdit} disabled={saving}>✕</button>
                  </div>
                ) : (
                  <div className="value-inline">
                    <strong>{user?.email}</strong>
                    <button className="pencil-btn" onClick={() => startEdit("email")}>✎</button>
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="detail-row password-row">
                <span>Password</span>

                {editingField === "password" ? (
                  <div className="edit-inline password-edit">
                    <input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoFocus
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <div className="password-edit-actions">
                      <button className="save-btn" onClick={savePassword} disabled={saving}>Save</button>
                      <button className="cancel-btn" onClick={cancelEdit} disabled={saving}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="value-inline">
                    <strong>••••••••</strong>
                    <button className="pencil-btn" onClick={() => startEdit("password")}>✎</button>
                  </div>
                )}
              </div>

            </div>

            <button className="logout-btn" onClick={handleLogout}>
              🚪 Log Out
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}

export default Profile;