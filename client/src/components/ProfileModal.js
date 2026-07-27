import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./ProfileModal.css";

function ProfileModal({ isOpen, onClose }) {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // SMS Notification Preferences for non-admins
  const [smsEnabled, setSmsEnabled] = useState(user?.notificationPrefs?.sms_enabled || false);
  const [smsMinSeverity, setSmsMinSeverity] = useState(user?.notificationPrefs?.sms_min_severity || "critical");
  const [phone, setPhone] = useState(user?.notificationPrefs?.phone || "");

  const [editingField, setEditingField] = useState(null); // "name_email" | "password" | "sms" | null
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setSmsEnabled(user.notificationPrefs?.sms_enabled || false);
      setSmsMinSeverity(user.notificationPrefs?.sms_min_severity || "critical");
      setPhone(user.notificationPrefs?.phone || "");
    }
  }, [user, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const startEdit = (field) => {
    setFieldError("");
    setSuccessMessage("");
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
    setSuccessMessage("");
    setName(user?.name || "");
    setEmail(user?.email || "");
    setSmsEnabled(user?.notificationPrefs?.sms_enabled || false);
    setSmsMinSeverity(user?.notificationPrefs?.sms_min_severity || "critical");
    setPhone(user?.notificationPrefs?.phone || "");
  };

  const saveNameOrEmail = async () => {
    setFieldError("");
    setSuccessMessage("");
    setSaving(true);
    try {
      const res = await api.put("/users/profile", { name, email });
      const updatedUser = res.data.data;
      localStorage.setItem("mg_user", JSON.stringify({ ...user, ...updatedUser }));
      setSuccessMessage("Profile updated successfully.");
      setEditingField(null);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setFieldError(err.response?.data?.message || "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setFieldError("");
    setSuccessMessage("");

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
      setSuccessMessage("Password updated successfully.");
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

  const saveSmsPrefs = async () => {
    setFieldError("");
    setSuccessMessage("");

    if (smsEnabled && !phone) {
      setFieldError("Please enter a phone number to enable SMS notifications.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/users/notification-prefs", {
        sms_enabled: smsEnabled,
        sms_min_severity: smsMinSeverity,
        phone,
      });
      const updatedPrefs = res.data.data;
      const updatedUser = { ...user, notificationPrefs: updatedPrefs };
      localStorage.setItem("mg_user", JSON.stringify(updatedUser));
      setSuccessMessage("SMS notification preferences saved.");
      setEditingField(null);
    } catch (err) {
      setFieldError(err.response?.data?.message || "Couldn't save notification preferences.");
    } finally {
      setSaving(false);
    }
  };

  const showSmsPrefs = user?.role === "admin" || user?.role === "site_engineer";

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pm-header">
          <div className="pm-title-group">
            <span className="pm-icon">👤</span>
            <div>
              <h2 className="pm-title">Profile & Settings</h2>
              <p className="pm-subtitle">{user?.email || ""}</p>
            </div>
          </div>
          <button className="pm-close-btn" onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>

        {/* Success/Error Alerts */}
        {successMessage && <div className="pm-alert pm-alert--success">{successMessage}</div>}
        {fieldError && <div className="pm-alert pm-alert--error">{fieldError}</div>}

        {/* Content Body */}
        <div className="pm-body">
          {/* Section 1: User Identity Card */}
          <div className="pm-card">
            <div className="pm-card-row">
              <div className="pm-avatar-large">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="pm-user-name">{user?.name || "User"}</h3>
                <span className="pm-role-badge">
                  {user?.role === "admin" ? "System Admin" : user?.role === "site_engineer" ? "Site Engineer" : "Registered User"}
                </span>
                {user?.assignedSite?.name && (
                  <div className="pm-site-tag">Assigned Site: <strong>{user.assignedSite.name}</strong></div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Account Details */}
          <div className="pm-card">
            <div className="pm-card-header">
              <h3>Account Info</h3>
              {editingField !== "name_email" && (
                <button className="pm-edit-btn" onClick={() => startEdit("name_email")}>
                  Edit
                </button>
              )}
            </div>

            {editingField === "name_email" ? (
              <div className="pm-edit-form">
                <label className="pm-label">Name</label>
                <input
                  type="text"
                  className="pm-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <label className="pm-label">Email</label>
                <input
                  type="email"
                  className="pm-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="pm-form-actions">
                  <button className="pm-btn pm-btn--primary" onClick={saveNameOrEmail} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="pm-btn pm-btn--secondary" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="pm-info-grid">
                <div>
                  <div className="pm-field-label">Full Name</div>
                  <div className="pm-field-val">{user?.name || "—"}</div>
                </div>
                <div>
                  <div className="pm-field-label">Email Address</div>
                  <div className="pm-field-val">{user?.email || "—"}</div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Password Security */}
          <div className="pm-card">
            <div className="pm-card-header">
              <h3>Security & Password</h3>
              {editingField !== "password" && (
                <button className="pm-edit-btn" onClick={() => startEdit("password")}>
                  Change Password
                </button>
              )}
            </div>

            {editingField === "password" ? (
              <div className="pm-edit-form">
                <label className="pm-label">Current Password</label>
                <input
                  type="password"
                  className="pm-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <label className="pm-label">New Password</label>
                <input
                  type="password"
                  className="pm-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <label className="pm-label">Confirm New Password</label>
                <input
                  type="password"
                  className="pm-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <div className="pm-form-actions">
                  <button className="pm-btn pm-btn--primary" onClick={savePassword} disabled={saving}>
                    {saving ? "Updating..." : "Update Password"}
                  </button>
                  <button className="pm-btn pm-btn--secondary" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="pm-field-val" style={{ color: "#6b7280" }}>
                •••••••••••• (Last security update active)
              </div>
            )}
          </div>

          {/* Section 4: SMS Notifications (for Admin & Site Engineer) */}
          {showSmsPrefs && (
            <div className="pm-card">
              <div className="pm-card-header">
                <h3>SMS Notifications</h3>
                {editingField !== "sms" && (
                  <button className="pm-edit-btn" onClick={() => startEdit("sms")}>
                    Edit Preferences
                  </button>
                )}
              </div>

              {editingField === "sms" ? (
                <div className="pm-edit-form">
                  <label className="pm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={smsEnabled}
                      onChange={(e) => setSmsEnabled(e.target.checked)}
                    />
                    Enable SMS Alert Notifications
                  </label>

                  <label className="pm-label">Phone Number (E.164 format)</label>
                  <input
                    type="tel"
                    className="pm-input"
                    placeholder="+94771234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />

                  <label className="pm-label">Minimum Severity Trigger</label>
                  <select
                    className="pm-input"
                    value={smsMinSeverity}
                    onChange={(e) => setSmsMinSeverity(e.target.value)}
                  >
                    <option value="low">Low & Above</option>
                    <option value="medium">Medium & Above</option>
                    <option value="high">High & Above</option>
                    <option value="critical">Critical Only</option>
                  </select>

                  <div className="pm-form-actions">
                    <button className="pm-btn pm-btn--primary" onClick={saveSmsPrefs} disabled={saving}>
                      {saving ? "Saving..." : "Save Preferences"}
                    </button>
                    <button className="pm-btn pm-btn--secondary" onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pm-info-grid">
                  <div>
                    <div className="pm-field-label">Status</div>
                    <div className="pm-field-val">
                      {smsEnabled ? "🟢 Enabled" : "⚪ Disabled"}
                    </div>
                  </div>
                  <div>
                    <div className="pm-field-label">Phone Number</div>
                    <div className="pm-field-val">{phone || "Not set"}</div>
                  </div>
                  <div>
                    <div className="pm-field-label">Trigger Severity</div>
                    <div className="pm-field-val" style={{ textTransform: "capitalize" }}>
                      {smsMinSeverity}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
