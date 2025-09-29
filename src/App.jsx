// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import Home from "./routes/Home";
import Jobs from "./routes/Jobs";
import JobDetail from "./routes/JobDetail";
import Candidates from "./routes/Candidates";
import CandidateDetail from "./routes/CandidateDetail";
import Assessments from "./routes/Assessments";
import Login from "./routes/Login";

/**
 * App: top-level router.
 * - Wraps routes in RootLayout (header + <Outlet/>)
 * - Index route -> Home
 * - /jobs, /jobs/:jobId etc.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Home />} />

          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:jobId" element={<JobDetail />} />

          <Route path="candidates" element={<Candidates />} />
          <Route path="candidates/:id" element={<CandidateDetail />} />

          <Route path="assessments" element={<Assessments />} />
          <Route path="login" element={<Login />} />

          {/* catch-all: redirect to home or show 404 component */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
