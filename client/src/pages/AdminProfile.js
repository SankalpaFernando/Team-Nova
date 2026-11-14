import { useState } from "react";
import "./AdminProfile.css";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AdminSidebar from "../components/AdminSidebar";
import { User, Check, X, Pencil } from "lucide-react";

function AdminProfile() {
  const { user, refreshUser } = useAuth();
  const isEngineer = user?.role === 'site_engineer';

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

  return (
    <div className="mu-page">

      {/* ── Standard Admin Sidebar ── */}
      <AdminSidebar activePage="profile" />

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
                  {user?.name?.[0]?.toUpperCase() || <User size={40} />}
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
                    <button className="ap-save-btn" onClick={saveName} disabled={saving}><Check size={14} /></button>
                    <button className="ap-cancel-btn" onClick={cancelEdit} disabled={saving}><X size={14} /></button>
                  </div>
                ) : (
                  <div className="ap-value-inline">
                    <strong>{user?.name}</strong>
                    <button className="ap-pencil-btn" onClick={() => startEdit("name")} title="Edit name"><Pencil size={13} /></button>
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
                  <strong className="ap-role-badge">{isEngineer ? 'Site Engineer' : 'Admin'}</strong>
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
                    <button className="ap-pencil-btn" onClick={() => startEdit("password")} title="Change password"><Pencil size={13} /></button>
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
