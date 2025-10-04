// src/api/jobsApi.js
// Defensive fetch-based API wrapper expected by Jobs.jsx
import fetchWithAuth from "./fetchWithAuth"; // <- use the single fetchWithAuth file
import { saveJob, bulkSaveJobs } from "../db";

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
 */
async function requestWithAuth(url, init = {}) {
  try {
    // fetchWithAuth returns parsed JSON body (or throws)
    const body = await fetchWithAuth(url, init);
    return body;
  } catch (err) {
    // if it's already structured, rethrow
    if (err && (err.status || err.body || err.message)) throw err;
    throw new Error(err?.message || "Network error");
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
    const data = await requestWithAuth(u.toString(), { method: 'GET', headers: { Accept: 'application/json' } });

    // persist jobs locally if present (non-blocking)
    try {
      // handle both shapes: array or { results: [] }
      if (Array.isArray(data?.results ? data.results : data)) {
          const arr = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
        if (arr.length) {
            try { await bulkSaveJobs(arr); } catch (err) { console.warn("bulkSaveJobs failed", err); }
        }
      }
      return data;
    } 
    catch (persistErr) {
      // Non-fatal: log warning and proceed
      // eslint-disable-next-line no-console
      console.warn("jobsApi: failed to persist jobs locally", persistErr);
    }

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

    // persist created job (non-blocking)
    try { await saveJob(data); } catch (e) { console.warn("saveJob failed", e); }

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

    // persist updated job (non-blocking)
    if (data && data.id) {
      try { await saveJob(data); } catch (e) { console.warn("saveJob failed", e); }
    }

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

    // If server returns updated full jobs list, persist it (non-blocking)
    try {
      if (data && Array.isArray(data.jobs) && data.jobs.length) {
        await bulkSaveJobs(data.jobs);
      }
    } catch (persistErr) {
      // eslint-disable-next-line no-console
      console.warn("jobsApi: failed to persist reordered jobs locally", persistErr);
    }

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

    // persist fetched job (non-blocking)
    try {
      if (data && data.id) await saveJob(data);
    } catch (persistErr) {
      // eslint-disable-next-line no-console
      console.warn("jobsApi: failed to persist fetched job locally", persistErr);
    }

    return data;
  } catch (err) {
    const b = err.body ? (typeof err.body === "string" ? err.body : JSON.stringify(err.body)) : "<empty>";
    throw handleResponseError(`/api/jobs/${id}`, err.status || 0, err.message || "", b);
  }
}
