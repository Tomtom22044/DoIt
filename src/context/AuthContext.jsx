import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = '/api/auth';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        } catch (err) {
            console.error('Login error:', err);
            if (err.message.includes('Failed to fetch')) {
                throw new Error('לא ניתן להתחבר לשרת. וודא שאתה מחובר לאותה רשת ושהשרת פועל.');
            }
            throw err;
        }
    };

    const signup = async (email, password, name) => {
        try {
            const res = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        } catch (err) {
            console.error('Signup error:', err);
            if (err.message.includes('Failed to fetch')) {
                throw new Error('לא ניתן להתחבר לשרת. וודא שאתה מחובר לאותה רשת ושהשרת פועל.');
            }
            throw err;
        }
    };

    const loginWithGoogle = async (credential) => {
        try {
            console.log('Attempting Google login with backend...');
            const res = await fetch(`${API_URL}/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
            });

            const data = await res.json();
            console.log('Google login response:', data);

            if (!res.ok || data.error) {
                throw new Error(data.error || `Server responded with status ${res.status}`);
            }

            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        } catch (err) {
            console.error('Detailed Google login error:', err);
            if (err.message.includes('Failed to fetch')) {
                throw new Error('לא ניתן להתחבר לשרת מחשבון גוגל. וודא שהשרת פועל ונגיש.');
            }
            throw err;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const value = {
        user,
        token,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
