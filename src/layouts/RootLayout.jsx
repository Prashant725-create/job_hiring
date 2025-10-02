import React from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <div>
      <header style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <nav style={{ display: "flex", gap: 12 }}>
          <Link to="/">Home</Link>
          <Link to="/jobs">Jobs</Link>
          <Link to="/candidates">Candidates</Link>
          <Link to="/assessments">Assessments</Link>
          <Link to="/login">Login</Link>
        </nav>
      </header>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}

function Header() {
  const { user, logout } = useAuth();
  return (
    <header>
      {user ? (
        <div>
          <span>{user.name}</span>
          <button onClick={() => void logout()}>Logout</button>
        </div>
      ) : (
        <a href="/login">Login</a>
      )}
    </header>
  );
}