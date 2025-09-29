// src/routes/Jobs.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchJobs, createJob, patchJob, reorderJob } from "../api/jobsApi";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* --- helper: slugify --- */
function makeSlug(s = "") {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

/* --- Sortable item --- */
function SortableItem({ job, onEdit, onArchive }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: job.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: 12,
    border: "1px solid #e8e8e8",
    borderRadius: 8,
    marginBottom: 8,
    background: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: 700 }}>{job.title}</div>
        <div style={{ fontSize: 12, color: "#666" }}>{(job.tags || []).join(", ")}</div>
        <div style={{ fontSize: 11, color: "#999" }}>slug: {job.slug}</div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => onEdit(job)}>Edit</button>
        <button onClick={() => onArchive(job)}>{job.status === "active" ? "Archive" : "Unarchive"}</button>
        <span {...listeners} style={{ cursor: "grab", padding: 8 }}>☰</span>
        <Link to={`/jobs/${job.id}`}>Open</Link>
      </div>
    </div>
  );
}

/* --- Main Jobs component --- */
export default function Jobs() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState(null); // server response { total,page,pageSize,pages,results }
  const [items, setItems] = useState([]); // current page items (for DnD)
  const [loading, setLoading] = useState(false);

  // modal & form state
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [saving, setSaving] = useState(false);

  // backup for optimistic reorder rollback
  const backupRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchJobs({ search, status, page, pageSize });
      setData(res);
      setItems(res.results || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  /* open create modal */
  function openCreate() {
    setEditing(null);
    setTitle("");
    setTagsText("");
    setOpenModal(true);
  }

  /* open edit modal */
  function openEdit(job) {
    setEditing(job);
    setTitle(job.title || "");
    setTagsText((job.tags || []).join(", "));
    setOpenModal(true);
  }

  /* save (create or edit) */
  async function handleSave(e) {
    e?.preventDefault?.();
    if (!title.trim()) {
      alert("Title is required");
      return;
    }
    const slug = makeSlug(title);
    setSaving(true);
    try {
      // client-side unique slug check (simple): search server for slug
      const check = await fetchJobs({ search: slug, page: 1, pageSize: 1000 });
      const conflict = (check.results || []).find(j => j.slug === slug && (!editing || j.id !== editing.id));
      if (conflict) {
        alert("Slug already exists. Please change title.");
        setSaving(false);
        return;
      }

      const payload = { title: title.trim(), tags: tagsText.split(",").map(s => s.trim()).filter(Boolean) };

      if (editing) {
        await patchJob(editing.id, payload);
        setOpenModal(false);
        load();
      } else {
        await createJob(payload);
        setOpenModal(false);
        setPage(1);
        load();
      }
    } catch (err) {
      console.error(err);
      if (err.status === 409) alert(err.body?.message || "Slug conflict");
      else alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* archive/unarchive */
  async function toggleArchive(job) {
    try {
      await patchJob(job.id, { status: job.status === "active" ? "archived" : "active" });
      load();
    } catch (err) {
      console.error(err);
      alert("Failed to change status");
    }
  }

  /* DnD reorder: optimistic update with rollback */
  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(items, oldIndex, newIndex);
    // optimistic
    backupRef.current = items;
    setItems(newItems);

    // call server: toOrder is 1-based position
    reorderJob(active.id, newIndex + 1)
      .then(() => {
        // refresh to get server canonical order (and updated order numbers)
        load();
        backupRef.current = null;
      })
      .catch(err => {
        console.error("reorder failed", err);
        // rollback
        setItems(backupRef.current || items);
        backupRef.current = null;
        alert("Reorder failed — rolled back");
      });
  }

  return (
    <div style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Jobs</h2>
        <div>
          <button onClick={openCreate}>+ New Job</button>
        </div>
      </header>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          placeholder="Search title or slug"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: 8 }}
        />
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: 8 }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={() => { setPage(1); load(); }}>Apply</button>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map(job => (
                <SortableItem key={job.id} job={job} onEdit={openEdit} onArchive={toggleArchive} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
        <div style={{ padding: "0 8px" }}>
          Page {page}{data ? ` / ${data.pages || 1}` : ""}
        </div>
        <button onClick={() => setPage(p => Math.min((data?.pages || Infinity), p + 1))} disabled={data && page >= data.pages}>Next</button>
      </div>

      {/* Create/Edit modal */}
      {openModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <form onSubmit={handleSave} style={{ background: "#fff", padding: 20, borderRadius: 8, width: 520 }}>
            <h3>{editing ? "Edit Job" : "New Job"}</h3>

            <div style={{ display: "grid", gap: 8 }}>
              <label>
                Title
                <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: 8 }} />
              </label>

              <label>
                Tags (comma-separated)
                <input value={tagsText} onChange={e => setTagsText(e.target.value)} style={{ width: "100%", padding: 8 }} />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setOpenModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" disabled={saving}>{saving ? "Saving..." : (editing ? "Save" : "Create")}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Link to="/">← Back to home</Link>
      </div>
    </div>
  );
}
