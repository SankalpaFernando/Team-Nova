import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';
import { AlertTriangle, ArrowRight, ClipboardList, Clock, Check, X } from 'lucide-react';
import './MyRequests.css';

function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paramMap, setParamMap] = useState({});

  useEffect(() => {
    api.get('/parameters?includeInactive=true').then(res => {
      const map = {};
      (res.data?.data || []).forEach(p => {
        if (p._id) map[String(p._id)] = { label: p.label || p.key, unit: p.unit || '' };
      });
      setParamMap(map);
    }).catch(() => {});
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/change-requests');
      if (res.data?.success) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      setError('Failed to fetch your change requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || r.entityType === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const renderPayloadDiff = (req) => {
    const payload = req.payload || {};
    const { changes, form, targetSummary } = payload;

    if (req.action === 'delete') {
      const isSite = req.entityType === 'site';
      const isDevice = req.entityType === 'device';

      const entityLabel = payload.targetSummary
        || (isDevice && payload.device_id ? `Device ${payload.device_id}` : null)
        || (isSite && (payload.name || req.site?.name) ? `Site "${payload.name || req.site?.name}"` : null)
        || 'target entity';

      return (
        <div className="mr-diff-delete-notice" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <AlertTriangle size={16} /> <strong>Deletion Request</strong> for {entityLabel}
          {isDevice && payload.device_id && (
            <span style={{ fontWeight: 700, background: '#fee2e2', padding: '2px 8px', borderRadius: '4px', color: '#991b1b', fontSize: '0.875rem' }}>
              Device ID: {payload.device_id}
            </span>
          )}
          {isSite && (payload.location || payload.name) && (
            <span style={{ fontWeight: 600, background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', color: '#92400e', fontSize: '0.875rem' }}>
              {payload.name}{payload.location ? ` — ${payload.location}` : ''}
            </span>
          )}
        </div>
      );
    }

    if (req.action === 'update' && changes && Object.keys(changes).length > 0) {
      return (
        <div className="mr-diff-container">
          <div className="mr-diff-header">
            <strong>Proposed Field Modifications ({targetSummary || 'Target Entity'}):</strong>
          </div>
          <div className="mr-diff-list">
            {Object.entries(changes).map(([field, values]) => (
              <div key={field} className="mr-diff-row">
                <span className="mr-diff-fieldname">{field}:</span>
                <span className="mr-diff-old">{String(values.old ?? 'empty')}</span>
                <span className="mr-diff-arrow"><ArrowRight size={14} /></span>
                <span className="mr-diff-new">{String(values.new ?? 'empty')}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Threshold update — formatted with parameter names, units, and diffs (only changed parameters)
    if (payload.isThresholdUpdate) {
      const thresholds = payload.changedThresholds || form?.thresholds || payload.thresholds || [];
      if (thresholds.length === 0) return <em>No threshold changes specified</em>;
      const siteName = req.site?.name || payload.name || 'Site';

      return (
        <div className="mr-diff-container">
          <div className="mr-diff-header">
            <strong>Proposed Parameter Thresholds ({siteName}):</strong>
          </div>
          <div className="mr-diff-list">
            {thresholds.map((t, idx) => {
              const pId = t.parameter?._id ? String(t.parameter._id) : String(t.parameter);
              const pInfo = paramMap[pId] || {};
              const name = t.parameter_name || pInfo.label || t.parameter?.label || t.parameter?.key || 'Parameter';
              const unit = t.unit || pInfo.unit || t.parameter?.unit || '';
              const hasPrev = t.previous_min !== null && t.previous_min !== undefined && t.previous_max !== null && t.previous_max !== undefined;

              return (
                <div key={idx} className="mr-diff-row">
                  <span className="mr-diff-fieldname">{name} {unit ? `(${unit})` : ''}:</span>
                  {hasPrev ? (
                    <>
                      <span className="mr-diff-old">
                        Min: {t.previous_min}, Max: {t.previous_max}
                      </span>
                      <span className="mr-diff-arrow"><ArrowRight size={14} /></span>
                      <span className="mr-diff-new">
                        Min: {t.min}, Max: {t.max}
                      </span>
                    </>
                  ) : (
                    <span className="mr-diff-new">
                      Min: {t.min}, Max: {t.max}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const dataObj = form || payload;
    const entries = Object.entries(dataObj).filter(([k]) => !['changes', 'form', 'targetSummary', 'isThresholdUpdate', 'thresholds'].includes(k));

    if (entries.length === 0) return <em>No details specified</em>;

    return (
      <div className="mr-payload-grid">
        {entries.map(([key, val]) => (
          <div key={key} className="mr-payload-item">
            <span className="mr-payload-key">{key}:</span>{' '}
            <span className="mr-payload-val">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mu-page">
      <AdminSidebar activePage="my-requests" />
      <div className="mu-main">
        <header className="mu-header">
          <div>
            <p className="mu-breadcrumb">Site Engineer › My Requests</p>
            <h1 className="mu-title">My Operational Requests</h1>
            <p className="mu-subtitle">Track status of operational changes submitted for admin approval</p>
          </div>
        </header>

        <div className="mu-content">
          {error && <div className="mu-alert mu-alert--error">{error}</div>}

          {/* Filters Bar */}
          <div className="mr-filters-bar">
            <div className="mr-filter-group">
              <span className="mr-filter-label">Category:</span>
              {['all', 'site', 'device', 'sensor', 'parameter'].map((cat) => (
                <button
                  key={cat}
                  className={`mr-filter-btn ${categoryFilter === cat ? 'mr-filter-btn--active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat.toUpperCase()} {cat !== 'all' && `(${requests.filter((r) => r.entityType === cat).length})`}
                </button>
              ))}
            </div>

            <div className="mr-filter-group">
              <span className="mr-filter-label">Status:</span>
              {['all', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  className={`mr-filter-btn ${statusFilter === st ? 'mr-filter-btn--active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st.toUpperCase()} {st !== 'all' && `(${requests.filter((r) => r.status === st).length})`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="mr-loading">Loading your requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="mr-empty-card">
              <span className="mr-empty-icon"><ClipboardList size={32} /></span>
              <h3>No Requests Found</h3>
              <p>You have no operational change requests matching the selected filters.</p>
            </div>
          ) : (
            <div className="mr-cards-list">
              {filteredRequests.map((req) => (
                <div key={req._id} className={`mr-card mr-card--status-${req.status}`}>
                  <div className="mr-card-header">
                    <div className="mr-card-tags">
                      <span className={`mr-badge mr-badge--${req.entityType}`}>{req.entityType.toUpperCase()}</span>
                      <span className={`mr-badge mr-badge--${req.action}`}>{req.action.toUpperCase()}</span>
                    </div>
                    <div className="mr-status-pill-wrap">
                      <span className={`mr-status-pill mr-status-pill--${req.status}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {req.status === 'pending' && <><Clock size={14} /> Pending Approval</>}
                        {req.status === 'approved' && <><Check size={14} /> Approved</>}
                        {req.status === 'rejected' && <><X size={14} /> Rejected</>}
                      </span>
                    </div>
                  </div>

                  <div className="mr-card-body">
                    <div className="mr-info-grid">
                      <div>
                        <strong>Target Site:</strong> {req.site?.name || (req.entityType === 'site' && (req.payload?.name || req.payload?.form?.name)) || 'Site'}
                      </div>
                      <div>
                        <strong>Submitted:</strong> {new Date(req.createdAt).toLocaleString()}
                      </div>
                      {(req.payload?.device_id || req.payload?.targetSummary || req.payload?.name || req.payload?.form?.name || req.payload?.form?.device_id) && (
                        <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <strong style={{ color: '#0f172a' }}>Target {req.entityType ? req.entityType.toUpperCase() : 'ENTITY'}:</strong>
                          <span style={{ fontWeight: 700, color: req.action === 'delete' ? '#dc2626' : '#047857' }}>
                            {req.payload?.device_id 
                              ? `Device ID: ${req.payload.device_id}` 
                              : (req.payload?.targetSummary || req.payload?.name || req.payload?.form?.name || req.payload?.form?.device_id || '—')}
                          </span>
                        </div>
                      )}
                      {req.reviewedAt && (
                        <div>
                          <strong>Reviewed:</strong> {new Date(req.reviewedAt).toLocaleString()} by{' '}
                          {req.reviewedBy?.name || 'Admin'}
                        </div>
                      )}
                    </div>

                    <div className="mr-payload-box">
                      {renderPayloadDiff(req)}
                    </div>

                    {req.status === 'rejected' && req.adminNote && (
                      <div className="mr-admin-note">
                        <strong>Admin Feedback:</strong> {req.adminNote}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyRequests;
