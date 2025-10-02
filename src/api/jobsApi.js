// src/api/jobsApi.js
// Defensive fetch-based API wrapper expected by Jobs.jsx
import fetchWithAuth from './fetchWithAuth'; // <- use the single fetchWithAuth file

function handleResponseError(respUrl, status, statusText, bodyText) {
  const msg = `Request failed: ${status} ${statusText} (${respUrl}) - body: ${bodyText}`;
  const err = new Error(msg);
  err.status = status;
  err.body = bodyText;
  return err;
}

/**
 * requestWithAuth - small wrapper around fetchWithAuth that preserves
 * easy-to-debug error messages for your existing UI.
 *
 * fetchWithAuth already throws a helpful Error; but to keep the exact error
 * shape you had earlier we re-wrap thrown errors when possible.
 */
async function requestWithAuth(url, init = {}) {
  try {
    // fetchWithAuth returns parsed JSON body (or throws)
    const body = await fetchWithAuth(url, init);
    return body;
  } catch (err) {
    // err could be an Error produced by fetchWithAuth with .status and .body,
    // or a lower-level network error. Re-throw with similar shape to existing code.
    // If it's already structured, just rethrow.
    if (err && (err.status || err.body || err.message)) throw err;
    throw new Error(err?.message || 'Network error');
  }
}

export async function fetchJobs({
  search = "",
  status = "",
  page = 1,
  pageSize = 10,
  sort = "order",
} = {}) {
  const u = new URL("/api/jobs", location.origin);
  if (search) u.searchParams.set("search", search);
  if (status) u.searchParams.set("status", status);
  u.searchParams.set("page", String(page));
  u.searchParams.set("pageSize", String(pageSize));
  u.searchParams.set("sort", sort);

  try {
    const data = await requestWithAuth(u.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    // Normalize to { results, total, page, pages, pageSize }
    if (Array.isArray(data)) {
      return {
        results: data,
        total: data.length,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(data.length / pageSize)),
      };
    }
    return data;
  } catch (err) {
    // If fetchWithAuth provided body/status, surface them in a similar message
    if (err.status || err.body) {
      const b = typeof err.body === "string" ? err.body : JSON.stringify(err.body || "");
      throw handleResponseError("/api/jobs", err.status || 0, err.message || "", b || "<empty>");
    }
    throw err;
  }
}

export async function createJob(body) {
  try {
    const data = await requestWithAuth("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    return data;
  } catch (err) {
    const b = err.body ? (typeof err.body === "string" ? err.body : JSON.stringify(err.body)) : "<empty>";
    throw handleResponseError("/api/jobs", err.status || 0, err.message || "", b);
  }
}

export async function patchJob(id, body) {
  try {
    const data = await requestWithAuth(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    return data;
  } catch (err) {
    const b = err.body ? (typeof err.body === "string" ? err.body : JSON.stringify(err.body)) : "<empty>";
    throw handleResponseError(`/api/jobs/${id}`, err.status || 0, err.message || "", b);
  }
}

export async function reorderJob(id, toOrder) {
  try {
    const data = await requestWithAuth(`/api/jobs/${id}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ toOrder }),
    });
    return data;
  } catch (err) {
    const b = err.body ? (typeof err.body === "string" ? err.body : JSON.stringify(err.body)) : "<empty>";
    throw handleResponseError(`/api/jobs/${id}/reorder`, err.status || 0, err.message || "", b);
  }
}

export async function getJob(id) {
  try {
    const data = await requestWithAuth(`/api/jobs/${id}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return data;
  } catch (err) {
    const b = err.body ? (typeof err.body === "string" ? err.body : JSON.stringify(err.body)) : "<empty>";
    throw handleResponseError(`/api/jobs/${id}`, err.status || 0, err.message || "", b);
  }
}
