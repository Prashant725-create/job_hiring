// src/api/candidatesApi.js
async function request(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { /* ignore json parse error */ }

  if (!res.ok) {
    const err = new Error(body?.message || res.statusText || "Request failed");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * GET /api/candidates?search=&stage=&page=&pageSize=
 * Returns paginated shape: { total, page, pageSize, pages, results: [] }
 */
export async function fetchCandidates({ search = "", stage = "", page = 1, pageSize = 50 } = {}) {
  const u = new URL("/api/candidates", location.origin);
  if (search) u.searchParams.set("search", search);
  if (stage) u.searchParams.set("stage", stage);
  u.searchParams.set("page", String(page));
  u.searchParams.set("pageSize", String(pageSize));
  return request(u.toString());
}

/** POST /api/candidates -> create new candidate */
export async function createCandidate(payload) {
  return request("/api/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/candidates/:id -> update candidate (e.g., stage transitions) */
export async function patchCandidate(id, payload) {
  return request(`/api/candidates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** GET /api/candidates/:id */
export async function fetchCandidate(id) {
  return request(`/api/candidates/${id}`);
}

/** GET /api/candidates/:id/timeline */
export async function fetchCandidateTimeline(id) {
  return request(`/api/candidates/${id}/timeline`);
}
