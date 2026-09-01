/* ============================================================================
   RELATIONSHIP GRAPH — who stands where, and against whom
   The studio can already draw a Lineage tree, but a bloodline is only one
   kind of tie. This is the general case: any entity in the world can be
   joined to any other by a typed, directional relationship, and the result is
   laid out as a force-directed web you can drag around.

   Layout runs a small spring simulation in requestAnimationFrame and settles;
   dragged nodes are pinned so a hand-arranged web stays arranged.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useRef, useEffect, useMemo, useCallback } = React;
  const UI = () => window.WorldOSUI;

  const REL_TYPES = [
    { id: 'ally',      label: 'Allied with',   color: '#138c64', dash: '' },
    { id: 'enemy',     label: 'Enemy of',      color: '#b44539', dash: '' },
    { id: 'family',    label: 'Kin of',        color: '#a05d68', dash: '' },
    { id: 'member',    label: 'Member of',     color: '#ffab00', dash: '' },
    { id: 'rules',     label: 'Rules',         color: '#ffd37a', dash: '' },
    { id: 'serves',    label: 'Serves',        color: '#ab763e', dash: '' },
    { id: 'loves',     label: 'Loves',         color: '#e0a0b0', dash: '' },
    { id: 'betrayed',  label: 'Betrayed',      color: '#b44539', dash: '4 3' },
    { id: 'created',   label: 'Created',       color: '#9dbfcf', dash: '' },
    { id: 'located',   label: 'Located in',    color: '#6f456f', dash: '4 3' },
    { id: 'knows',     label: 'Knows of',      color: '#8a8a8a', dash: '2 4' },
  ];
  const relOf = (id) => REL_TYPES.find(r => r.id === id) || REL_TYPES[REL_TYPES.length - 1];

  const KIND_COLOR = {
    hero: '#ffab00', faction: '#9dbfcf', article: '#138c64', element: '#a05d68',
    card: '#ab763e', item: '#ffd37a', lore: '#6f456f', event: '#b44539', map: '#cfcfcf',
  };

  function RelationshipGraph() {
    const [rels, setRels] = window.useEntities('relationships');
    const [positions, setPositions] = window.useEntities('relationshipLayout');
    const [addOpen, setAddOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [kindFilter, setKindFilter] = useState('All');
    const U = UI();

    const liveRels = useMemo(() => (rels || []).filter(r => r && !r._deleted), [rels]);
    const index = useMemo(() => window.WorldOS.index(), [liveRels.length]);
    const nameOf = useCallback((ref) => {
      const hit = index.find(e => e.kind === ref.kind && e.id === ref.id);
      return hit ? hit.name : ref.id;
    }, [index]);

    /* nodes = every entity that appears in at least one relationship */
    const nodes = useMemo(() => {
      const seen = new Map();
      for (const r of liveRels) {
        for (const ref of [r.from, r.to]) {
          if (!ref) continue;
          const key = ref.kind + ':' + ref.id;
          if (!seen.has(key)) seen.set(key, { key, kind: ref.kind, id: ref.id, name: nameOf(ref) });
        }
      }
      let list = Array.from(seen.values());
      if (kindFilter !== 'All') list = list.filter(n => n.kind === kindFilter);
      return list;
    }, [liveRels, kindFilter, nameOf]);

    const nodeKeys = new Set(nodes.map(n => n.key));
    const edges = liveRels.filter(r =>
      r.from && r.to &&
      nodeKeys.has(r.from.kind + ':' + r.from.id) &&
      nodeKeys.has(r.to.kind + ':' + r.to.id));

    const kinds = Array.from(new Set(Array.from(
      new Set(liveRels.flatMap(r => [r.from && r.from.kind, r.to && r.to.kind]).filter(Boolean)))));

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Relationship Graph</h1>
            <div className="page-sub">{nodes.length} entities · {edges.length} relationships</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-gold" onClick={() => setAddOpen(true)}>+ Relationship</button>
          </div>
        </div>

        {liveRels.length === 0 ? (
          <U.EmptyState
            title="Nothing is connected yet"
            body="Join any two things in the world — a hero to a faction, a faction to its enemy, a god to the myth that made them — and the web draws itself."
            action={<button className="btn btn-gold" onClick={() => setAddOpen(true)}>Add the first relationship</button>}/>
        ) : (
          <>
            <div className="asset-bar">
              <div className="chip-row">
                <span className={`chip ${kindFilter === 'All' ? 'on' : ''}`} onClick={() => setKindFilter('All')}>All</span>
                {kinds.map(k => (
                  <span key={k} className={`chip ${kindFilter === k ? 'on' : ''}`} onClick={() => setKindFilter(k)}>{k}</span>
                ))}
              </div>
              <div className="rg-legend">
                {REL_TYPES.slice(0, 6).map(r => (
                  <span key={r.id} className="rg-legend-item">
                    <i style={{ background: r.color }}/>{r.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rg-layout">
              <GraphCanvas nodes={nodes} edges={edges} positions={positions || []}
                setPositions={setPositions} onSelect={setSelected} selected={selected}/>
              <aside className="rg-side">
                <div className="panel"><div className="panel-body">
                  <div className="wos-side-head">Relationships</div>
                  {edges.map(r => {
                    const t = relOf(r.type);
                    return (
                      <div key={r.id} className={`rg-row ${selected === r.id ? 'sel' : ''}`}
                        onClick={() => setSelected(r.id)}>
                        <div className="rg-row-line">
                          <b>{nameOf(r.from)}</b>
                          <span style={{ color: t.color }}> {t.label.toLowerCase()} </span>
                          <b>{nameOf(r.to)}</b>
                        </div>
                        {r.note && <div className="rg-row-note">{r.note}</div>}
                        <button className="btn btn-ghost wos-mini"
                          onClick={(e) => { e.stopPropagation(); setRels((rels || []).map(x => x.id === r.id ? { ...x, _deleted: true } : x)); }}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div></div>
              </aside>
            </div>
          </>
        )}

        <AddRelModal open={addOpen} onClose={() => setAddOpen(false)}
          onAdd={(r) => { setRels((rels || []).concat(r)); setAddOpen(false); }}/>
      </div>
    );
  }

  /* ── the canvas ─────────────────────────────────────────────────────── */
  function GraphCanvas({ nodes, edges, positions, setPositions, onSelect, selected }) {
    const W = 900, H = 560;
    const [pts, setPts] = useState({});
    const dragRef = useRef(null);
    const frame = useRef(0);

    // seed positions: saved if we have one, otherwise a circle
    useEffect(() => {
      setPts(prev => {
        const next = { ...prev };
        nodes.forEach((n, i) => {
          if (next[n.key]) return;
          const saved = (positions || []).find(p => p.key === n.key);
          if (saved) { next[n.key] = { x: saved.x, y: saved.y, pinned: true }; return; }
          const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
          next[n.key] = { x: W / 2 + Math.cos(a) * 200, y: H / 2 + Math.sin(a) * 170, pinned: false };
        });
        Object.keys(next).forEach(k => { if (!nodes.some(n => n.key === k)) delete next[k]; });
        return next;
      });
    }, [nodes, positions]);

    // spring simulation
    useEffect(() => {
      let alive = true;
      let alpha = 1;
      const step = () => {
        if (!alive) return;
        setPts(prev => {
          const next = {};
          for (const k in prev) next[k] = { ...prev[k], vx: 0, vy: 0 };
          const keys = Object.keys(next);
          // repulsion
          for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
              const a = next[keys[i]], b = next[keys[j]];
              let dx = b.x - a.x, dy = b.y - a.y;
              let d2 = dx * dx + dy * dy || 0.01;
              const f = 9000 / d2;
              const d = Math.sqrt(d2);
              const ux = dx / d, uy = dy / d;
              a.vx -= ux * f; a.vy -= uy * f;
              b.vx += ux * f; b.vy += uy * f;
            }
          }
          // springs along edges
          for (const e of edges) {
            const ak = e.from.kind + ':' + e.from.id, bk = e.to.kind + ':' + e.to.id;
            const a = next[ak], b = next[bk];
            if (!a || !b) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
            const f = (d - 170) * 0.02;
            const ux = dx / d, uy = dy / d;
            a.vx += ux * f; a.vy += uy * f;
            b.vx -= ux * f; b.vy -= uy * f;
          }
          for (const k of keys) {
            const p = next[k];
            if (p.pinned) continue;
            // gentle pull to centre keeps disconnected clusters on screen
            p.vx += (W / 2 - p.x) * 0.004;
            p.vy += (H / 2 - p.y) * 0.004;
            p.x = Math.max(40, Math.min(W - 40, p.x + p.vx * alpha));
            p.y = Math.max(30, Math.min(H - 30, p.y + p.vy * alpha));
          }
          return next;
        });
        alpha *= 0.985;
        if (alpha > 0.02) frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
      return () => { alive = false; cancelAnimationFrame(frame.current); };
    }, [edges, nodes.length]);

    const onDown = (key) => (e) => {
      e.stopPropagation();
      const svg = e.currentTarget.ownerSVGElement;
      const r = svg.getBoundingClientRect();
      dragRef.current = { key, sx: r.left, sy: r.top, sw: r.width, sh: r.height };
    };
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const x = ((e.clientX - d.sx) / d.sw) * W;
      const y = ((e.clientY - d.sy) / d.sh) * H;
      setPts(p => ({ ...p, [d.key]: { ...p[d.key], x, y, pinned: true } }));
    };
    const onUp = () => {
      const d = dragRef.current;
      if (d) {
        const p = pts[d.key];
        if (p) {
          const rest = (positions || []).filter(x => x.key !== d.key);
          setPositions(rest.concat({ key: d.key, x: p.x, y: p.y }));
        }
      }
      dragRef.current = null;
    };

    return (
      <div className="rg-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
          <defs>
            {REL_TYPES.map(t => (
              <marker key={t.id} id={`arw-${t.id}`} viewBox="0 0 8 8" refX="7" refY="4"
                markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L8 4 L0 8 z" fill={t.color}/>
              </marker>
            ))}
          </defs>
          {edges.map(e => {
            const a = pts[e.from.kind + ':' + e.from.id], b = pts[e.to.kind + ':' + e.to.id];
            if (!a || !b) return null;
            const t = relOf(e.type);
            return (
              <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={t.color} strokeWidth={selected === e.id ? 2.6 : 1.3}
                strokeDasharray={t.dash} markerEnd={`url(#arw-${t.id})`}
                opacity={selected && selected !== e.id ? 0.28 : 0.85}
                onClick={() => onSelect(e.id)} style={{ cursor: 'pointer' }}/>
            );
          })}
          {nodes.map(n => {
            const p = pts[n.key];
            if (!p) return null;
            const c = KIND_COLOR[n.kind] || '#cfcfcf';
            return (
              <g key={n.key} transform={`translate(${p.x},${p.y})`} onMouseDown={onDown(n.key)}
                 style={{ cursor: 'grab' }}>
                <circle r="9" fill={c} stroke="var(--parchment)" strokeWidth="2"/>
                <text y="-15" textAnchor="middle" className="rg-node-label">{n.name}</text>
              </g>
            );
          })}
        </svg>
        <div className="rg-hint">Drag a node to pin it where you want it</div>
      </div>
    );
  }

  /* ── add ────────────────────────────────────────────────────────────── */
  function AddRelModal({ open, onClose, onAdd }) {
    const [from, setFrom] = useState([]);
    const [to, setTo] = useState([]);
    const [type, setType] = useState('ally');
    const [note, setNote] = useState('');
    const U = UI();
    const ok = from.length === 1 && to.length === 1;
    return (
      <U.Modal open={open} title="New relationship" onClose={onClose}>
        <U.Field label="From — pick one">
          <U.EntityLink value={from} onChange={v => setFrom(v.slice(-1))}/>
        </U.Field>
        <U.Field label="Relationship">
          <U.Select value={type} onChange={e => setType(e.target.value)}
            options={REL_TYPES.map(r => ({ value: r.id, label: r.label }))}/>
        </U.Field>
        <U.Field label="To — pick one">
          <U.EntityLink value={to} onChange={v => setTo(v.slice(-1))}/>
        </U.Field>
        <U.Field label="Note">
          <U.Text value={note} onChange={e => setNote(e.target.value)} placeholder="Since the fall of the Ninth Gate…"/>
        </U.Field>
        <div className="wos-modal-actions">
          <button className="btn btn-gold" disabled={!ok} onClick={() => {
            onAdd({ id: window.makeId ? window.makeId() : 'rel_' + Date.now(),
                    from: from[0], to: to[0], type, note });
            setFrom([]); setTo([]); setNote(''); setType('ally');
          }}>Add relationship</button>
        </div>
      </U.Modal>
    );
  }

  window.RelationshipGraph = RelationshipGraph;

  window.registerWorldOS({
    id: 'relationshipGraph',
    nav: { section: 'World OS', item: { id: 'relationships', label: 'Relationships', icon: 'tree', badge: null } },
    routes: { relationships: () => <RelationshipGraph/> },
    collections: [['relationships', 'WORLD_RELATIONSHIPS'], ['relationshipLayout', 'WORLD_REL_LAYOUT']],
    styles: `
      .rg-layout{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start}
      .rg-canvas{position:relative;border:1px solid var(--rule);border-radius:var(--r-md);background:var(--parchment-2);overflow:hidden}
      .rg-canvas svg{display:block;width:100%;height:auto;user-select:none}
      .rg-node-label{fill:var(--ink);font-size:11px;font-family:var(--body);paint-order:stroke;stroke:var(--parchment);stroke-width:3px}
      .rg-hint{position:absolute;right:10px;bottom:8px;font-size:11px;color:var(--ink-faint);pointer-events:none}
      .rg-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--ink-dim)}
      .rg-legend-item{display:inline-flex;align-items:center;gap:5px}
      .rg-legend-item i{width:12px;height:2px;display:inline-block}
      .rg-row{border:1px solid var(--rule);border-radius:var(--r-sm);padding:8px 10px;margin-bottom:7px;background:var(--parchment-3);cursor:pointer;display:flex;flex-direction:column;gap:4px}
      .rg-row.sel{border-color:var(--gold)}
      .rg-row-line{font-size:13px;color:var(--ink);line-height:1.5}
      .rg-row-note{font-size:12px;color:var(--ink-faint)}
      @media (max-width:1100px){.rg-layout{grid-template-columns:1fr}}
    `,
  });
})();
