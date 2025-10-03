// src/main.jsx
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import App from "./App";
import "./index.css";

async function init() {
  // Always try to register MSW in both dev & prod
  try {
    const { worker } = await import("./mocks/browser");

    await worker.start({
      serviceWorker: { url: "/mockServiceWorker.js" }, // works in Vercel too
      onUnhandledRequest: "bypass",
    });

    console.log("[MSW] worker started");
  } catch (err) {
    console.warn("[MSW] Worker not started", err);
  }

  // Render app after worker init (to avoid race conditions)
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

init();