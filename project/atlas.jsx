/* ============================================================================
   ATLAS — interactive maps
   Upload a map image, drop pins on it, group pins into layers, and link each
   pin to anything else in the studio. Coordinates are stored as fractions of
   the image (0..1) so pins stay put at any zoom or container size.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useRef, useMemo, useCallback } = React;
  const UI = () => window.WorldOSUI;

  const PIN_KINDS = [
    { id: 'city',     name: 'City',      glyph: '◉', color: '#ffab00' },
    { id: 'town',     name: 'Town',      glyph: '○', color: '#ffd37a' },
    { id: 'ruin',     name: 'Ruin',      glyph: '▲', color: '#ab763e' },
    { id: 'dungeon',  name: 'Dungeon',   glyph: '◆', color: '#a05d68' },
    { id: 'battle',   name: 'Battle',    glyph: '✶', color: '#b44539' },
    { id: 'region',   name: 'Region',    glyph: '▭', color: '#9dbfcf' },
    { id: 'wonder',   name: 'Wonder',    glyph: '★', color: '#138c64' },
    { id: 'note',     name: 'Note',      glyph: '•', color: '#cfcfcf' },
  ];
  const kindOf = (id) => PIN_KINDS.find(k => k.id === id) || PIN_KINDS[PIN_KINDS.length - 1];

  function AtlasPage() {
    const [maps, setMaps] = window.useEntities('maps');
    const [pins, setPins] = window.useEntities('mapPins');
    const [activeId, setActiveId] = useState(null);
    const [newOpen, setNewOpen] = useState(false);
    const U = UI();

    const live = (maps || []).filter(m => m && !m._deleted);
    const active = live.find(m => m.id === activeId) || null;

    if (active) {
      return <MapView map={active} maps={maps} setMaps={setMaps}
                      pins={pins} setPins={setPins} onBack={() => setActiveId(null)}/>;
    }

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Atlas</h1>
            <div className="page-sub">{live.length} map{live.length === 1 ? '' : 's'} · click a map to place pins</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-gold" onClick={() => setNewOpen(true)}>+ New map</button>
          </div>
        </div>

        {live.length === 0 ? (
          <U.EmptyState
            title="No maps yet"
            body="Upload any image — a hand-drawn world map, a city plan, a dungeon floor — and start dropping pins on it."
            action={<button className="btn btn-gold" onClick={() => setNewOpen(true)}>Upload your first map</button>}/>
        ) : (
          <div className="atlas-grid">
            {live.map(m => {
              const count = (pins || []).filter(p => p.mapId === m.id && !p._deleted).length;
              return (
                <div key={m.id} className="atlas-card" onClick={() => setActiveId(m.id)}>
                  <div className="atlas-thumb">
                    {window.WorldOS.imageSrc(m.image)
                      ? <img src={window.WorldOS.imageSrc(m.image)} alt=""/>
                      : <div className="atlas-thumb-empty">no image</div>}
                  </div>
                  <div className="atlas-card-body">
                    <div className="atlas-card-name">{m.name}</div>
                    <div className="atlas-card-meta">
                      {m.scope || 'Map'} · {count} pin{count === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <NewMapModal open={newOpen} onClose={() => setNewOpen(false)}
          onCreate={(m) => { setMaps((maps || []).concat(m)); setNewOpen(false); setActiveId(m.id); }}/>
      </div>
    );
  }

  function NewMapModal({ open, onClose, onCreate }) {
    const [name, setName] = useState('');
    const [scope, setScope] = useState('World');
    const [image, setImage] = useState(null);
    const U = UI();

    const create = () => {
      if (!name.trim() || !image) return;
      onCreate({
        id: window.makeId ? window.makeId() : 'map_' + Date.now(),
        name: name.trim(), scope, image,
        createdAt: new Date().toISOString(),
      });
      setName(''); setImage(null); setScope('World');
    };

    return (
      <U.Modal open={open} title="New map" onClose={onClose}>
        <U.Field label="Map name">
          <U.Text value={name} onChange={e => setName(e.target.value)} placeholder="The Shattered Coast"/>
        </U.Field>
        <U.Field label="Scope">
          <U.Select value={scope} onChange={e => setScope(e.target.value)}
            options={['World', 'Continent', 'Region', 'City', 'Building', 'Dungeon', 'Plane']}/>
        </U.Field>
        <U.Field label="Map image">
          <U.ImageDrop value={image} onChange={setImage} preset="map" height={220}
            folder="maps" label="Drop your map image"/>
        </U.Field>
        <div className="wos-modal-actions">
          <button className="btn btn-gold" disabled={!name.trim() || !image} onClick={create}>Create map</button>
        </div>
      </U.Modal>
    );
  }

  /* ── the map itself ─────────────────────────────────────────────────── */
  function MapView({ map, maps, setMaps, pins, setPins, onBack }) {
    const U = UI();
    const wrapRef = useRef(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [placing, setPlacing] = useState(false);
    const [selected, setSelected] = useState(null);
    const [hidden, setHidden] = useState([]);      // hidden pin kinds = layers
    const drag = useRef(null);

    const myPins = useMemo(
      () => (pins || []).filter(p => p.mapId === map.id && !p._deleted),
      [pins, map.id]);

    const visible = myPins.filter(p => !hidden.includes(p.kind));

    /* place a pin at the clicked point, in image-fraction coordinates */
    const onSurfaceClick = (e) => {
      if (!placing) return;
      const r = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const pin = {
        id: window.makeId ? window.makeId() : 'pin_' + Date.now(),
        mapId: map.id, x, y, kind: 'city', name: 'New pin', notes: '', links: [],
      };
      setPins((pins || []).concat(pin));
      setSelected(pin.id);
      setPlacing(false);
    };

    const updatePin = (id, patch) =>
      setPins((pins || []).map(p => p.id === id ? { ...p, ...patch } : p));
    const deletePin = (id) => {
      setPins((pins || []).map(p => p.id === id ? { ...p, _deleted: true } : p));
      setSelected(null);
    };

    /* pan by dragging the surface when not placing */
    const onDown = (e) => {
      if (placing) return;
      drag.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
    };
    const onMove = (e) => {
      if (!drag.current) return;
      setPan({ x: drag.current.ox + (e.clientX - drag.current.sx),
               y: drag.current.oy + (e.clientY - drag.current.sy) });
    };
    const onUp = () => { drag.current = null; };

    const sel = myPins.find(p => p.id === selected) || null;

    return (
      <div className="page atlas-page">
        <div className="page-head">
          <div>
            <button className="btn btn-ghost" onClick={onBack}>← Atlas</button>
            <h1 className="page-title" style={{ marginTop: 8 }}>{map.name}</h1>
            <div className="page-sub">{map.scope} · {myPins.length} pins</div>
          </div>
          <div className="page-actions">
            <button className={`btn ${placing ? 'btn-gold' : ''}`} onClick={() => setPlacing(!placing)}>
              {placing ? 'Click the map…' : '+ Place pin'}
            </button>
            <button className="btn" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>−</button>
            <button className="btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>{Math.round(zoom * 100)}%</button>
            <button className="btn" onClick={() => setZoom(z => Math.min(6, z + 0.25))}>+</button>
          </div>
        </div>

        <div className="atlas-layout">
          <div className="atlas-stage" ref={wrapRef}
               onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
            <div className="atlas-surface"
                 style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                 onClick={onSurfaceClick}>
              <img src={window.WorldOS.imageSrc(map.image)} alt={map.name} className="atlas-img" draggable={false}/>
              {visible.map(p => {
                const k = kindOf(p.kind);
                return (
                  <button key={p.id}
                    className={`atlas-pin ${selected === p.id ? 'sel' : ''}`}
                    style={{ left: (p.x * 100) + '%', top: (p.y * 100) + '%', color: k.color,
                             transform: `translate(-50%,-50%) scale(${1 / zoom})` }}
                    title={p.name}
                    onClick={(e) => { e.stopPropagation(); setSelected(p.id); }}>
                    <span className="atlas-pin-glyph">{k.glyph}</span>
                    <span className="atlas-pin-label">{p.name}</span>
                  </button>
                );
              })}
            </div>
            {placing && <div className="atlas-placing">Click anywhere on the map to drop a pin</div>}
          </div>

          <aside className="atlas-side">
            <div className="panel">
              <div className="panel-body">
                <div className="wos-side-head">Layers</div>
                {PIN_KINDS.map(k => {
                  const n = myPins.filter(p => p.kind === k.id).length;
                  const off = hidden.includes(k.id);
                  return (
                    <label key={k.id} className={`atlas-layer ${off ? 'off' : ''}`}>
                      <input type="checkbox" checked={!off}
                        onChange={() => setHidden(off ? hidden.filter(x => x !== k.id) : hidden.concat(k.id))}/>
                      <span className="atlas-layer-glyph" style={{ color: k.color }}>{k.glyph}</span>
                      <span>{k.name}</span>
                      <span className="wos-dim">{n}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {sel ? (
              <div className="panel" style={{ marginTop: 12 }}>
                <div className="panel-body">
                  <div className="wos-side-head">Pin</div>
                  <U.Field label="Name">
                    <U.Text value={sel.name} onChange={e => updatePin(sel.id, { name: e.target.value })}/>
                  </U.Field>
                  <U.Field label="Kind">
                    <U.Select value={sel.kind} onChange={e => updatePin(sel.id, { kind: e.target.value })}
                      options={PIN_KINDS.map(k => ({ value: k.id, label: k.name }))}/>
                  </U.Field>
                  <U.Field label="Notes">
                    <U.Area value={sel.notes || ''} onChange={e => updatePin(sel.id, { notes: e.target.value })}
                      placeholder="What happens here?"/>
                  </U.Field>
                  <U.Field label="Linked to">
                    <U.EntityLink value={sel.links || []} onChange={v => updatePin(sel.id, { links: v })}/>
                  </U.Field>
                  <button className="btn btn-ghost" onClick={() => deletePin(sel.id)}>Delete pin</button>
                </div>
              </div>
            ) : (
              <div className="panel" style={{ marginTop: 12 }}>
                <div className="panel-body wos-dim" style={{ fontSize: 13 }}>
                  Select a pin to edit it, or use <b>+ Place pin</b> and click the map.
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  window.AtlasPage = AtlasPage;

  window.registerWorldOS({
    id: 'atlas',
    nav: { section: 'World OS', item: { id: 'atlas', label: 'Atlas', icon: 'map', badge: null } },
    routes: { atlas: () => <AtlasPage/> },
    collections: [['maps', 'WORLD_MAPS'], ['mapPins', 'WORLD_MAP_PINS']],
    styles: `
      .atlas-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
      .atlas-card{border:1px solid var(--rule);border-radius:var(--r-md);overflow:hidden;background:var(--parchment-2);cursor:pointer;transition:border-color .15s,transform .15s}
      .atlas-card:hover{border-color:var(--gold-deep);transform:translateY(-2px)}
      .atlas-thumb{height:150px;background:var(--parchment-3);display:grid;place-items:center;overflow:hidden}
      .atlas-thumb img{width:100%;height:100%;object-fit:cover}
      .atlas-thumb-empty{color:var(--ink-faint);font-size:12px;letter-spacing:.2em;text-transform:uppercase}
      .atlas-card-body{padding:12px 14px}
      .atlas-card-name{font-family:var(--display);font-size:16px;color:var(--ink)}
      .atlas-card-meta{font-size:12px;color:var(--ink-faint);margin-top:2px}
      .atlas-layout{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start}
      .atlas-stage{position:relative;height:70vh;overflow:hidden;border:1px solid var(--rule);border-radius:var(--r-md);background:var(--parchment-3);cursor:grab}
      .atlas-stage:active{cursor:grabbing}
      .atlas-surface{position:relative;transform-origin:0 0;display:inline-block}
      .atlas-img{display:block;max-width:none}
      .atlas-pin{position:absolute;background:none;border:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;line-height:1}
      .atlas-pin-glyph{font-size:20px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.9))}
      .atlas-pin-label{font-size:11px;color:#fff;background:rgba(9,9,10,.82);padding:1px 6px;border-radius:9px;margin-top:2px;white-space:nowrap;border:1px solid var(--rule)}
      .atlas-pin.sel .atlas-pin-label{border-color:var(--gold);color:var(--gold-bright)}
      .atlas-placing{position:absolute;left:50%;top:14px;transform:translateX(-50%);background:rgba(9,9,10,.9);border:1px solid var(--gold-deep);color:var(--gold-bright);padding:6px 14px;border-radius:99px;font-size:12px;letter-spacing:.1em;pointer-events:none}
      .atlas-layer{display:flex;align-items:center;gap:8px;padding:5px 2px;font-size:13px;color:var(--ink);cursor:pointer}
      .atlas-layer.off{opacity:.45}
      .atlas-layer .wos-dim{margin-left:auto}
      .atlas-layer-glyph{width:16px;text-align:center}
      @media (max-width:1100px){.atlas-layout{grid-template-columns:1fr}}
    `,
  });
})();
