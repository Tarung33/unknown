import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getComplaintById, getLawsuitInfo, escalateComplaint } from '../services/api';
import { FiArrowLeft, FiExternalLink, FiFileText, FiAlertTriangle, FiMail, FiCheck } from 'react-icons/fi';
import './LawsuitPage.css';

const LawsuitPage = () => {
    const { id } = useParams();
    const [complaint, setComplaint] = useState(null);
    const [lawsuitInfo, setLawsuitInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [escalated, setEscalated] = useState(false);
    const [escalateLoading, setEscalateLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [complaintRes, infoRes] = await Promise.all([
                    getComplaintById(id),
                    getLawsuitInfo(),
                ]);
                setComplaint(complaintRes.data);
                setLawsuitInfo(infoRes.data);
                setEscalated(complaintRes.data.status === 'lawsuit_filed');
            } catch (err) {
                console.error('Failed to load:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleEscalate = async () => {
        if (!window.confirm('This will send a legal notice to the authority. Continue?')) return;
        setEscalateLoading(true);
        try {
            await escalateComplaint(id);
            setEscalated(true);
            const res = await getComplaintById(id);
            setComplaint(res.data);
        } catch (err) {
            console.error('Escalation failed:', err);
        }
        setEscalateLoading(false);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading lawsuit information...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <Link to={`/complaint/${id}`} className="back-link animate-fadeIn">
                <FiArrowLeft /> Back to Complaint
            </Link>

            <div className="page-header animate-fadeInUp">
                <h1>⚖️ Legal Action & Lawsuit Filing</h1>
                <p>Complaint {complaint?.complaintId} — {complaint?.heading}</p>
            </div>

            {/* Lawsuit Status */}
            {escalated ? (
                <div className="lawsuit-status-card glass-card animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                    <div className="lawsuit-status-header">
                        <FiMail className="status-icon sent" />
                        <div>
                            <h2>Legal Notice Sent</h2>
                            <p>A formal legal notice has been sent to the {complaint?.department}.</p>
                        </div>
                    </div>
                    {complaint?.lawsuitDetails?.emailContent && (
                        <details className="email-details">
                            <summary>View Legal Notice Email</summary>
                            <pre className="email-content">{complaint.lawsuitDetails.emailContent}</pre>
                        </details>
                    )}
                </div>
            ) : (
                <div className="lawsuit-status-card glass-card warning-card animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                    <div className="lawsuit-status-header">
                        <FiAlertTriangle className="status-icon warning" />
                        <div>
                            <h2>File a Lawsuit</h2>
                            <p>The authority has not responded within the deadline. You can file a legal notice.</p>
                        </div>
                    </div>
                    <button
                        className="btn btn-danger btn-lg"
                        onClick={handleEscalate}
                        disabled={escalateLoading}
                    >
                        <FiFileText /> {escalateLoading ? 'Sending Legal Notice...' : 'Send Legal Notice & File Lawsuit'}
                    </button>
                </div>
            )}

            {/* Step by Step Procedure */}
            {lawsuitInfo && (
                <div className="procedure-section animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                    <h2 className="section-heading">📋 Step-by-Step Procedure to File a Lawsuit</h2>
                    <div className="procedure-steps">
                        {lawsuitInfo.steps.map((step, i) => (
                            <div key={step.step} className="procedure-step glass-card" style={{ animationDelay: `${0.1 * i}s` }}>
                                <div className="step-number">{step.step}</div>
                                <div className="step-content">
                                    <h3>{step.title}</h3>
                                    <p>{step.description}</p>
                                    {step.link && (
                                        <a href={step.link} target="_blank" rel="noopener noreferrer" className="step-link">
                                            <FiExternalLink /> Visit Portal
                                        </a>
                                    )}
                                </div>
                                {escalated && i === 1 && (
                                    <div className="step-done">
                                        <FiCheck /> Done
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Helpful Platforms */}
            {lawsuitInfo && (
                <div className="platforms-section animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                    <h2 className="section-heading">🌐 Helpful Platforms & Resources</h2>
                    <div className="platforms-grid">
                        {lawsuitInfo.platforms.map((platform, i) => (
                            <a
                                key={i}
                                href={platform.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="platform-card glass-card"
                            >
                                <div className="platform-icon"><FiExternalLink /></div>
                                <div>
                                    <h3>{platform.name}</h3>
                                    <p>{platform.description}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LawsuitPage;
