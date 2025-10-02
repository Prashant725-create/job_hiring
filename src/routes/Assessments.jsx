// src/routes/Assessments.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";

// --- utils ---
const makeId = (prefix = "") => `${prefix}${Math.random().toString(36).slice(2, 9)}`;
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const QUESTION_TYPES = [
  { id: "short", label: "Short text" },
  { id: "long", label: "Long text" },
  { id: "single", label: "Single choice" },
  { id: "multi", label: "Multiple choice" },
  { id: "number", label: "Numeric" },
  { id: "file", label: "File upload" },
];

const defaultQuestion = (type = "short") => ({
  id: makeId("q_"),
  label: "New question",
  type,
  required: false,
  options: type === "single" || type === "multi" ? ["Option 1", "Option 2", "Option 3", "Option 4"] : undefined,
  min: undefined,
  max: undefined,
  maxLength: undefined,
  condition: null,
});

// helper: read file as data URL and return metadata object
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () =>
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: fr.result,
      });
    fr.onerror = (e) => reject(e);
    fr.readAsDataURL(file);
  });
}


// --- Local persistence ---
const loadAssessment = (jobId) => JSON.parse(localStorage.getItem(`assessment:${jobId}`) || "null");
const saveAssessment = (jobId, assessment) => localStorage.setItem(`assessment:${jobId}`, JSON.stringify(assessment));
const loadResponses = (jobId) => JSON.parse(localStorage.getItem(`assessmentResponses:${jobId}`) || "[]");
const saveResponses = (jobId, responses) => localStorage.setItem(`assessmentResponses:${jobId}`, JSON.stringify(responses));

// --- Mock API helpers ---
const apiGet = async (jobId) => {
  const res = await fetch(`/assessments/${jobId}`);
  if (res.status === 404) return null;
  return res.json();
};
const apiPut = async (jobId, body) =>
  fetch(`/assessments/${jobId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
const apiSubmit = async (jobId, payload) =>
  fetch(`/assessments/${jobId}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((r) => r.json());

// --- Question Preview ---
function QuestionPreview({ q, value, onChange, visible }) {
  if (!visible) return null;

  const handleChange = (v) => onChange(v);

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontWeight: 600 }}>{q.label} {q.required && "*"}</label>
      {q.type === "short" && <input value={value ?? ""} onChange={(e) => handleChange(e.target.value)} />}
      {q.type === "long" && <textarea value={value ?? ""} onChange={(e) => handleChange(e.target.value)} rows={4} style={{ width: "100%", minHeight: 120 }} />}
      {q.type === "number" && <input type="number" value={value ?? ""} onChange={(e) => handleChange(e.target.value)} />}
      {q.type === "single" &&
        (q.options || []).map((opt) => (
          <div key={opt}><label><input type="radio" name={q.id} checked={value === opt} onChange={() => handleChange(opt)} /> {opt}</label></div>
        ))}
      {q.type === "multi" &&
        (q.options || []).map((opt) => {
          const arr = Array.isArray(value) ? value : [];
          return (
            <div key={opt}>
              <label>
                <input type="checkbox" checked={arr.includes(opt)} onChange={(e) => {
                  const checked = e.target.checked;
                  const newArr = [...arr];
                  if (checked) newArr.push(opt);
                  else newArr.splice(newArr.indexOf(opt), 1);
                  handleChange(newArr);
                }} /> {opt}
              </label>
            </div>
          );
        })}
      {q.type === "file" && (
        <div>
          <input
            type="file"
            onChange={async (e) => {
              const f = e.target.files && e.target.files[0];
              if (!f) { onChange(null); return; }
              try {
                const meta = await readFileAsDataUrl(f);
                // store a small object as the answer (name + dataUrl)
                onChange(meta);
              } catch (err) {
                console.error("file read failed", err);
                onChange({ name: f.name, size: f.size, type: f.type });
              }
            }}
          />
          {/* show chosen file info */}
          {value && value.name && (
            <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>
              Selected: {value.name} ({Math.round((value.size||0)/1024)} KB)
            </div>
          )}
        </div>
    )}

    </div>
  );
}

