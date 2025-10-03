// src/routes/JobsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, useParams, useNavigate } from "react-router-dom";
import { fetchJobs, createJob, patchJob, reorderJob } from "../api/jobsApi";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

/* ---------- helpers ---------- */
const makeSlug = (s = "") =>
  s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

function clampPage(p, pages) {
  if (p < 1) return 1;
  if (p > pages) return pages;
  return p;
}

/* ---------- Job detail route (/jobs/:jobId) ---------- */
function JobDetail({ jobs, setJobs }) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const job = jobs.find((j) => j.id === jobId);

  const [title, setTitle] = useState(job?.title ?? "");
  const [tags, setTags] = useState((job?.tags || []).join(", "));

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setTags((job.tags || []).join(", "));
    }
  }, [job]);

  if (!job) return <div className="p-6">Job not found</div>;

  async function handleSave() {
    const newTitle = (title || "").trim();
    if (!newTitle) {
      alert("Title is required");
      return;
    }
    const slug = makeSlug(newTitle);
    // local unique check
    if (jobs.some((j) => j.slug === slug && j.id !== job.id)) {
      alert("Slug must be unique");
      return;
    }

    try {
      const updated = await patchJob(job.id, { title: newTitle, slug, tags: tags.split(",").map(t => t.trim()).filter(Boolean) });
      // update local
      setJobs(prev => prev.map(p => p.id === updated.id ? updated : p));
      navigate(-1);
    } catch (err) {
      console.error("save failed", err);
      alert("Failed to save job");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-4 px-3 py-1 bg-gray-200 rounded">← Back</button>
      <h2 className="text-2xl font-bold mb-3">Edit job</h2>

      <div className="mb-3">
        <label className="block mb-1">Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-2 rounded" />
      </div>

      <div className="mb-3">
        <label className="block mb-1">Tags (comma separated)</label>
        <input value={tags} onChange={e => setTags(e.target.value)} className="w-full border p-2 rounded" />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
        <button onClick={() => navigate(-1)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
      </div>
    </div>
  );
}

/* ---------- Top-level IndexView (moved out of JobsPage) ---------- */
function IndexView({
  jobs,
  loading,
  search,
  setSearch,
  status,
  setStatus,
  setOpenCreate,
  openCreate,
  newTitle,
  setNewTitle,
  newTags,
  setNewTags,
  handleCreate,
  toggleArchive,
  move,
  page,
  pages,
  setPage,
}) {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <div>
          <button onClick={() => setOpenCreate(true)} className="px-3 py-1 bg-blue-600 text-white rounded">+ New Job</button>
        </div>
      </header>

      <div className="flex gap-2 mb-4">
        <input
          placeholder="Search title/slug"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border p-2 rounded"
        />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="border p-2 rounded">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? <div>Loading…</div> : (
        <div>
          {/* grid of cards (5 per row on wide screens) */}
          <div className="jobs-grid">
            {jobs.map((j, idx) => (
              <div key={j.id} className="card-teal" style={{ padding: 12, minHeight: 120 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ maxWidth: "78%" }}>
                    <Link to={`${j.id}`} className="text-xl" style={{ color: "var(--accent)" }}>{j.title}</Link>
                    <div className="small-muted" style={{ marginTop: 6 }}>{(j.tags || []).join(", ")}</div>
                    <div className="small-muted" style={{ fontSize: 12, marginTop: 8 }}>order: {j.order}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => toggleArchive(j.id)} className="pager-button">
                      {j.status === "active" ? "Archive" : "Unarchive"}
                    </button>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => move(j.id, -1)} disabled={idx === 0} className="pager-button">↑</button>
                      <button onClick={() => move(j.id, +1)} disabled={idx === jobs.length - 1} className="pager-button">↓</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {jobs.length === 0 && <div className="p-4 text-gray-500">No jobs</div>}
        </div>
      )}


      {/* pagination */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 12 }}>
        <button  className="pager-button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: "6px 10px", background: "#eee", borderRadius: 6 }}>Prev</button>
        <span>Page {page} of {pages}</span>
        <button  className="pager-button" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))} style={{ padding: "6px 10px", background: "#eee", borderRadius: 6 }}>Next</button>
      </div>

      {/* create modal */}
      {openCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form onSubmit={handleCreate} className="bg-white p-5 rounded shadow-md w-[420px]">
            <h3 className="text-xl font-bold mb-3">New Job</h3>
            <div className="mb-3">
              <label className="block mb-1">Title</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border p-2 rounded" />
            </div>
            <div className="mb-3">
              <label className="block mb-1">Tags (comma separated)</label>
              <input value={newTags} onChange={e => setNewTags(e.target.value)} className="w-full border p-2 rounded" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpenCreate(false)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
              <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}



