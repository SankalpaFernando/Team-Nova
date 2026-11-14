import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./AdminProfile.css";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function AdminProfile() {
  const { user, logout, refreshUser } = useAuth();
  const isEngineer = user?.role === 'site_engineer';
  const navigate = useNavigate();

  // ── Avatar ─────────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState(null);

  // ── Editable fields ────────────────────────────────────
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editingField, setEditingField] = useState(null); // "name" | "password" | null
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const startEdit = (field) => {
    setFieldError("");
    setEditingField(field);
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
  };

  const saveName = async () => {
    setFieldError("");
    setSaving(true);
    try {
      await api.put("/users/profile", { name });
      await refreshUser();
      setEditingField(null);
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

  return (
    <div className="mu-page">

      {/* ── Sidebar (same as other admin pages) ── */}
      <aside className="mu-sidebar">
        <div className="mu-brand">
          <span className="mu-brand-icon">🌿</span>
          <div>
            <div className="mu-brand-name">MangroveGuard</div>
            <div className="mu-brand-role">Admin Panel</div>
          </div>
        </div>

        <nav className="mu-nav">
          {[
            { to: "/admin-dashboard", icon: "⬛", label: "Dashboard" },
            { to: "/manage-users",    icon: "👥", label: "Users"    },
            { to: "/manage-devices",  icon: "📡", label: "Devices"  },
            { to: "/manage-sensors",  icon: "🔬", label: "Sensors"  },
            { to: "/parameter-admin", icon: "⚙️", label: "Parameters"},
            { to: "/admin-alerts",    icon: "🔔", label: "Alerts"   },
            { to: "/admin-maps",      icon: "📍", label: "Sites"    },
            { to: "/admin-messages",  icon: "✉️", label: "Messages" },
            { to: "/admin-profile",   icon: "👤", label: "Profile", active: true },
          ].map(({ to, icon, label, active }) => (
            <Link
              key={to}
              to={to}
              className={`mu-nav-link ${active ? "mu-nav-link--active" : ""}`}
            >
              <span className="mu-nav-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mu-sidebar-bottom">
          <div className="mu-user-card">
            <div className="mu-user-avatar">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <div className="mu-user-name">{user?.name || "Admin"}</div>
              <div className="mu-user-email">{user?.email || ""}</div>
            </div>
          </div>
          <button className="mu-logout-btn" onClick={handleLogout}>
            ⏻ Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="mu-main">

        {/* Header */}
        <div className="mu-header">
          <div>
            <p className="mu-breadcrumb">{isEngineer ? 'Site Engineer' : 'Admin'} › Profile</p>
            <h1 className="mu-title">{isEngineer ? 'Site Engineer Profile' : 'Admin Profile'}</h1>
            <p className="mu-subtitle">
              Manage your account details and security settings.
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="ap-container">
          <div className="ap-card">

            <div className="ap-image">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Admin" />
              ) : (
                <div className="ap-default-avatar">
                  {user?.name?.[0]?.toUpperCase() || "👤"}
                </div>
              )}
            </div>

            <label className="ap-upload-btn">
              Upload Image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                hidden
              />
            </label>

            <hr />

            {fieldError && <p className="ap-field-error">{fieldError}</p>}

            <div className="ap-details">

              {/* Name */}
              <div className="ap-row">
                <span>Full Name</span>

                {editingField === "name" ? (
                  <div className="ap-edit-inline">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                    <button className="ap-save-btn" onClick={saveName} disabled={saving}>✓</button>
                    <button className="ap-cancel-btn" onClick={cancelEdit} disabled={saving}>✕</button>
                  </div>
                ) : (
                  <div className="ap-value-inline">
                    <strong>{user?.name}</strong>
                    <button className="ap-pencil-btn" onClick={() => startEdit("name")}>✎</button>
                  </div>
                )}
              </div>

              {/* Email (Read-only verified) */}
              <div className="ap-row">
                <span>Email</span>
                <div className="ap-value-inline">
                  <strong>{user?.email}</strong>
                  <span style={{ fontSize: "11.5px", fontWeight: "600", color: "#166534", background: "#dcfce7", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "10px", marginLeft: "8px" }}>
                    Verified
                  </span>
                </div>
              </div>

              {/* Role (admin-only, read-only) */}
              <div className="ap-row">
                <span>Role</span>
                <div className="ap-value-inline">
                  <strong className="ap-role-badge">Admin</strong>
                </div>
              </div>

              {/* Password */}
              <div className="ap-row ap-password-row">
                <span>Password</span>

                {editingField === "password" ? (
                  <div className="ap-edit-inline ap-password-edit">
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
                    <div className="ap-password-edit-actions">
                      <button className="ap-save-btn ap-save-btn--wide" onClick={savePassword} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button className="ap-cancel-btn ap-cancel-btn--wide" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ap-value-inline">
                    <strong>••••••••</strong>
                    <button className="ap-pencil-btn" onClick={() => startEdit("password")}>✎</button>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      </main>
    </div>
  );
}

export default AdminProfile;
