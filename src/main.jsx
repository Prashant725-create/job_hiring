import React from "react";
import ReactDOM from "react-dom/client";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./index.css";
import "./App.css";
import App from './App.jsx'

if (import.meta.env.DEV) {
  import("./mocks/browser").then(({ worker }) =>
    worker.start({ onUnhandledRequest: "bypass" })
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
