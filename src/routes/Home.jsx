// src/routes/Home.jsx
import React, { useState } from "react";

import { Link } from "react-router-dom";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <>
      


      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>

      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>

      <hr style={{ margin: "2rem 0" }} />

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link to="/jobs">
          <button>Jobs Board</button>
        </Link>
        <Link to="/candidates">
          <button>Candidates</button>
        </Link>
        <Link to="/assessments">
          <button>Assessments</button>
        </Link>
      </div>
    </>
  );
}
