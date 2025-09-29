// src/routes/JobDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJob, patchJob, fetchJobs } from "../api/jobsApi";

/* small slug helper */
function makeSlug(s = "") {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

export default function JobDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    getJob(jobId)
      .then((j) => {
        setJob(j);
        setTitle(j.title || "");
        setTagsText((j.tags || []).join(", "));
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load job");
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  async function handleSave(e) {
    e?.preventDefault?.();
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    const slug = makeSlug(title);
    setSaving(true);

    try {
      // Check slug uniqueness (simple client-side check)
      const check = await fetchJobs({ search: slug, page: 1, pageSize: 1000 });
      const conflict = (check.results || []).find(
        (j) => j.slug === slug && j.id !== job.id
      );
      if (conflict) {
        alert("A job with the same slug already exists. Please change the title.");
        setSaving(false);
        return;
      }

      const payload = {
        title: title.trim(),
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      };

      const updated = await patchJob(job.id, payload);
      setJob(updated);
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive() {
    if (!job) return;
    const prev = job;
    const newStatus = job.status === "active" ? "archived" : "active";
    // optimistic UI
    setJob({ ...job, status: newStatus });
    try {
      const updated = await patchJob(job.id, { status: newStatus });
      setJob(updated);
    } catch (err) {
      console.error(err);
      setJob(prev); // rollback
      alert("Failed to change status — rolled back");
    }
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Loading job...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ color: "red", marginBottom: 12 }}>{error}</div>
        <Link to="/jobs">← Back to jobs</Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ padding: 20 }}>
        <div>Job not found.</div>
        <Link to="/jobs">← Back to jobs</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{job.title}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setEditOpen(true)}>Edit</button>
          <button onClick={toggleArchive}>
            {job.status === "active" ? "Archive" : "Unarchive"}
          </button>
          <Link to="/jobs" style={{ alignSelf: "center" }}>Back to jobs</Link>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div><strong>Slug:</strong> {job.slug}</div>
        <div><strong>Status:</strong> {job.status}</div>
        <div><strong>Tags:</strong> {(job.tags || []).join(", ")}</div>
        <div><strong>Order:</strong> {job.order}</div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <form onSubmit={handleSave} style={{ background: "#fff", padding: 20, borderRadius: 8, width: 520 }}>
            <h3>Edit job</h3>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ textAlign: "left" }}>
                Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>

              <label style={{ textAlign: "left" }}>
                Tags (comma-separated)
                <input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</button>
                <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
