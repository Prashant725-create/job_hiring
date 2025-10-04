// src/components/ThemeToggle.jsx
import React, { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme() || {};
  const isDark = theme === "dark";
  const [imgError, setImgError] = useState(false);

  // Vite provides import.meta.env.BASE_URL which is "/" by default;
  // use it so production basePath works if you set a base.
  const base = (import.meta && import.meta.env && import.meta.env.BASE_URL) || "/";
  const sunUrl = `${base}sun.svg`;
  const moonUrl = `${base}moon.svg`;

  const onClick = () => {
    if (typeof toggleTheme === "function") {
      toggleTheme();
    } else {
      // fallback: directly toggle html class & persist
      const html = document.documentElement;
      if (html.classList.contains("dark")) {
        html.classList.remove("dark");
        try { localStorage.setItem("theme", "light"); } catch {}
      } else {
        html.classList.add("dark");
        try { localStorage.setItem("theme", "dark"); } catch {}
      }
    }
    // reset any previous broken-image state so next render tries to load again
    setImgError(false);
  };

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onClick}
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
        cursor: "pointer",
      }}
    >
      {imgError ? (
        // fallback emoji if image fails to load
        <span style={{ fontSize: 16 }}>{isDark ? "☀️" : "🌙"}</span>
      ) : (
        <img
          src={isDark ? sunUrl : moonUrl}
          alt={isDark ? "Light mode" : "Dark mode"}
          width={18}
          height={18}
          style={{ display: "block" }}
          onError={() => setImgError(true)}
        />
      )}
      <span style={{ fontSize: 13 }}>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