/* ---------- Main Jobs page + index route ---------- */
export default function JobsPage() {
  // server-backed state
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTags, setNewTags] = useState("");

  // optimistic backup for reorder/archive
  const [backup, setBackup] = useState(null);

  useEffect(() => {
    console.log("Jobs mounted");
    return () => console.log("Jobs unmounted");
  }, []);

  // load from server (uses fetchJobs from your jobsApi.js)
  async function load() {
    setLoading(true);
    try {
      const res = await fetchJobs({ search: search || "", status: status || "", page, pageSize: PAGE_SIZE, sort: "order" });

      if (!res || typeof res !== "object") throw new Error("Invalid response from server");
      const results = Array.isArray(res) ? res : res.results;
      if (!results) throw new Error("Response missing results");

      setJobs(results);
      setTotal(typeof res.total === "number" ? res.total : results.length);
    } catch (err) {
      console.error("load failed", err);
      alert("Failed to load jobs — check console/network and MSW worker.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page]);

  // create
  async function handleCreate(e) {
    e?.preventDefault?.();
    const title = (newTitle || "").trim();
    if (!title) {
      alert("Title required");
      return;
    }
    const slug = makeSlug(title);
    if (jobs.some(j => j.slug === slug)) {
      alert("Slug already exists");
      return;
    }

    setLoading(true);
    try {
      await createJob({ title, slug, tags: newTags.split(",").map(t => t.trim()).filter(Boolean) });
      // reload page (keeps server ordering/pagination consistent)
      await load();
      setOpenCreate(false);
      setNewTitle("");
      setNewTags("");
    } catch (err) {
      console.error("create failed", err);
      alert("Failed to create job");
    } finally {
      setLoading(false);
    }
  }

  // archive/unarchive - optimistic update with rollback
  async function toggleArchive(jobId) {
    const prev = jobs.slice();
    setBackup(prev);
    const next = jobs.map(j => j.id === jobId ? { ...j, status: j.status === "active" ? "archived" : "active" } : j);
    setJobs(next);

    try {
      const desired = next.find(j => j.id === jobId).status;
      await patchJob(jobId, { status: desired });
      setBackup(null);
    } catch (err) {
      console.error("toggle archive failed", err);
      setJobs(prev); // rollback
      setBackup(null);
      alert("Failed to change status — rolled back");
    }
  }

  // reorder (up/down) - optimistic, call reorder endpoint
  async function move(jobId, direction) {
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx === -1) return;
    const toIndex = idx + direction;
    if (toIndex < 0 || toIndex >= jobs.length) return;

    const prev = jobs.slice();
    setBackup(prev);

    const next = [...jobs];
    const [moving] = next.splice(idx, 1);
    next.splice(toIndex, 0, moving);
    // assign new order locally (1-based)
    const withOrder = next.map((j, i) => ({ ...j, order: i + 1 }));
    setJobs(withOrder);

    try {
      // server expects 1-based toOrder
      await reorderJob(jobId, toIndex + 1);
      setBackup(null);
    } catch (err) {
      console.error("reorder failed", err);
      setJobs(prev); // rollback
      setBackup(null);
      alert("Failed to reorder — rolled back");
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  

  // wire routes (index + /:jobId)
  return (
    <Routes>
      <Route
        index
        element={
          <IndexView
            jobs={jobs} loading={loading} search={search} setSearch={setSearch} status={status} setStatus={setStatus} setOpenCreate={setOpenCreate} openCreate={openCreate} newTitle={newTitle} setNewTitle={setNewTitle} newTags={newTags} setNewTags={setNewTags} handleCreate={handleCreate} toggleArchive={toggleArchive} move={move} page={page} pages={pages} setPage={setPage}
          />
        }
      />
      <Route path=":jobId" element={<JobDetail jobs={jobs} setJobs={setJobs} />} />
    </Routes>
  );

}
