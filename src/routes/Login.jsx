import React from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  function handleSubmit(e) {
    e.preventDefault();
    // fake login
    navigate("/");
  }
  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, width: 320 }}>
        <input placeholder="email" name="email" />
        <input placeholder="password" name="password" type="password" />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit">Sign in</button>
        </div>
      </form>
    </div>
  );
}
