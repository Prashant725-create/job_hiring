// src/components/ThemeToggle.jsx
import React from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text)",
        cursor: "pointer"
      }}
    >
      {isDark ? (
        <img src="/sun.svg" alt="Light mode" width={18} height={18} />
      ) : (
        <img src="/moon.svg" alt="Dark mode" width={18} height={18} />
      )}
      <span style={{ fontSize: 13 }}>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
