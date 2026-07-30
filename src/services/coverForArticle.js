// Cover For Article
//
// Calls the live cover generator's additive /for-article wrapper, which reuses
// the production Wavespeed cover generator (real logos + watermark) and returns
// both the full-quality cover and an under-1MB, 1800x900 X-ready copy.
//
// Uses the same explicit /api/cover-generator base as the Cover Generator page
// (a hardcoded backend origin), which is the proven-working pattern for this
// route family and avoids the axios baseURL ambiguity between env files.

const COVER_API_BASE =
  process.env.REACT_APP_COVER_API_BASE ||
  'https://crypto-news-curator-backend-production.up.railway.app';

/**
 * Generate a cover for an article via the live generator.
 * @param {Object} args
 * @param {string} args.title
 * @param {string} [args.content]
 * @param {string} [args.sourceImageUrl] source article image, used as a style reference only
 * @param {string} [args.network] optional network/company tag to prefer for logo selection
 * @param {'jpeg'|'png'} [args.xFormat] format for the under-1MB X copy (default jpeg)
 * @returns {Promise<{success:boolean, imageUrl:string, xReadyUrl:string|null, symbolUsed:string|null, mode:string}>}
 */
export async function generateCoverForArticle({ title, content, sourceImageUrl, network, xFormat }) {
  const response = await fetch(`${COVER_API_BASE}/api/cover-generator/for-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, sourceImageUrl, network, xFormat })
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(`Cover generation returned a non-JSON response (${response.status})`);
  }

  if (!response.ok || !data || !data.success) {
    throw new Error((data && data.error) || `Cover generation failed (${response.status})`);
  }

  return data;
}

/**
 * Fetch the curated style catalog so the user can pick a style to re-render with.
 * @returns {Promise<Array<{id:string, name:string}>>}
 */
export async function fetchStyleCatalog() {
  const response = await fetch(`${COVER_API_BASE}/api/style-catalog`);
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    return [];
  }
  const list = Array.isArray(data) ? data : (data.styles || data.data || data.catalog || []);
  return list
    .map((s) => ({
      id: s.id || s.styleId || s.slug,
      name: s.name || s.title || s.id || s.styleId || s.slug
    }))
    .filter((s) => s.id);
}

export default generateCoverForArticle;
