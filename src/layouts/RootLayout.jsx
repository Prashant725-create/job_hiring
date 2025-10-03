// src/layouts/RootLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

/**
 * RootLayout
 * - Top header with teal gradient
 * - Centered page container (.app-container)
 * - ThemeToggle on the right
 * - Shows user info + Logout via Header component
 */
export default function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <header className="header-gradient" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="app-container py-3 flex items-center justify-between">
          <nav className="flex items-center gap-4">
            <Link to="/" className="font-semibold hover:underline">Home</Link>
            <Link to="/jobs" className="hover:underline">Jobs</Link>
            <Link to="/candidates" className="hover:underline">Candidates</Link>
            <Link to="/assessments" className="hover:underline">Assessments</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Header /> {/* displays user or Login link */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-container flex-1 py-6">
        {/* main content area is centered by .app-container */}
        <Outlet />
      </main>

      {/* optional footer area */}
      <footer className="app-container py-6 text-sm text-muted">
        <div style={{ color: "var(--muted)" }}>
          © {new Date().getFullYear()} Job Hiring Platform
        </div>
      </footer>
    </div>
  );
}

/* Header subcomponent that shows authenticated user / logout button or Login link */
function Header() {
  const { user, logout } = useAuth();

  if (user) {
    return (
      <Card className="p-2 flex items-center gap-3" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontWeight: 600 }}>{user.name}</div>
        <button
          onClick={() => void logout()}
          className="px-3 py-1 rounded"
          style={{
            background: "var(--button-bg)",
            border: "1px solid var(--button-border)",
            color: "var(--text)",
          }}
        >
          Logout
        </button>
      </Card>
    );
  }

  return (
    <Link to="/login" className="px-3 py-1 rounded" style={{ background: "var(--button-bg)", border: "1px solid var(--button-border)", color: "var(--text)" }}>
      Login
    </Link>
  );
}
