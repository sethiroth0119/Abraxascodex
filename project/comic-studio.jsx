/* ============================================================================
   COMIC STUDIO — turn the world's images into pages
   Panels, lettering, cast, and a PNG you can hand to a printer.

   One decision shapes the whole file: the editor IS a canvas, drawn by the
   same renderPage() the export uses, just at a different scale. A DOM preview
   next to a canvas exporter always drifts — a font falls back, a shadow lands
   differently — and you only find out after downloading. Here what you see is
   literally the thing that gets saved.

   Cast members come from the Power Codex, so a panel knows which form someone
   is in and what that form can do. Backgrounds come from the Asset Library,
   an upload, or a URL.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useRef, useEffect, useMemo, useCallback } = React;
  const UI = () => window.WorldOSUI;

  /* Page is 1200x1800 (2:3, standard comic proportion). Everything is stored
     in these page coordinates and scaled at draw time. */
  const PAGE_W = 1200, PAGE_H = 1800;

  const LAYOUTS = [
    { id: 'splash',  name: 'Splash',        rects: [[0,0,1,1]] },
    { id: 'two',     name: 'Two stacked',   rects: [[0,0,1,.5],[0,.5,1,.5]] },
    { id: 'three',   name: 'Three rows',    rects: [[0,0,1,1/3],[0,1/3,1,1/3],[0,2/3,1,1/3]] },
    { id: 'quad',    name: 'Four square',   rects: [[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]] },
    { id: 'hero',    name: 'Hero + two',    rects: [[0,0,1,.55],[0,.55,.5,.45],[.5,.55,.5,.45]] },
    { id: 'twoTop',  name: 'Two + wide',    rects: [[0,0,.5,.42],[.5,0,.5,.42],[0,.42,1,.58]] },
    { id: 'sixgrid', name: 'Six panel',     rects: [[0,0,.5,1/3],[.5,0,.5,1/3],[0,1/3,.5,1/3],[.5,1/3,.5,1/3],[0,2/3,.5,1/3],[.5,2/3,.5,1/3]] },
  ];

  const BALLOON_KINDS = [
    { id: 'speech',    name: 'Speech',    tail: true },
    { id: 'thought',   name: 'Thought',   tail: true },
    { id: 'shout',     name: 'Shout',     tail: true },
    { id: 'whisper',   name: 'Whisper',   tail: true },
    { id: 'radio',     name: 'Radio / comms', tail: true },
    { id: 'caption',   name: 'Caption box',   tail: false },
    { id: 'sfx',       name: 'Sound effect',  tail: false },
  ];
  const kindDef = (id) => BALLOON_KINDS.find(k => k.id === id) || BALLOON_KINDS[0];

  /* Caption looks. A narration box is not one thing — a yellow corner box and
     a full-width black bar do different jobs on the page. */
  const CAPTION_STYLES = [
    { id: 'classic', name: 'Classic yellow', fill: '#f6e27a', text: '#14110c', border: '#14110c' },
    { id: 'white',   name: 'White box',      fill: '#fdfbf5', text: '#14110c', border: '#14110c' },
    { id: 'bar',     name: 'Black bar',      fill: '#0d0d0f', text: '#f6f2e8', border: '#0d0d0f' },
    { id: 'parch',   name: 'Parchment',      fill: '#e8dcc0', text: '#2a2013', border: '#6b5a38' },
    { id: 'blue',    name: 'Cold blue',      fill: '#cfe0ea', text: '#0f1c26', border: '#12303f' },
  ];
  const capStyle = (id) => CAPTION_STYLES.find(c => c.id === id) || CAPTION_STYLES[0];

  /* Ready-made narration openers, so a caption is one click rather than a
     blank box you have to think of something for. */
  const CAPTION_PRESETS = [
    { group: 'Time', items: ['Early that day…', 'Later…', 'Moments later…', 'That night…',
        'The next morning…', 'Three days later…', 'Years ago…', 'At dawn…', 'By nightfall…', 'Long before any of this…'] },
    { group: 'Place', items: ['Elsewhere…', 'Meanwhile…', 'Back at the gate…', 'Far to the north…',
        'Somewhere beneath the city…', 'On the other side…'] },
    { group: 'Beat', items: ['And then —', 'Nothing happened.', 'For a moment, no one moved.',
        'It did not stop.', 'Everything changed.', 'No one spoke.'] },
  ];

  /* ── image cache: canvas needs decoded bitmaps, not <img> elements ──── */
  const imgCache = new Map();
  function loadBitmap(src) {
    if (!src) return Promise.resolve(null);
    if (imgCache.has(src)) return imgCache.get(src);
    const p = new Promise((resolve) => {
      const im = new Image();
      // Supabase storage and most CDNs send permissive CORS; asking for it is
      // what keeps the canvas untainted so export can work at all.
      im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = () => {
        // retry without CORS so it at least displays; export will flag it
        const alt = new Image();
        alt.onload = () => { alt.__tainted = true; resolve(alt); };
        alt.onerror = () => resolve(null);
        alt.src = src;
      };
      im.src = src;
    });
    imgCache.set(src, p);
    return p;
  }

  /* ── text ───────────────────────────────────────────────────────────── */
  function wrapText(ctx, text, maxWidth) {
    const out = [];
    for (const para of String(text || '').split('\n')) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); continue; }
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const test = line + ' ' + words[i];
        if (ctx.measureText(test).width > maxWidth) { out.push(line); line = words[i]; }
        else line = test;
      }
      out.push(line);
    }
    return out;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* A thought balloon is a ring of overlapping lobes, not a polygon — drawing
     it with straight segments reads as a crystal, which is not the idea. */
  function cloudPath(ctx, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2;
    const rx = w / 2, ry = h / 2;
    const lobes = Math.max(9, Math.round(w / 34));
    ctx.beginPath();
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2;
      // ride an ellipse slightly inside the box so lobes stay in bounds
      const lx = cx + Math.cos(a) * (rx * 0.80);
      const ly = cy + Math.sin(a) * (ry * 0.74);
      const r = Math.min(rx, ry) * 0.42 + (i % 2 ? 2 : 6);
      ctx.moveTo(lx + r, ly);
      ctx.arc(lx, ly, r, 0, Math.PI * 2);
    }
    // a solid core so the lobes read as one mass rather than a chain
    ctx.moveTo(cx + rx * 0.86, cy);
    ctx.ellipse(cx, cy, rx * 0.86, ry * 0.74, 0, 0, Math.PI * 2);
  }

  function spikyPath(ctx, x, y, w, h) {
    ctx.beginPath();
    const steps = 20, cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
      const sp = i % 2 === 0 ? 1 : 0.72;
      const px = cx + Math.cos(a) * rx * sp;
      const py = cy + Math.sin(a) * ry * sp;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /* Legacy balloons stored a compass direction ('bl','bc'…) relative to the
     bubble. New ones store the tip against the PANEL instead, which is the
     behaviour you actually want: a speaker does not move when you reposition
     their balloon, so the tail should stay pointing at them.
     Returns absolute page coordinates, or null for no tail. */
  const LEGACY_TAIL = { bl:[0.15,1.55], bc:[0.5,1.7], br:[0.85,1.55], tl:[0.15,-0.7], tr:[0.85,-0.7] };
  function tailTipAbs(b, x, y, w, h, geo) {
    if (b.tailPt === null) return null;
    if (b.tailPt && typeof b.tailPt.x === 'number' && geo) {
      return { x: geo.px + b.tailPt.x * geo.pw, y: geo.py + b.tailPt.y * geo.ph };
    }
    if (typeof b.tail === 'string') {
      if (b.tail === 'none') return null;
      const t = LEGACY_TAIL[b.tail] || LEGACY_TAIL.bc;
      return { x: x + t[0] * w, y: y + t[1] * h };
    }
    if (b.tail === null) return null;
    return { x: x + 0.5 * w, y: y + 1.7 * h };     // default: just below
  }

  /* Where a ray from the balloon centre toward the tip leaves the box. Gives
     the tail a believable root on any shape without per-shape maths. */
  function edgePoint(cx, cy, hw, hh, tx, ty) {
    const dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy + hh };
    const sx = dx === 0 ? Infinity : hw / Math.abs(dx);
    const sy = dy === 0 ? Infinity : hh / Math.abs(dy);
    const t = Math.min(sx, sy);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  /* ── the single render path, used for preview and for export ────────── */
  async function renderPage(canvas, page, opts) {
    const o = opts || {};
    const scale = o.scale || 1;
    const selection = o.selection || null;
    const ctx = canvas.getContext('2d');
    canvas.width = PAGE_W * scale;
    canvas.height = PAGE_H * scale;
    ctx.save();
    ctx.scale(scale, scale);

    let tainted = false;
    const gutter = page.gutter == null ? 18 : page.gutter;
    const margin = page.margin == null ? 36 : page.margin;

    // page ground
    ctx.fillStyle = page.paper || '#ffffff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    const panels = page.panels || [];
    for (const p of panels) {
      const px = margin + p.x * (PAGE_W - margin * 2) + gutter / 2;
      const py = margin + p.y * (PAGE_H - margin * 2) + gutter / 2;
      const pw = p.w * (PAGE_W - margin * 2) - gutter;
      const ph = p.h * (PAGE_H - margin * 2) - gutter;

      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();

      ctx.fillStyle = p.bg || '#111318';
      ctx.fillRect(px, py, pw, ph);

      const src = window.WorldOS.imageSrc(p.image);
      if (src) {
        const bmp = await loadBitmap(src);
        if (bmp) {
          if (bmp.__tainted) tainted = true;
          // cover fit, honouring the focal point so faces don't get cropped out
          const ir = bmp.width / bmp.height, pr = pw / ph;
          let dw, dh;
          if (ir > pr) { dh = ph; dw = ph * ir; } else { dw = pw; dh = pw / ir; }
          const zoom = p.zoom || 1;
          dw *= zoom; dh *= zoom;
          const fx = p.focusX == null ? 0.5 : p.focusX;
          const fy = p.focusY == null ? 0.5 : p.focusY;
          ctx.drawImage(bmp, px + (pw - dw) * fx, py + (ph - dh) * fy, dw, dh);
        }
      }

      // caption box
      if (p.caption) {
        ctx.font = '600 26px Lato, sans-serif';
        const inset = 16, boxW = Math.min(pw - inset * 2, 520);
        const lines = wrapText(ctx, p.caption, boxW - 28);
        const boxH = lines.length * 32 + 22;
        ctx.fillStyle = 'rgba(252,248,238,.96)';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.fillRect(px + inset, py + inset, boxW, boxH);
        ctx.strokeRect(px + inset, py + inset, boxW, boxH);
        ctx.fillStyle = '#14110c';
        lines.forEach((ln, i) => ctx.fillText(ln, px + inset + 14, py + inset + 34 + i * 32));
      }

      ctx.restore();

      // panel border
      ctx.strokeStyle = page.inkColor || '#000000';
      ctx.lineWidth = page.borderWidth == null ? 6 : page.borderWidth;
      ctx.strokeRect(px, py, pw, ph);

      if (selection && selection.type === 'panel' && selection.id === p.id) {
        ctx.strokeStyle = '#ffab00';
        ctx.lineWidth = 5;
        ctx.setLineDash([14, 10]);
        ctx.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
        ctx.setLineDash([]);
      }

      // lettering
      for (const b of (p.balloons || [])) {
        const bx = px + (b.x || 0.1) * pw;
        const by = py + (b.y || 0.1) * ph;
        const bw = (b.w || 0.4) * pw;
        drawBalloon(ctx, b, bx, by, bw, { pw, ph, px, py }, selection);
      }
    }

    ctx.restore();
    return { tainted };
  }

  function drawBalloon(ctx, b, x, y, w, geo, selection) {
    const kind = b.kind || 'speech';
    const def = kindDef(kind);
    const isSfx = kind === 'sfx';
    const isCap = kind === 'caption';
    const fontSize = b.size || (isSfx ? 72 : kind === 'shout' ? 34 : 28);

    ctx.font = isSfx
      ? `700 ${fontSize}px Bangers, Impact, sans-serif`
      : `${kind === 'shout' ? 700 : 400} ${fontSize}px "Comic Neue", Lato, sans-serif`;

    if (isSfx) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(((b.rotate || -8) * Math.PI) / 180);
      if (b.flipX) ctx.scale(-1, 1);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 10;
      ctx.strokeText(b.text || '', 0, 0);
      ctx.fillStyle = b.color || '#ffcc34';
      ctx.fillText(b.text || '', 0, 0);
      ctx.restore();
      return;
    }

    const pad = 20;
    const lines = wrapText(ctx, b.text, w - pad * 2);
    const lh = fontSize * 1.28;
    const h = lines.length * lh + pad * 2 - (lh - fontSize) / 2;

    const cs = isCap ? capStyle(b.capStyle) : null;
    const cx = x + w / 2, cy = y + h / 2;

    // tail tip in absolute page coords
    const tp = def.tail ? tailTipAbs(b, x, y, w, h, geo) : null;
    const tipX = tp ? tp.x : 0;
    const tipY = tp ? tp.y : 0;

    ctx.save();

    // mirror the shape when asked, so an asymmetric bubble can sit either side
    if (b.flipX || b.flipY) {
      ctx.translate(cx, cy);
      ctx.scale(b.flipX ? -1 : 1, b.flipY ? -1 : 1);
      ctx.translate(-cx, -cy);
    }

    ctx.fillStyle = isCap ? cs.fill : '#ffffff';
    ctx.strokeStyle = isCap ? cs.border : '#000';
    ctx.lineWidth = kind === 'whisper' ? 2 : 4;
    if (kind === 'whisper') ctx.setLineDash([9, 7]);
    if (kind === 'radio') ctx.setLineDash([2, 0]);

    if (kind === 'thought') cloudPath(ctx, x, y, w, h);
    else if (kind === 'shout') spikyPath(ctx, x, y, w, h);
    else if (kind === 'radio') { ctx.beginPath(); ctx.rect(x, y, w, h); }
    else if (isCap) { ctx.beginPath(); ctx.rect(x, y, w, h); }
    else roundRect(ctx, x, y, w, h, 22);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    /* ── tail: drawn toward wherever the tip has been dragged ──────────── */
    if (tp) {
      const root = edgePoint(cx, cy, w / 2, h / 2, tipX, tipY);
      const ang = Math.atan2(tipY - cy, tipX - cx);
      const px2 = Math.cos(ang + Math.PI / 2), py2 = Math.sin(ang + Math.PI / 2);
      const baseHalf = Math.max(12, Math.min(30, w * 0.09));

      ctx.save();
      if (kind === 'thought') {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        [0.42, 0.72, 0.95].forEach((t, i) => {
          const r = 14 - i * 4;
          ctx.beginPath();
          ctx.arc(root.x + (tipX - root.x) * t, root.y + (tipY - root.y) * t, r, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        });
      } else if (kind === 'radio') {
        // a jagged bolt rather than a smooth spike
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath();
        ctx.moveTo(root.x, root.y);
        const segs = 4;
        for (let i = 1; i <= segs; i++) {
          const t = i / segs;
          const jx = (i % 2 ? 1 : -1) * 12 * (1 - t);
          ctx.lineTo(root.x + (tipX - root.x) * t + px2 * jx,
                     root.y + (tipY - root.y) * t + py2 * jx);
        }
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(root.x + px2 * baseHalf, root.y + py2 * baseHalf);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(root.x - px2 * baseHalf, root.y - py2 * baseHalf);
        ctx.closePath();
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = kind === 'whisper' ? 2 : 4;
        if (kind === 'whisper') ctx.setLineDash([9, 7]);
        // stroke only the two outer edges so the join with the body stays open
        ctx.beginPath();
        ctx.moveTo(root.x + px2 * baseHalf, root.y + py2 * baseHalf);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(root.x - px2 * baseHalf, root.y - py2 * baseHalf);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // text
    ctx.save();
    ctx.fillStyle = isCap ? cs.text : '#14110c';
    ctx.textAlign = b.align || 'center';
    const tx = b.align === 'left' ? x + pad : b.align === 'right' ? x + w - pad : x + w / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, tx, y + pad + fontSize * 0.9 + i * lh));
    ctx.restore();

    // who is speaking — editor aid, not drawn on export
    if (b.speakerName && selection) {
      ctx.save();
      ctx.font = '600 15px Lato, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.textAlign = 'left';
      ctx.fillText(b.speakerName, x + 4, y - 8);
      ctx.restore();
    }

    if (selection && selection.type === 'balloon' && selection.id === b.id) {
      ctx.save();
      ctx.strokeStyle = '#ffab00';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
      ctx.setLineDash([]);
      // draggable tail handle
      if (tp) {
        ctx.beginPath();
        ctx.arc(tipX, tipY, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#ffab00';
        ctx.fill();
        ctx.strokeStyle = '#0d0d0f';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* Where the tail handle sits, in page coords — shared with hit-testing so
     the grab area is exactly what is drawn. */
  function tailHandleAt(ctx, page, panel, b) {
    const def = kindDef(b.kind || 'speech');
    if (!def.tail) return null;
    const pr = panelRect(page, panel);
    const x = pr.x + (b.x || .1) * pr.w;
    const y = pr.y + (b.y || .1) * pr.h;
    const w = (b.w || .4) * pr.w;
    const h = balloonHeight(ctx, b, w);
    const tp = tailTipAbs(b, x, y, w, h, { px: pr.x, py: pr.y, pw: pr.w, ph: pr.h });
    if (!tp) return null;
    return { x: tp.x, y: tp.y, w, h, bx: x, by: y };
  }

  /* Height has to be measured the same way the renderer does it, or the
     handle drifts from the drawn tail. */
  function balloonHeight(ctx, b, w) {
    const kind = b.kind || 'speech';
    if (kind === 'sfx') return 90;
    const fontSize = b.size || (kind === 'shout' ? 34 : 28);
    ctx.save();
    ctx.font = `${kind === 'shout' ? 700 : 400} ${fontSize}px "Comic Neue", Lato, sans-serif`;
    const lines = wrapText(ctx, b.text, w - 40);
    ctx.restore();
    const lh = fontSize * 1.28;
    return lines.length * lh + 40 - (lh - fontSize) / 2;
  }

  /* ── page geometry helpers shared by hit-testing ─────────────────────── */
  function panelRect(page, p) {
    const gutter = page.gutter == null ? 18 : page.gutter;
    const margin = page.margin == null ? 36 : page.margin;
    return {
      x: margin + p.x * (PAGE_W - margin * 2) + gutter / 2,
      y: margin + p.y * (PAGE_H - margin * 2) + gutter / 2,
      w: p.w * (PAGE_W - margin * 2) - gutter,
      h: p.h * (PAGE_H - margin * 2) - gutter,
    };
  }

  window.ComicStudioInternals = { PAGE_W, PAGE_H, LAYOUTS, renderPage, panelRect, wrapText };

  /* ══════════════════════════════════════════════════════════════════════
     PAGE COMPONENT
     ══════════════════════════════════════════════════════════════════ */
  function ComicStudio() {
    const [comics, setComics] = window.useEntities('comics');
    const [pages, setPages] = window.useEntities('comicPages');
    const [openId, setOpenId] = useState(null);
    const [newOpen, setNewOpen] = useState(false);
    const U = UI();

    const live = useMemo(() => (comics || []).filter(c => c && !c._deleted), [comics]);
    const open = live.find(c => c.id === openId) || null;

    if (open) return <ComicEditor comic={open} comics={comics} setComics={setComics}
      pages={pages} setPages={setPages} onBack={() => setOpenId(null)}/>;

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Comic Studio</h1>
            <div className="page-sub">{live.length} book{live.length === 1 ? '' : 's'}</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-gold" onClick={() => setNewOpen(true)}>+ New comic</button>
          </div>
        </div>

        {live.length === 0 ? (
          <U.EmptyState
            title="No comics yet"
            body="Lay out panels, drop in art from the Asset Library, letter it, and download the finished page as a PNG. Cast members come from the Power Codex, so a panel knows which form a character is in."
            action={<button className="btn btn-gold" onClick={() => setNewOpen(true)}>Start a comic</button>}/>
        ) : (
          <div className="wb-grid">
            {live.map(c => {
              const n = (pages || []).filter(p => p.comicId === c.id && !p._deleted).length;
              return (
                <div key={c.id} className="quest-card" onClick={() => setOpenId(c.id)}>
                  <div className="quest-status" style={{ color: 'var(--gold)' }}>{c.issue || 'Issue —'}</div>
                  <div className="quest-title">{c.title}</div>
                  {c.synopsis && <div className="quest-hook">{c.synopsis}</div>}
                  <div className="quest-meta"><span>{n} page{n === 1 ? '' : 's'}</span></div>
                </div>
              );
            })}
          </div>
        )}

        <U.Modal open={newOpen} title="New comic" onClose={() => setNewOpen(false)}>
          <NewComicForm onCreate={(c, firstPage) => {
            setComics((comics || []).concat(c));
            setPages((pages || []).concat(firstPage));
            setNewOpen(false); setOpenId(c.id);
          }}/>
        </U.Modal>
      </div>
    );
  }

  function NewComicForm({ onCreate }) {
    const [title, setTitle] = useState('');
    const [issue, setIssue] = useState('Issue 1');
    const [synopsis, setSynopsis] = useState('');
    const [layout, setLayout] = useState('quad');
    const U = UI();
    const make = () => {
      const id = window.makeId ? window.makeId() : 'cb_' + Date.now();
      const lay = LAYOUTS.find(l => l.id === layout) || LAYOUTS[0];
      onCreate(
        { id, title: title.trim(), issue, synopsis, links: [], createdAt: new Date().toISOString() },
        {
          id: (window.makeId ? window.makeId() : 'cp_' + Date.now()),
          comicId: id, order: 0, paper: '#f4efe4', inkColor: '#000000',
          gutter: 18, margin: 36, borderWidth: 6, cast: [],
          panels: lay.rects.map((r, i) => ({
            id: 'pn_' + i + '_' + Math.random().toString(36).slice(2, 7),
            x: r[0], y: r[1], w: r[2], h: r[3],
            image: null, focusX: .5, focusY: .5, zoom: 1, caption: '', balloons: [],
          })),
        });
    };
    return (
      <>
        <U.Field label="Title"><U.Text value={title} onChange={e => setTitle(e.target.value)} placeholder="The Ninth Gate"/></U.Field>
        <div className="field-row">
          <U.Field label="Issue"><U.Text value={issue} onChange={e => setIssue(e.target.value)}/></U.Field>
          <U.Field label="First page layout">
            <U.Select value={layout} onChange={e => setLayout(e.target.value)}
              options={LAYOUTS.map(l => ({ value: l.id, label: l.name }))}/>
          </U.Field>
        </div>
        <U.Field label="Synopsis"><U.Area value={synopsis} onChange={e => setSynopsis(e.target.value)}/></U.Field>
        <div className="wos-modal-actions">
          <button className="btn btn-gold" disabled={!title.trim()} onClick={make}>Create comic</button>
        </div>
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  function ComicEditor({ comic, comics, setComics, pages, setPages, onBack }) {
    const U = UI();
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const [pageIdx, setPageIdx] = useState(0);
    const [sel, setSel] = useState(null);            // {type:'panel'|'balloon', id, panelId}
    const [scale, setScale] = useState(0.42);
    const [exporting, setExporting] = useState(false);
    const [notice, setNotice] = useState('');
    const drag = useRef(null);

    const myPages = useMemo(() =>
      (pages || []).filter(p => p.comicId === comic.id && !p._deleted)
                   .sort((a, b) => (a.order || 0) - (b.order || 0)),
      [pages, comic.id]);

    const page = myPages[Math.min(pageIdx, myPages.length - 1)] || null;

    const setPage = useCallback((patch) => {
      if (!page) return;
      setPages((pages || []).map(p => p.id === page.id ? { ...p, ...patch } : p));
    }, [page, pages, setPages]);

    const setPanel = useCallback((panelId, patch) => {
      if (!page) return;
      setPage({ panels: (page.panels || []).map(p => p.id === panelId ? { ...p, ...patch } : p) });
    }, [page, setPage]);

    /* draw whenever anything changes */
    useEffect(() => {
      if (!page || !canvasRef.current) return;
      let cancelled = false;
      (async () => {
        // comic lettering needs its faces decoded before the first paint
        try { await document.fonts.ready; } catch (e) {}
        if (cancelled) return;
        await renderPage(canvasRef.current, page, { scale, selection: sel });
      })();
      return () => { cancelled = true; };
    }, [page, scale, sel]);

    /* ── hit testing in page coordinates ─────────────────────────────── */
    const toPage = (e) => {
      const r = canvasRef.current.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * PAGE_W, y: ((e.clientY - r.top) / r.height) * PAGE_H };
    };

    const hit = (pt) => {
      if (!page) return null;
      const mctx = canvasRef.current.getContext('2d');
      // the tail handle is small and sits on top of everything
      if (sel && sel.type === 'balloon') {
        const p = (page.panels || []).find(x => x.id === sel.panelId);
        const b = p && (p.balloons || []).find(x => x.id === sel.id);
        if (b) {
          const hnd = tailHandleAt(mctx, page, p, b);
          if (hnd && Math.hypot(pt.x - hnd.x, pt.y - hnd.y) < 22) {
            return { type: 'tail', id: b.id, panelId: p.id };
          }
        }
      }
      // balloons next — they sit above the art
      for (const p of (page.panels || [])) {
        const pr = panelRect(page, p);
        for (const b of (p.balloons || [])) {
          const bx = pr.x + (b.x || .1) * pr.w, by = pr.y + (b.y || .1) * pr.h;
          const bw = (b.w || .4) * pr.w;
          const bh = balloonHeight(mctx, b, bw);
          if (pt.x >= bx - 10 && pt.x <= bx + bw + 10 && pt.y >= by - 20 && pt.y <= by + bh + 10) {
            return { type: 'balloon', id: b.id, panelId: p.id };
          }
        }
      }
      for (const p of (page.panels || [])) {
        const pr = panelRect(page, p);
        if (pt.x >= pr.x && pt.x <= pr.x + pr.w && pt.y >= pr.y && pt.y <= pr.y + pr.h) {
          return { type: 'panel', id: p.id, panelId: p.id };
        }
      }
      return null;
    };

    const onDown = (e) => {
      const pt = toPage(e);
      const h = hit(pt);
      if (h && h.type === 'tail') {
        drag.current = { h };           // selection stays on the balloon
        return;
      }
      setSel(h);
      if (h && h.type === 'balloon') {
        const p = (page.panels || []).find(x => x.id === h.panelId);
        const b = (p.balloons || []).find(x => x.id === h.id);
        const pr = panelRect(page, p);
        drag.current = { h, offX: pt.x - (pr.x + (b.x || .1) * pr.w), offY: pt.y - (pr.y + (b.y || .1) * pr.h) };
      }
    };
    const onMove = (e) => {
      if (!drag.current) return;
      const pt = toPage(e);
      const { h, offX, offY } = drag.current;
      const p = (page.panels || []).find(x => x.id === h.panelId);
      if (!p) return;
      const pr = panelRect(page, p);

      if (h.type === 'tail') {
        const b = (p.balloons || []).find(x => x.id === h.id);
        if (!b) return;
        const mctx = canvasRef.current.getContext('2d');
        // stored against the panel, so the tip stays on the speaker when the
        // bubble is moved elsewhere
        setPanel(p.id, { balloons: (p.balloons || []).map(x => x.id === h.id
          ? { ...x, tailPt: { x: (pt.x - pr.x) / pr.w, y: (pt.y - pr.y) / pr.h } } : x) });
        return;
      }

      const nx = Math.max(-.05, Math.min(.95, (pt.x - offX - pr.x) / pr.w));
      const ny = Math.max(-.05, Math.min(.95, (pt.y - offY - pr.y) / pr.h));
      setPanel(p.id, { balloons: (p.balloons || []).map(b => b.id === h.id ? { ...b, x: nx, y: ny } : b) });
    };
    const onUp = () => { drag.current = null; };

    /* ── page operations ──────────────────────────────────────────────── */
    const addPage = (layoutId) => {
      const lay = LAYOUTS.find(l => l.id === layoutId) || LAYOUTS[0];
      const np = {
        id: window.makeId ? window.makeId() : 'cp_' + Date.now(),
        comicId: comic.id, order: myPages.length,
        paper: page ? page.paper : '#f4efe4', inkColor: '#000000',
        gutter: 18, margin: 36, borderWidth: 6, cast: [],
        panels: lay.rects.map((r, i) => ({
          id: 'pn_' + i + '_' + Math.random().toString(36).slice(2, 7),
          x: r[0], y: r[1], w: r[2], h: r[3],
          image: null, focusX: .5, focusY: .5, zoom: 1, caption: '', balloons: [],
        })),
      };
      setPages((pages || []).concat(np));
      setPageIdx(myPages.length);
      setSel(null);
    };

    const relayout = (layoutId) => {
      const lay = LAYOUTS.find(l => l.id === layoutId);
      if (!lay || !page) return;
      const old = page.panels || [];
      // keep art and lettering where a panel still exists in the new layout
      const next = lay.rects.map((r, i) => {
        const keep = old[i];
        return keep
          ? { ...keep, x: r[0], y: r[1], w: r[2], h: r[3] }
          : { id: 'pn_' + i + '_' + Math.random().toString(36).slice(2, 7),
              x: r[0], y: r[1], w: r[2], h: r[3],
              image: null, focusX: .5, focusY: .5, zoom: 1, caption: '', balloons: [] };
      });
      setPage({ panels: next });
      setSel(null);
    };

    const deletePage = () => {
      if (!page) return;
      setPages((pages || []).map(p => p.id === page.id ? { ...p, _deleted: true } : p));
      setPageIdx(Math.max(0, pageIdx - 1));
      setSel(null);
    };

    /* ── export ───────────────────────────────────────────────────────── */
    const download = async (mult) => {
      if (!page) return;
      setExporting(true); setNotice('');
      try {
        const off = document.createElement('canvas');
        const { tainted } = await renderPage(off, page, { scale: mult, selection: null });
        if (tainted) {
          setNotice('An image on this page is hosted somewhere that forbids copying it into a canvas, '
            + 'so it cannot be exported. Re-upload that one instead of linking it.');
          setExporting(false);
          return;
        }
        await new Promise((resolve, reject) => {
          off.toBlob((blob) => {
            if (!blob) return reject(new Error('Could not encode the page'));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (comic.title || 'page').replace(/[^\w\-]+/g, '-').toLowerCase()
              + '-p' + (pageIdx + 1) + '.png';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            resolve();
          }, 'image/png');
        });
        setNotice('Downloaded page ' + (pageIdx + 1) + ' at ' + Math.round(PAGE_W * mult) + '×' + Math.round(PAGE_H * mult) + '.');
      } catch (e) {
        setNotice(/tainted|SecurityError/i.test(String(e && e.message))
          ? 'The page could not be saved because one of its images is cross-origin. Re-upload it rather than linking it.'
          : 'Export failed: ' + (e && e.message));
      } finally { setExporting(false); }
    };

    const selPanel = sel && page ? (page.panels || []).find(p => p.id === sel.panelId) : null;
    const selBalloon = sel && sel.type === 'balloon' && selPanel
      ? (selPanel.balloons || []).find(b => b.id === sel.id) : null;

    if (!page) {
      return (
        <div className="page">
          <div className="page-head"><div><button className="btn btn-ghost" onClick={onBack}>← Comics</button>
            <h1 className="page-title" style={{ marginTop: 8 }}>{comic.title}</h1></div></div>
          <U.EmptyState title="No pages" body="This comic has no pages left."
            action={<button className="btn btn-gold" onClick={() => addPage('quad')}>Add a page</button>}/>
        </div>
      );
    }

    return (
      <div className="page cs-page">
        <div className="page-head">
          <div>
            <button className="btn btn-ghost" onClick={onBack}>← Comics</button>
            <h1 className="page-title" style={{ marginTop: 8 }}>{comic.title}</h1>
            <div className="page-sub">{comic.issue} · page {pageIdx + 1} of {myPages.length}</div>
          </div>
          <div className="page-actions">
            <button className="btn" onClick={() => setScale(s => Math.max(.2, s - .06))}>−</button>
            <button className="btn" onClick={() => setScale(.42)}>{Math.round(scale * 100)}%</button>
            <button className="btn" onClick={() => setScale(s => Math.min(.9, s + .06))}>+</button>
            <button className="btn btn-gold" disabled={exporting} onClick={() => download(2)}>
              {exporting ? 'Rendering…' : 'Download page'}
            </button>
          </div>
        </div>

        {notice && <div className="cs-notice">{notice}</div>}

        <div className="cs-layout">
          <div className="cs-stage" ref={wrapRef}>
            <canvas ref={canvasRef} className="cs-canvas"
              style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}/>
          </div>

          <aside className="cs-side">
            <div className="panel"><div className="panel-body">
              <div className="wos-side-head">Pages</div>
              <div className="cs-pagestrip">
                {myPages.map((p, i) => (
                  <button key={p.id} className={`cs-pagechip ${i === pageIdx ? 'on' : ''}`}
                    onClick={() => { setPageIdx(i); setSel(null); }}>{i + 1}</button>
                ))}
              </div>
              <div className="field-row" style={{ marginTop: 10 }}>
                <U.Field label="Add page">
                  <U.Select value="" onChange={e => e.target.value && addPage(e.target.value)}
                    options={[{ value: '', label: '— layout —' }].concat(LAYOUTS.map(l => ({ value: l.id, label: l.name })))}/>
                </U.Field>
                <U.Field label="Relayout this page">
                  <U.Select value="" onChange={e => e.target.value && relayout(e.target.value)}
                    options={[{ value: '', label: '— layout —' }].concat(LAYOUTS.map(l => ({ value: l.id, label: l.name })))}/>
                </U.Field>
              </div>
              <button className="btn btn-ghost" onClick={deletePage}>Delete page</button>
            </div></div>

            {selPanel ? (
              <PanelInspector panel={selPanel} setPanel={setPanel} page={page}
                selBalloon={selBalloon} setSel={setSel}/>
            ) : (
              <div className="panel" style={{ marginTop: 12 }}><div className="panel-body wos-dim" style={{ fontSize: 13 }}>
                Click a panel to add art and lettering. Drag a balloon to move it.
              </div></div>
            )}

            <CastPanel page={page} setPage={setPage}/>

            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <div className="wos-side-head">Page style</div>
              <div className="field-row">
                <U.Field label="Paper">
                  <input className="field-input" type="color" value={page.paper || '#f4efe4'}
                    onChange={e => setPage({ paper: e.target.value })}/>
                </U.Field>
                <U.Field label="Border width">
                  <U.Text type="number" min="0" max="20" value={page.borderWidth == null ? 6 : page.borderWidth}
                    onChange={e => setPage({ borderWidth: Number(e.target.value) })}/>
                </U.Field>
              </div>
              <div className="field-row">
                <U.Field label="Gutter">
                  <U.Text type="number" min="0" max="60" value={page.gutter == null ? 18 : page.gutter}
                    onChange={e => setPage({ gutter: Number(e.target.value) })}/>
                </U.Field>
                <U.Field label="Margin">
                  <U.Text type="number" min="0" max="120" value={page.margin == null ? 36 : page.margin}
                    onChange={e => setPage({ margin: Number(e.target.value) })}/>
                </U.Field>
              </div>
              <button className="btn" onClick={() => download(1)}>Download at 1× (screen)</button>
            </div></div>
          </aside>
        </div>
      </div>
    );
  }

  /* ── inspector ──────────────────────────────────────────────────────── */
  function PanelInspector({ panel, setPanel, page, selBalloon, setSel }) {
    const U = UI();
    const [libOpen, setLibOpen] = useState(false);
    const balloons = panel.balloons || [];

    const addBalloon = (kind) => {
      const b = {
        id: window.makeId ? window.makeId() : 'bl_' + Date.now(),
        kind,
        text: kind === 'sfx' ? 'KRAKOOM' : kind === 'caption' ? 'Early that day…' : 'New line…',
        x: .12, y: .12, w: kind === 'sfx' ? .5 : .42,
        tailPt: kindDef(kind).tail ? { x: .30, y: .40 } : null,
        capStyle: 'classic', align: 'center', flipX: false, flipY: false,
        speaker: null, speakerName: '',
      };
      setPanel(panel.id, { balloons: balloons.concat(b) });
      setSel({ type: 'balloon', id: b.id, panelId: panel.id });
    };
    const setB = (id, patch) =>
      setPanel(panel.id, { balloons: balloons.map(b => b.id === id ? { ...b, ...patch } : b) });
    const dropB = (id) => {
      setPanel(panel.id, { balloons: balloons.filter(b => b.id !== id) });
      setSel({ type: 'panel', id: panel.id, panelId: panel.id });
    };

    const cast = page.cast || [];

    return (
      <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
        <div className="wos-side-head">Panel</div>

        <U.ImageDrop value={panel.image} onChange={v => setPanel(panel.id, { image: v })}
          preset="art" height={130} folder="comics" label="Drop panel art"/>
        <button className="btn" style={{ marginTop: 6 }} onClick={() => setLibOpen(true)}>Pick from Asset Library</button>

        {panel.image && (
          <>
            <div className="field-row" style={{ marginTop: 10 }}>
              <U.Field label="Focus X">
                <input type="range" min="0" max="1" step="0.01" value={panel.focusX == null ? .5 : panel.focusX}
                  onChange={e => setPanel(panel.id, { focusX: Number(e.target.value) })}/>
              </U.Field>
              <U.Field label="Focus Y">
                <input type="range" min="0" max="1" step="0.01" value={panel.focusY == null ? .5 : panel.focusY}
                  onChange={e => setPanel(panel.id, { focusY: Number(e.target.value) })}/>
              </U.Field>
            </div>
            <U.Field label={'Zoom ' + (panel.zoom || 1).toFixed(2) + '×'}>
              <input type="range" min="1" max="3" step="0.05" value={panel.zoom || 1}
                onChange={e => setPanel(panel.id, { zoom: Number(e.target.value) })}/>
            </U.Field>
          </>
        )}

        <U.Field label="Caption">
          <U.Area value={panel.caption || ''} onChange={e => setPanel(panel.id, { caption: e.target.value })}
            placeholder="Later, beneath the Ninth Gate…" style={{ minHeight: 60 }}/>
        </U.Field>

        <div className="wos-side-head" style={{ marginTop: 12 }}>Lettering</div>
        <div className="wos-dim" style={{ fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
          Drag a bubble to move it. Select one and drag the gold dot to point its
          tail at whoever is speaking — anywhere in the panel, or off its edge.
        </div>
        <div className="chip-row" style={{ marginBottom: 8 }}>
          {BALLOON_KINDS.map(k => (
            <span key={k.id} className="chip" onClick={() => addBalloon(k.id)}>+ {k.name}</span>
          ))}
        </div>

        {balloons.map(b => (
          <div key={b.id} className={`cs-balloon-row ${selBalloon && selBalloon.id === b.id ? 'on' : ''}`}
            onClick={() => setSel({ type: 'balloon', id: b.id, panelId: panel.id })}>
            <div className="cs-balloon-head">
              <span className="wos-dim">{(BALLOON_KINDS.find(k => k.id === b.kind) || {}).name}</span>
              <button className="btn btn-ghost wos-mini" onClick={(e) => { e.stopPropagation(); dropB(b.id); }}>×</button>
            </div>
            <textarea className="field-area" value={b.text} style={{ minHeight: 52 }}
              onChange={e => setB(b.id, { text: e.target.value })}/>
            {b.kind === 'caption' && (
              <>
                <select className="field-select" value={b.capStyle || 'classic'}
                  onChange={e => setB(b.id, { capStyle: e.target.value })}>
                  {CAPTION_STYLES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="field-select" value=""
                  onChange={e => { if (e.target.value) setB(b.id, { text: e.target.value }); }}>
                  <option value="">— insert a narration line —</option>
                  {CAPTION_PRESETS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  ))}
                </select>
              </>
            )}

            {kindDef(b.kind).tail && (
              <select className="field-select" value={b.speaker ? b.speaker.profileId : ''}
                onChange={e => {
                  const c = cast.find(x => x.profileId === e.target.value);
                  setB(b.id, c
                    ? { speaker: { profileId: c.profileId }, speakerName: c.name }
                    : { speaker: null, speakerName: '' });
                }}>
                <option value="">— who is speaking —</option>
                {cast.map(c => <option key={c.profileId} value={c.profileId}>{c.name}</option>)}
              </select>
            )}

            <div className="cs-btnrow">
              <button className="btn wos-mini" onClick={(e) => { e.stopPropagation(); setB(b.id, { flipX: !b.flipX }); }}
                title="Mirror the bubble left/right">{b.flipX ? '◀▶ flipped' : '◀▶ flip H'}</button>
              <button className="btn wos-mini" onClick={(e) => { e.stopPropagation(); setB(b.id, { flipY: !b.flipY }); }}
                title="Mirror the bubble up/down">{b.flipY ? '▲▼ flipped' : '▲▼ flip V'}</button>
              {kindDef(b.kind).tail && (
                <>
                  <button className="btn wos-mini" onClick={(e) => { e.stopPropagation();
                    setB(b.id, { tailPt: { x: (b.x || .1) + (b.w || .4) / 2, y: (b.y || .1) + .18 } }); }}
                    title="Put the tail just below the bubble">
                    reset tail
                  </button>
                  <button className="btn wos-mini" onClick={(e) => { e.stopPropagation();
                    setB(b.id, { tailPt: null, tail: null }); }} title="Remove the tail">no tail</button>
                </>
              )}
              <select className="field-select wos-mini" value={b.align || 'center'} style={{ maxWidth: 92 }}
                onClick={e => e.stopPropagation()}
                onChange={e => setB(b.id, { align: e.target.value })}>
                <option value="center">Centre</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            <U.Field label={'Width ' + Math.round((b.w || .42) * 100) + '%'}>
              <input type="range" min="0.15" max="0.9" step="0.01" value={b.w || .42}
                onChange={e => setB(b.id, { w: Number(e.target.value) })}/>
            </U.Field>
          </div>
        ))}

        <AssetPicker open={libOpen} onClose={() => setLibOpen(false)}
          onPick={(img) => { setPanel(panel.id, { image: img }); setLibOpen(false); }}/>
      </div></div>
    );
  }

  /* ── pick art already in the library ────────────────────────────────── */
  function AssetPicker({ open, onClose, onPick }) {
    const U = UI();
    const assets = (window.WORLD_ASSETS || []).filter(a => a && !a._deleted && a.image);
    return (
      <U.Modal open={open} title="Pick from the Asset Library" onClose={onClose} wide>
        {assets.length === 0
          ? <div className="wos-dim">The Asset Library is empty. Upload images there and they show up here.</div>
          : <div className="asset-grid">
              {assets.map(a => (
                <div key={a.id} className="asset-tile" onClick={() => onPick(a.image)}>
                  <img src={window.WorldOS.imageSrc(a.image)} alt={a.name} loading="lazy"/>
                  <div className="asset-tile-name">{a.name}</div>
                </div>
              ))}
            </div>}
      </U.Modal>
    );
  }

  /* ── cast: who is in this page, in which form, holding what ─────────── */
  function CastPanel({ page, setPage }) {
    const U = UI();
    const profiles = (window.WORLD_POWER_PROFILES || []).filter(p => p && !p._deleted);
    const cast = page.cast || [];
    const D = window.PowerCodexData;

    const add = (profileId) => {
      const p = profiles.find(x => x.id === profileId);
      if (!p || cast.some(c => c.profileId === profileId)) return;
      setPage({ cast: cast.concat({ profileId, name: p.name, formId: '', weaponId: '' }) });
    };
    const setC = (profileId, patch) =>
      setPage({ cast: cast.map(c => c.profileId === profileId ? { ...c, ...patch } : c) });

    return (
      <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
        <div className="wos-side-head">Cast on this page</div>
        {profiles.length === 0 ? (
          <div className="wos-dim" style={{ fontSize: 13 }}>
            No power profiles yet. Build them in the Power Codex and they become castable here,
            with their forms and weapons.
          </div>
        ) : (
          <>
            <select className="field-select" value="" onChange={e => e.target.value && add(e.target.value)}>
              <option value="">+ add a character…</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {cast.map(c => {
              const prof = profiles.find(p => p.id === c.profileId);
              if (!prof) return null;
              const form = (prof.forms || []).find(f => f.id === c.formId);
              const active = form || prof;
              const tier = D ? D.tierOf(active.tier) : { name: active.tier, color: '#ffab00' };
              return (
                <div key={c.profileId} className="cs-cast">
                  <div className="cs-cast-top">
                    <b>{prof.name}</b>
                    <span className="pc-tier" style={{ color: tier.color, borderColor: tier.color }}>
                      {tier.name} {active.rating != null ? active.rating : ''}
                    </span>
                    <button className="btn btn-ghost wos-mini"
                      onClick={() => setPage({ cast: cast.filter(x => x.profileId !== c.profileId) })}>×</button>
                  </div>
                  <div className="field-row">
                    <select className="field-select" value={c.formId || ''}
                      onChange={e => setC(c.profileId, { formId: e.target.value })}>
                      <option value="">Base form</option>
                      {(prof.forms || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <select className="field-select" value={c.weaponId || ''}
                      onChange={e => setC(c.profileId, { weaponId: e.target.value })}>
                      <option value="">No weapon</option>
                      {(prof.weapons || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  {form && form.description && <div className="cs-cast-note">{form.description}</div>}
                </div>
              );
            })}
          </>
        )}
      </div></div>
    );
  }

  window.ComicStudio = ComicStudio;

  window.registerWorldOS({
    id: 'comicStudio',
    nav: { section: 'World OS', item: { id: 'comics', label: 'Comic Studio', icon: 'card', badge: null } },
    routes: { comics: () => <ComicStudio/> },
    collections: [['comics', 'WORLD_COMICS'], ['comicPages', 'WORLD_COMIC_PAGES']],
    styles: `
      .cs-layout{display:grid;grid-template-columns:1fr 360px;gap:16px;align-items:start}
      .cs-stage{background:var(--parchment-3);border:1px solid var(--rule);border-radius:var(--r-md);
        padding:20px;display:grid;place-items:center;overflow:auto;max-height:78vh}
      .cs-canvas{box-shadow:0 30px 70px -20px rgba(0,0,0,.9);cursor:crosshair;display:block}
      .cs-side{display:flex;flex-direction:column}
      .cs-notice{border:1px solid var(--gold-deep);background:rgba(255,171,0,.08);color:var(--ink);
        padding:10px 14px;border-radius:var(--r-md);margin-bottom:14px;font-size:13px}
      .cs-pagestrip{display:flex;gap:6px;flex-wrap:wrap}
      .cs-pagechip{width:32px;height:32px;border-radius:var(--r-sm);border:1px solid var(--rule);
        background:var(--parchment-3);color:var(--ink-dim);cursor:pointer;font-family:var(--mono);font-size:12px}
      .cs-pagechip.on{border-color:var(--gold);color:var(--gold-bright);background:rgba(255,171,0,.12)}
      .cs-balloon-row{border:1px solid var(--rule);border-radius:var(--r-sm);padding:8px;margin-bottom:8px;
        background:var(--parchment-3);display:flex;flex-direction:column;gap:6px;cursor:pointer}
      .cs-balloon-row.on{border-color:var(--gold)}
      .cs-balloon-head{display:flex;align-items:center;justify-content:space-between;font-size:10px;
        letter-spacing:.18em;text-transform:uppercase}
      .cs-btnrow{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
      .cs-btnrow .btn{padding:3px 8px;font-size:11px}
      .cs-cast{border:1px solid var(--rule);border-left:3px solid var(--gold-deep);border-radius:var(--r-sm);
        padding:8px;margin-top:8px;background:var(--parchment-3);display:flex;flex-direction:column;gap:6px}
      .cs-cast-top{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink)}
      .cs-cast-top .wos-mini{margin-left:auto}
      .cs-cast-note{font-size:12px;color:var(--ink-faint);line-height:1.5}
      @media (max-width:1200px){.cs-layout{grid-template-columns:1fr}}
    `,
  });
})();
