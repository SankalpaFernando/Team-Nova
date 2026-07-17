import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./ManageUsers.css";

function ManageUsers() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Data state ─────────────────────────────────────────
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // ── Modal state ────────────────────────────────────────
  const [showAdd, setShowAdd]       = useState(false);
  const [showEdit, setShowEdit]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]     = useState(null);

  // ── Form state ─────────────────────────────────────────
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "registered_user"
  });
  const [saving, setSaving]   = useState(false);
  const [formErr, setFormErr] = useState("");

  // ── Toast ──────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ── Fetch all users ────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users");
      setUsers(res.data.data || []);
    } catch {
      setError("Could not load users. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Counts for stat cards ──────────────────────────────
  const countByRole = (role) => users.filter(u => u.role === role).length;

  // ── Add user ───────────────────────────────────────────
  const openAdd = () => {
    setForm({ name: "", email: "", password: "", role: "registered_user" });
    setFormErr("");
    setShowAdd(true);
  };

  const doAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormErr("Name, email and password are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/users", form);
      setShowAdd(false);
      load();
      showToast("User created successfully!");
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit user ──────────────────────────────────────────
  const openEdit = (u) => {
    setSelected(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setFormErr("");
    setShowEdit(true);
  };

  const doEdit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setFormErr("Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/users/${selected._id}`, {
        name: form.name,
        email: form.email,
        role: form.role
      });
      setShowEdit(false);
      load();
      showToast("User updated successfully!");
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete user ────────────────────────────────────────
  const openDelete = (u) => {
    setSelected(u);
    setShowDelete(true);
  };

  const doDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/users/${selected._id}`);
      setShowDelete(false);
      load();
      showToast("User deleted successfully.", "delete");
    } catch (err) {
      setError("Failed to delete user.");
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────
  const fc = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const roleClass = (role) => ({
    admin:            "mu-badge--admin",
    registered_user:  "mu-badge--user",
    visitor:          "mu-badge--visitor"
  }[role] || "mu-badge--user");

  const roleLabel = (role) => ({
    admin:            "Admin",
    registered_user:  "Registered User",
    visitor:          "Visitor"
  }[role] || role);

  const handleLogout = () => { logout(); navigate("/"); };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="mu-page">

      {/* ── Sidebar ── */}
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
            { to: "/manage-users",    icon: "👥", label: "Users",   active: true },
            { to: "/manage-devices",  icon: "📡", label: "Devices"  },
            { to: "/admin-alerts",    icon: "🔔", label: "Alerts"   },
            { to: "/admin-maps",      icon: "📍", label: "Sites"    },
            { to: "/admin-profile",   icon: "👤", label: "Profile"  },
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
            <p className="mu-breadcrumb">Admin › Users</p>
            <h1 className="mu-title">Manage Users</h1>
            <p className="mu-subtitle">
              View, create, edit and remove system users.
            </p>
          </div>
          <button className="mu-btn-primary" onClick={openAdd}>
            ＋ Create User
          </button>
        </div>

        {/* Stats */}
        <div className="mu-stats">
          {[
            { icon: "👥", val: users.length,                label: "Total Users"       },
            { icon: "🛡️", val: countByRole("admin"),         label: "Admins"            },
            { icon: "👤", val: countByRole("registered_user"), label: "Registered Users" },
            { icon: "🌐", val: countByRole("visitor"),       label: "Visitors"          },
          ].map((s, i) => (
            <div className="mu-stat-card" key={i}>
              <span className="mu-stat-icon">{s.icon}</span>
              <div>
                <div className="mu-stat-val">{s.val}</div>
                <div className="mu-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && <div className="mu-error">{error}</div>}

        {/* Loading */}
        {loading ? (
          <div className="mu-loading">
            <div className="mu-spinner" />
            <p>Loading users…</p>
          </div>
        ) : (

          /* Table */
          <div className="mu-card">
            <table className="mu-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="mu-empty">
                      No users found. Click <strong>＋ Create User</strong> to add one.
                    </td>
                  </tr>
                ) : users.map((u, i) => (
                  <tr key={u._id} className="mu-tr">
                    <td className="mu-td-num">{i + 1}</td>
                    <td className="mu-td-name">
                      <div className="mu-name-row">
                        <div className="mu-avatar">
                          {u.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        {u.name}
                      </div>
                    </td>
                    <td className="mu-td-email">{u.email}</td>
                    <td>
                      <span className={`mu-badge ${roleClass(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="mu-td-dim">{formatDate(u.created_at)}</td>
                    <td>
                      <div className="mu-actions">
                        <button
                          className="mu-act mu-act--edit"
                          onClick={() => openEdit(u)}
                        >
                          ✏ Edit
                        </button>
                        <button
                          className="mu-act mu-act--del"
                          onClick={() => openDelete(u)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ═══════ MODALS ═══════ */}

      {/* Add User */}
      {showAdd && (
        <div className="mu-overlay" onClick={() => setShowAdd(false)}>
          <div className="mu-modal" onClick={e => e.stopPropagation()}>
            <div className="mu-modal-head">
              <h2>Create New User</h2>
              <button className="mu-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form className="mu-modal-body" onSubmit={doAdd}>
              {formErr && <p className="mu-ferr">{formErr}</p>}

              <label className="mu-lbl">Full Name</label>
              <input
                className="mu-inp"
                name="name"
                value={form.name}
                onChange={fc}
                placeholder="e.g. Kasun Perera"
              />

              <label className="mu-lbl">Email Address</label>
              <input
                className="mu-inp"
                type="email"
                name="email"
                value={form.email}
                onChange={fc}
                placeholder="e.g. kasun@gmail.com"
              />

              <label className="mu-lbl">Password</label>
              <input
                className="mu-inp"
                type="password"
                name="password"
                value={form.password}
                onChange={fc}
                placeholder="Minimum 6 characters"
              />

              <label className="mu-lbl">Role</label>
              <select className="mu-inp" name="role" value={form.role} onChange={fc}>
                <option value="registered_user">Registered User</option>
                <option value="admin">Admin</option>
              </select>

              <div className="mu-modal-foot">
                <button
                  type="button"
                  className="mu-btn-sec"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mu-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User */}
      {showEdit && (
        <div className="mu-overlay" onClick={() => setShowEdit(false)}>
          <div className="mu-modal" onClick={e => e.stopPropagation()}>
            <div className="mu-modal-head">
              <h2>Edit User</h2>
              <button className="mu-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form className="mu-modal-body" onSubmit={doEdit}>
              {formErr && <p className="mu-ferr">{formErr}</p>}

              <label className="mu-lbl">Full Name</label>
              <input
                className="mu-inp"
                name="name"
                value={form.name}
                onChange={fc}
              />

              <label className="mu-lbl">Email Address</label>
              <input
                className="mu-inp"
                type="email"
                name="email"
                value={form.email}
                onChange={fc}
              />

              <label className="mu-lbl">Role</label>
              <select className="mu-inp" name="role" value={form.role} onChange={fc}>
                <option value="registered_user">Registered User</option>
                <option value="admin">Admin</option>
              </select>

              <div className="mu-modal-foot">
                <button
                  type="button"
                  className="mu-btn-sec"
                  onClick={() => setShowEdit(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mu-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDelete && (
        <div className="mu-overlay" onClick={() => setShowDelete(false)}>
          <div className="mu-modal mu-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="mu-modal-head">
              <h2>Confirm Delete</h2>
              <button className="mu-close" onClick={() => setShowDelete(false)}>✕</button>
            </div>
            <div className="mu-del-body">
              <div className="mu-del-icon">🗑️</div>
              <p>
                Are you sure you want to delete <strong>{selected?.name}</strong>?
              </p>
              <p className="mu-del-warn">
                This action cannot be undone. All data associated with this user will be permanently removed.
              </p>
            </div>
            <div className="mu-modal-foot">
              <button
                type="button"
                className="mu-btn-sec"
                onClick={() => setShowDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mu-btn-danger"
                onClick={doDelete}
                disabled={saving}
              >
                {saving ? "Deleting…" : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className={`mu-toast mu-toast--${toast.type}`}>
          <span className="mu-toast-icon">
            {toast.type === "delete" ? "🗑️" : "✅"}
          </span>
          {toast.message}
        </div>
      )}

    </div>
  );
}

export default ManageUsers;