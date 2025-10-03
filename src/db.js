// src/db.js
import Dexie from "dexie";

export const db = new Dexie("JobHiringDB");

// Schema: use indexes often queried (id, slug, jobId, candidateId, at)
db.version(1).stores({
  jobs: "id,title,slug,order",                 // primary key id
  candidates: "id, email, name, stage, appliedAt",    // primary key id
  timelines: "++idx, id, candidateId, at",            // auto idx
  assessments: "jobId",                               // store assessment builder by jobId
  responses: "++idx, jobId, at"                       // responses per job
});

// convenience wrappers

// Jobs
export async function saveJob(job) {
  if (!job || !job.id) return;
  await db.jobs.put(job);
}

export async function bulkSaveJobs(jobs = []) {
  if (!Array.isArray(jobs) || jobs.length === 0) return;
  await db.jobs.bulkPut(jobs);
}

export async function getJobs({ page = 1, pageSize = 10, status = "", search = "" } = {}) {
  let collection = db.jobs.orderBy("order"); // or id
  if (status) collection = collection.filter(j => j.status === status);
  if (search) {
    const q = search.toLowerCase();
    collection = collection.filter(j => (j.title && j.title.toLowerCase().includes(q)) || (j.slug && j.slug.includes(q)));
  }
  const total = await collection.count();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const results = await collection.offset((page - 1) * pageSize).limit(pageSize).toArray();
  return { total, page, pageSize, pages, results };
}

// Candidates
export async function saveCandidate(c) {
  if (!c || !c.id) return Promise.resolve();
  return db.candidates.put(c);

}

export async function bulkSaveCandidates(list = []) {
  if (!Array.isArray(list) || list.length === 0) return Promise.resolve();
  return db.candidates.bulkPut(list);
}

export async function getCandidates({ page = 1, pageSize = 50, stage = "", search = "" } = {}) {
  let collection = db.candidates.orderBy("appliedAt"); // newest?
  if (stage) collection = collection.filter(c => c.stage === stage);
  if (search) {
    const q = search.toLowerCase();
    collection = collection.filter(c => (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q));
  }
  const total = await collection.count();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const results = await collection.offset((page-1)*pageSize).limit(pageSize).toArray();

  // reverse used so newest appear first if ordered by appliedAt
  return { results, total, page, pageSize, pages: Math.max(1, Math.ceil(total/pageSize)) };
}

// Timeline (status change events)
export async function saveTimelineEvent(ev) {
  if (!ev) return;
  await db.timelines.put(ev);
}
export async function getTimelineForCandidate(candidateId) {
  return await db.timelines.where("candidateId").equals(candidateId).sortBy("at");
}

// Assessments & responses
export async function saveAssessment(assessment) {
  if (!assessment || !assessment.jobId) return;
  await db.assessments.put(assessment, assessment.jobId);
}
export async function getAssessment(jobId) {
  return await db.assessments.get(jobId);
}
export async function saveResponse(jobId, resp) {
  if (!jobId || !resp) return;
  await db.responses.add({ jobId, ...resp });
}
export async function getResponses(jobId) {
  return await db.responses.where("jobId").equals(jobId).sortBy("at");
}

// utility: clear (for dev)
export async function clearAll() {
  await Promise.all([
    db.jobs.clear(),
    db.candidates.clear(),
    db.timelines.clear(),
    db.assessments.clear(),
    db.responses.clear(),
  ]);
}

export default db;
