import { FiClock, FiCheckCircle, FiAlertCircle, FiSend, FiShield, FiXCircle, FiAlertTriangle, FiFileText } from 'react-icons/fi';
import './StatusTimeline.css';

const statusConfig = {
    submitted: { icon: <FiSend />, label: 'Submitted', color: 'var(--primary)' },
    ai_review: { icon: <FiShield />, label: 'AI Review', color: 'var(--purple)' },
    ai_rejected: { icon: <FiXCircle />, label: 'AI Rejected', color: 'var(--red)' },
    verified: { icon: <FiCheckCircle />, label: 'Verified', color: 'var(--emerald)' },
    sent_to_admin: { icon: <FiSend />, label: 'Sent to Admin', color: 'var(--cyan)' },
    admin_approved: { icon: <FiCheckCircle />, label: 'Admin Approved', color: 'var(--emerald)' },
    admin_rejected: { icon: <FiXCircle />, label: 'Admin Rejected', color: 'var(--red)' },
    sent_to_authority: { icon: <FiSend />, label: 'Sent to Authority', color: 'var(--amber)' },
    authority_responded: { icon: <FiCheckCircle />, label: 'Authority Responded', color: 'var(--cyan)' },
    resolved: { icon: <FiCheckCircle />, label: 'Resolved', color: '#4ade80' },
    escalated: { icon: <FiAlertTriangle />, label: 'Escalated', color: 'var(--red)' },
    lawsuit_filed: { icon: <FiFileText />, label: 'Lawsuit Filed', color: 'var(--red)' },
};

const StatusTimeline = ({ history = [], currentStatus }) => {
    if (!history || history.length === 0) return null;

    return (
        <div className="timeline">
            {history.map((item, index) => {
                const config = statusConfig[item.status] || { icon: <FiClock />, label: item.status, color: 'var(--text-muted)' };
                const isLatest = index === history.length - 1;
                const isActive = item.status === currentStatus;

                return (
                    <div key={index} className={`timeline-item ${isLatest ? 'latest' : ''} ${isActive ? 'active' : ''}`}>
                        <div className="timeline-line" />
                        <div className="timeline-dot" style={{ borderColor: config.color, color: config.color }}>
                            {config.icon}
                        </div>
                        <div className="timeline-content">
                            <div className="timeline-header">
                                <span className="timeline-label" style={{ color: config.color }}>
                                    {config.label}
                                </span>
                                <span className="timeline-time">
                                    {new Date(item.timestamp).toLocaleString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                            <p className="timeline-message">{item.message}</p>
                            {item.updatedBy && item.updatedBy !== 'system' && (
                                <span className="timeline-by">by {item.updatedBy}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default StatusTimeline;
