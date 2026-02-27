import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, loginAdmin } from '../services/api';
import { FiShield, FiEye, FiEyeOff, FiLogIn, FiUsers } from 'react-icons/fi';
import './Auth.css';

const LoginPage = () => {
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const [formData, setFormData] = useState({ voterID: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let res;
            if (isAdminLogin) {
                res = await loginAdmin({ email: formData.email, password: formData.password });
            } else {
                res = await loginUser({ voterID: formData.voterID, password: formData.password });
            }

            login(res.data);

            if (res.data.role === 'admin') {
                navigate('/admin');
            } else if (res.data.role === 'authority') {
                navigate('/authority');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-effects">
                <div className="bg-circle bg-circle-1"></div>
                <div className="bg-circle bg-circle-2"></div>
                <div className="bg-circle bg-circle-3"></div>
            </div>

            <div className="auth-container animate-fadeInUp">
                <div className="auth-header">
                    <div className="auth-logo">
                        <FiShield />
                    </div>
                    <h1>Civic Shield</h1>
                    <p>Secure Complaint Management System</p>
                </div>

                <div className="auth-toggle">
                    <button
                        className={`toggle-btn ${!isAdminLogin ? 'active' : ''}`}
                        onClick={() => setIsAdminLogin(false)}
                    >
                        <FiLogIn /> Citizen Login
                    </button>
                    <button
                        className={`toggle-btn ${isAdminLogin ? 'active' : ''}`}
                        onClick={() => setIsAdminLogin(true)}
                    >
                        <FiUsers /> Admin / Authority
                    </button>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    {isAdminLogin ? (
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="form-control"
                                placeholder="admin@department.gov"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>Voter ID</label>
                            <input
                                type="text"
                                name="voterID"
                                className="form-control"
                                placeholder="e.g., ABC1234567"
                                value={formData.voterID}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className="form-control"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                                Signing In...
                            </>
                        ) : (
                            <>
                                <FiLogIn /> Sign In
                            </>
                        )}
                    </button>
                </form>

                {!isAdminLogin && (
                    <div className="auth-footer">
                        <p>Don't have an account? <Link to="/register">Register with Voter ID</Link></p>
                    </div>
                )}

                {isAdminLogin && (
                    <div className="auth-footer">
                        <div className="demo-credentials">
                            <p className="demo-title">Demo Credentials (Password below):</p>
                            <div className="demo-creds-scroll">
                                <p>admin@municipal.gov — Municipal Corp</p>
                                <p>admin@health.gov — Health Dept</p>
                                <p>admin@police.gov — Police Dept</p>
                                <p>admin@education.gov — Education</p>
                                <p>admin@transport.gov — Transport</p>
                                <p>admin@electricity.gov — Electricity</p>
                                <p>admin@water.gov — Water Supply</p>
                                <p>admin@environment.gov — Environment</p>
                                <p>admin@publicworks.gov — Public Works</p>
                                <p>admin@revenue.gov — Revenue</p>
                            </div>
                            <p style={{ marginTop: 8 }}>🔑 Admin pw: <strong>admin123</strong> | Authority pw: <strong>authority123</strong></p>
                            <p style={{ fontSize: '0.7rem', opacity: 0.6 }}>Authority emails: authority@{'{dept}'}.gov</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
