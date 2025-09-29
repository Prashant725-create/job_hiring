// src/routes/CandidateDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchCandidate, fetchCandidateTimeline, patchCandidate } from "../api/candidatesApi";

/**
 * Candidate detail:
 * - shows candidate data
 * - shows timeline (GET /api/candidates/:id/timeline)
 * - allows adding notes (with simple @mention suggestion UI). Notes are stored locally in timeline state
 *   after a no-op PATCH (to simulate network persistence).
 */

// tiny MentionEditor: suggestions from a list, insert @name
function MentionEditor({ suggestions = [], onSave }) {
  const [text, setText] = useState("");
  const [show, setShow] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [tokenPos, setTokenPos] = useState(null);

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart;
    const m = /@([a-zA-Z0-9_]*)$/.exec(val.slice(0, cursor));
    if (m) {
      const token = m[1];
      setTokenPos({ start: cursor - token.length - 1, token });
      setFiltered(suggestions.filter(s => s.toLowerCase().includes(token.toLowerCase())).slice(0, 6));
      setShow(true);
    } else {
      setShow(false);
      setFiltered([]);
      setTokenPos(null);
    }
  }

  function pick(s) {
    if (!tokenPos) {
      setText(text + ` @${s}`);
      setShow(false);
      return;
    }
    const before = text.slice(0, tokenPos.start);
    const after = text.slice(tokenPos.start + 1 + tokenPos.token.length);
    const next = `${before}@${s}${after}`;
    setText(next);
    setShow(false);
  }

  return (
    <div>
      <textarea rows={5} style={{ width: "100%" }} value={text} onChange={handleChange} />
      {show && filtered.length > 0 && (
        <div style={{ border: "1px solid #ddd", background: "#fff", padding: 8 }}>
          {filtered.map(s => (
            <div key={s}><button type="button" onClick={() => pick(s)}>{s}</button></div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <button onClick={() => onSave(text)}>Save note</button>
      </div>
    </div>
  );
}

export default function CandidateDetail() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchCandidate(id), fetchCandidateTimeline(id)])
      .then(([c, t]) => {
        setCandidate(c);
        setTimeline(t);
      })
      .catch(err => {
        console.error(err);
        alert("Failed to load candidate");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // suggestions for mentions: first 10 timeline names or a static list
  const mentionSuggestions = ["Alice", "Bob", "Charlie", "Dana", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy"];

  async function saveNote(text) {
    if (!id) return;
    try {
      // simulate network round-trip (no-Op PATCH) so MSW can be exercised; then add local timeline item
      await patchCandidate(id, {}); // in MSW this will update candidate; here it's a no-op for notes
      const ev = { id: `local-${Date.now()}`, candidateId: id, at: new Date().toISOString(), type: "note", payload: { text } };
      setTimeline(prev => [...prev, ev]);
      alert("Note saved (local)");
    } catch (err) {
      console.error(err);
      alert("Failed to save note");
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!candidate) return (
    <div style={{ padding: 20 }}>
      <div>Candidate not found.</div>
      <Link to="/candidates">← Back</Link>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <Link to="/candidates">← Back to candidates</Link>
      <h2 style={{ marginTop: 12 }}>{candidate.name}</h2>
      <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
        <div style={{ minWidth: 260 }}>
          <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <div><strong>Email:</strong> {candidate.email}</div>
            <div><strong>Stage:</strong> {candidate.stage}</div>
            <div><strong>Applied:</strong> {new Date(candidate.appliedAt).toLocaleString()}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Add note</h4>
            <MentionEditor suggestions={mentionSuggestions} onSave={saveNote} />
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h4>Timeline</h4>
          <div>
            {timeline.map(ev => (
              <div key={ev.id} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: 12, color: "#666" }}>{new Date(ev.at).toLocaleString()}</div>
                <div>
                  {ev.type === "status_change" ? (
                    <div>Stage changed: <strong>{ev.payload.from}</strong> → <strong>{ev.payload.to}</strong></div>
                  ) : (
                    <div><strong>Note:</strong> {ev.payload?.text}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
