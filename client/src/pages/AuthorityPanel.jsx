import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuthorityComplaints, authorityActionOnComplaint } from '../services/api';
import { FiMessageSquare, FiRefreshCw, FiClock, FiAlertTriangle, FiSend } from 'react-icons/fi';
import './AuthorityPanel.css';

const AuthorityPanel = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState({}); // per complaint id
    const [actionLoading, setActionLoading] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [filter, setFilter] = useState('pending');

    const fetchComplaints = async () => {
        try {
            const res = await getAuthorityComplaints();
            setComplaints(res.data);
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchComplaints(); }, []);

    const handleReply = async (complaintId) => {
        const text = replyText[complaintId] || '';
        if (!text.trim()) {
            setMessage({ type: 'error', text: 'Please write a response before sending' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return;
        }
        setActionLoading(complaintId);
        try {
            await authorityActionOnComplaint(complaintId, { action: 'respond', remarks: text });
            setMessage({ type: 'success', text: 'Response sent to user successfully' });
            setReplyText(prev => { const n = { ...prev }; delete n[complaintId]; return n; });
            await fetchComplaints();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send response' });
        }
        setActionLoading('');
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const isOverdue = (complaint) =>
        complaint.escalationDeadline && new Date(complaint.escalationDeadline) < new Date();

    const getCount = (f) => {
        if (f === 'all') return complaints.length;
        if (f === 'pending') return complaints.filter(c => c.status === 'sent_to_authority').length;
        if (f === 'replied') return complaints.filter(c => ['replied', 'user_resolved', 'user_not_resolved'].includes(c.status)).length;
        if (f === 'escalated') return complaints.filter(c => ['escalated', 'lawsuit_filed'].includes(c.status)).length;
        return 0;
    };

    const filteredComplaints = complaints.filter(c => {
        if (filter === 'pending') return c.status === 'sent_to_authority';
        if (filter === 'replied') return ['replied', 'user_resolved', 'user_not_resolved'].includes(c.status);
        if (filter === 'escalated') return ['escalated', 'lawsuit_filed'].includes(c.status);
        return true;
    });

    const statusLabel = {
        sent_to_authority: 'Pending',
        replied: 'Replied',
        user_resolved: 'User Resolved ✅',
        user_not_resolved: 'User Not Satisfied ⚠️',
        resolved: 'Resolved',
        escalated: 'Escalated',
        lawsuit_filed: 'Lawsuit Filed',
    };

    return (
        <div className="page-container">
            <div className="page-header animate-fadeInUp">
                <h1>⚖️ Authority Panel</h1>
                <p>{user?.designation || 'Authority'} — {user?.department} | {user?.name}</p>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <div className="admin-toolbar animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                <div className="filter-tabs">
                    {['all', 'pending', 'replied', 'escalated'].map(f => (
                        <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            <span className="filter-count">{getCount(f)}</span>
                        </button>
                    ))}
                </div>
                <button className="btn btn-outline btn-sm" onClick={fetchComplaints}><FiRefreshCw /> Refresh</button>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div><p>Loading complaints...</p></div>
            ) : filteredComplaints.length === 0 ? (
                <div className="empty-state glass-card">
                    <div className="empty-state-icon">⚖️</div>
                    <h3>No Complaints</h3>
                    <p>No complaints in the <strong>{filter}</strong> section.</p>
                </div>
            ) : (
                <div className="admin-complaints-list">
                    {filteredComplaints.map((complaint, i) => (
                        <div
                            key={complaint._id}
                            className={`admin-complaint-item glass-card animate-fadeInUp ${isOverdue(complaint) && complaint.status === 'sent_to_authority' ? 'overdue-card' : ''}`}
                            style={{ animationDelay: `${0.05 * i}s` }}
                        >
                            <div className="admin-complaint-header">
                                <div>
                                    <span className="complaint-id">{complaint.complaintId}</span>
                                    <h3>{complaint.heading}</h3>
                                    <p className="complaint-dept">{complaint.department} • {complaint.anonymousId}</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                    <span className={`badge badge-${complaint.status}`}>
                                        {statusLabel[complaint.status] || complaint.status.replace(/_/g, ' ')}
                                    </span>
                                    {isOverdue(complaint) && complaint.status === 'sent_to_authority' && (
                                        <span className="badge badge-critical"><FiAlertTriangle /> OVERDUE</span>
                                    )}
                                </div>
                            </div>

                            <p className="admin-complaint-desc">{complaint.description?.substring(0, 200)}{complaint.description?.length > 200 ? '...' : ''}</p>

                            {complaint.location?.address && (
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                    📍 {complaint.location.address}
                                </p>
                            )}

                            {complaint.escalationDeadline && (
                                <div className="deadline-info">
                                    <FiClock /> Deadline: {new Date(complaint.escalationDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    {isOverdue(complaint) && <span className="overdue-tag"> (OVERDUE)</span>}
                                </div>
                            )}

                            {complaint.adminRemarks && (
                                <div className="admin-remarks"><strong>Admin Remarks:</strong> {complaint.adminRemarks}</div>
                            )}

                            {/* User's resolution feedback */}
                            {['user_resolved', 'user_not_resolved'].includes(complaint.status) && complaint.userResolution && (
                                <div className={`user-resolution-box ${complaint.userResolution.accepted ? 'resolved' : 'not-resolved'}`}>
                                    <strong>{complaint.userResolution.accepted ? '✅ User marked as Resolved' : '⚠️ User is NOT Satisfied'}</strong>
                                    {complaint.userResolution.feedback && (
                                        <p>"{complaint.userResolution.feedback}"</p>
                                    )}
                                </div>
                            )}

                            {/* Previous reply shown in replied section */}
                            {complaint.status !== 'sent_to_authority' && complaint.authorityResponse && (
                                <div className="authority-reply-box">
                                    <strong>Your previous response:</strong>
                                    <p>"{complaint.authorityResponse}"</p>
                                </div>
                            )}

                            {/* Reply form — only for pending or user-not-satisfied */}
                            {(complaint.status === 'sent_to_authority' || complaint.status === 'user_not_resolved') && (
                                <div className="admin-actions">
                                    <div className="form-group" style={{ marginBottom: 12 }}>
                                        <label style={{ fontSize: '0.8rem', marginBottom: 6, display: 'block', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            <FiMessageSquare style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                            {complaint.status === 'user_not_resolved' ? 'Send Follow-up Response' : 'Send Response to User'}
                                        </label>
                                        <textarea
                                            className="form-control"
                                            placeholder="Write your response to the complainant..."
                                            rows={3}
                                            value={replyText[complaint.complaintId] || ''}
                                            onChange={e => setReplyText(prev => ({ ...prev, [complaint.complaintId]: e.target.value }))}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleReply(complaint.complaintId)}
                                        disabled={actionLoading === complaint.complaintId}
                                    >
                                        <FiSend /> {actionLoading === complaint.complaintId ? 'Sending...' : 'Send Response'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuthorityPanel;
