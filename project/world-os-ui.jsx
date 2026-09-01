/* ============================================================================
   WORLD OS — shared UI
   Primitives the world-building pages share. Kept deliberately small: these
   compose with the studio's existing .panel / .field / .btn classes rather
   than replacing them.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useRef, useCallback, useEffect } = React;

  /* ── ImageDrop ───────────────────────────────────────────────────────
     Drag a file on, or click to browse. Runs the file through the World OS
     image pipeline (downscale + WebP) and hands back the processed record.  */
  function ImageDrop({ value, onChange, preset = 'art', label = 'Drop an image', height = 180, clearable = true }) {
    const [over, setOver] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    const take = useCallback(async (file) => {
      if (!file) return;
      setBusy(true); setErr('');
      try {
        const img = await window.WorldOS.processImage(file, preset);
        onChange(img);
      } catch (e) {
        setErr(e.message || 'Could not read that image');
      } finally { setBusy(false); }
    }, [onChange, preset]);

    const onDrop = (e) => {
      e.preventDefault(); setOver(false);
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      take(f);
    };

    const browse = async () => {
      const [img] = await window.WorldOS.pickImages({ preset });
      if (img) onChange(img);
    };

    return (
      <div className="wos-drop-wrap">
        <div
          className={`wos-drop ${over ? 'over' : ''} ${value ? 'filled' : ''}`}
          style={{ height }}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          onClick={browse}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') browse(); }}
        >
          {value && value.dataUrl
            ? <img src={value.dataUrl} alt="" className="wos-drop-img"/>
            : <div className="wos-drop-hint">
                <div className="wos-drop-icon">+</div>
                <div>{busy ? 'Processing…' : label}</div>
                <div className="wos-drop-sub">drag a file, or click to browse</div>
              </div>}
          {busy && <div className="wos-drop-busy">Processing…</div>}
        </div>
        {value && value.dataUrl && (
          <div className="wos-drop-meta">
            <span>{value.width}×{value.height}</span>
            <span>{window.WorldOS.prettyBytes(value.bytes)}</span>
            {value.naturalWidth > value.width && (
              <span className="wos-dim">resized from {value.naturalWidth}×{value.naturalHeight}</span>
            )}
            {clearable && (
              <button className="btn btn-ghost wos-mini" onClick={(e) => { e.stopPropagation(); onChange(null); }}>
                Remove
              </button>
            )}
          </div>
        )}
        {err && <div className="wos-err">{err}</div>}
      </div>
    );
  }

  /* ── Modal ──────────────────────────────────────────────────────────── */
  function Modal({ open, title, onClose, children, wide }) {
    useEffect(() => {
      if (!open) return;
      const esc = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', esc);
      return () => window.removeEventListener('keydown', esc);
    }, [open, onClose]);
    if (!open) return null;
    return (
      <div className="wos-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={`wos-modal ${wide ? 'wide' : ''}`}>
          <div className="wos-modal-head">
            <div className="wos-modal-title">{title}</div>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
          <div className="wos-modal-body">{children}</div>
        </div>
      </div>
    );
  }

  /* ── EmptyState ─────────────────────────────────────────────────────── */
  function EmptyState({ title, body, action }) {
    return (
      <div className="wos-empty">
        <div className="wos-empty-title">{title}</div>
        {body && <div className="wos-empty-body">{body}</div>}
        {action}
      </div>
    );
  }

  /* ── Field helpers ──────────────────────────────────────────────────── */
  const Field = ({ label, children }) => (
    <div className="field"><label className="field-label">{label}</label>{children}</div>
  );
  const Text = (p) => <input className="field-input" {...p}/>;
  const Area = (p) => <textarea className="field-area" {...p}/>;
  const Select = ({ options, ...p }) => (
    <select className="field-select" {...p}>
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  /* ── TagInput ───────────────────────────────────────────────────────── */
  function TagInput({ value = [], onChange, placeholder = 'Add a tag…' }) {
    const [draft, setDraft] = useState('');
    const add = () => {
      const t = draft.trim();
      if (!t || value.includes(t)) { setDraft(''); return; }
      onChange(value.concat(t)); setDraft('');
    };
    return (
      <div>
        <div className="chip-row" style={{ marginBottom: 6 }}>
          {value.map(t => (
            <span key={t} className="chip" onClick={() => onChange(value.filter(x => x !== t))}>
              {t} <span className="wos-dim">×</span>
            </span>
          ))}
        </div>
        <input className="field-input" value={draft} placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          onBlur={add}/>
      </div>
    );
  }

  /* ── EntityLink ──────────────────────────────────────────────────────
     Cross-reference picker over every collection in the studio. This is what
     makes the world connected rather than a set of separate lists.          */
  function EntityLink({ value = [], onChange }) {
    const [q, setQ] = useState('');
    const idx = window.WorldOS.index();
    const chosen = new Set(value.map(v => v.kind + ':' + v.id));
    const hits = q.trim()
      ? idx.filter(e => e.name.toLowerCase().includes(q.trim().toLowerCase()))
           .filter(e => !chosen.has(e.kind + ':' + e.id)).slice(0, 8)
      : [];
    return (
      <div>
        <div className="chip-row" style={{ marginBottom: 6 }}>
          {value.map(v => {
            const hit = window.WorldOS.resolve(v);
            return (
              <span key={v.kind + v.id} className="chip"
                onClick={() => onChange(value.filter(x => !(x.kind === v.kind && x.id === v.id)))}>
                <span className="wos-dim">{v.kind}</span> {hit ? hit.name : v.id} <span className="wos-dim">×</span>
              </span>
            );
          })}
        </div>
        <input className="field-input" value={q} placeholder="Link a hero, faction, item, article…"
          onChange={e => setQ(e.target.value)}/>
        {hits.length > 0 && (
          <div className="wos-suggest">
            {hits.map(h => (
              <div key={h.kind + h.id} className="wos-suggest-row"
                onClick={() => { onChange(value.concat({ kind: h.kind, id: h.id })); setQ(''); }}>
                <span>{h.name}</span><span className="wos-dim">{h.group}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  window.WorldOSUI = { ImageDrop, Modal, EmptyState, Field, Text, Area, Select, TagInput, EntityLink };

  /* ── shared styles ──────────────────────────────────────────────────── */
  const css = `
    .wos-dim{color:var(--ink-faint)}
    .wos-err{color:var(--pyrth);font-size:12px;margin-top:6px}
    .wos-mini{padding:2px 8px;font-size:11px;margin-left:auto}

    .wos-drop{position:relative;border:1px dashed var(--rule-strong);border-radius:var(--r-md);
      background:var(--parchment-2);display:grid;place-items:center;overflow:hidden;cursor:pointer;
      transition:border-color .15s,background .15s}
    .wos-drop:hover,.wos-drop.over{border-color:var(--gold);background:rgba(255,171,0,.06)}
    .wos-drop.filled{border-style:solid}
    .wos-drop-img{width:100%;height:100%;object-fit:contain}
    .wos-drop-hint{text-align:center;color:var(--ink-dim);font-size:13px;padding:16px}
    .wos-drop-icon{font-size:26px;color:var(--gold);line-height:1;margin-bottom:6px}
    .wos-drop-sub{font-size:11px;color:var(--ink-faint);margin-top:4px}
    .wos-drop-busy{position:absolute;inset:0;display:grid;place-items:center;background:rgba(9,9,10,.72);color:var(--gold-bright);font-size:13px}
    .wos-drop-meta{display:flex;gap:12px;align-items:center;font-size:11px;color:var(--ink-dim);margin-top:6px;flex-wrap:wrap}

    .wos-modal-back{position:fixed;inset:0;background:rgba(9,9,10,.78);backdrop-filter:blur(3px);
      z-index:800;display:grid;place-items:center;padding:24px}
    .wos-modal{background:var(--parchment-2);border:1px solid var(--rule-strong);border-radius:var(--r-lg);
      width:min(560px,96vw);max-height:90vh;display:flex;flex-direction:column;
      box-shadow:0 60px 100px -20px rgba(0,0,0,.9)}
    .wos-modal.wide{width:min(940px,96vw)}
    .wos-modal-head{display:flex;align-items:center;justify-content:space-between;gap:16px;
      padding:14px 18px;border-bottom:1px solid var(--rule)}
    .wos-modal-title{font-family:var(--display);font-size:18px;color:var(--ink)}
    .wos-modal-body{padding:18px;overflow:auto}
    .wos-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}

    .wos-empty{border:1px dashed var(--rule-strong);border-radius:var(--r-lg);padding:48px 24px;
      text-align:center;background:var(--parchment-2)}
    .wos-empty-title{font-family:var(--display);font-size:20px;color:var(--ink);margin-bottom:8px}
    .wos-empty-body{color:var(--ink-dim);font-size:14px;max-width:520px;margin:0 auto 18px;line-height:1.6}

    .wos-side-head{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:10px}
    .wos-suggest{border:1px solid var(--rule);border-radius:var(--r-sm);margin-top:4px;overflow:hidden}
    .wos-suggest-row{display:flex;justify-content:space-between;gap:12px;padding:7px 10px;font-size:13px;
      cursor:pointer;color:var(--ink);background:var(--parchment-2)}
    .wos-suggest-row:hover{background:rgba(255,171,0,.10)}
  `;
  if (!document.getElementById('world-os-ui-style')) {
    const el = document.createElement('style');
    el.id = 'world-os-ui-style';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
