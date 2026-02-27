import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitComplaint } from '../services/api';
import API from '../services/api';
import { FiUploadCloud, FiMapPin, FiSend, FiUser, FiX, FiFile, FiCheckSquare, FiEdit3 } from 'react-icons/fi';
import './NewComplaint.css';

const NewComplaint = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [formData, setFormData] = useState({
        department: '',
        heading: '',
        description: '',
        agreedToTerms: false,
    });
    const [files, setFiles] = useState([]);
    const [location, setLocation] = useState(null);
    const [manualAddress, setManualAddress] = useState('');
    const [locationMode, setLocationMode] = useState('auto'); // 'auto' or 'manual'
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch departments from API
    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const res = await API.get('/departments');
                setDepartments(res.data);
            } catch (err) {
                console.error('Failed to fetch departments:', err);
            }
        };
        fetchDepts();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
        setError('');
    };

    const handleDepartmentSelect = (deptName) => {
        setFormData({ ...formData, department: deptName });
        setError('');
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        const totalFiles = [...files, ...newFiles].slice(0, 5);
        setFiles(totalFiles);
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const fetchLocation = async () => {
        setLocationLoading(true);
        setLocationError('');

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser. Please enter your address manually.');
            setLocationMode('manual');
            setLocationLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
                    );
                    const data = await response.json();
                    setLocation({
                        latitude,
                        longitude,
                        address: data.display_name || `${latitude}, ${longitude}`,
                    });
                } catch {
                    setLocation({
                        latitude,
                        longitude,
                        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                    });
                }
                setLocationLoading(false);
            },
            (err) => {
                setLocationError('Failed to get location. You can enter your address manually below.');
                setLocationMode('manual');
                setLocationLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!formData.department || !formData.heading || !formData.description) {
            setError('Please fill all required fields');
            setLoading(false);
            return;
        }

        if (!formData.agreedToTerms) {
            setError('You must agree to the Terms & Conditions');
            setLoading(false);
            return;
        }

        // Determine final address
        const finalAddress = locationMode === 'manual' ? manualAddress : location?.address;
        if (!finalAddress && !location) {
            setError('Please provide a location (auto-fetch or enter manually)');
            setLoading(false);
            return;
        }

        try {
            const fd = new FormData();
            fd.append('department', formData.department);
            fd.append('heading', formData.heading);
            fd.append('description', formData.description);
            fd.append('agreedToTerms', 'true');

            if (location) {
                fd.append('latitude', location.latitude);
                fd.append('longitude', location.longitude);
                fd.append('address', location.address);
            } else if (manualAddress) {
                fd.append('latitude', '0');
                fd.append('longitude', '0');
                fd.append('address', manualAddress);
            }

            files.forEach(file => {
                fd.append('documents', file);
            });

            const res = await submitComplaint(fd);
            setSuccess(`Complaint ${res.data.complaintId} submitted successfully! It will be analyzed by our AI system and routed to the ${formData.department}.`);

            setTimeout(() => {
                navigate(`/complaint/${res.data.complaintId}`);
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit complaint');
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="page-container">
            <div className="page-header animate-fadeInUp">
                <h1>📝 File a New Complaint</h1>
                <p>Your identity will be anonymized as <strong className="anon-id">Unknown-{user?.voterID?.slice(-4)}</strong></p>
            </div>

            {error && <div className="alert alert-error animate-fadeInUp">{error}</div>}
            {success && <div className="alert alert-success animate-fadeInUp">{success}</div>}

            <form onSubmit={handleSubmit} className="complaint-form">
                {/* Profile Section */}
                <div className="form-section glass-card animate-fadeInUp">
                    <h2 className="section-title"><FiUser /> Your Profile (Auto-fetched)</h2>
                    <p className="section-desc">These details are fetched from your profile and will be anonymized before processing.</p>

                    <div className="profile-grid">
                        <div className="profile-field">
                            <span className="profile-label">Name</span>
                            <span className="profile-value">{user?.name}</span>
                        </div>
                        <div className="profile-field">
                            <span className="profile-label">Age</span>
                            <span className="profile-value">{user?.age}</span>
                        </div>
                        <div className="profile-field">
                            <span className="profile-label">Gender</span>
                            <span className="profile-value">{user?.gender}</span>
                        </div>
                        <div className="profile-field">
                            <span className="profile-label">Phone</span>
                            <span className="profile-value">{user?.phone}</span>
                        </div>
                        <div className="profile-field">
                            <span className="profile-label">Voter ID</span>
                            <span className="profile-value">{user?.voterID}</span>
                        </div>
                        <div className="profile-field">
                            <span className="profile-label">Anonymous ID</span>
                            <span className="profile-value anon-highlight">Unknown-{user?.voterID?.slice(-4)}</span>
                        </div>
                    </div>
                </div>

                {/* Complaint Details */}
                <div className="form-section glass-card animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                    <h2 className="section-title">📋 Complaint Details</h2>

                    <div className="form-group">
                        <label>Department * <span style={{ fontSize: '0.75rem', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(Your complaint will be routed to this department's admin)</span></label>
                        <input
                            type="text"
                            name="department"
                            className="form-control"
                            placeholder="e.g., Municipal Corporation, Health Department, Police Department, Education Department..."
                            value={formData.department}
                            onChange={handleChange}
                            required
                        />
                        {departments.length > 0 && (
                            <div className="dept-suggestions">
                                {departments.map(dept => (
                                    <button
                                        key={dept.key}
                                        type="button"
                                        className={`dept-chip ${formData.department === dept.name ? 'active' : ''}`}
                                        onClick={() => handleDepartmentSelect(dept.name)}
                                        title={dept.desc}
                                    >
                                        {dept.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Complaint Heading *</label>
                        <input
                            type="text"
                            name="heading"
                            className="form-control"
                            placeholder="Brief title for your complaint"
                            value={formData.heading}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description *</label>
                        <textarea
                            name="description"
                            className="form-control"
                            placeholder="Describe your complaint in detail. Include dates, specific issues, and any relevant information..."
                            value={formData.description}
                            onChange={handleChange}
                            rows={6}
                            required
                        />
                    </div>
                </div>

                {/* Document Upload */}
                <div className="form-section glass-card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                    <h2 className="section-title"><FiUploadCloud /> Upload Documents</h2>
                    <p className="section-desc">Upload supporting evidence (images, PDFs, docs). Max 5 files, 5MB each.</p>

                    <div className="upload-area">
                        <input
                            type="file"
                            id="file-upload"
                            multiple
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        <label htmlFor="file-upload" className="upload-label">
                            <FiUploadCloud className="upload-icon" />
                            <span>Drop files here or click to browse</span>
                            <span className="upload-hint">JPG, PNG, PDF, DOC up to 5MB</span>
                        </label>
                    </div>

                    {files.length > 0 && (
                        <div className="file-list">
                            {files.map((file, i) => (
                                <div key={i} className="file-item">
                                    <FiFile className="file-icon" />
                                    <div className="file-info">
                                        <span className="file-name">{file.name}</span>
                                        <span className="file-size">{formatFileSize(file.size)}</span>
                                    </div>
                                    <button type="button" className="file-remove" onClick={() => removeFile(i)}>
                                        <FiX />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Location */}
                <div className="form-section glass-card animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                    <h2 className="section-title"><FiMapPin /> Location</h2>
                    <p className="section-desc">Provide your complaint location — auto-fetch or enter manually.</p>

                    <div className="location-mode-toggle">
                        <button
                            type="button"
                            className={`mode-btn ${locationMode === 'auto' ? 'active' : ''}`}
                            onClick={() => setLocationMode('auto')}
                        >
                            <FiMapPin /> Auto-Detect
                        </button>
                        <button
                            type="button"
                            className={`mode-btn ${locationMode === 'manual' ? 'active' : ''}`}
                            onClick={() => setLocationMode('manual')}
                        >
                            <FiEdit3 /> Enter Manually
                        </button>
                    </div>

                    {locationMode === 'auto' ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-outline location-btn"
                                onClick={fetchLocation}
                                disabled={locationLoading}
                            >
                                {locationLoading ? (
                                    <>
                                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                                        Fetching Location...
                                    </>
                                ) : (
                                    <>
                                        <FiMapPin /> {location ? 'Update Location' : 'Fetch My Location'}
                                    </>
                                )}
                            </button>

                            {locationError && <p className="location-error">{locationError}</p>}

                            {location && (
                                <div className="location-result">
                                    <div className="location-coords">
                                        <span>📍 {location.address}</span>
                                    </div>
                                    <div className="location-meta">
                                        <span>Lat: {location.latitude?.toFixed(6)}</span>
                                        <span>Lng: {location.longitude?.toFixed(6)}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="manual-location">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter your full address (e.g., 123 MG Road, Sector 5, Bangalore, Karnataka 560001)"
                                value={manualAddress}
                                onChange={(e) => setManualAddress(e.target.value)}
                            />
                            {manualAddress && (
                                <div className="location-result" style={{ marginTop: 12 }}>
                                    <div className="location-coords">
                                        <span>📍 {manualAddress}</span>
                                    </div>
                                    <div className="location-meta">
                                        <span>Manually entered address</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Terms & Submit */}
                <div className="form-section glass-card animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
                    <div className="terms-section">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="agreedToTerms"
                                checked={formData.agreedToTerms}
                                onChange={handleChange}
                            />
                            <span className="checkmark"><FiCheckSquare /></span>
                            <span>
                                I agree to the <strong>Terms & Conditions</strong>. I confirm that the information provided is true and accurate to my knowledge.
                                I understand that my identity will be anonymized and my personal data will not be shared without my explicit consent.
                                Filing false or malicious complaints may result in legal action.
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg submit-complaint-btn"
                        disabled={loading || !formData.agreedToTerms}
                    >
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                                Submitting Complaint...
                            </>
                        ) : (
                            <>
                                <FiSend /> Submit Complaint
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewComplaint;
