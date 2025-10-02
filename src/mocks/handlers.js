// src/mocks/handlers.js
import { http, HttpResponse, delay } from "msw";
import { nanoid } from "nanoid";
import { faker } from "@faker-js/faker";

/* ----------------- Helpers ----------------- */
function paginate(arr, page = 1, pageSize = 10) {
  const total = arr.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.max(1, Math.min(page, pages));
  const start = (p - 1) * pageSize;
  return {
    total,
    page: p,
    pageSize,
    pages,
    results: arr.slice(start, start + pageSize),
  };
}

function makeSlug(s = "") {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

/* ------------------ Jobs (seed) ------------------ */
let jobs = [];
if (jobs.length === 0) {
  for (let i = 1; i <= 25; i++) {
    const title = `Job ${i} - ${["Frontend", "Backend", "Fullstack", "Data"][i % 4]}`;
    jobs.push({
      id: nanoid(),
      title,
      slug: makeSlug(title),
      status: Math.random() > 0.85 ? "archived" : "active",
      tags: i % 3 ? ["javascript", "react"] : ["node"],
      order: i,
    });
  }
}

/* ---------------- Candidates (seed 1000) ---------------- */
const STAGES = ["applied", "screen", "tech", "offer", "hired", "rejected"];

let candidates = [];
let candidateTimeline = [];

if (candidates.length === 0) {
  const CANDIDATE_count = 1000;
  for (let i = 0; i < CANDIDATE_count; i++) {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const name = `${first} ${last}`;
    const email = `${first}.${last}@${faker.internet.domainName()}`.toLowerCase();
    const stage = STAGES[Math.floor(Math.random() * STAGES.length)];
    const id = nanoid();
    const appliedAt = faker.date.past({ years: 1 }).toISOString();
    candidates.push({
      id,
      name,
      email,
      stage,
      appliedAt,
      avatar: faker.image.avatar(),
    });
    candidateTimeline.push({
      id: nanoid(),
      candidateId: id,
      at: appliedAt,
      type: "status_change",
      payload: { from: null, to: stage },
    });
  }
}

/* ---------------- In-memory stores for Assessments (MSW) ---------------- */
let assessmentsStore = {}; // map jobId -> assessment object
let assessmentResponsesStore = {}; // map jobId -> array of responses

// seed a demo assessment so GET /assessments/demo-job returns an object (no 404)
assessmentsStore["demo-job"] = {
  jobId: "demo-job",
  title: "Demo Assessment (seeded)",
  sections: [
    {
      id: nanoid(),
      title: "General",
      questions: [
        {
          id: nanoid(),
          label: "Full name",
          type: "short",
          required: true,
        },
        {
          id: nanoid(),
          label: "Do you have prior experience?",
          type: "single",
          required: true,
          options: ["Yes", "No"],
        },
        {
          id: nanoid(),
          label: "Years of experience",
          type: "number",
          min: 0,
          max: 50,
          condition: null, // you can add a condition referencing the above question id if needed
        },
      ],
    },
  ],
};

/* -------------------- Handlers (MSW v2) -------------------- */

export const handlers = [
  // ---- JOBS ----
  // GET /api/jobs?search=&status=&page=&pageSize=&sort=
  http.get("/api/jobs", async ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const status = url.searchParams.get("status") || "";
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");
    const sort = url.searchParams.get("sort") || "order";

    let filtered = jobs.slice();

    if (search) {
      filtered = filtered.filter(
        (j) => j.title.toLowerCase().includes(search) || j.slug.includes(search)
      );
    }
    if (status) {
      filtered = filtered.filter((j) => j.status === status);
    }

    if (sort === "order") filtered.sort((a, b) => a.order - b.order);

    // simulate network latency
    await delay(200 + Math.random() * 200);

    return HttpResponse.json(paginate(filtered, page, pageSize), { status: 200 });
  }),

  // POST /api/jobs -> create job (title required, slug unique)
  http.post("/api/jobs", async ({ request }) => {
    const body = await request.json();
    const title = (body.title || "").trim();
    if (!title) {
      return HttpResponse.json({ message: "Title required" }, { status: 400 });
    }
    const slug = makeSlug(title);
    if (jobs.some((j) => j.slug === slug)) {
      return HttpResponse.json({ message: "Slug already exists" }, { status: 409 });
    }
    const newJob = {
      id: nanoid(),
      title,
      slug,
      tags: body.tags || [],
      status: "active",
      order: jobs.length ? Math.max(...jobs.map((j) => j.order)) + 1 : 1,
    };
    jobs.push(newJob);

    await delay(150);
    return HttpResponse.json(newJob, { status: 201 });
  }),

  // PATCH /api/jobs/:id
  http.patch("/api/jobs/:id", async ({ request, params }) => {
    const id = params.id;
    const body = await request.json();
    const job = jobs.find((j) => j.id === id);
    if (!job) return HttpResponse.json({ message: "Job not found" }, { status: 404 });

    if (body.title) {
      job.title = body.title;
      job.slug = makeSlug(body.title);
    }
    if (body.tags) job.tags = body.tags;
    if (body.status) job.status = body.status;
    if (typeof body.order !== "undefined") job.order = body.order;

    await delay(200);
    return HttpResponse.json(job, { status: 200 });
  }),

  // PATCH /api/jobs/:id/reorder -> { toOrder }  (occasionally return 500 to test rollback)
  http.patch("/api/jobs/:id/reorder", async ({ request, params }) => {
    const id = params.id;
    const body = await request.json();
    const toOrder = body?.toOrder;

    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return HttpResponse.json({ message: "Job not found" }, { status: 404 });

    // simulate occasional server failure (10% chance)
    if (Math.random() < 0.1) {
      await delay(250);
      return HttpResponse.json({ message: "Simulated server error (reorder)" }, { status: 500 });
    }

    const [moving] = jobs.splice(idx, 1);
    const insertIndex = Math.max(0, Math.min(jobs.length, (toOrder || 1) - 1));
    jobs.splice(insertIndex, 0, moving);

    // reassign order numbers
    jobs = jobs.map((j, i) => ({ ...j, order: i + 1 }));

    await delay(200);
    return HttpResponse.json({ success: true, jobs }, { status: 200 });
  }),

  // GET /api/jobs/:id
  http.get("/api/jobs/:id", async ({ params }) => {
    const id = params.id;
    const job = jobs.find((j) => j.id === id);
    if (!job) return HttpResponse.json({ message: "Job not found" }, { status: 404 });
    await delay(150);
    return HttpResponse.json(job, { status: 200 });
  }),

  /* ---------------- CANDIDATES ---------------- */

  // GET /api/candidates?search=&stage=&page=&pageSize=
  http.get("/api/candidates", async ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const stage = url.searchParams.get("stage") || "";
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "50");

    let filtered = candidates.slice();

    if (stage) filtered = filtered.filter((c) => c.stage === stage);
    if (search) {
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search)
      );
    }

    // sort by appliedAt desc
    filtered.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));

    await delay(200 + Math.random() * 200);
    return HttpResponse.json(paginate(filtered, page, pageSize), { status: 200 });
  }),

  // POST /api/candidates
  http.post("/api/candidates", async ({ request }) => {
    const body = await request.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    if (!name || !email) {
      return HttpResponse.json({ message: "name and email required" }, { status: 400 });
    }
    const id = nanoid();
    const appliedAt = new Date().toISOString();
    const newC = { id, name, email, stage: "applied", appliedAt, avatar: faker.image.avatar() };
    candidates.unshift(newC);
    candidateTimeline.push({
      id: nanoid(),
      candidateId: id,
      at: appliedAt,
      type: "status_change",
      payload: { from: null, to: "applied" },
    });
    await delay(150);
    return HttpResponse.json(newC, { status: 201 });
  }),

  // PATCH /api/candidates/:id
  http.patch("/api/candidates/:id", async ({ request, params }) => {
    const id = params.id;
    const body = await request.json();
    const ci = candidates.findIndex((c) => c.id === id);
    if (ci === -1) return HttpResponse.json({ message: "candidate not found" }, { status: 404 });

    const cand = candidates[ci];
    if (body.stage && body.stage !== cand.stage) {
      const from = cand.stage;
      const to = body.stage;
      cand.stage = to;
      candidateTimeline.push({
        id: nanoid(),
        candidateId: id,
        at: new Date().toISOString(),
        type: "status_change",
        payload: { from, to },
      });
    }
    if (body.name) cand.name = body.name;
    if (body.email) cand.email = body.email;

    candidates[ci] = cand;
    await delay(120 + Math.random() * 200);
    return HttpResponse.json(cand, { status: 200 });
  }),

  // GET /api/candidates/:id/timeline
  http.get("/api/candidates/:id/timeline", async ({ params }) => {
    const id = params.id;
    const events = candidateTimeline
      .filter((ev) => ev.candidateId === id)
      .sort((a, b) => a.at.localeCompare(b.at));
    await delay(120);
    return HttpResponse.json(events, { status: 200 });
  }),

  // GET /api/candidates/:id
  http.get("/api/candidates/:id", async ({ params }) => {
    const id = params.id;
    const c = candidates.find((x) => x.id === id);
    if (!c) return HttpResponse.json({ message: "not found" }, { status: 404 });
    await delay(100);
    return HttpResponse.json(c, { status: 200 });
  }),

  /* ---------------- ASSESSMENTS ---------------- */

  // GET /assessments/:jobId
  http.get("/assessments/:jobId", async ({ params }) => {
    const jobId = params.jobId;
    const a = assessmentsStore[jobId] || null;
    if (!a) return HttpResponse.json(null, { status: 404 });
    await delay(80);
    return HttpResponse.json(a, { status: 200 });
  }),

  // PUT /assessments/:jobId  (save/update assessment)
  http.put("/assessments/:jobId", async ({ request, params }) => {
    const jobId = params.jobId;
    const body = await request.json();
    // basic server-side validation: ensure structure and attach jobId
    body.jobId = jobId;
    assessmentsStore[jobId] = body;
    await delay(80);
    return HttpResponse.json(body, { status: 200 });
  }),

  // POST /assessments/:jobId/submit  (store candidate response)
  http.post("/assessments/:jobId/submit", async ({ request, params }) => {
    const jobId = params.jobId;
    const payload = await request.json();
    if (!assessmentResponsesStore[jobId]) assessmentResponsesStore[jobId] = [];
    // stamp with server time
    const resp = { ...payload, storedAt: new Date().toISOString() };
    assessmentResponsesStore[jobId].unshift(resp);
    await delay(60);
    return HttpResponse.json(resp, { status: 201 });
  }),


  http.post('/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    // simple dev credentials
    if (email === 'hr@example.com' && password === 'password123') {
      const accessToken = 'MOCK_ACCESS_TOKEN_' + Date.now();
      return HttpResponse.json({
        accessToken,
        user: { id: 'u_hr_1', email: 'hr@example.com', name: 'HR Admin', role: 'hr' }
      }, { status: 200 });
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  http.post('/auth/logout', async () => {
    return HttpResponse.json({ ok: true }, { status: 200 });
  }),

];
