import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAdminComplaints, adminActionOnComplaint, requestUserData } from '../services/api';
import API from '../services/api';
import { FiCheck, FiX, FiDatabase, FiRefreshCw, FiSend, FiUser, FiPhone, FiBriefcase } from 'react-icons/fi';
import './AdminPanel.css';

const AdminPanel = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [authorities, setAuthorities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionState, setActionState] = useState({}); // per complaint: { remarks, selectedAuth }
    const [actionLoading, setActionLoading] = useState('');
    const [filter, setFilter] = useState('all');
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchAll = async () => {
        try {
            const [cRes, aRes] = await Promise.all([
                getAdminComplaints(),
                API.get('/authorities'),
            ]);
            setComplaints(cRes.data);
            setAuthorities(aRes.data);
        } catch (err) {
            console.error('Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const getState = (id) => actionState[id] || { remarks: '', selectedAuth: '' };
    const setState = (id, patch) => setActionState(prev => ({ ...prev, [id]: { ...getState(id), ...patch } }));

    const handleAction = async (complaintId, action) => {
        const s = getState(complaintId);
        if (action === 'approve' && !s.selectedAuth) {
            setMessage({ type: 'error', text: 'Please select an authority to forward the complaint to' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return;
        }
        setActionLoading(complaintId + action);
        try {
            await adminActionOnComplaint(complaintId, {
                action,
                remarks: s.remarks,
                targetAuthority: s.selectedAuth || undefined,
            });
            const selectedAuthObj = authorities.find(a => a.department === s.selectedAuth);
            setMessage({
                type: 'success', text: action === 'approve'
                    ? `Approved & forwarded to ${selectedAuthObj?.name || s.selectedAuth}`
                    : 'Complaint rejected'
            });
            setActionState(prev => { const n = { ...prev }; delete n[complaintId]; return n; });
            await fetchAll();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed' });
        }
        setActionLoading('');
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleRequestData = async (complaintId) => {
        setActionLoading(complaintId + 'req');
        try {
            await requestUserData(complaintId);
            setMessage({ type: 'success', text: 'Data request sent to user' });
            await fetchAll();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to request data' });
        }
        setActionLoading('');
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleForwardDataToAuthority = async (complaintId) => {
        // Admin sends data-shared signal to authority via remarks update
        setActionLoading(complaintId + 'fwd');
        try {
            await adminActionOnComplaint(complaintId, { action: 'forward-data', remarks: 'User data shared with authority' });
            setMessage({ type: 'success', text: 'User data forwarded to authority' });
            await fetchAll();
        } catch {
            setMessage({ type: 'error', text: 'Failed to forward data' });
        }
        setActionLoading('');
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const getFilterCount = (f) => {
        if (f === 'all') return complaints.length;
        if (f === 'pending') return complaints.filter(c => c.status === 'sent_to_admin').length;
        if (f === 'approved') return complaints.filter(c => ['admin_approved', 'sent_to_authority', 'replied', 'user_resolved', 'user_not_resolved', 'resolved'].includes(c.status)).length;
        if (f === 'rejected') return complaints.filter(c => c.status === 'admin_rejected').length;
        return 0;
    };

    const filteredComplaints = complaints.filter(c => {
        if (filter === 'pending') return c.status === 'sent_to_admin';
        if (filter === 'approved') return ['admin_approved', 'sent_to_authority', 'replied', 'user_resolved', 'user_not_resolved', 'resolved'].includes(c.status);
        if (filter === 'rejected') return c.status === 'admin_rejected';
        return true;
    });

    // Group authorities by department for the select
    const authsByDept = authorities.reduce((acc, a) => {
        if (!acc[a.department]) acc[a.department] = [];
        acc[a.department].push(a);
        return acc;
    }, {});

    return (
        <div className="page-container">
            <div className="page-header animate-fadeInUp">
                <h1>🔧 Admin Panel</h1>
                <p>Department: <strong>{user?.department}</strong> | {user?.name}</p>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <div className="admin-toolbar animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                <div className="filter-tabs">
                    {['all', 'pending', 'approved', 'rejected'].map(f => (
                        <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            <span className="filter-count">{getFilterCount(f)}</span>
                        </button>
                    ))}
                </div>
                <button className="btn btn-outline btn-sm" onClick={fetchAll}><FiRefreshCw /> Refresh</button>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div><p>Loading complaints...</p></div>
            ) : filteredComplaints.length === 0 ? (
                <div className="empty-state glass-card">
                    <div className="empty-state-icon">📋</div>
                    <h3>No Complaints</h3>
                    <p>No complaints in the <strong>{filter}</strong> section for your department ({user?.department}).</p>
                </div>
            ) : (
                <div className="admin-complaints-list">
                    {filteredComplaints.map((complaint, i) => {
                        const s = getState(complaint.complaintId);
                        const isPending = complaint.status === 'sent_to_admin';
                        const selectedAuthObj = authorities.find(a => a.department === s.selectedAuth);

                        return (
                            <div key={complaint._id} className="admin-complaint-item glass-card animate-fadeInUp" style={{ animationDelay: `${0.05 * i}s` }}>
                                <div className="admin-complaint-header">
                                    <div>
                                        <span className="complaint-id">{complaint.complaintId}</span>
                                        <h3>{complaint.heading}</h3>
                                        <p className="complaint-dept">{complaint.department} • {complaint.anonymousId}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            {new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className={`badge badge-${complaint.status}`}>
                                        {complaint.status === 'sent_to_admin' ? 'Pending Review' : complaint.status.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                <p className="admin-complaint-desc">{complaint.description?.substring(0, 200)}{complaint.description?.length > 200 ? '...' : ''}</p>

                                {complaint.aiAnalysis?.score > 0 && (
                                    <div className="admin-ai-summary">
                                        <span>AI Score: <strong>{complaint.aiAnalysis.score}/100</strong></span>
                                        <span>Severity: <strong className={`text-${complaint.aiAnalysis.severity}`}>{complaint.aiAnalysis.severity}</strong></span>
                                        <span>Category: <strong>{complaint.aiAnalysis.category}</strong></span>
                                    </div>
                                )}

                                {/* User Data Revealed */}
                                {complaint.userConsentForData === true && (
                                    <div className="user-data-revealed">
                                        <h4><FiDatabase /> User Data (Consent Granted)</h4>
                                        <div className="revealed-data">
                                            <span><FiUser /> {complaint.profileSnapshot?.name}</span>
                                            <span>Age: {complaint.profileSnapshot?.age}</span>
                                            <span>Gender: {complaint.profileSnapshot?.gender}</span>
                                            <span>Voter last 4: {complaint.profileSnapshot?.voterIdLast4}</span>
                                        </div>
                                        {/* Option to forward user data to authority */}
                                        {['sent_to_authority', 'replied'].includes(complaint.status) && (
                                            <button
                                                className="btn btn-outline btn-sm" style={{ marginTop: 10 }}
                                                onClick={() => handleForwardDataToAuthority(complaint.complaintId)}
                                                disabled={actionLoading === complaint.complaintId + 'fwd'}
                                            >
                                                <FiSend /> {actionLoading === complaint.complaintId + 'fwd' ? 'Forwarding...' : 'Forward Data to Authority'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Pending actions */}
                                {isPending && (
                                    <div className="admin-actions">
                                        <div className="form-group" style={{ marginBottom: 12 }}>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Add remarks (optional)"
                                                value={s.remarks}
                                                onChange={e => setState(complaint.complaintId, { remarks: e.target.value })}
                                            />
                                        </div>

                                        {/* Authority Selection */}
                                        <div className="form-group" style={{ marginBottom: 16 }}>
                                            <label style={{ fontSize: '0.8rem', marginBottom: 8, display: 'block', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                <FiSend style={{ verticalAlign: 'middle', marginRight: 4 }} /> Select Authority to Forward *
                                            </label>
                                            <select
                                                className="form-control"
                                                value={s.selectedAuth}
                                                onChange={e => setState(complaint.complaintId, { selectedAuth: e.target.value })}
                                            >
                                                <option value="">-- Choose Authority --</option>
                                                {Object.entries(authsByDept).map(([dept, auths]) => (
                                                    <optgroup key={dept} label={dept}>
                                                        {auths.map(auth => (
                                                            <option key={auth._id} value={auth.department}>
                                                                {auth.name} — {auth.designation}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>

                                            {/* Show selected authority card */}
                                            {selectedAuthObj && (
                                                <div className="authority-preview">
                                                    <div className="auth-preview-avatar"><FiUser /></div>
                                                    <div>
                                                        <strong>{selectedAuthObj.name}</strong>
                                                        <p><FiBriefcase /> {selectedAuthObj.designation}</p>
                                                        <p>{selectedAuthObj.department}</p>
                                                        {selectedAuthObj.phone && <p><FiPhone /> {selectedAuthObj.phone}</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="action-buttons">
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleAction(complaint.complaintId, 'approve')}
                                                disabled={actionLoading === complaint.complaintId + 'approve'}
                                            >
                                                <FiCheck /> {actionLoading === complaint.complaintId + 'approve' ? 'Approving...' : 'Approve & Forward'}
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleAction(complaint.complaintId, 'reject')}
                                                disabled={actionLoading === complaint.complaintId + 'reject'}
                                            >
                                                <FiX /> {actionLoading === complaint.complaintId + 'reject' ? 'Rejecting...' : 'Reject'}
                                            </button>
                                            {!complaint.dataRequestedByAdmin && (
                                                <button
                                                    className="btn btn-outline"
                                                    onClick={() => handleRequestData(complaint.complaintId)}
                                                    disabled={actionLoading === complaint.complaintId + 'req'}
                                                >
                                                    <FiDatabase /> {actionLoading === complaint.complaintId + 'req' ? 'Requesting...' : 'Request User Data'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
