import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiLogin, apiLogout, apiGetCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = sessionStorage.getItem('gct_user') || localStorage.getItem('gct_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    async function verifySession() {
      try {
        const cached = sessionStorage.getItem('gct_user') || localStorage.getItem('gct_user');
        let uid = null;
        if (cached) {
          try {
            uid = JSON.parse(cached)?.user_id;
          } catch (e) {}
        }

        const data = await apiGetCurrentUser(uid);
        if (data?.success && data?.user) {
          setUser(data.user);
          sessionStorage.setItem('gct_user', JSON.stringify(data.user));
          localStorage.setItem('gct_user', JSON.stringify(data.user));
        }
      } catch (err) {
        // If 401 and no cached user, clear
        if (err.status === 401) {
          setUser(null);
          sessionStorage.removeItem('gct_user');
          localStorage.removeItem('gct_user');
        }
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, []);

  const login = async (userId, password) => {
    const data = await apiLogin(userId, password);
    if (data?.success && data?.user) {
      setUser(data.user);
      sessionStorage.setItem('gct_user', JSON.stringify(data.user));
      localStorage.setItem('gct_user', JSON.stringify(data.user));
      return data.user;
    }
    throw new Error(data?.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      setUser(null);
      sessionStorage.removeItem('gct_user');
      localStorage.removeItem('gct_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
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
