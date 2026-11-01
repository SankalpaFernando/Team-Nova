import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import UserLayout from "../components/UserLayout";
import { User, LogOut } from "lucide-react";

function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const [avatarPreview, setAvatarPreview] = useState(null);

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editingField, setEditingField] = useState(null);
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
    <UserLayout activePage="profile">
      <div className="ul-header">
        <div>
          <p className="ul-breadcrumb">Account &rsaquo; Profile</p>
          <h1 className="ul-title">User Profile</h1>
          <p className="ul-subtitle">Manage your personal account credentials and security settings.</p>
        </div>
      </div>

      <div className="profile-container" style={{ margin: "0 auto", maxWidth: "600px" }}>
        <div className="profile-card">
          <div className="profile-image">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profile" />
            ) : (
              <div className="default-avatar">
                <User size={32} color="#1f4d3a" />
              </div>
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
                  <button className="save-btn" onClick={saveName} disabled={saving}>✓</button>
                  <button className="cancel-btn" onClick={cancelEdit} disabled={saving}>✕</button>
                </div>
              ) : (
                <div className="value-inline">
                  <strong>{user?.name}</strong>
                  <button className="pencil-btn" onClick={() => startEdit("name")}>✎</button>
                </div>
              )}
            </div>

            {/* Email (Read-only verified) */}
            <div className="detail-row">
              <span>Email</span>
              <div className="value-inline">
                <strong>{user?.email}</strong>
                <span style={{ fontSize: "11.5px", fontWeight: "600", color: "#166534", background: "#dcfce7", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "10px", marginLeft: "8px" }}>
                  Verified
                </span>
              </div>
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

          <button className="logout-btn" onClick={handleLogout} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </UserLayout>
  );
}

export default Profile;