// --- Main component ---
export default function Assessments() {
  const { jobId } = useParams();
  const jid = jobId || "demo-job";

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(true);
  const [responses, setResponses] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      let server = await apiGet(jid);
      if (!server) server = loadAssessment(jid) || { jobId: jid, title: "Assessment", sections: [] };
      // MIGRATE: ensure single/multi questions have at least 4 options
      if (server && server.sections) {
        for (const sec of server.sections) {
          for (const q of sec.questions || []) {
            if ((q.type === "single" || q.type === "multi")) {
              if (!Array.isArray(q.options) || q.options.length < 4) {
                // preserve existing options and pad to 4 with labelled defaults
                const existing = Array.isArray(q.options) ? q.options.slice() : [];
                while (existing.length < 4) {
                  existing.push(`Option ${existing.length + 1}`);
                }
                q.options = existing;
              }
            } else {
              // non-choice questions shouldn't keep options
              q.options = undefined;
            }
          }
        }
      }

      if (mounted) {
        setAssessment(server);
        setResponses(loadResponses(jid));
        setLoading(false);
      }
    }
    void load();
    return () => (mounted = false);
  }, [jid]);

  const flatQuestions = useMemo(() => assessment?.sections.flatMap((s) => s.questions) || [], [assessment]);
  const isVisible = (q) => {
    if (!q.condition) return true;
    const condQ = flatQuestions.find((x) => x.id === q.condition.questionId);
    if (!condQ) return true;
    const val = formValues[condQ.id];
    return String(val) === String(q.condition.value);
  };

  const handleChange = (q, val) => {
    setFormValues((prev) => ({ ...prev, [q.id]: val }));
    setFormErrors((prev) => ({ ...prev, [q.id]: null }));
  };

  const validateAnswer = (q, value) => {
    if (q.required) {
      if (q.type === "multi") {
        if (!Array.isArray(value) || value.length === 0) return { valid: false, message: "Required" };
      } else if (!value || value === "") return { valid: false, message: "Required" };
    }
    return { valid: true };
  };

  const validateAll = () => {
    const errors = {};
    assessment.sections.forEach((s) => s.questions.forEach((q) => {
      if (!isVisible(q)) return;
      const { valid, message } = validateAnswer(q, formValues[q.id]);
      if (!valid) errors[q.id] = message;
    }));
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return alert("Fix errors");
    const payload = { id: makeId("resp_"), jobId: jid, answers: { ...formValues }, at: new Date().toISOString() };
    const saved = await apiSubmit(jid, payload);
    const newResponses = [saved, ...responses];
    setResponses(newResponses);
    saveResponses(jid, newResponses);
    alert("Submitted!");
    setFormValues({});
  };

  const addSection = () => {
    const sec = { id: makeId("sec_"), title: "New section", questions: [] };
    const next = clone(assessment);
    next.sections.push(sec);
    setAssessment(next);
    saveAssessment(jid, next);
  };
  const addQuestion = (secId, type = "short") => {
    const next = clone(assessment);
    const sec = next.sections.find((s) => s.id === secId);
    if (!sec) return;
    sec.questions.push(defaultQuestion(type));
    setAssessment(next);
    saveAssessment(jid, next);
  };

  if (loading || !assessment) return <div>Loading assessment…</div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2>{assessment.title}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/">← Back</Link>
          <button onClick={() => setEditMode((m) => !m)}>{editMode ? "Preview/Run" : "Edit"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          {editMode ? (
            <>
              <button onClick={addSection}>+ Add section</button>
              {assessment.sections.map((sec) => (
                <div key={sec.id} style={{ border: "1px solid #ddd", padding: 8, marginTop: 8 }}>
                  <input value={sec.title} onChange={(e) => { const next = clone(assessment); next.sections.find(s => s.id === sec.id).title = e.target.value; setAssessment(next); saveAssessment(jid, next); }} style={{ fontWeight: 700 }} />
                  <button onClick={() => addQuestion(sec.id)}>+ Add Q</button>
                  {sec.questions.map((q) => (
                    <div key={q.id} style={{ marginTop: 4 }}>
                      <input value={q.label} onChange={(e) => { const next = clone(assessment); next.sections.find(s => s.id === sec.id).questions.find(qq => qq.id === q.id).label = e.target.value; setAssessment(next); saveAssessment(jid, next); }} />
                      <select value={q.type} 
                        onChange={(e) => {
                          const newType = e.target.value;
                          const next = clone(assessment);
                          const qobj = next.sections.find(s => s.id === sec.id).questions.find(qq => qq.id === q.id);
                          qobj.type = newType;
                          // initialize options for choice types
                          if (newType === "single" || newType === "multi") {
                            qobj.options = qobj.options && qobj.options.length ? qobj.options : ["Option 1", "Option 2", "Option 3", "Option 4"];

                          } else {
                            qobj.options = undefined;
                          }
                          setAssessment(next);
                          saveAssessment(jid, next);
                      }}>
                        {QUESTION_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                      {/* options editor for single/multi */}
                      {(q.type === "single" || q.type === "multi") && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 12, color: "#666" }}>Options (one per line)</div>
                          <textarea
                            value={(q.options || []).join("\n")}
                            onChange={(e) => {
                              const next = clone(assessment);
                              const qobj = next.sections.find(s => s.id === sec.id).questions.find(qq => qq.id === q.id);
                              qobj.options = e.target.value.split("\n").map(s => s.trim()).filter(Boolean);
                              setAssessment(next);
                              saveAssessment(jid, next);
                            }}
                            style={{ width: "100%", minHeight: 72 }}
                          />
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              {assessment.sections.map((sec) => (
                <div key={sec.id} style={{ marginBottom: 12 }}>
                  <h4>{sec.title}</h4>
                  {sec.questions.map((q) => (
                    <QuestionPreview key={q.id} q={q} value={formValues[q.id]} onChange={(v) => handleChange(q, v)} visible={isVisible(q)} />
                  ))}
                </div>
              ))}
              <button type="submit">Submit Assessment</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

