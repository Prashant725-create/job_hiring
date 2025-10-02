// src/components/ThemeToggle.jsx
import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import SunIcon from "../assets/DarkMode/sun.svg";
import MoonIcon from "../assets/DarkMode/moon.svg";

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
        <img src={SunIcon} alt="Light mode" width={18} height={18} />
      ) : (
        <img src={MoonIcon} alt="Dark mode" width={18} height={18} />
      )}
      <span style={{ fontSize: 13 }}>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
