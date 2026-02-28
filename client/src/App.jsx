import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import NewComplaint from './pages/NewComplaint';
import MyComplaints from './pages/MyComplaints';
import ComplaintTracker from './pages/ComplaintTracker';
import AdminPanel from './pages/AdminPanel';
import AuthorityPanel from './pages/AuthorityPanel';
import LawsuitPage from './pages/LawsuitPage';
import LandingPage from './pages/LandingPage';

const AppContent = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
                <p>Loading Civic Shield...</p>
            </div>
        );
    }

    return (
        <>
            {user && <Navbar />}
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
                <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />

                {/* User Routes */}
                <Route path="/dashboard" element={
                    <ProtectedRoute roles={['user']}>
                        <Dashboard />
                    </ProtectedRoute>
                } />
                <Route path="/new-complaint" element={
                    <ProtectedRoute roles={['user']}>
                        <NewComplaint />
                    </ProtectedRoute>
                } />
                <Route path="/my-complaints" element={
                    <ProtectedRoute roles={['user']}>
                        <MyComplaints />
                    </ProtectedRoute>
                } />
                <Route path="/complaint/:id" element={
                    <ProtectedRoute>
                        <ComplaintTracker />
                    </ProtectedRoute>
                } />
                <Route path="/lawsuit/:id" element={
                    <ProtectedRoute>
                        <LawsuitPage />
                    </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin" element={
                    <ProtectedRoute roles={['admin']}>
                        <AdminPanel />
                    </ProtectedRoute>
                } />

                {/* Authority Routes */}
                <Route path="/authority" element={
                    <ProtectedRoute roles={['authority']}>
                        <AuthorityPanel />
                    </ProtectedRoute>
                } />

                {/* Default — Landing page for guests, dashboard for logged-in users */}
                <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </>
    );
};

const App = () => {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
};

export default App;
