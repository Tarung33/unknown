import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getComplaintById, updateConsent, escalateComplaint, userResolve } from '../services/api';
import StatusTimeline from '../components/StatusTimeline';
import { FiArrowLeft, FiFileText, FiMapPin, FiShield, FiAlertTriangle, FiCheck, FiX, FiExternalLink, FiMessageSquare, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import './ComplaintTracker.css';

const ComplaintTracker = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState('');
    const [resolveFeedback, setResolveFeedback] = useState('');

    const fetchComplaint = async () => {
        try {
            const res = await getComplaintById(id);
            setComplaint(res.data);
        } catch (err) {
            setError('Failed to load complaint details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaint();
        // Refresh every 30 seconds for real-time status updates
        const interval = setInterval(fetchComplaint, 30000);
        return () => clearInterval(interval);
    }, [id]);

    const handleConsent = async (consent) => {
        setActionLoading(consent ? 'accept' : 'decline');
        try {
            await updateConsent(id, consent);
            await fetchComplaint();
        } catch (err) {
            setError('Failed to update consent');
        }
        setActionLoading('');
    };

    const handleEscalate = async () => {
        if (!window.confirm('Are you sure you want to file a lawsuit? This will send a legal notice to the authority.')) return;
        setActionLoading('escalate');
        try {
            await escalateComplaint(id);
            await fetchComplaint();
            navigate(`/lawsuit/${id}`);
        } catch (err) {
            setError('Failed to escalate complaint');
        }
        setActionLoading('');
    };

    const handleUserResolve = async (accepted) => {
        setActionLoading(accepted ? 'resolved' : 'notresolved');
        try {
            await userResolve(id, { accepted, feedback: resolveFeedback });
            setResolveFeedback('');
            await fetchComplaint();
        } catch (err) {
            setError('Failed to submit resolution');
        }
        setActionLoading('');
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading complaint details...</p>
            </div>
        );
    }

    if (error || !complaint) {
        return (
            <div className="page-container">
                <div className="alert alert-error">{error || 'Complaint not found'}</div>
                <Link to="/dashboard" className="btn btn-outline"><FiArrowLeft /> Back to Dashboard</Link>
            </div>
        );
    }

    const statusLabels = {
        submitted: 'Submitted',
        ai_review: 'AI Review',
        ai_rejected: 'AI Rejected',
        verified: 'Verified',
        sent_to_admin: 'With Admin',
        admin_approved: 'Admin Approved',
        admin_rejected: 'Admin Rejected',
        sent_to_authority: 'With Authority',
        replied: 'Authority Replied',
        user_resolved: 'Resolved ✅',
        user_not_resolved: 'Not Resolved ⚠️',
        resolved: 'Resolved',
        escalated: 'Escalated',
        lawsuit_filed: 'Lawsuit Filed',
    };

    return (
        <div className="page-container">
            <Link to="/dashboard" className="back-link animate-fadeIn">
                <FiArrowLeft /> Back to Dashboard
            </Link>

            <div className="tracker-header animate-fadeInUp">
                <div className="tracker-top">
                    <div>
                        <span className="tracker-id">{complaint.complaintId}</span>
                        <h1>{complaint.heading}</h1>
                    </div>
                    <span className={`badge badge-${complaint.status}`}>
                        {statusLabels[complaint.status]}
                    </span>
                </div>
                <div className="tracker-meta">
                    <span><FiMapPin /> {complaint.department}</span>
                    <span>Filed: {new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    <span>ID: {complaint.anonymousId}</span>
                </div>
            </div>

            <div className="tracker-grid">
                {/* Timeline */}
                <div className="tracker-timeline glass-card animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                    <h2>📦 Complaint Tracking</h2>
                    <StatusTimeline history={complaint.statusHistory} currentStatus={complaint.status} />
                </div>

                {/* Details Panel */}
                <div className="tracker-details">
                    {/* Description */}
                    <div className="detail-card glass-card animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
                        <h3>Description</h3>
                        <p className="detail-text">{complaint.description}</p>
                    </div>

                    {/* AI Analysis */}
                    {complaint.aiAnalysis && complaint.aiAnalysis.isValid !== null && (
                        <div className="detail-card glass-card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                            <h3><FiShield /> AI Analysis</h3>
                            <div className="ai-analysis">
                                <div className="ai-score">
                                    <div className="score-circle" style={{
                                        background: `conic-gradient(${complaint.aiAnalysis.score >= 60 ? 'var(--emerald)' : 'var(--red)'} ${complaint.aiAnalysis.score * 3.6}deg, var(--border) 0deg)`,
                                    }}>
                                        <span>{complaint.aiAnalysis.score}</span>
                                    </div>
                                    <span className="score-label">Validity Score</span>
                                </div>
                                <div className="ai-info">
                                    <p className="ai-verdict">{complaint.aiAnalysis.verdict}</p>
                                    <div className="ai-badges">
                                        <span className={`badge badge-${complaint.aiAnalysis.severity}`}>
                                            {complaint.aiAnalysis.severity}
                                        </span>
                                        <span className={`badge ${complaint.aiAnalysis.isValid ? 'badge-verified' : 'badge-ai_rejected'}`}>
                                            {complaint.aiAnalysis.isValid ? 'Valid' : 'Flagged'}
                                        </span>
                                    </div>
                                    {complaint.aiAnalysis.flags?.length > 0 && (
                                        <div className="ai-flags">
                                            {complaint.aiAnalysis.flags.map((flag, i) => (
                                                <span key={i} className="flag-tag">⚠️ {flag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Government Order */}
                    {complaint.govtOrderDoc?.content && (
                        <div className="detail-card glass-card animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
                            <h3><FiFileText /> Government Order</h3>
                            <pre className="govt-order">{complaint.govtOrderDoc.content}</pre>
                        </div>
                    )}

                    {/* Location */}
                    {complaint.location?.address && (
                        <div className="detail-card glass-card animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                            <h3><FiMapPin /> Location</h3>
                            <p className="detail-text">📍 {complaint.location.address}</p>
                            {complaint.location.latitude && (
                                <p className="location-coords-small">
                                    Coordinates: {complaint.location.latitude?.toFixed(6)}, {complaint.location.longitude?.toFixed(6)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Data Consent Request */}
                    {complaint.dataRequestedByAdmin && complaint.userConsentForData === null && user?.role === 'user' && (
                        <div className="detail-card glass-card consent-card animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
                            <h3><FiAlertTriangle /> Data Access Request</h3>
                            <p>The admin has requested access to your personal data for complaint processing. Do you consent to share your data?</p>
                            <div className="consent-buttons">
                                <button
                                    className="btn btn-success"
                                    onClick={() => handleConsent(true)}
                                    disabled={actionLoading === 'accept'}
                                >
                                    <FiCheck /> {actionLoading === 'accept' ? 'Processing...' : 'Accept & Share'}
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleConsent(false)}
                                    disabled={actionLoading === 'decline'}
                                >
                                    <FiX /> {actionLoading === 'decline' ? 'Processing...' : 'Decline'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Authority Response + User Resolve */}
                    {complaint.status === 'replied' && user?.role === 'user' && (
                        <div className="detail-card glass-card authority-reply-card animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
                            <h3><FiMessageSquare /> Authority Response</h3>
                            <div className="authority-reply-content">
                                <p>"{complaint.authorityResponse}"</p>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 12 }}>
                                Is your complaint resolved by this response?
                            </p>
                            <textarea
                                className="form-control"
                                placeholder="Add your feedback (optional)..."
                                rows={2}
                                value={resolveFeedback}
                                onChange={e => setResolveFeedback(e.target.value)}
                                style={{ marginBottom: 12, marginTop: 8 }}
                            />
                            <div className="consent-buttons">
                                <button
                                    className="btn btn-success"
                                    onClick={() => handleUserResolve(true)}
                                    disabled={actionLoading === 'resolved'}
                                >
                                    <FiThumbsUp /> {actionLoading === 'resolved' ? 'Submitting...' : 'Yes, Resolved'}
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleUserResolve(false)}
                                    disabled={actionLoading === 'notresolved'}
                                >
                                    <FiThumbsDown /> {actionLoading === 'notresolved' ? 'Submitting...' : 'No, Not Resolved'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Show what user decided after replying */}
                    {complaint.status === 'user_not_resolved' && (
                        <div className="detail-card glass-card escalation-card animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
                            <h3><FiAlertTriangle /> Not Resolved</h3>
                            <p>You have marked this complaint as not resolved. The authority will follow up.</p>
                            {complaint.authorityResponse && (
                                <div className="authority-reply-content" style={{ marginTop: 10 }}>
                                    <strong>Authority's last response:</strong>
                                    <p>"{complaint.authorityResponse}"</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Escalation / Lawsuit */}
                    {(complaint.status === 'escalated' || complaint.status === 'sent_to_authority' || complaint.status === 'user_not_resolved') && user?.role === 'user' && (
                        <div className="detail-card glass-card escalation-card animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
                            <h3><FiAlertTriangle /> Escalation</h3>
                            {complaint.status === 'escalated' ? (
                                <>
                                    <p>The authority has not responded within the deadline. You can now file a lawsuit.</p>
                                    <button
                                        className="btn btn-danger btn-lg"
                                        onClick={handleEscalate}
                                        disabled={actionLoading === 'escalate'}
                                    >
                                        <FiAlertTriangle /> {actionLoading === 'escalate' ? 'Filing...' : 'File Lawsuit'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p>Complaint is with the authority. Deadline: {complaint.escalationDeadline ? new Date(complaint.escalationDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not set'}</p>
                                    {complaint.escalationDeadline && new Date(complaint.escalationDeadline) < new Date() && (
                                        <button
                                            className="btn btn-danger btn-lg"
                                            onClick={handleEscalate}
                                            disabled={actionLoading === 'escalate'}
                                        >
                                            <FiAlertTriangle /> {actionLoading === 'escalate' ? 'Filing...' : 'File Lawsuit (Deadline Passed)'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Lawsuit Filed Info */}
                    {complaint.status === 'lawsuit_filed' && (
                        <div className="detail-card glass-card animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
                            <h3>⚖️ Lawsuit Filed</h3>
                            <p>A legal notice has been sent to the authority.</p>
                            <Link to={`/lawsuit/${complaint.complaintId}`} className="btn btn-outline">
                                <FiExternalLink /> View Lawsuit Details &amp; Filing Procedure
                            </Link>
                        </div>
                    )}

                    {/* Documents */}
                    {complaint.documents?.length > 0 && (
                        <div className="detail-card glass-card animate-fadeInUp" style={{ animationDelay: '0.45s' }}>
                            <h3>📎 Attached Documents</h3>
                            <div className="doc-list">
                                {complaint.documents.map((doc, i) => (
                                    <div key={i} className="doc-item">
                                        <FiFileText />
                                        <span>{doc.originalName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplaintTracker;

