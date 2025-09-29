// src/routes/Candidates.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
// import { FixedSizeList } from "react-window";

import {
  fetchCandidates,
  createCandidate,
  patchCandidate
} from "../api/candidatesApi";

/**
 * Candidates page:
 * - loads up to `pageSize` candidates for client-side search
 * - server-like filtering by stage (when stageFilter is set we request server)
 * - virtualized list using react-window
 * - Kanban-style columns (quick-move buttons). Moves use optimistic update + rollback.
 */

// stages
const STAGES = ["applied", "screen", "tech", "offer", "hired", "rejected"];

export default function Candidates() {
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize] = useState(1000); // load many for client-side search
  const [data, setData] = useState([]); // loaded candidates (array)
  const [loading, setLoading] = useState(false);

  // create modal state
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // optimistic backup for moves
  const [backup, setBackup] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      if (stageFilter) {
        const res = await fetchCandidates({ stage: stageFilter, page: 1, pageSize });
        setData(res.results || []);
      } else {
        const res = await fetchCandidates({ page: 1, pageSize });
        setData(res.results || []);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter]);

  // client-side filter/search on loaded `data`
  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  async function handleCreate(e) {
    e?.preventDefault?.();
    if (!name.trim() || !email.trim()) {
      alert("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      await createCandidate({ name: name.trim(), email: email.trim() });
      setOpenCreate(false);
      setName("");
      setEmail("");
      await loadAll();
    } catch (err) {
      console.error(err);
      alert("Failed to create candidate");
    } finally {
      setSaving(false);
    }
  }

  // Move candidate to another stage (optimistic)
  async function moveCandidate(candidateId, toStage) {
    const prev = data.slice();
    setBackup(prev);
    const next = data.map((c) => (c.id === candidateId ? { ...c, stage: toStage } : c));
    setData(next);

    try {
      await patchCandidate(candidateId, { stage: toStage });
      // success — optionally refresh to get canonical server timeline/state
      // await loadAll();
      setBackup(null);
    } catch (err) {
      console.error("move failed", err);
      setData(prev); // rollback
      setBackup(null);
      alert("Failed to move candidate — rolled back");
    }
  }

  // Virtualized list row
  const Row = ({ index, style }) => {
    const c = filtered[index];
    if (!c) return null;
    return (
      <div style={{ ...style, padding: 8 }}>
        <div style={{ border: "1px solid #e8e8e8", borderRadius: 8, padding: 12, background: "#fff", display: "flex", justifyContent: "space-between" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 13, color: "#666" }}>{c.email}</div>
            <div style={{ fontSize: 12, color: "#888" }}>Stage: {c.stage}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Link to={`/candidates/${c.id}`}>Open</Link>
            <div>
              Move to:
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {STAGES.map(s => s !== c.stage ? (
                  <button key={s} onClick={() => moveCandidate(c.id, s)} style={{ fontSize: 12 }}>{s}</button>
                ) : null)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Candidates</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setOpenCreate(true)}>+ New Candidate</button>
        </div>
      </header>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <input placeholder="Search name or email (client-side)" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: 8 }} />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{ padding: 8 }}>
          <option value="">All stages (client+server)</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => { setStageFilter(""); setSearch(""); loadAll(); }}>Reset</button>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? <div>Loading...</div> : (
          <List
            height={600}
            itemCount={filtered.length}
            itemSize={100}
            width={"100%"}
          >
            {Row}
          </List>
        )}
      </div>

      {/* Kanban quick-preview below */}
      <div style={{ marginTop: 18 }}>
        <h3>Kanban preview</h3>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {STAGES.map(stage => {
            const list = filtered.filter(c => c.stage === stage);
            return (
              <div key={stage} style={{ minWidth: 260, background: "#f7f7f7", padding: 8, borderRadius: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{stage} ({list.length})</div>
                {list.slice(0, 10).map(c => (
                  <div key={c.id} style={{ padding: 8, border: "1px solid #eee", borderRadius: 6, marginBottom: 8, background: "#fff" }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{c.email}</div>
                    <div style={{ marginTop: 6 }}>
                      Move to:
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        {STAGES.map(s => s !== c.stage ? (
                          <button key={s} onClick={() => moveCandidate(c.id, s)} style={{ fontSize: 12 }}>{s}</button>
                        ) : null)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create modal */}
      {openCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form onSubmit={handleCreate} style={{ background: "#fff", padding: 20, borderRadius: 8, width: 420 }}>
            <h3>New Candidate</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setOpenCreate(false)} disabled={saving}>Cancel</button>
                <button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Link to="/">← Back to home</Link>
      </div>
    </div>
  );
}
