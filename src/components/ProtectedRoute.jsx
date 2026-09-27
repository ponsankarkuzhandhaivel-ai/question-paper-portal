import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Loading Question Paper Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If student tries to visit admin page, redirect to student dashboard
    if (user.role === 'student') {
      return <Navigate to="/student/dashboard" replace />;
    }
    // If staff/admin tries to visit student page, redirect to admin dashboard
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
