import { Link } from 'react-router-dom';
import { FiClock, FiMapPin, FiChevronRight } from 'react-icons/fi';
import './ComplaintCard.css';

const statusLabels = {
    submitted: 'Submitted',
    ai_review: 'AI Review',
    ai_rejected: 'AI Rejected',
    verified: 'Verified',
    sent_to_admin: 'With Admin',
    admin_approved: 'Admin Approved',
    admin_rejected: 'Admin Rejected',
    sent_to_authority: 'With Authority',
    authority_responded: 'Authority Responded',
    resolved: 'Resolved',
    escalated: 'Escalated',
    lawsuit_filed: 'Lawsuit Filed',
};

const ComplaintCard = ({ complaint, linkPrefix = '/complaint' }) => {
    return (
        <Link to={`${linkPrefix}/${complaint.complaintId}`} className="complaint-card glass-card">
            <div className="complaint-card-header">
                <span className="complaint-id">{complaint.complaintId}</span>
                <span className={`badge badge-${complaint.status}`}>
                    {statusLabels[complaint.status] || complaint.status}
                </span>
            </div>

            <h3 className="complaint-card-title">{complaint.heading}</h3>

            <p className="complaint-card-desc">
                {complaint.description?.substring(0, 120)}
                {complaint.description?.length > 120 ? '...' : ''}
            </p>

            <div className="complaint-card-meta">
                <span className="meta-item">
                    <FiMapPin /> {complaint.department}
                </span>
                <span className="meta-item">
                    <FiClock /> {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                    })}
                </span>
            </div>

            <div className="complaint-card-footer">
                {complaint.aiAnalysis?.severity && (
                    <span className={`badge badge-${complaint.aiAnalysis.severity}`}>
                        {complaint.aiAnalysis.severity}
                    </span>
                )}
                <span className="view-details">
                    View Details <FiChevronRight />
                </span>
            </div>
        </Link>
    );
};

export default ComplaintCard;
