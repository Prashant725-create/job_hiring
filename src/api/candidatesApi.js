// src/api/candidatesApi.js
// Candidates API wrapper using fetchWithAuth

import fetchWithAuth from "./fetchWithAuth";
import { saveCandidate, bulkSaveCandidates } from "../db";

/**
 * requestWithAuth - wrapper around fetchWithAuth that preserves the
 * old error shape (err.status, err.body) your app expects.
 */
async function requestWithAuth(url, init = {}) {
  try {
    // fetchWithAuth returns parsed JSON body (or throws an Error with .status/.body)
    const body = await fetchWithAuth(url, init);
    return body;
  } catch (err) {
    // Normalize thrown error so callers can inspect .status and .body like before
    if (err && (err.status || err.body || err.message)) {
      // already structured by fetchWithAuth — rethrow
      throw err;
    }
    const e = new Error(err?.message || "Network error");
    throw e;
  }
}

/**
 * GET /api/candidates?search=&stage=&page=&pageSize=
 * Returns paginated shape: { total, page, pageSize, pages, results: [] }
 */
// --- fetchCandidates (replace existing) ---
export async function fetchCandidates({ search = "", stage = "", page = 1, pageSize = 50 } = {}) {
  const u = new URL("/api/candidates", location.origin);
  if (search) u.searchParams.set("search", search);
  if (stage) u.searchParams.set("stage", stage);
  u.searchParams.set("page", String(page));
  u.searchParams.set("pageSize", String(pageSize));

  try {
    const data = await requestWithAuth(u.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    // If server returned a paginated object with results, persist them locally
    if (Array.isArray(data?.results ? data.results : data)) {
      const arr = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
      if (arr.length) {
        try { await bulkSaveCandidates(arr); } catch (err) { console.warn("bulkSaveCandidates failed", err); }
      }
    }
    return data;
  } catch (err) {
    if (err.status || err.body) throw err;
    throw new Error(err?.message || "Request failed");
  }
}



/** POST /api/candidates -> create new candidate */
export async function createCandidate(payload) {
  try {
    const data = await requestWithAuth("/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    // persist
    try { await saveCandidate(data); } catch (e) { console.warn("saveCandidate failed", e); }

    return data;
  } catch (err) {
    if (err.status || err.body) throw err;
    throw new Error(err?.message || "Request failed");
  }
}


export async function patchCandidate(id, payload) {
  try {
    const data = await requestWithAuth(`/api/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    if (data && data.id) {
      try { await saveCandidate(data); } catch (e) { console.warn("saveCandidate failed", e); }
    }

    return data;
  } catch (err) {
    if (err.status || err.body) throw err;
    throw new Error(err?.message || "Request failed");
  }
}


/** GET /api/candidates/:id */
export async function fetchCandidate(id) {
  try {
    return await requestWithAuth(`/api/candidates/${id}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    if (err.status || err.body) throw err;
    throw new Error(err?.message || "Request failed");
  }
}

/** GET /api/candidates/:id/timeline */
export async function fetchCandidateTimeline(id) {
  try {
    return await requestWithAuth(`/api/candidates/${id}/timeline`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    if (err.status || err.body) throw err;
    throw new Error(err?.message || "Request failed");
  }
}
