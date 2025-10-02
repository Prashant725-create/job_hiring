// src/api/fetchWithAuth.js
let _token = null;

/**
 * Call from AuthProvider when token changes.
 * @param {string|null} token
 */
export function setFetchAuthToken(token) {
  _token = token;
}

/**
 * fetchWithAuth - wrapper around fetch that sets Authorization header
 * when a token is present, returns parsed JSON body and throws on non-OK.
 *
 * Usage:
 *   import fetchWithAuth from './fetchWithAuth';
 *   await fetchWithAuth('/api/jobs');
 */
export default async function fetchWithAuth(input, init = {}) {
  // shallow-clone init so we don't mutate caller's object
  const cfg = { ...(init || {}) };
  cfg.headers = { ...(cfg.headers || {}) };

  if (_token) {
    cfg.headers['Authorization'] = `Bearer ${_token}`;
  }

  const res = await fetch(input, cfg);

  // read body as text then try parse JSON (defensive)
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (err) {
    // leave body null if not JSON
  }

  if (!res.ok) {
    const message = (body && (body.message || body.error)) || res.statusText || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}
