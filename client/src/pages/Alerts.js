import { useEffect, useState } from "react";
import "./Alerts.css";
import mangrove from "../assests/mangrove.png";
import api from "../services/api";
import UserNavbar from "../components/UserNavbar";
import Footer from "../components/Footer";

const STATUS_LABEL = {
  unread: "Pending",
  read: "Read",
  resolved: "Resolved",
};

const SEVERITY_LABEL = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};


function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-GB");
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const loadAlerts = async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await api.get("/alerts", { params: { limit: 15, page } });
        const newAlerts = res.data.data || [];
        setAlerts(prev => page === 1 ? newAlerts : [...prev, ...newAlerts]);
        setHasMore(page < (res.data.pages || 1));
      } catch (err) {
        setError("Couldn't load alerts from the server.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    loadAlerts();
  }, [page]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <UserNavbar />

      {/* Background */}
      <div
        className="alerts-hero"
        style={{ backgroundImage: `url(${mangrove})`, flex: 1 }}
      >
        <h2 className="alerts-title">
          Alerts & Notifications
        </h2>

        {error && <div className="alerts-error">{error}</div>}

        {/* Alerts Table */}
        <div className="alerts-table-container">
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Site Name</th>
                <th>Alert</th>
                <th>Severity</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty-msg">Loading alerts…</td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty-msg">No alerts to show</td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert._id} className={`severity-row-${alert.severity_level}`}>
                    <td>{alert.device?.site?.name || "—"}</td>
                    <td className="alert-message-cell">{alert.message}</td>
                    <td>
                      <span className={`severity-badge severity-${alert.severity_level}`}>
                        {SEVERITY_LABEL[alert.severity_level] || alert.severity_level}
                      </span>
                    </td>
                    <td>{formatDate(alert.created_at)}</td>
                    <td>{formatTime(alert.created_at)}</td>
                    <td>
                      <span className={alert.status}>
                        {STATUS_LABEL[alert.status] || alert.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
              <button 
                onClick={() => setPage(p => p + 1)} 
                disabled={loadingMore}
                style={{
                  padding: '10px 20px',
                  background: '#1d7068',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Alerts;