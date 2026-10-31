import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import {
  Users,
  ShieldCheck,
  HardHat,
  User,
  MapPin,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Check,
  Clock,
  AlertCircle
} from "lucide-react";
import "./ManageUsers.css";

function ManageUsers() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Data state ─────────────────────────────────────────
  const [users, setUsers]         = useState([]);
  const [sites, setSites]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [processingId, setProcessingId] = useState(null);

  // ── Modal state ────────────────────────────────────────
  const [showAdd, setShowAdd]       = useState(false);
  const [showEdit, setShowEdit]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]     = useState(null);

  // ── Form state ─────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "registered_user",
    status: "approved",
    assignedSite: ""
  });
  const [saving, setSaving]   = useState(false);
  const [formErr, setFormErr] = useState("");

  // ── Toast ──────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // ── Fetch all users & sites ────────────────────────────
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [userRes, siteRes] = await Promise.all([
        api.get("/users"),
        api.get("/sites")
      ]);
      setUsers(userRes.data.data || []);
      setSites(siteRes.data.data || []);
    } catch {
      setError("Could not load user or site data. Check backend status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Counts for stat cards ──────────────────────────────
  const countByRole = (role) => users.filter(u => u.role === role).length;
  const countPending = users.filter(u => u.status === "pending").length;
  const countApproved = users.filter(u => (u.status || "approved") === "approved").length;
  const countRejected = users.filter(u => u.status === "rejected").length;

  // ── Approve & Reject Handlers ─────────────────────────
  const handleApprove = async (userId, userName) => {
    setProcessingId(userId);
    try {
      const res = await api.put(`/users/${userId}/approve`);
      if (res.data?.success) {
        showToast(res.data.message || `User "${userName}" approved! Approval email with login link sent.`);
        load();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve user.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId, userName) => {
    setProcessingId(userId);
    try {
      const res = await api.put(`/users/${userId}/reject`);
      if (res.data?.success) {
        showToast(`User "${userName}" registration rejected.`, "delete");
        load();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject user.");
    } finally {
      setProcessingId(null);
    }
  };

  // ── Add user ───────────────────────────────────────────
  const openAdd = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "registered_user",
      status: "approved",
      assignedSite: ""
    });
    setFormErr("");
    setShowAdd(true);
  };

  const doAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormErr("Name, email and password are required.");
      return;
    }
    if (form.role === "site_engineer" && !form.assignedSite) {
      setFormErr("Selecting an assigned site is required when setting role to Site Engineer.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/users", form);
      const newUserId = res.data.data._id;
      if (form.role === "site_engineer") {
        await api.put(`/users/${newUserId}/role`, { role: form.role, assignedSite: form.assignedSite });
      }
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
    const siteId = u.assignedSite?._id || u.assignedSite || "";
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      status: u.status || "approved",
      assignedSite: siteId
    });
    setFormErr("");
    setShowEdit(true);
  };

  const doEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErr("");
    try {
      // The request sends ONLY role and status
      await api.put(`/users/${selected._id}`, {
        role: form.role,
        status: form.status
      });

      const wasPendingOrRejected = selected.status !== "approved";
      const isNowApproved = form.status === "approved";
      setShowEdit(false);
      load();
      if (wasPendingOrRejected && isNowApproved) {
        showToast(`User updated and approved! Approval email with login link sent to ${selected.email}.`);
      } else {
        showToast("User updated successfully!");
      }
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
    site_engineer:    "mu-badge--engineer",
    registered_user:  "mu-badge--user"
  }[role] || "mu-badge--user");

  const roleLabel = (role) => ({
    admin:            "Admin",
    site_engineer:    "Site Engineer",
    registered_user:  "Registered User"
  }[role] || role);

  const statusBadge = (status) => {
    const s = status || "approved";
    if (s === "pending") {
      return (
        <span className="mu-badge mu-badge--pending" title="Awaiting Administrator Approval">
          <Clock size={12} /> Pending
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="mu-badge mu-badge--rejected" title="Registration Rejected">
          <X size={12} /> Rejected
        </span>
      );
    }
    return (
      <span className="mu-badge mu-badge--approved" title="Approved & Active">
        <CheckCircle2 size={12} /> Approved
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  // ── Filtered user list ─────────────────────────────────
  const filteredUsers = users.filter((u) => {
    const s = u.status || "approved";
    if (activeTab === "pending") return u.status === "pending";
    if (activeTab === "approved") return s === "approved";
    if (activeTab === "rejected") return u.status === "rejected";
    return true;
  });

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="mu-page">

      {/* ── Sidebar ── */}
      <AdminSidebar activePage="users" />

      {/* ── Main ── */}
      <main className="mu-main">

        {/* Header */}
        <div className="mu-header">
          <div>
            <p className="mu-breadcrumb">Admin › Users</p>
            <h1 className="mu-title">Manage Users</h1>
            <p className="mu-subtitle">
              Review registrations, approve new users, assign roles, and manage access permissions.
            </p>
          </div>
          <button className="mu-btn-primary" onClick={openAdd}>
            ＋ Create User
          </button>
        </div>

        {/* Pending Banner Alert if requests exist */}
        {countPending > 0 && (
          <div className="mu-pending-banner">
            <div className="mu-pending-banner-left">
              <div className="mu-pending-banner-icon">
                <Clock size={22} color="#b45309" />
              </div>
              <div>
                <div className="mu-pending-banner-title">
                  {countPending} User Registration{countPending > 1 ? "s" : ""} Awaiting Review
                </div>
                <p className="mu-pending-banner-sub">
                  New users cannot log in or view any site details until approved by an administrator.
                </p>
              </div>
            </div>
            {activeTab !== "pending" && (
              <button className="mu-pending-banner-btn" onClick={() => setActiveTab("pending")}>
                Review Pending ({countPending})
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mu-stats">
          {[
            { icon: <Users size={22} color="#2b9388" />, val: users.length, label: "Total Users" },
            {
              icon: <Clock size={22} color="#d97706" />,
              val: countPending,
              label: "Pending Approvals",
              highlight: countPending > 0,
              onClick: () => setActiveTab("pending")
            },
            { icon: <ShieldCheck size={22} color="#164e3d" />, val: countByRole("admin"), label: "Admins" },
            { icon: <HardHat size={22} color="#0ca678" />, val: countByRole("site_engineer"), label: "Site Engineers" },
            { icon: <User size={22} color="#1d7068" />, val: countByRole("registered_user"), label: "Registered Users" },
          ].map((s, i) => (
            <div
              className={`mu-stat-card ${s.highlight ? "mu-stat-card--highlight" : ""}`}
              key={i}
              onClick={s.onClick}
              style={s.onClick ? { cursor: "pointer" } : undefined}
            >
              <span className="mu-stat-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</span>
              <div>
                <div className="mu-stat-val">{s.val}</div>
                <div className="mu-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && <div className="mu-error">{error}</div>}

        {/* Filter Tabs */}
        <div className="mu-filter-tabs">
          {[
            { id: "all", label: `All Users (${users.length})` },
            { id: "pending", label: `Pending Approvals (${countPending})`, badge: countPending },
            { id: "approved", label: `Approved Users (${countApproved})` },
            { id: "rejected", label: `Rejected (${countRejected})` }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`mu-filter-tab ${activeTab === tab.id ? "mu-filter-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.badge > 0 && <span className="mu-tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>

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
                  <th>Role & Assignment</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="mu-empty">
                      {activeTab === "pending"
                        ? "🎉 No pending user registrations! All user requests have been processed."
                        : "No users found in this filter."}
                    </td>
                  </tr>
                ) : filteredUsers.map((u, i) => (
                  <tr key={u._id} className="mu-tr">
                    <td className="mu-td-num">{i + 1}</td>
                    <td className="mu-td-name">
                      <div className="mu-name-row">
                        <div className="mu-avatar">
                          {u.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          {u.status === "pending" && (
                            <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>
                              New Registration
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="mu-td-email">{u.email}</td>
                    <td>
                      <span className={`mu-badge ${roleClass(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                      {u.role === "site_engineer" && (
                        <div style={{ fontSize: "0.78rem", color: "#2b8a3e", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={13} color="#2b8a3e" />
                          <span>{u.assignedSite?.name || "Unassigned Site"}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {statusBadge(u.status)}
                    </td>
                    <td className="mu-td-dim">{formatDate(u.created_at || u.createdAt)}</td>
                    <td>
                      <div className="mu-actions">
                        {u.status === "pending" ? (
                          <>
                            <button
                              className="mu-act mu-act--approve"
                              disabled={processingId === u._id}
                              onClick={() => handleApprove(u._id, u.name)}
                              title="Approve registration"
                            >
                              <Check size={13} /> {processingId === u._id ? "Approving…" : "Approve"}
                            </button>
                            <button
                              className="mu-act mu-act--reject"
                              disabled={processingId === u._id}
                              onClick={() => handleReject(u._id, u.name)}
                              title="Reject registration"
                            >
                              <X size={13} /> Reject
                            </button>
                            <button
                              className="mu-act mu-act--del"
                              onClick={() => openDelete(u)}
                              title="Delete user"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : u.status === "rejected" ? (
                          <>
                            <button
                              className="mu-act mu-act--approve"
                              disabled={processingId === u._id}
                              onClick={() => handleApprove(u._id, u.name)}
                              title="Re-approve user access"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              className="mu-act mu-act--edit"
                              onClick={() => openEdit(u)}
                              title="Edit user"
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            <button
                              className="mu-act mu-act--del"
                              onClick={() => openDelete(u)}
                              title="Delete user"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="mu-act mu-act--edit"
                              onClick={() => openEdit(u)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            {u.role !== "admin" && (
                              <button
                                className="mu-act mu-act--reject"
                                disabled={processingId === u._id}
                                onClick={() => handleReject(u._id, u.name)}
                                title="Revoke access"
                              >
                                <X size={13} /> Revoke
                              </button>
                            )}
                            <button
                              className="mu-act mu-act--del"
                              onClick={() => openDelete(u)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </>
                        )}
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
                <option value="site_engineer">Site Engineer</option>
                <option value="admin">Admin</option>
              </select>

              <label className="mu-lbl">Approval Status</label>
              <select className="mu-inp" name="status" value={form.status} onChange={fc}>
                <option value="approved">Approved (Active immediately)</option>
                <option value="pending">Pending Approval</option>
              </select>

              {form.role === "site_engineer" && (
                <>
                  <label className="mu-lbl">Assigned Site</label>
                  <select className="mu-inp" name="assignedSite" value={form.assignedSite} onChange={fc}>
                    <option value="">-- Select Assigned Site --</option>
                    {sites.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.region})</option>
                    ))}
                  </select>
                </>
              )}

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
              <h2>Edit User & Role Assignment</h2>
              <button className="mu-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form className="mu-modal-body" onSubmit={doEdit}>
              {formErr && <p className="mu-ferr">{formErr}</p>}

              {/* Read-only User Identity */}
              <label className="mu-lbl">Full Name</label>
              <input
                className="mu-inp"
                type="text"
                value={selected?.name || ""}
                disabled
                readOnly
                style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
              />

              <label className="mu-lbl">Email Address</label>
              <input
                className="mu-inp"
                type="text"
                value={selected?.email || ""}
                disabled
                readOnly
                style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
              />

              <label className="mu-lbl">Account Status</label>
              <select className="mu-inp" name="status" value={form.status} onChange={fc}>
                <option value="approved">Approved (Active Access)</option>
                <option value="pending">Pending Approval</option>
                <option value="rejected">Rejected (Access Blocked)</option>
              </select>

              <label className="mu-lbl">System Role</label>
              <select className="mu-inp" name="role" value={form.role} onChange={fc}>
                <option value="registered_user">Registered User</option>
                <option value="site_engineer">Site Engineer</option>
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
              <div className="mu-del-icon" style={{ display: "flex", justifyContent: "center" }}><Trash2 size={36} color="#e24b4a" /></div>
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
          <span className="mu-toast-icon" style={{ display: "inline-flex", alignItems: "center" }}>
            {toast.type === "delete" ? <Trash2 size={16} color="#e24b4a" /> : <CheckCircle2 size={16} color="#166534" />}
          </span>
          {toast.message}
        </div>
      )}

    </div>
  );
}

export default ManageUsers;
