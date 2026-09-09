/* ============================================================================
   BUG ATTACHMENTS — many photos and videos per report
   Replaces the single <image-slot>, which relied on a window.omelette runtime
   that does not exist in this app and was therefore read-only: every
   screenshot a reporter dropped was discarded on reload.

   Files go to the private bug-attachments bucket under the uploader's own id.
   Images are downscaled and re-encoded before upload — a phone screenshot is
   several megabytes of PNG and there is no reason to store that. Video is
   uploaded as-is, because in-browser transcoding is not worth the weight, so
   it carries a size cap instead.

   The bucket is private, so viewing goes through short-lived signed URLs; the
   record stores the path, never a URL that would outlive its permission.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useEffect, useRef, useCallback } = React;

  const BUCKET = 'bug-attachments';
  const MAX_VIDEO = 25 * 1024 * 1024;
  const MAX_FILES = 10;
  const sb = () => window.supabaseClient;

  const isVideo = (t) => /^video\//.test(t || '');
  const isImage = (t) => /^image\//.test(t || '');

  function prettyBytes(n) {
    if (!n && n !== 0) return '';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  /* Downscale a photo before it ever leaves the browser. */
  async function shrinkImage(file, max = 1600, quality = 0.82) {
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(new Error('Could not read ' + file.name));
      fr.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('That image could not be decoded'));
      i.src = dataUrl;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    let blob = await new Promise(r => c.toBlob(r, 'image/webp', quality));
    if (!blob) blob = await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
    return { blob, width: w, height: h };
  }

  const extFor = (mime) => ({
    'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  }[mime] || 'bin');

  /* Upload one file, returning the record stored on the bug. */
  async function uploadOne(file, uid) {
    if (!sb()) throw new Error('Not connected — sign in and try again');
    if (!isImage(file.type) && !isVideo(file.type)) {
      throw new Error(file.name + ' is not an image or video');
    }

    let body = file, width = null, height = null, type = file.type;
    if (isImage(file.type) && file.type !== 'image/gif') {
      const out = await shrinkImage(file);
      body = out.blob; width = out.width; height = out.height; type = out.blob.type;
    }
    if (isVideo(type) && body.size > MAX_VIDEO) {
      throw new Error(file.name + ' is ' + prettyBytes(body.size)
        + ' — videos are capped at ' + prettyBytes(MAX_VIDEO) + '. Trim it, or upload a screenshot instead.');
    }

    // per-user prefix: the insert policy requires it, and it stops one member
    // overwriting another's file
    const path = uid + '/' + Date.now().toString(36) + '-'
      + Math.random().toString(36).slice(2, 8) + '.' + extFor(type);

    const { error } = await sb().storage.from(BUCKET)
      .upload(path, body, { contentType: type, upsert: false });
    if (error) throw new Error(error.message);

    return {
      id: 'att_' + Math.random().toString(36).slice(2, 10),
      path, type, name: file.name,
      size: body.size, width, height,
      addedAt: new Date().toISOString(),
    };
  }

  /* A private bucket means no permanent URL. Sign on demand and cache for the
     life of the view; the record keeps only the path.

     Returns { url, error } rather than a bare string: a blank thumbnail with
     no stated reason is exactly the kind of silent failure this whole feature
     has already been bitten by twice. */
  const signCache = new Map();
  async function signedUrl(path) {
    if (!path) return { url: '', error: 'no path on this attachment' };
    const hit = signCache.get(path);
    if (hit && hit.expires > Date.now()) return { url: hit.url, error: null };
    if (!sb()) return { url: '', error: 'not connected' };
    try {
      const res = await sb().storage.from(BUCKET).createSignedUrl(path, 3600);
      if (res.error) return await downloadFallback(path, res.error.message || String(res.error));
      // supabase-js v2 returns signedUrl; v1 returned signedURL. Accepting both
      // costs nothing and avoids a blank image if the CDN build ever changes.
      const d = res.data || {};
      const url = d.signedUrl || d.signedURL || '';
      if (!url) return await downloadFallback(path, 'signing returned no URL');
      signCache.set(path, { url, expires: Date.now() + 55 * 60 * 1000 });
      return { url, error: null };
    } catch (e) {
      return await downloadFallback(path, e.message || String(e));
    }
  }

  /* If signing fails, pull the bytes down instead. It needs the same read
     permission but a different endpoint, so a quirk in one path does not leave
     the viewer staring at an empty box. Object URLs are revoked when the page
     goes away, which is fine for a thumbnail. */
  async function downloadFallback(path, why) {
    try {
      const { data, error } = await sb().storage.from(BUCKET).download(path);
      if (error || !data) return { url: '', error: (error && error.message) || why };
      const url = URL.createObjectURL(data);
      signCache.set(path, { url, expires: Date.now() + 55 * 60 * 1000, blob: true });
      return { url, error: null };
    } catch (e) {
      return { url: '', error: why + ' (and download failed: ' + (e.message || e) + ')' };
    }
  }

  /* ── one thumbnail that resolves its own signed URL ──────────────────── */
  function Attachment({ att, onRemove, canRemove }) {
    const [url, setUrl] = useState('');
    const [why, setWhy] = useState(null);      // why it could not be shown

    useEffect(() => {
      let alive = true;
      setUrl(''); setWhy(null);
      signedUrl(att.path).then(r => {
        if (!alive) return;
        if (r.url) setUrl(r.url); else setWhy(r.error || 'could not load');
      });
      return () => { alive = false; };
    }, [att.path]);

    // the <img> itself can still fail after a good URL — an expired signature,
    // a deleted object — so report that too rather than showing a blank box
    const onMediaError = () => { signCache.delete(att.path); setWhy('image failed to load'); };

    return (
      <div className="bug-att">
        {why ? (
          <div className="bug-att-missing" title={att.path + ' — ' + why}>
            <span>can’t show this</span>
            <small>{why}</small>
          </div>
        ) : !url ? (
          <div className="bug-att-missing">loading…</div>
        ) : isVideo(att.type) ? (
          <video src={url} controls preload="metadata" playsInline onError={onMediaError}/>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt={att.name || 'attachment'} loading="lazy" onError={onMediaError}/>
          </a>
        )}
        <div className="bug-att-foot">
          <span title={att.name}>{isVideo(att.type) ? 'video' : 'image'} · {prettyBytes(att.size)}</span>
          {canRemove && <button className="bug-att-x" onClick={() => onRemove(att)} title="Remove">×</button>}
        </div>
      </div>
    );
  }

  /* ── the picker: drop many, or browse ────────────────────────────────── */
  function BugAttachments({ value = [], onChange, readOnly = false }) {
    const [busy, setBusy] = useState(null);      // 'name (2 of 5)'
    const [error, setError] = useState('');
    const [over, setOver] = useState(false);
    const inputRef = useRef(null);

    const take = useCallback(async (files) => {
      const list = Array.from(files || []).filter(Boolean);
      if (!list.length) return;
      setError('');

      const room = MAX_FILES - value.length;
      if (room <= 0) { setError('Up to ' + MAX_FILES + ' attachments per report.'); return; }
      const batch = list.slice(0, room);
      const skipped = list.length - batch.length;

      const uid = (window.CURRENT_USER && window.CURRENT_USER.id) || null;
      if (!uid) { setError('You need to be signed in to attach files.'); return; }

      const done = [], failures = [];
      for (let i = 0; i < batch.length; i++) {
        setBusy(batch[i].name + ' (' + (i + 1) + ' of ' + batch.length + ')');
        try { done.push(await uploadOne(batch[i], uid)); }
        catch (e) { failures.push(e.message || String(e)); }
      }
      setBusy(null);

      if (done.length) onChange(value.concat(done));
      const notes = failures.slice();
      if (skipped) notes.push(skipped + ' file' + (skipped === 1 ? '' : 's') + ' skipped — limit is ' + MAX_FILES + '.');
      setError(notes.join(' · '));
    }, [value, onChange]);

    const remove = async (att) => {
      onChange(value.filter(a => a.id !== att.id));
      // best effort: a failed delete leaves an orphan file, not a broken record
      try { if (sb() && att.path) await sb().storage.from(BUCKET).remove([att.path]); } catch (e) {}
    };

    return (
      <div className="bug-atts">
        {!readOnly && (
          <div
            className={'bug-att-drop' + (over ? ' over' : '') + (busy ? ' busy' : '')}
            onDragOver={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
            onClick={() => !busy && inputRef.current && inputRef.current.click()}
            role="button" tabIndex={0}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !busy) inputRef.current.click(); }}
          >
            <input ref={inputRef} type="file" accept="image/*,video/*" multiple
              style={{ display: 'none' }}
              onChange={e => { take(e.target.files); e.target.value = ''; }}/>
            {busy
              ? <span>Uploading {busy}…</span>
              : <span>
                  <b>Drop screenshots or video here</b>, or click to browse — up to {MAX_FILES},
                  images are compressed automatically, video up to {prettyBytes(MAX_VIDEO)}.
                </span>}
          </div>
        )}

        {error && <div className="bug-att-err">{error}</div>}

        {value.length > 0 ? (
          <div className="bug-att-grid">
            {value.map(att => (
              <Attachment key={att.id} att={att} onRemove={remove} canRemove={!readOnly}/>
            ))}
          </div>
        ) : readOnly ? (
          <div className="bug-att-none">No attachments.</div>
        ) : null}
      </div>
    );
  }

  window.BugAttachments = BugAttachments;

  const css = `
    .bug-atts{display:flex;flex-direction:column;gap:10px}
    .bug-att-drop{border:1px dashed var(--rule-strong);border-radius:var(--r-md);
      background:var(--parchment-2);padding:16px;text-align:center;cursor:pointer;
      font-size:13px;color:var(--ink-dim);line-height:1.6;transition:border-color .15s,background .15s}
    .bug-att-drop:hover,.bug-att-drop.over{border-color:var(--gold);background:rgba(255,171,0,.07)}
    .bug-att-drop.busy{cursor:progress;color:var(--gold-bright)}
    .bug-att-drop b{color:var(--ink)}
    .bug-att-err{border:1px solid var(--pyrth);background:rgba(180,69,57,.12);color:var(--ink);
      padding:8px 12px;border-radius:var(--r-sm);font-size:12.5px;line-height:1.5}
    .bug-att-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
    .bug-att{border:1px solid var(--rule);border-radius:var(--r-sm);overflow:hidden;
      background:var(--parchment-3);display:flex;flex-direction:column}
    .bug-att img,.bug-att video{width:100%;height:110px;object-fit:cover;display:block;background:#000}
    .bug-att-missing{height:110px;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:3px;color:var(--ink-faint);font-size:12px;text-align:center;padding:6px}
    .bug-att-missing small{font-size:10px;color:var(--pyrth);line-height:1.3;word-break:break-word}
    .bug-att-foot{display:flex;align-items:center;gap:6px;padding:5px 8px;font-size:11px;color:var(--ink-faint)}
    .bug-att-foot span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bug-att-x{margin-left:auto;background:none;border:none;color:var(--ink-faint);cursor:pointer;
      font-size:15px;line-height:1;padding:0 2px}
    .bug-att-x:hover{color:var(--pyrth)}
    .bug-att-none{font-size:13px;color:var(--ink-faint)}
  `;
  if (!document.getElementById('bug-attachments-style')) {
    const el = document.createElement('style');
    el.id = 'bug-attachments-style';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
