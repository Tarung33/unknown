import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/api';
import { FiShield, FiEye, FiEyeOff, FiUserPlus } from 'react-icons/fi';
import './Auth.css';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        voterID: '',
        name: '',
        age: '',
        gender: '',
        phone: '',
        address: '',
        password: '',
        confirmPassword: '',
    });
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

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const res = await registerUser({
                voterID: formData.voterID,
                name: formData.name,
                age: parseInt(formData.age),
                gender: formData.gender,
                phone: formData.phone,
                address: formData.address,
                password: formData.password,
            });

            login(res.data);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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

            <div className="auth-container register-container animate-fadeInUp">
                <div className="auth-header">
                    <div className="auth-logo">
                        <FiShield />
                    </div>
                    <h1>Create Account</h1>
                    <p>Register with your Voter ID to get started</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Voter ID *</label>
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

                    <div className="grid-2">
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                className="form-control"
                                placeholder="Your full name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Age *</label>
                            <input
                                type="number"
                                name="age"
                                className="form-control"
                                placeholder="Your age"
                                min="18"
                                max="120"
                                value={formData.age}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label>Gender *</label>
                            <select name="gender" className="form-control" value={formData.gender} onChange={handleChange} required>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Phone Number *</label>
                            <input
                                type="tel"
                                name="phone"
                                className="form-control"
                                placeholder="10-digit phone number"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Address</label>
                        <input
                            type="text"
                            name="address"
                            className="form-control"
                            placeholder="Your residential address (optional)"
                            value={formData.address}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label>Password *</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="form-control"
                                    placeholder="Min 6 characters"
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

                        <div className="form-group">
                            <label>Confirm Password *</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className="form-control"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                                Creating Account...
                            </>
                        ) : (
                            <>
                                <FiUserPlus /> Create Account
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login">Sign In</Link></p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
