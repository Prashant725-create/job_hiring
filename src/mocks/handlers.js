// src/mocks/handlers.js
import { rest } from "msw";
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
  const CANDIDATE_COUNT = 1000;
  for (let i = 0; i < CANDIDATE_COUNT; i++) {
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

/* -------------------- Handlers -------------------- */
export const handlers = [
  // ---- JOBS ----
  // GET /api/jobs?search=&status=&page=&pageSize=&sort=
  rest.get("/api/jobs", (req, res, ctx) => {
    const search = (req.url.searchParams.get("search") || "").trim().toLowerCase();
    const status = req.url.searchParams.get("status") || "";
    const page = Number(req.url.searchParams.get("page") || "1");
    const pageSize = Number(req.url.searchParams.get("pageSize") || "10");
    const sort = req.url.searchParams.get("sort") || "order";

    let filtered = jobs.slice();

    if (search) {
      filtered = filtered.filter(
        (j) =>
          j.title.toLowerCase().includes(search) ||
          j.slug.includes(search)
      );
    }
    if (status) {
      filtered = filtered.filter((j) => j.status === status);
    }

    if (sort === "order") filtered.sort((a, b) => a.order - b.order);

    return res(ctx.delay(200 + Math.random() * 200), ctx.status(200), ctx.json(paginate(filtered, page, pageSize)));
  }),

  // POST /api/jobs -> create job (title required, slug unique)
  rest.post("/api/jobs", async (req, res, ctx) => {
    const body = await req.json();
    const title = (body.title || "").trim();
    if (!title) {
      return res(ctx.status(400), ctx.json({ message: "Title required" }));
    }
    const slug = makeSlug(title);
    if (jobs.some((j) => j.slug === slug)) {
      return res(ctx.status(409), ctx.json({ message: "Slug already exists" }));
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
    return res(ctx.delay(150), ctx.status(201), ctx.json(newJob));
  }),

  // PATCH /api/jobs/:id
  rest.patch("/api/jobs/:id", async (req, res, ctx) => {
    const id = req.params.id;
    const body = await req.json();
    const job = jobs.find((j) => j.id === id);
    if (!job) return res(ctx.status(404), ctx.json({ message: "Job not found" }));

    // If title changed, update slug (optional) — we won't enforce slug uniqueness on patch here,
    // because the client also checks; you can add enforcement if you want.
    if (body.title) {
      job.title = body.title;
      job.slug = makeSlug(body.title);
    }
    if (body.tags) job.tags = body.tags;
    if (body.status) job.status = body.status;
    if (typeof body.order !== "undefined") job.order = body.order;

    return res(ctx.delay(200), ctx.status(200), ctx.json(job));
  }),

  // PATCH /api/jobs/:id/reorder -> { toOrder }  (occasionally return 500 to test rollback)
  rest.patch("/api/jobs/:id/reorder", async (req, res, ctx) => {
    const id = req.params.id;
    const { toOrder } = await req.json();

    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return res(ctx.status(404), ctx.json({ message: "Job not found" }));

    // simulate occasional server failure (10% chance)
    if (Math.random() < 0.1) {
      return res(ctx.delay(250), ctx.status(500), ctx.json({ message: "Simulated server error (reorder)" }));
    }

    // move item: remove and insert at toOrder - 1 (1-based toOrder)
    const [moving] = jobs.splice(idx, 1);
    const insertIndex = Math.max(0, Math.min(jobs.length, (toOrder || 1) - 1));
    jobs.splice(insertIndex, 0, moving);

    // reassign order numbers
    jobs = jobs.map((j, i) => ({ ...j, order: i + 1 }));

    return res(ctx.delay(200), ctx.status(200), ctx.json({ success: true, jobs }));
  }),

  // GET /api/jobs/:id
  rest.get("/api/jobs/:id", (req, res, ctx) => {
    const id = req.params.id;
    const job = jobs.find((j) => j.id === id);
    if (!job) return res(ctx.status(404), ctx.json({ message: "Job not found" }));
    return res(ctx.delay(150), ctx.status(200), ctx.json(job));
  }),

  /* ---------------- CANDIDATES ---------------- */

  // GET /api/candidates?search=&stage=&page=&pageSize=
  rest.get("/api/candidates", (req, res, ctx) => {
    const search = (req.url.searchParams.get("search") || "").trim().toLowerCase();
    const stage = req.url.searchParams.get("stage") || "";
    const page = Number(req.url.searchParams.get("page") || "1");
    const pageSize = Number(req.url.searchParams.get("pageSize") || "50");

    let filtered = candidates.slice();

    if (stage) filtered = filtered.filter((c) => c.stage === stage);
    if (search) {
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search)
      );
    }

    // sort by appliedAt desc
    filtered.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));

    return res(ctx.delay(200 + Math.random() * 200), ctx.status(200), ctx.json(paginate(filtered, page, pageSize)));
  }),

  // POST /api/candidates
  rest.post("/api/candidates", async (req, res, ctx) => {
    const body = await req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    if (!name || !email) {
      return res(ctx.status(400), ctx.json({ message: "name and email required" }));
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
    return res(ctx.delay(150), ctx.status(201), ctx.json(newC));
  }),

  // PATCH /api/candidates/:id
  rest.patch("/api/candidates/:id", async (req, res, ctx) => {
    const id = req.params.id;
    const body = await req.json();
    const ci = candidates.findIndex((c) => c.id === id);
    if (ci === -1) return res(ctx.status(404), ctx.json({ message: "candidate not found" }));

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
    return res(ctx.delay(120 + Math.random() * 200), ctx.status(200), ctx.json(cand));
  }),

  // GET /api/candidates/:id/timeline
  rest.get("/api/candidates/:id/timeline", (req, res, ctx) => {
    const id = req.params.id;
    const events = candidateTimeline.filter((ev) => ev.candidateId === id).sort((a, b) => a.at.localeCompare(b.at));
    return res(ctx.delay(120), ctx.status(200), ctx.json(events));
  }),

  // GET /api/candidates/:id
  rest.get("/api/candidates/:id", (req, res, ctx) => {
    const id = req.params.id;
    const c = candidates.find((x) => x.id === id);
    if (!c) return res(ctx.status(404), ctx.json({ message: "not found" }));
    return res(ctx.delay(100), ctx.status(200), ctx.json(c));
  }),
];
