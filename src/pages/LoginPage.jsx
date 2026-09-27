import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect immediately
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'staff') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUid = userId.trim();
    const cleanPass = password.trim();

    if (!cleanUid || !cleanPass) {
      setError('Please enter both User ID and Password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedUser = await login(cleanUid, cleanPass);
      if (loggedUser.role === 'admin' || loggedUser.role === 'staff') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid login details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <header className="brand-header">
          <div className="brand-logo-wrap">
            <img
              src="/gnanamani_logo.jpg"
              alt="Gnanamani College of Technology"
              className="brand-logo"
            />
          </div>
          <h1 className="college-title">Gnanamani College of Technology</h1>
          <p className="portal-subtitle">Question Paper Portal</p>
        </header>

        {error && (
          <div className="alert-message error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label htmlFor="userId">User ID</label>
            <div className="input-wrap">
              <input
                type="text"
                id="userId"
                name="user_id"
                placeholder="Enter your User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner"></span> Authenticating...
              </>
            ) : (
              <>
                <span>Sign In</span> &rarr;
              </>
            )}
          </button>
        </form>
      </div>

      <footer className="portal-footer">
        &copy; {new Date().getFullYear()} Gnanamani College of Technology. All rights reserved.
      </footer>
    </div>
  );
}
