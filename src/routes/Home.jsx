// src/routes/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import hero from "../assets/DarkMode/talent-search.png";


export default function Home() {
  return (
  <div>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "48px 0" }}>
      <img
        src={hero}
        alt="Talent search"
        style={{ maxWidth: 200, width: "100%", height: "auto", display: "block" }}
        loading="lazy"
      />
    </div>
    <div className="app-container" style={{ padding: 70, maxWidth: 900, margin: "0 auto" }}>
      <div className="card-teal" style={{ padding: 28 }}>
        <h1 className="centered-title" style={{ fontSize: 36, marginBottom: 8 }}>
          Job Hiring Platform
        </h1>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 18 }}>
          Streamline hiring — manage jobs, candidates, assessments and review applicants in one place.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <Link to="/jobs">
            <button className="primary">Browse Jobs</button>
          </Link>
          <Link to="/candidates">
            <button>View Candidates</button>
          </Link>
          <Link to="/assessments">
            <button>Assessments</button>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <p className="small-muted">
          Welcome to your hiring dashboard. Toggle theme at top right.
        </p>
      </div>

      {/* optional: dev counter retained from your previous page (uncomment if you want it)
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <DevCounter />
      </div>
      */}
    </div>
  </div>
  );
}
