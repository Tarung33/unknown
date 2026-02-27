import { useState, useEffect } from 'react';
import { getMyComplaints } from '../services/api';
import ComplaintCard from '../components/ComplaintCard';
import { FiList, FiSearch } from 'react-icons/fi';

const MyComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getMyComplaints();
                setComplaints(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const filtered = complaints.filter(c =>
        c.heading?.toLowerCase().includes(search.toLowerCase()) ||
        c.complaintId?.toLowerCase().includes(search.toLowerCase()) ||
        c.department?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-container">
            <div className="page-header animate-fadeInUp">
                <h1>📋 My Complaints</h1>
                <p>View and track all your filed complaints</p>
            </div>

            <div className="animate-fadeInUp" style={{ animationDelay: '0.1s', marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by complaint ID, heading, or department..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: 42 }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading your complaints...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="empty-state glass-card">
                    <div className="empty-state-icon">📋</div>
                    <h3>{search ? 'No matching complaints' : 'No complaints filed yet'}</h3>
                    <p>{search ? 'Try a different search term' : 'File your first complaint to get started'}</p>
                </div>
            ) : (
                <div className="complaints-grid">
                    {filtered.map((complaint, i) => (
                        <div key={complaint._id} className="animate-fadeInUp" style={{ animationDelay: `${0.05 * i}s` }}>
                            <ComplaintCard complaint={complaint} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyComplaints;
