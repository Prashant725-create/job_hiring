// src/components/RequireAuth.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (role && user.role !== role) return <div>Forbidden</div>;
  return children;
}
