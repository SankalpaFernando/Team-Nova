import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./AdminMessages.css";

function AdminMessages() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get("/messages");
      setMessages(res.data.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "unread" ? "read" : "unread";
    try {
      await api.put(`/messages/${id}/status`, { status: newStatus });
      setMessages(messages.map(msg => msg._id === id ? { ...msg, status: newStatus } : msg));
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const unreadCount = messages.filter(m => m.status === 'unread').length;
  const readCount = messages.filter(m => m.status === 'read').length;

  return (
    <div className="msg-page">
      {/* ── Sidebar ── */}
      <aside className="msg-sidebar">
        <div className="msg-brand">
          <span className="msg-brand-icon">🌿</span>
          <div>
            <div className="msg-brand-name">MangroveGuard</div>
            <div className="msg-brand-role">Admin Panel</div>
          </div>
        </div>

        <nav className="msg-nav">
          {[
            { to: "/admin-dashboard", icon: "⬛", label: "Dashboard" },
            { to: "/manage-users",    icon: "👥", label: "Users"     },
            { to: "/manage-devices",  icon: "📡", label: "Devices"   },
            { to: "/admin-alerts",    icon: "🔔", label: "Alerts"    },
            { to: "/admin-maps",      icon: "📍", label: "Sites" },
            { to: "/admin-messages",  icon: "✉️", label: "Messages", active: true },
            { to: "/profile",   icon: "👤", label: "Profile"   },
          ].map(({ to, icon, label, active }) => (
            <Link key={to} to={to} className={`msg-nav-link ${active ? "msg-nav-link--active" : ""}`}>
              <span className="msg-nav-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="msg-sidebar-bottom">
          <div className="msg-user-card">
            <div className="msg-user-avatar">{user?.name?.[0]?.toUpperCase() || "A"}</div>
            <div>
              <div className="msg-user-name">{user?.name || "Admin"}</div>
              <div className="msg-user-email">{user?.email || ""}</div>
            </div>
          </div>
          <button className="msg-logout-btn" onClick={handleLogout}>⏻ Logout</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="msg-main">
        {/* Header */}
        <div className="msg-header">
          <div>
            <p className="msg-breadcrumb">Admin › Messages</p>
            <h1 className="msg-title">Contact Messages</h1>
            <p className="msg-subtitle">View and manage messages from users and visitors.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="msg-stats">
          {[
            { icon: "✉️", val: messages.length, label: "Total Messages" },
            { icon: "🔴", val: unreadCount,     label: "Unread Messages" },
            { icon: "🟢", val: readCount,       label: "Read Messages" },
          ].map((s, i) => (
            <div className="msg-stat-card" key={i}>
              <span className="msg-stat-icon">{s.icon}</span>
              <div>
                <div className="msg-stat-val">{s.val}</div>
                <div className="msg-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && <div className="msg-error">{error}</div>}

        {/* Loading */}
        {loading ? (
          <div className="msg-loading">
            <div className="msg-spinner" />
            <p>Loading messages…</p>
          </div>
        ) : (
          /* Table */
          <div className="msg-card">
            <table className="msg-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sender</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="msg-empty">
                      No messages found.
                    </td>
                  </tr>
                ) : messages.map((msg, i) => (
                  <tr key={msg._id} className="msg-tr">
                    <td className="msg-td-dim">{new Date(msg.createdAt).toLocaleDateString()}</td>
                    <td className="msg-td-name">{msg.fullName}</td>
                    <td className="msg-td-loc">{msg.email}</td>
                    <td className="msg-td-data">{msg.subject}</td>
                    <td>
                      <span className={`msg-badge msg-badge--${msg.status === 'unread' ? 'rs' : 're'}`}>
                        {msg.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="msg-actions">
                        <button 
                          className={`msg-act msg-act--${msg.status === 'unread' ? 'edit' : 'thresh'}`} 
                          onClick={() => toggleStatus(msg._id, msg.status)}
                        >
                          {msg.status === "unread" ? "Mark as Read" : "Mark as Unread"}
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
    </div>
  );
}

export default AdminMessages;
