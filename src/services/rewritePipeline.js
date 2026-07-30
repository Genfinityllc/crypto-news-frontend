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
