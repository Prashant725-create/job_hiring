// src/main.jsx
import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from './contexts/AuthContext';

import App from "./App";
import "./index.css";

async function init() {
  if (import.meta.env.DEV) {
    try {
      const { worker } = await import("./mocks/browser");
      // wait for worker to start before rendering app
      await worker.start({
        serviceWorker: { url: import.meta.env.BASE_URL + "mockServiceWorker.js" },
        onUnhandledRequest: "bypass",
      });
      console.log("[MSW] worker started");
    } catch (err) {
      console.error("[MSW] failed to start worker", err);
    }
  }

  createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
}

init();
