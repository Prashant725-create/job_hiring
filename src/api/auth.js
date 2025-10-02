// src/api/auth.js
export async function login(email, password) {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(txt || 'Login failed');
    err.status = res.status;
    throw err;
  }
  return res.json(); // { accessToken, user }
}

export async function logout() {
  const res = await fetch('/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Logout failed');
  return res.json();
}
