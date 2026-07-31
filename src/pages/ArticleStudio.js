import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { listRewriteJobs, getRewriteStatus, generateJobCover, fetchStyleCatalog } from '../services/rewritePipeline';

// Simple, dependency-free presentation. Dark theme to match the app.
const c = {
  bg: '#0d1117', panel: '#161b22', border: '#30363d', text: '#c9d1d9',
  sub: '#8b949e', accent: '#3b82f6', good: '#22c55e', warn: '#f59e0b', bad: '#ef4444'
};

function statusColor(status) {
  if (status === 'completed') return c.good;
  if (status === 'failed') return c.bad;
  return c.warn;
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// Minimal markdown -> React elements for a readable preview (headings + paragraphs + bold).
function renderMarkdown(md) {
  if (!md) return null;
  const blocks = md.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const b = block.trim();
    if (!b) return null;
    if (b.startsWith('## ')) return <h2 key={i} style={{ color: c.text, fontSize: '1.15rem', marginTop: '1.1rem' }}>{b.slice(3)}</h2>;
    if (b.startsWith('# ')) return <h1 key={i} style={{ color: c.text, fontSize: '1.35rem' }}>{b.slice(2)}</h1>;
    const html = b.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#3b82f6">$1</a>');
    return <p key={i} style={{ color: c.text, lineHeight: 1.6, margin: '0.5rem 0' }} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

function copy(text, label) {
  navigator.clipboard.writeText(text || '').then(() => toast.success(`${label} copied`)).catch(() => toast.error('Copy failed'));
}

function Field({ label, value, mono }) {
  const display = Array.isArray(value) ? value.join(', ') : (value || '');
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ color: c.sub, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <button onClick={() => copy(display, label)} style={{ background: 'transparent', color: c.accent, border: `1px solid ${c.border}`, borderRadius: 5, fontSize: '0.7rem', padding: '2px 8px', cursor: 'pointer' }}>Copy</button>
      </div>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: '8px 10px', color: c.text, fontSize: '0.85rem', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>{display || <span style={{ color: c.sub }}>(none)</span>}</div>
    </div>
  );
}

export default function ArticleStudio() {
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cover, setCover] = useState(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [styleOptions, setStyleOptions] = useState([]);
  const [pickStyle, setPickStyle] = useState('');
  const [useSubject, setUseSubject] = useState(true);
  const query = useQuery();
  const pollRef = useRef(null);

  // Load the style catalog once for the cover style picker.
  useEffect(() => {
    fetchStyleCatalog().then(setStyleOptions).catch(() => {});
  }, []);

  const handleGenerateCover = async () => {
    if (!selectedId) return;
    setCoverBusy(true);
    try {
      const cv = await generateJobCover(selectedId, { styleId: pickStyle || undefined, useSubject, xFormat: 'png' });
      setCover(cv);
      toast.success('Cover generated');
    } catch (e) {
      toast.error(`Cover failed: ${e.message}`);
    } finally {
      setCoverBusy(false);
    }
  };

  // Show the selected job's persisted cover (if it already has one).
  useEffect(() => {
    setCover(detail && detail.result && detail.result.cover ? detail.result.cover : null);
  }, [detail]);

  const refreshList = useCallback(async () => {
    const items = await listRewriteJobs(40);
    setJobs(items);
    return items;
  }, []);

  // Initial load + auto-select a job passed via ?job=
  useEffect(() => {
    (async () => {
      const items = await refreshList();
      const q = query.get('job');
      if (q) setSelectedId(q);
      else if (items[0]) setSelectedId(items[0].jobId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the list while any job is in progress
  useEffect(() => {
    pollRef.current = setInterval(() => {
      const anyRunning = jobs.some((j) => j.status === 'running');
      if (anyRunning || jobs.length === 0) refreshList();
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [jobs, refreshList]);

  // Load detail when a job is selected; poll it while running
  useEffect(() => {
    if (!selectedId) return;
    let stop = false;
    const load = async () => {
      try {
        setLoadingDetail(true);
        const st = await getRewriteStatus(selectedId);
        if (!stop) setDetail(st);
        if (!stop && st.status === 'running') setTimeout(load, 4000);
      } catch (e) {
        if (!stop) setDetail({ status: 'failed', error: e.message });
      } finally {
        if (!stop) setLoadingDetail(false);
      }
    };
    load();
    return () => { stop = true; };
  }, [selectedId]);

  const result = detail && detail.result;
  const article = result && result.article;
  const audit = result && result.audit;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem', color: c.text }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Article Studio</h1>
      <p style={{ color: c.sub, marginTop: 0 }}>Fact-checked rewrites. Start one from any news card; they process here and persist, so you can leave and come back.</p>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Job list */}
        <div style={{ flex: '1 1 320px', minWidth: 300, maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent rewrites</h3>
            <button onClick={refreshList} style={{ background: 'transparent', color: c.accent, border: `1px solid ${c.border}`, borderRadius: 5, fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer' }}>Refresh</button>
          </div>
          {jobs.length === 0 && <div style={{ color: c.sub, fontSize: '0.85rem' }}>No rewrites yet. Click "Generate AI Rewrite" on a news article.</div>}
          {jobs.map((j) => (
            <div key={j.jobId} onClick={() => setSelectedId(j.jobId)}
              style={{ background: selectedId === j.jobId ? '#1f2937' : c.panel, border: `1px solid ${selectedId === j.jobId ? c.accent : c.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: '8px', cursor: 'pointer' }}>
              <div style={{ fontSize: '0.9rem', color: c.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title || '(untitled)'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: statusColor(j.status), fontSize: '0.75rem', fontWeight: 600 }}>{j.status === 'running' ? `${j.progress || 0}%` : j.status}{j.usedFallback ? ' (standard)' : ''}</span>
                <span style={{ color: c.sub, fontSize: '0.72rem' }}>{j.stepLabel || ''}</span>
              </div>
              {j.status === 'running' && (
                <div style={{ height: 4, background: c.bg, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${j.progress || 0}%`, background: c.accent, transition: 'width 0.4s' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detail */}
        <div style={{ flex: '2 1 500px', minWidth: 320 }}>
          {!selectedId && <div style={{ color: c.sub }}>Select a rewrite to view it.</div>}
          {selectedId && detail && detail.status === 'running' && (
            <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10, padding: '1.5rem' }}>
              <div style={{ fontSize: '1rem', marginBottom: 10 }}>{detail.stepLabel || 'Processing'}...</div>
              <div style={{ height: 8, background: c.bg, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${detail.progress || 0}%`, background: c.accent, transition: 'width 0.4s' }} />
              </div>
              <div style={{ color: c.sub, fontSize: '0.8rem', marginTop: 8 }}>This runs server-side. You can leave this page and come back; it keeps going.</div>
            </div>
          )}
          {selectedId && detail && detail.status === 'failed' && (
            <div style={{ background: c.panel, border: `1px solid ${c.bad}`, borderRadius: 10, padding: '1.5rem', color: c.bad }}>Rewrite failed: {detail.error || 'unknown error'}</div>
          )}
          {selectedId && article && (
            <div>
              {/* Header + scores */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', flex: 1 }}>{article.headline}</h2>
                {result.requiresHumanReview && (
                  <span title={(result.reviewReasons || []).join('; ')} style={{ background: 'rgba(245,158,11,0.15)', color: c.warn, border: `1px solid ${c.warn}`, borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', maxWidth: 340 }}>
                    Review: {(result.reviewReasons || []).join('; ') || 'flagged'}
                  </span>
                )}
              </div>
              {audit && (
                <div style={{ color: c.sub, fontSize: '0.8rem', margin: '6px 0 14px' }}>
                  Overall {result.overallScore} · Factual {audit.factual_accuracy.score} · SEO {audit.seo.score} · Readability {audit.readability.score}{result.fallback ? ' · standard rewrite' : ''}
                </div>
              )}

              {/* Cover */}
              <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Cover</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: c.sub }}>
                      <input type="checkbox" checked={useSubject} onChange={(e) => setUseSubject(e.target.checked)} /> 3D element
                    </label>
                    <select value={pickStyle} onChange={(e) => setPickStyle(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, fontSize: '0.78rem', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                      <option value="">Rotate style</option>
                      {styleOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={handleGenerateCover} disabled={coverBusy} style={{ background: c.accent, color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.8rem', padding: '6px 14px', cursor: coverBusy ? 'default' : 'pointer' }}>
                      {coverBusy ? 'Generating (about 1 min)...' : (cover ? 'Re-render' : 'Generate Cover')}
                    </button>
                  </div>
                </div>
                {cover && cover.imageUrl ? (
                  <div>
                    <img src={cover.imageUrl} alt="cover" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, fontSize: '0.78rem', color: c.sub, flexWrap: 'wrap' }}>
                      <span>logo: {cover.symbolUsed || 'none'}</span>
                      <span>style: {cover.styleUsed || 'random'}</span>
                      <span>element: {cover.subjectUsed || 'default'}</span>
                      {cover.xReadyUrl && <a href={cover.xReadyUrl} target="_blank" rel="noopener noreferrer" style={{ color: c.accent }}>Download X-ready (under 1MB)</a>}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: c.sub, fontSize: '0.85rem' }}>No cover yet. Generate one from the fact-checked article.</div>
                )}
              </div>

              {/* Article (markdown, WordPress-ready) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: c.sub, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Article (Markdown, ready for WordPress)</span>
                <button onClick={() => copy(article.article_markdown, 'Article markdown')} style={{ background: c.accent, color: '#fff', border: 'none', borderRadius: 5, fontSize: '0.75rem', padding: '4px 12px', cursor: 'pointer' }}>Copy Markdown</button>
              </div>
              <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem', maxHeight: 460, overflowY: 'auto' }}>
                {renderMarkdown(article.article_markdown)}
              </div>

              {/* Separated SEO / metadata fields */}
              <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10, padding: '1rem 1.25rem' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>SEO and metadata</h3>
                <Field label="SEO Title" value={article.seo_title} />
                <Field label="Meta Description" value={article.meta_description} />
                <Field label="Focus Keyphrase" value={article.focus_keyphrase} />
                <Field label="Secondary Keyphrases" value={article.secondary_keyphrases} />
                <Field label="Long-tail Tags" value={article.tags} />
                <Field label="Categories" value={article.categories} />
                <Field label="URL Slug" value={article.slug} mono />
                <Field label="Image Alt Text" value={article.image_alt_text} />
                <Field label="Image Caption" value={article.image_caption} />
                <Field label="Official Sources" value={(article.official_sources || []).map((s) => `${s.name} (${s.url})`)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
