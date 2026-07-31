// Rewrite Pipeline
//
// Talks to the async, fact-checked rewrite pipeline. Uses the same explicit
// backend origin as the cover generator (proven-working pattern), avoiding the
// axios baseURL ambiguity.

const PIPELINE_API_BASE =
  process.env.REACT_APP_COVER_API_BASE ||
  'https://crypto-news-curator-backend-production.up.railway.app';

/**
 * Start a rewrite job. Returns the jobId immediately; the pipeline runs
 * server-side and is tracked in Article Studio.
 */
export async function startRewritePipeline({ title, content, url }) {
  const resp = await fetch(`${PIPELINE_API_BASE}/api/rewrite-pipeline/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, url })
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.success) {
    throw new Error((data && data.error) || `Failed to start rewrite (${resp.status})`);
  }
  return data.jobId;
}

/**
 * Start a MANUAL cover job: the user pastes their own title + article (not a
 * rewrite) and we run the same concept + truthful-text-clipping cover process on
 * it. Returns the jobId; it shows up in Article Studio like any other job.
 */
export async function startManualCover({ title, content }) {
  const resp = await fetch(`${PIPELINE_API_BASE}/api/rewrite-pipeline/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.success) {
    throw new Error((data && data.error) || `Failed to start cover (${resp.status})`);
  }
  return data.jobId;
}

/** Get a single job's full status (includes the result when completed). */
export async function getRewriteStatus(jobId) {
  const resp = await fetch(`${PIPELINE_API_BASE}/api/rewrite-pipeline/status/${jobId}`);
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.success) {
    throw new Error((data && data.error) || `Failed to get status (${resp.status})`);
  }
  return data;
}

/** List recent rewrite jobs (shared) for the Article Studio feed. */
export async function listRewriteJobs(limit = 40) {
  const resp = await fetch(`${PIPELINE_API_BASE}/api/rewrite-pipeline/list?limit=${limit}`);
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.success) return [];
  return data.jobs || [];
}

/**
 * Generate (or re-render) the cover for a completed rewrite. Uses the verified
 * headline/entities, and persists the cover onto the job.
 * @param {string} jobId
 * @param {{styleId?:string, useSubject?:boolean, xFormat?:'png'|'jpeg'}} [opts]
 */
export async function generateJobCover(jobId, opts = {}) {
  const resp = await fetch(`${PIPELINE_API_BASE}/api/rewrite-pipeline/${jobId}/cover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts)
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.success) {
    throw new Error((data && data.error) || `Cover generation failed (${resp.status})`);
  }
  return data.cover;
}

/** Fetch the curated style catalog (id, name, and sample image) for the picker. */
export async function fetchStyleCatalog() {
  const resp = await fetch(`${PIPELINE_API_BASE}/api/style-catalog`);
  const data = await resp.json().catch(() => null);
  const list = Array.isArray(data) ? data : (data && (data.styles || data.data || data.catalog)) || [];
  return list
    .map((s) => ({
      id: s.id || s.styleId || s.slug,
      name: s.name || s.title || s.id,
      image: s.sampleImageUrl || s.previewUrl || s.thumbnail || s.image || null
    }))
    .filter((s) => s.id);
}
