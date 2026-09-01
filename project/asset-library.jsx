/* ============================================================================
   ASSET LIBRARY — image upload and reuse
   One place to put every picture the world needs: character portraits, map
   scans, banners, reference art. Multi-file drop, tagging, search, and a
   storage read-out so it is obvious when the browser quota is getting close.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useMemo, useCallback } = React;
  const UI = () => window.WorldOSUI;

  const CATEGORIES = ['Portrait', 'Landscape', 'Map', 'Banner', 'Item', 'Symbol', 'Reference', 'Other'];

  function AssetLibrary() {
    const [assets, setAssets] = window.useEntities('assets');
    const [q, setQ] = useState('');
    const [cat, setCat] = useState('All');
    const [sel, setSel] = useState(null);
    const [busy, setBusy] = useState(false);
    const [over, setOver] = useState(false);
    const [urlOpen, setUrlOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [urlErr, setUrlErr] = useState('');
    const U = UI();

    const live = useMemo(() => (assets || []).filter(a => a && !a._deleted), [assets]);

    const shown = live.filter(a => {
      if (cat !== 'All' && a.category !== cat) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return (a.name || '').toLowerCase().includes(s)
          || (a.tags || []).some(t => t.toLowerCase().includes(s));
    });

    // only images still held inline count against the browser/JSON budget —
    // stored and linked ones cost nothing there
    const totalBytes = live.reduce((n, a) => {
      const im = a.image;
      if (!im || im.stored || im.remote) return n;
      return n + (im.bytes || 0);
    }, 0);
    const linkedCount = live.filter(a => a.image && a.image.remote).length;
    const storedCount = live.filter(a => a.image && a.image.stored).length;

    const ingest = useCallback(async (files) => {
      if (!files || !files.length) return;
      setBusy(true);
      const made = [];
      for (const f of files) {
        try {
          const image = await window.WorldOS.storeImage(await window.WorldOS.processImage(f, 'art'), 'library');
          made.push({
            id: window.makeId ? window.makeId() : 'asset_' + Date.now() + '_' + made.length,
            name: (f.name || 'image').replace(/\.[^.]+$/, ''),
            category: 'Other', tags: [], notes: '', links: [],
            image, addedAt: new Date().toISOString(),
          });
        } catch (e) { console.warn('[assets] skipped', f.name, e.message); }
      }
      if (made.length) setAssets((assets || []).concat(made));
      setBusy(false);
    }, [assets, setAssets]);

    const browse = async () => {
      setBusy(true);
      const picked = await window.WorldOS.pickImages({ preset: 'art', multiple: true });
      const imgs = [];
      for (const p of picked) imgs.push(await window.WorldOS.storeImage(p, 'library'));
      if (imgs.length) {
        setAssets((assets || []).concat(imgs.map((image, i) => ({
          id: window.makeId ? window.makeId() : 'asset_' + Date.now() + '_' + i,
          name: (image.name || 'image').replace(/\.[^.]+$/, ''),
          category: 'Other', tags: [], notes: '', links: [],
          image, addedAt: new Date().toISOString(),
        }))));
      }
      setBusy(false);
    };

    const addByUrl = async () => {
      if (!url.trim()) return;
      setBusy(true); setUrlErr('');
      try {
        const image = await window.WorldOS.storeImage(await window.WorldOS.processUrl(url, 'art'), 'library');
        setAssets((assets || []).concat({
          id: window.makeId ? window.makeId() : 'asset_' + Date.now(),
          name: image.name || 'linked image',
          category: 'Other', tags: [], notes: '', links: [],
          image, addedAt: new Date().toISOString(),
        }));
        setUrl(''); setUrlOpen(false);
      } catch (e) {
        setUrlErr(e.message || 'Could not load that URL');
      } finally { setBusy(false); }
    };

    const update = (id, patch) => setAssets((assets || []).map(a => a.id === id ? { ...a, ...patch } : a));
    const remove = (id) => {
      const victim = live.find(a => a.id === id);
      if (victim) window.WorldOS.removeStoredImage(victim.image);   // no-op unless it was stored
      setAssets((assets || []).map(a => a.id === id ? { ...a, _deleted: true } : a));
      setSel(null);
    };

    const current = live.find(a => a.id === sel) || null;

    return (
      <div className="page"
           onDragOver={(e) => { e.preventDefault(); setOver(true); }}
           onDragLeave={() => setOver(false)}
           onDrop={(e) => { e.preventDefault(); setOver(false); ingest(Array.from(e.dataTransfer.files || [])); }}>
        <div className="page-head">
          <div>
            <h1 className="page-title">Asset Library</h1>
            <div className="page-sub">
              {live.length} image{live.length === 1 ? '' : 's'}{storedCount > 0 ? ` · ${storedCount} in the cloud` : ''}{linkedCount > 0 ? ` · ${linkedCount} linked` : ''}{totalBytes > 0 ? ` · ${window.WorldOS.prettyBytes(totalBytes)} inline` : ''}
            </div>
          </div>
          <div className="page-actions">
            <button className="btn" onClick={() => setUrlOpen(true)}>+ Link a URL</button>
            <button className="btn btn-gold" onClick={browse} disabled={busy}>
              {busy ? 'Processing…' : '+ Upload images'}
            </button>
          </div>
        </div>

        <div className="asset-bar">
          <input className="field-input" placeholder="Search by name or tag…"
            value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }}/>
          <div className="chip-row">
            {['All'].concat(CATEGORIES).map(c => (
              <span key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</span>
            ))}
          </div>
        </div>

        {totalBytes > 3.5 * 1024 * 1024 && (
          <div className="asset-warn">
            {window.WorldOS.prettyBytes(totalBytes)} of images are still held inline rather than in
            cloud storage, and that counts against a cap near 5 MB. These were added before storage
            was available, or while it was unreachable — re-upload them to move them across.
          </div>
        )}

        {live.length === 0 ? (
          <U.EmptyState
            title="No images yet"
            body="Drop files anywhere on this page, or use Upload. Everything is resized and re-encoded automatically so the world stays small enough to sync."
            action={<button className="btn btn-gold" onClick={browse}>Upload images</button>}/>
        ) : (
          <div className="asset-grid">
            {shown.map(a => (
              <div key={a.id} className={`asset-tile ${sel === a.id ? 'sel' : ''}`} onClick={() => setSel(a.id)}>
                <img src={window.WorldOS.imageSrc(a.image)} alt={a.name} loading="lazy"/>
                <div className="asset-tile-name">{a.name}</div>
              </div>
            ))}
            {shown.length === 0 && <div className="wos-dim" style={{ padding: 20 }}>Nothing matches that search.</div>}
          </div>
        )}

        {over && <div className="asset-dropveil">Drop to add to the library</div>}

        <U.Modal open={urlOpen} title="Link an image by URL" onClose={() => { setUrlOpen(false); setUrlErr(''); }}>
          <U.Field label="Image URL">
            <U.Text value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/portrait.jpg"
              onKeyDown={e => { if (e.key === 'Enter') addByUrl(); }}/>
          </U.Field>
          <div className="wos-dim" style={{ fontSize: 12, lineHeight: 1.6 }}>
            The image is fetched and compressed like an upload where the host allows it.
            Where it does not, it stays a live link — that uses no storage, but it breaks
            if the original ever moves.
          </div>
          {urlErr && <div className="wos-err">{urlErr}</div>}
          <div className="wos-modal-actions">
            <button className="btn btn-gold" onClick={addByUrl} disabled={!url.trim() || busy}>
              {busy ? 'Loading…' : 'Add image'}
            </button>
          </div>
        </U.Modal>

        <U.Modal open={!!current} title={current ? current.name : ''} onClose={() => setSel(null)} wide>
          {current && (
            <div className="asset-detail">
              <div className="asset-detail-img"><img src={window.WorldOS.imageSrc(current.image)} alt={current.name}/></div>
              <div className="asset-detail-form">
                <U.Field label="Name">
                  <U.Text value={current.name} onChange={e => update(current.id, { name: e.target.value })}/>
                </U.Field>
                <U.Field label="Category">
                  <U.Select value={current.category} onChange={e => update(current.id, { category: e.target.value })}
                    options={CATEGORIES}/>
                </U.Field>
                <U.Field label="Tags">
                  <U.TagInput value={current.tags || []} onChange={v => update(current.id, { tags: v })}/>
                </U.Field>
                <U.Field label="Used for">
                  <U.EntityLink value={current.links || []} onChange={v => update(current.id, { links: v })}/>
                </U.Field>
                <U.Field label="Notes">
                  <U.Area value={current.notes || ''} onChange={e => update(current.id, { notes: e.target.value })}/>
                </U.Field>
                <div className="asset-detail-meta wos-dim">
                  {current.image.width}×{current.image.height} · {current.image.remote
                    ? <span className="wos-remote-tag">linked — no storage used</span>
                    : window.WorldOS.prettyBytes(current.image.bytes)}
                  {!current.image.remote && current.image.naturalWidth > current.image.width &&
                    <> · resized from {current.image.naturalWidth}×{current.image.naturalHeight}</>}
                  {current.image.remote && <div style={{marginTop:4,wordBreak:'break-all'}}>{current.image.url}</div>}
                </div>
                <button className="btn btn-ghost" onClick={() => remove(current.id)}>Delete image</button>
              </div>
            </div>
          )}
        </U.Modal>
      </div>
    );
  }

  window.AssetLibrary = AssetLibrary;

  window.registerWorldOS({
    id: 'assetLibrary',
    nav: { section: 'World OS', item: { id: 'assets', label: 'Asset Library', icon: 'flask', badge: null } },
    routes: { assets: () => <AssetLibrary/> },
    collections: [['assets', 'WORLD_ASSETS']],
    styles: `
      .asset-bar{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
      .asset-bar .chip.on{border-color:var(--gold-deep);color:var(--gold-bright);background:rgba(255,171,0,.10)}
      .asset-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
      .asset-tile{border:1px solid var(--rule);border-radius:var(--r-md);overflow:hidden;background:var(--parchment-2);cursor:pointer;transition:border-color .15s,transform .15s}
      .asset-tile:hover{border-color:var(--gold-deep);transform:translateY(-2px)}
      .asset-tile.sel{border-color:var(--gold)}
      .asset-tile img{width:100%;height:120px;object-fit:cover;display:block}
      .asset-tile-name{padding:7px 9px;font-size:12px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .asset-warn{border:1px solid var(--ember);background:rgba(171,118,62,.10);color:var(--ink);padding:10px 14px;border-radius:var(--r-md);margin-bottom:16px;font-size:13px}
      .asset-dropveil{position:fixed;inset:0;background:rgba(9,9,10,.78);border:2px dashed var(--gold);display:grid;place-items:center;color:var(--gold-bright);font-family:var(--display);font-size:24px;letter-spacing:.1em;z-index:900;pointer-events:none}
      .asset-detail{display:grid;grid-template-columns:1.2fr 1fr;gap:20px}
      .asset-detail-img{background:var(--parchment-3);border:1px solid var(--rule);border-radius:var(--r-md);display:grid;place-items:center;overflow:hidden;max-height:60vh}
      .asset-detail-img img{max-width:100%;max-height:60vh;object-fit:contain}
      .asset-detail-meta{font-size:12px;margin:8px 0 12px}
      @media (max-width:900px){.asset-detail{grid-template-columns:1fr}}
    `,
  });
})();
