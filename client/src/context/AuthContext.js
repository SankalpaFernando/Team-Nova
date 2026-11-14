import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

// Create the context
const AuthContext = createContext(null);

// Provider component — wraps the whole app
export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mg_user'));
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // When app loads — verify token is still valid
  useEffect(() => {
    const token = localStorage.getItem('mg_token');
    if (token && user) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Register function - submits registration form and requests 6-digit email verification code
  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    return res.data;
  };

  // Verify email code - creates the pending user record for admin review
  const verifyEmailCode = async (email, code) => {
    const res = await api.post('/auth/verify-email-code', { email, code });
    return res.data;
  };

  // Resend verification code with cooldown & hourly limits
  const resendEmailCode = async (email) => {
    const res = await api.post('/auth/resend-email-code', { email });
    return res.data;
  };

  // Login function
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('mg_token', token);
    localStorage.setItem('mg_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  // Forgot password — request a reset link be sent to the given email
  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgotpassword', { email });
    return res.data; // { success, message, devResetUrl? }
  };

  // Reset password — submit new password using the token from the emailed link
  const resetPassword = async (token, password) => {
    const res = await api.put(`/auth/resetpassword/${token}`, { password });
    const { token: authToken, user: userData } = res.data;
    localStorage.setItem('mg_token', authToken);
    localStorage.setItem('mg_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('mg_token');
    localStorage.removeItem('mg_user');
    setUser(null);
  };

  // refreshUser — call after saving profile to update React state immediately
  // without requiring a logout/login cycle.
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const fresh = res.data.user;
      localStorage.setItem('mg_user', JSON.stringify(fresh));
      setUser(fresh);
    } catch {
      // silently ignore
    }
  };

  // Helper flags
  const isAdmin = user?.role === 'admin';
  const isSiteEngineer = user?.role === 'site_engineer';
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register,
      verifyEmailCode,
      resendEmailCode,
      forgotPassword,
      resetPassword,
      logout,
      refreshUser,
      isAdmin, 
      isSiteEngineer,
      isLoggedIn 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — easy way to use auth anywhere
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
