// src/routes/Candidates.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Link, useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardTitle } from "@/components/ui/card"; 
// tolerant react-window import (put this after React imports)
import * as RW from "react-window";
const List = RW.FixedSizeList || (RW.default && RW.default.FixedSizeList) || null;

import {
  fetchCandidates,
  fetchCandidate,
  fetchCandidateTimeline,
  patchCandidate,
  createCandidate,
} from "../api/candidatesApi";

/* ---------- constants ---------- */
const STAGES = ["applied", "screen", "tech", "offer", "hired", "rejected"];
const PAGE_SIZE = 50; // load many for client-side search / virtualization
const VROW_HEIGHT = 90;

/* ---------- helpers ---------- */
function renderNotesWithMentions(text, mentionSuggestions = []) {
  // simple rendering: wrap words starting with @ in a styled span
  return text.split(" ").map((w, i) =>
    w.startsWith("@") ? (
      <span key={i} style={{ color: "#0b63ff", fontWeight: 600, marginRight: 4 }}>{w} </span>
    ) : (
      <span key={i}>{w} </span>
    )
  );
}

/* ---------- CandidateDetail route (/candidates/:id) ---------- */
function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const c = await fetchCandidate(id);
        const tl = await fetchCandidateTimeline(id);
        if (!mounted) return;
        setCandidate(c);
        setTimeline(Array.isArray(tl) ? tl : []);
      } catch (err) {
        console.error("Failed loading candidate detail", err);
        // keep empty state; user sees "not found"
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!candidate) return <div className="p-6">Candidate not found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-4 px-3 py-1 bg-gray-200 rounded">← Back</button>
      <h2 className="text-2xl font-bold mb-2">{candidate.name}</h2>
      <div className="text-sm text-gray-600 mb-4">{candidate.email}</div>

      <section className="mb-6">
        <h3 className="font-semibold mb-2">Timeline</h3>
        <ul className="list-disc ml-6">
          {timeline.map((ev) => (
            <li key={ev.id || JSON.stringify(ev)}>{ev.at} — {ev.type}: {JSON.stringify(ev.payload)}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Notes</h3>
        <div className="bg-white p-3 border rounded">
          {Array.isArray(candidate.notes) && candidate.notes.length
            ? candidate.notes.map((n, i) => <div key={i} className="mb-2">{renderNotesWithMentions(n)}</div>)
            : <div className="text-gray-500">No notes</div>}
        </div>
      </section>
    </div>
  );
}

/* ---------- Top-level IndexView (stable) ---------- */
function IndexView({
  filtered,
  loading,
  List,
  Row,
  search,
  setSearch,
  stageFilter,
  setStageFilter,
  loadAll,
  setOpenCreate,
  openCreate,
  nameInput,
  setNameInput,
  emailInput,
  setEmailInput,
  handleCreate,
  saving,
  STAGES,
  moveCandidate,
  VROW_HEIGHT,
  page, pages, setPage
}) {
  return (
    <div style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Candidates</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setOpenCreate(true)}>+ New Candidate</button>
        </div>
      </header>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          placeholder="Search name or email (client-side)"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ padding: 8, flex: 1 }}
        />
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ padding: 8 }}>
          <option value="">All stages (client+server)</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => { setStageFilter(""); setSearch(""); void loadAll(); }}>Reset</button>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div>Loading...</div>
        ) : List ? (
          <List height={600} itemCount={filtered.length} itemSize={VROW_HEIGHT} width={"100%"}>
            {Row}
          </List>
        ) : (
          <div style={{ maxHeight: 600, overflowY: "auto" }}>
            {filtered.map((c, i) => (
              <div key={c?.id ?? i} style={{ padding: 8 }}>
                <Row index={i} style={{}} />
              </div>
            ))}
          </div>
        )}
      </div>

            {/* pagination */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 12 }}>
        <button
          className="pager-button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          style={{ padding: "6px 10px", background: "#eee", borderRadius: 6 }}
        >
          Prev
        </button>
        <div>Page {page} of {pages}</div>
        <button
          className="pager-button"
          disabled={page >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          style={{ padding: "6px 10px", background: "#eee", borderRadius: 6 }}
        >
          Next
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>Kanban (drag candidate to stage)</h3>

        {/* height-limited area so you can scroll vertically for the whole board */}
        <div className="kanban-wrapper">
          <div className="kanban-grid">
            {STAGES.map((stage) => {
              const list = filtered.filter((c) => c.stage === stage);
              return (
                <div
                  key={stage}
                  className="kanban-column"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("candidateId");
                    if (id) moveCandidate(id, stage);
                  }}
                >
                  <div className="kanban-title">{stage} ({list.length})</div>
                  <div className="kanban-items">
                    {list.slice(0, 50).map((c) => (
                      <div
                        className="kanban-card"
                        key={c.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("candidateId", c.id)}
                      >
                        <div className="kanban-card-title">{c.name}</div>
                        <div className="kanban-card-email">{c.email}</div>
                        <div className="kanban-card-actions">
                          {STAGES.map((s) => s !== c.stage ? (
                            <button key={s} onClick={() => moveCandidate(c.id, s)} className="move-btn small">{s}</button>
                          ) : null)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Create modal */}
      {openCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form onSubmit={handleCreate} style={{ background: "#fff", padding: 20, borderRadius: 8, width: 420 }}>
            <h3>New Candidate</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <input placeholder="Name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
              <input placeholder="Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
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


/* ---------- Main Candidates page (index + nested route) ---------- */
export default function Candidates() {
  const [data, setData] = useState([]); // loaded candidates (client-side search pool)
  const [loading, setLoading] = useState(false);
  

  const [stageFilter, setStageFilter] = useState(""); // server-side filter when set
  const [search, setSearch] = useState(""); // client-side search across loaded data
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [_pageSize] = useState(PAGE_SIZE);
  

  // create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);

  // optimistic backups
  const [backup, setBackup] = useState(null);

  // drag-and-drop refs
  const dragCandidateId = useRef(null);

  useEffect(() => {
    console.log("Candidates mounted");
    return () => console.log("Candidates unmounted");
  }, []);

  /* loadAll: fetch candidates from server (server-like filtering by stage) */
    async function loadAll() {
    setLoading(true);
    try {
      // request server with search/stage/page/pageSize
      const res = await fetchCandidates({
        search: search || "",
        stage: stageFilter || "",
        page,
        pageSize: PAGE_SIZE,
      });

      // defensive shape check
      const results = Array.isArray(res) ? res : (res?.results ?? null);
      if (!results) {
        console.error("loadAll: unexpected response", res);
        throw new Error("Invalid response from /api/candidates");
      }

      // determine total count (server should return `total`)
      const tot = typeof res?.total === "number" ? res.total : results.length;

      setData(results);
      setTotal(tot);
    } catch (err) {
      console.error("Failed to load candidates", err);
      alert("Failed to load candidates — check console/network and MSW worker.");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter, search, page]);

  /* client-side filtered list (search name/email) */
  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return data;
    return data.filter((c) =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  /* create candidate */
  async function handleCreate(e) {
    e?.preventDefault?.();
    if (!nameInput.trim() || !emailInput.trim()) {
      alert("Name and email required");
      return;
    }
    setSaving(true);
    try {
      await createCandidate({ name: nameInput.trim(), email: emailInput.trim() });
      setOpenCreate(false);
      setNameInput("");
      setEmailInput("");
      setPage(1);  
      await loadAll();
    } catch (err) {
      console.error("create failed", err);
      alert("Failed to create candidate");
    } finally {
      setSaving(false);
    }
  }

  /* optimistic move */
  async function moveCandidate(candidateId, toStage) {
    const prev = data.slice();
    setBackup(prev);
    const next = data.map((c) => (c.id === candidateId ? { ...c, stage: toStage } : c));
    setData(next);

    try {
      await patchCandidate(candidateId, { stage: toStage });
      setBackup(null);
    } catch (err) {
      console.error("move failed", err);
      setData(prev);
      setBackup(null);
      alert("Failed to move candidate — rolled back");
    }
  }

  /* drag events for Kanban columns */
  function onDragStart(e, candidateId) {
    dragCandidateId.current = candidateId;
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDrop(e, toStage) {
    e.preventDefault();
    const id = dragCandidateId.current;
    dragCandidateId.current = null;
    if (!id) return;
    moveCandidate(id, toStage);
  }

  /* Virtualized Row for react-window */
  const Row = ({ index, style }) => {
    const c = filtered[index];
    if (!c) return null;

    return (
      <div style={{ ...style, padding: 8, boxSizing: "border-box", width: "100%" }}>
        <div className="candidate-row">
          {/* LEFT: main content - allow shrinking (min-width:0) so it truncates instead of pushing layout */}
          <div className="candidate-main">
            <div className="name" title={c.name}>{c.name}</div>
            <div className="email" title={c.email}>{c.email}</div>
            <div className="small-muted">Stage: {c.stage}</div>
          </div>

          {/* RIGHT: actions area (fixed-ish) */}
          <div className="candidate-actions">
            <Link to={`${c.id}`} className="candidate-open">Open</Link>

            <div className="move-buttons">
              {STAGES.map((s) =>
                s !== c.stage ? (
                  <button
                    key={s}
                    onClick={() => moveCandidate(c.id, s)}
                    className="move-btn tag-btn"
                    type="button"
                  >
                    {s}
                  </button>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };


  /* Kanban column renderer */
  /* inside Candidates.jsx — replace existing KanbanColumns() */
    function KanbanColumns() {
      return (
        <div className="kanban-wrapper">
          {/* outer control for vertical height so the whole board stays visible on the page */}
          <div className="kanban-scrollable">
            {/* kanban-board uses grid-auto-columns so columns compress to fit viewport */}
            <div className="kanban-board" role="list" aria-label="Kanban columns">
              {STAGES.map((stage) => {
                const list = filtered.filter((c) => c.stage === stage);
                return (
                  <div key={stage} className="kanban-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("candidateId");
                    if (id) moveCandidate(id, stage);
                  }}>
                    <div className="column-title">{stage} ({list.length})</div>
                    {list.slice(0, 50).map((c) => (
                      <div
                        key={c.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("candidateId", c.id)}
                      >
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.email}</div>
                        <div style={{ marginTop: 6 }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
        </div>
      );
    }


  /* local mention suggestions (client-side) */
  const mentionSuggestions = useMemo(() => {
    // derive a tiny list of managers / users from loaded candidates
    return data.slice(0, 30).map(c => c.name.split(" ")[0]).filter(Boolean).slice(0, 10);
  }, [data]);

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));



  return (
  <Routes>
    <Route
      index
      element={
        <IndexView
          filtered={filtered} loading={loading} List={List} Row={Row} search={search} setSearch={setSearch} stageFilter={stageFilter} setStageFilter={setStageFilter} loadAll={loadAll} setOpenCreate={setOpenCreate} openCreate={openCreate} nameInput={nameInput} setNameInput={setNameInput} emailInput={emailInput} setEmailInput={setEmailInput} handleCreate={handleCreate} saving={saving} STAGES={STAGES} moveCandidate={moveCandidate} VROW_HEIGHT={VROW_HEIGHT} page={page} pages={pages} setPage={setPage}
        />

      }
    />
    <Route path=":id" element={<CandidateDetail />} />
  </Routes>
);

}
