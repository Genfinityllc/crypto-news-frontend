// Talks to the backend's Cover Studio routes (/api/cover-generator/studio):
// the shared backgrounds everyone sees, and drafts kept in a signed-in
// person's account. Signed out, drafts stay in the browser (drafts.js).
//
// A cover travels as the same plain data drafts.js makes (packCover), except
// that each picture is sent once as its own upload and the cover refers to it
// by the SHA-256 of its bytes. Saving again only uploads pictures the server
// does not have yet.

const hashes = new WeakMap(); // picture bytes -> their hash, worked out once

async function hashOf(rec) {
  if (hashes.has(rec)) return hashes.get(rec);
  const digest = await crypto.subtle.digest('SHA-256', rec.buf);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  hashes.set(rec, hex);
  return hex;
}

// getToken: () => Promise<string | null>, the signed-in person's Firebase ID token
export function makeStudioServer(apiBase, getToken) {
  const base = `${apiBase}/api/cover-generator/studio`;

  const call = async (method, path, { json, raw, type, auth = true, bytes = false } = {}) => {
    const headers = {};
    if (auth) {
      const token = await getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    let body;
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    }
    if (raw) {
      headers['Content-Type'] = type;
      body = raw;
    }
    const res = await fetch(base + path, { method, headers, body });
    if (bytes && res.ok) return res.arrayBuffer();
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    if (!res.ok || !data || data.success === false) {
      const err = new Error((data && data.error) || `The server answered ${res.status}.`);
      err.status = res.status;
      throw err;
    }
    return data;
  };

  return {
    // { signedIn, isOwner }
    me: () => call('GET', '/me'),

    // ---------- shared backgrounds ----------
    listBackdrops: () => call('GET', '/backdrops', { auth: false }).then((d) => d.backdrops || []),
    addBackdrop: (url) => call('POST', '/backdrops', { json: { url } }),
    removeBackdrop: (id) => call('DELETE', `/backdrops/${encodeURIComponent(id)}`).then((d) => d.backdrops || []),

    // ---------- drafts in the account ----------
    listDrafts: (profile) => call('GET', `/drafts?profile=${encodeURIComponent(profile)}`).then((d) => d.drafts || []),

    // meta: { id, name, profile, created, thumb, width, height }; cover: from packCover
    saveDraft: async (meta, cover) => {
      const id = encodeURIComponent(meta.id);
      const recs = cover.pictures || [];
      const refs = await Promise.all(recs.map(async (rec) => (rec ? { type: rec.type, hash: await hashOf(rec) } : null)));
      const wanted = [...new Set(refs.filter(Boolean).map((r) => r.hash))];
      if (wanted.length) {
        const { missing } = await call('POST', `/drafts/${id}/pictures/check`, { json: { hashes: wanted } });
        for (const hash of missing || []) {
          const at = refs.findIndex((r) => r && r.hash === hash);
          // one at a time: the pictures can be several megabytes each
          // eslint-disable-next-line no-await-in-loop
          await call('PUT', `/drafts/${id}/pictures/${hash}`, { raw: recs[at].buf, type: recs[at].type });
        }
      }
      const out = await call('PUT', `/drafts/${id}`, { json: { meta, cover: { ...cover, pictures: refs } } });
      return out.draft;
    },

    // -> the cover in the same shape packCover makes (pictures as bytes again)
    openDraft: async (draftId) => {
      const id = encodeURIComponent(draftId);
      const { cover } = await call('GET', `/drafts/${id}`);
      const byHash = new Map();
      const pictures = [];
      for (const ref of cover.pictures || []) {
        if (!ref) {
          pictures.push(null);
          continue;
        }
        if (!byHash.has(ref.hash)) {
          // eslint-disable-next-line no-await-in-loop
          const buf = await call('GET', `/drafts/${id}/pictures/${ref.hash}`, { bytes: true });
          const rec = { type: ref.type, buf };
          hashes.set(rec, ref.hash);
          byHash.set(ref.hash, rec);
        }
        pictures.push(byHash.get(ref.hash));
      }
      return { ...cover, pictures };
    },

    deleteDraft: (draftId) => call('DELETE', `/drafts/${encodeURIComponent(draftId)}`),
  };
}
