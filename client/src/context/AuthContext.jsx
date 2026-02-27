import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('civicShieldUser');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch {
                localStorage.removeItem('civicShieldUser');
            }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('civicShieldUser', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('civicShieldUser');
    };

    const isUser = () => user?.role === 'user';
    const isAdmin = () => user?.role === 'admin';
    const isAuthority = () => user?.role === 'authority';

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isUser, isAdmin, isAuthority }}>
            {children}
        </AuthContext.Provider>
    );
};
