import React from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from "../components/ThemeToggle";

export default function RootLayout() {
  return (
    <div>
      <header style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link to="/">Home</Link>
            <Link to="/jobs">Jobs</Link>
            <Link to="/candidates">Candidates</Link>
            <Link to="/assessments">Assessments</Link>
            <Link to="/login">Login</Link>
          </nav>

          {/* Theme toggle on the right */}
          <div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      

      <main style={{ padding: 20 }}>
        <div className="p-6 bg-teal-500 text-white">
          Tailwind works ✅
        </div>

        {/*
          // Optional: show only in development
          {import.meta.env.DEV && (
            <div className="p-6 bg-teal-500 text-white">Tailwind works ✅</div>
          )}
        */}
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