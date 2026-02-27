import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiShield, FiHome, FiPlusCircle, FiList, FiLogOut, FiUser, FiUsers, FiCheckSquare } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, isUser, isAdmin, isAuthority } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    <div className="brand-icon">
                        <FiShield />
                    </div>
                    <div className="brand-text">
                        <span className="brand-name">Civic Shield</span>
                        <span className="brand-tag">Complaint Management</span>
                    </div>
                </Link>

                <div className="navbar-links">
                    {user && isUser() && (
                        <>
                            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                                <FiHome /> <span>Dashboard</span>
                            </Link>
                            <Link to="/new-complaint" className={`nav-link ${isActive('/new-complaint') ? 'active' : ''}`}>
                                <FiPlusCircle /> <span>New Complaint</span>
                            </Link>
                            <Link to="/my-complaints" className={`nav-link ${isActive('/my-complaints') ? 'active' : ''}`}>
                                <FiList /> <span>My Complaints</span>
                            </Link>
                        </>
                    )}

                    {user && isAdmin() && (
                        <>
                            <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
                                <FiUsers /> <span>Admin Panel</span>
                            </Link>
                        </>
                    )}

                    {user && isAuthority() && (
                        <>
                            <Link to="/authority" className={`nav-link ${isActive('/authority') ? 'active' : ''}`}>
                                <FiCheckSquare /> <span>Authority Panel</span>
                            </Link>
                        </>
                    )}

                    {user && (
                        <div className="nav-user-section">
                            <div className="nav-user-info">
                                <FiUser />
                                <span>{user.name}</span>
                                <span className={`role-badge role-${user.role}`}>{user.role}</span>
                            </div>
                            <button className="nav-logout" onClick={handleLogout}>
                                <FiLogOut /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
