import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyComplaints } from '../services/api';
import ComplaintCard from '../components/ComplaintCard';
import { FiPlusCircle, FiFileText, FiCheckCircle, FiClock, FiAlertTriangle, FiShield } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchComplaints = async () => {
            try {
                const res = await getMyComplaints();
                setComplaints(res.data);
            } catch (err) {
                console.error('Failed to fetch complaints:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchComplaints();
    }, []);

    const stats = {
        total: complaints.length,
        active: complaints.filter(c => !['resolved', 'admin_rejected', 'ai_rejected'].includes(c.status)).length,
        resolved: complaints.filter(c => c.status === 'resolved').length,
        escalated: complaints.filter(c => ['escalated', 'lawsuit_filed'].includes(c.status)).length,
    };

    return (
        <div className="page-container">
            <div className="dashboard-welcome animate-fadeInUp">
                <div className="welcome-content">
                    <div className="welcome-icon">
                        <FiShield />
                    </div>
                    <div>
                        <h1>Welcome back, {user?.name}</h1>
                        <p>Your anonymous ID: <span className="anon-id">Unknown-{user?.voterID?.slice(-4)}</span></p>
                    </div>
                </div>
                <Link to="/new-complaint" className="btn btn-primary btn-lg">
                    <FiPlusCircle /> New Complaint
                </Link>
            </div>

            <div className="stats-grid animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-light)' }}>
                        <FiFileText />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Complaints</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber-light)' }}>
                        <FiClock />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">Active</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald-light)' }}>
                        <FiCheckCircle />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.resolved}</span>
                        <span className="stat-label">Resolved</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--red-light)' }}>
                        <FiAlertTriangle />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.escalated}</span>
                        <span className="stat-label">Escalated</span>
                    </div>
                </div>
            </div>

            <div className="section-header animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                <h2>Recent Complaints</h2>
                {complaints.length > 0 && (
                    <Link to="/my-complaints" className="btn btn-outline btn-sm">View All</Link>
                )}
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading complaints...</p>
                </div>
            ) : complaints.length === 0 ? (
                <div className="empty-state glass-card">
                    <div className="empty-state-icon">📋</div>
                    <h3>No Complaints Yet</h3>
                    <p>You haven't filed any complaints. Click the button above to submit your first complaint.</p>
                    <Link to="/new-complaint" className="btn btn-primary" style={{ marginTop: 16 }}>
                        <FiPlusCircle /> File a Complaint
                    </Link>
                </div>
            ) : (
                <div className="complaints-grid">
                    {complaints.slice(0, 6).map((complaint, i) => (
                        <div key={complaint._id} className="animate-fadeInUp" style={{ animationDelay: `${0.1 * i}s` }}>
                            <ComplaintCard complaint={complaint} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
