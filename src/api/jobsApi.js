// src/api/jobsApi.js
async function request(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const err = new Error(body?.message || res.statusText || 'Request failed');
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function fetchJobs({ search = '', status = '', page = 1, pageSize = 10, sort = 'order' } = {}) {
  const u = new URL('/api/jobs', location.origin);
  if (search) u.searchParams.set('search', search);
  if (status) u.searchParams.set('status', status);
  u.searchParams.set('page', String(page));
  u.searchParams.set('pageSize', String(pageSize));
  u.searchParams.set('sort', sort);
  return request(u.toString());
}

export async function createJob(payload) {
  return request('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function patchJob(id, payload) {
  return request(`/api/jobs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function reorderJob(id, toOrder) {
  return request(`/api/jobs/${id}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toOrder }),
  });
}

export async function getJob(id) {
  return request(`/api/jobs/${id}`);
}
