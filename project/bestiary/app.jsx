// =====================================================================
//  APP — main shell, sidebar index, search/filter, drag-reorder, persist
// =====================================================================

const { useState: useStateA, useEffect: useEffectA, useMemo, useCallback, useRef: useRefA } = React;
const SEED = window.MS.MONSTERS;
const STORE_KEY = "ms-bestiary-v1";

// ---------- persistence ----------
// localStorage keeps a per-browser cache so the UI is instant. Supabase is the
// shared source of truth: admin/staff edits push there (debounced) and every
// user pulls from there on open, so the Monster Manual stays in sync across users.
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// ---------- Supabase sync (parent shell auth) ----------
function getSupabase() {
  try { return window.parent && window.parent.supabaseClient; } catch { return null; }
}
function getRole() {
  try { return (window.parent && window.parent.CURRENT_ROLE) || ''; } catch { return ''; }
}
function canSync() {
  const r = getRole();
  return r === 'admin' || r === 'staff';
}

async function loadFromSupabase() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('bestiary_entries').select('*').order('ord');
    if (error) { console.warn('[bestiary] load failed:', error.message); return null; }
    if (!data || data.length === 0) return null;
    const entries = {};
    const order = [];
    for (const row of data) { entries[row.id] = row.data; order.push(row.id); }
    return { entries, order };
  } catch (e) { console.warn('[bestiary] load exception:', e && e.message); return null; }
}

// Track which IDs Supabase last saw so we can compute deletions.
let _lastSyncedIds = null;
let _syncTimer = null;

async function pushToSupabase(state) {
  if (!canSync()) return;
  const sb = getSupabase();
  if (!sb) return;
  try {
    const rows = state.order.map((id, i) => ({ id, data: state.entries[id], ord: i }));
    if (rows.length) {
      const { error } = await sb.from('bestiary_entries').upsert(rows);
      if (error) { console.warn('[bestiary] upsert failed:', error.message); return; }
    }
    const currentIds = new Set(state.order);
    if (_lastSyncedIds) {
      const removed = [..._lastSyncedIds].filter(id => !currentIds.has(id));
      if (removed.length) {
        const { error } = await sb.from('bestiary_entries').delete().in('id', removed);
        if (error) console.warn('[bestiary] delete failed:', error.message);
      }
    }
    _lastSyncedIds = currentIds;
  } catch (e) { console.warn('[bestiary] sync exception:', e && e.message); }
}

function saveState(state) {
  // Local cache — instant.
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  // Shared sync — debounced so a rapid burst of typing only pushes once.
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => pushToSupabase(state), 800);
}

function makeBlankMonster() {
  const id = "new_" + Math.random().toString(36).slice(2, 8);
  return {
    id, name: "Unnamed Entry", art: "",
    factions: [], elements: [], tier: "common", layout: "card",
    stats: { hp:8, atk:8, def:8, mag:8, res:8, spd:8 },
    passives: [], traits: [], lore: "",
    habitat: "", tactics: "",
    weaknesses: [], resistances: [],
    kalon: null,
  };
}

// =====================================================================
function App() {
  // Permission gate from the parent Abraxascodex app. Only admin + staff can
  // edit the Monster Manual; everyone else gets a read-only view. We wrap the
  // internal setEditing so non-permitted users can't toggle edit mode even by
  // calling internal callbacks (e.g. addEntry auto-sets editing=true).
  const canEdit = (() => {
    try {
      const role = (window.parent && window.parent.CURRENT_ROLE) || '';
      return role === 'admin' || role === 'staff';
    } catch { return false; }
  })();
  const [editing, _setEditing] = useStateA(false);
  const setEditing = canEdit ? _setEditing : () => {};
  // Belt-and-suspenders: if someone flips editing on while not permitted, snap it back.
  useEffectA(() => { if (!canEdit && editing) _setEditing(false); }, [canEdit, editing]);

  const [data, _setData] = useStateA(() => {
    const saved = loadSaved();
    let base;
    if (saved && saved.entries && saved.order) {
      base = saved;
    } else {
      const entries = Object.fromEntries(SEED.map(m => [m.id, m]));
      const order = [...SEED].sort((a,b) => a.name.localeCompare(b.name)).map(m => m.id);
      base = { entries, order };
    }
    // ---------- one-time seed-restore migration ----------
    // If user accidentally deleted seed entries before we shipped undo/redo,
    // bring them back once. Future deletions stick (flag is set after).
    const FLAG = "ms-bestiary-seedrestore-v2";
    if (!localStorage.getItem(FLAG)) {
      const entries = { ...base.entries };
      const order = [...base.order];
      const restored = [];
      for (const seed of SEED) {
        if (!entries[seed.id]) {
          entries[seed.id] = seed;
          restored.push(seed);
        }
      }
      if (restored.length) {
        // insert restored entries alphabetically into the order
        for (const r of restored) {
          let i = 0;
          while (i < order.length && (entries[order[i]]?.name || "").localeCompare(r.name) < 0) i++;
          order.splice(i, 0, r.id);
        }
        base = { entries, order };
      }
      try { localStorage.setItem(FLAG, "1"); } catch {}
    }
    return base;
  });
  const [search, setSearch] = useStateA("");
  const [filterFaction, setFilterFaction] = useStateA("");
  const [filterElement, setFilterElement] = useStateA("");
  const [filterTier, setFilterTier] = useStateA("");
  const [filterLayout, setFilterLayout] = useStateA("");
  const [sidebarOpen, setSidebarOpen] = useStateA(true);

  // ---------- undo / redo ----------
  const HISTORY_CAP = 80;
  const COALESCE_MS = 700;
  const [past, setPast] = useStateA([]);
  const [future, setFuture] = useStateA([]);
  const coalesceRef = useRefA({ pending: null, timer: null });

  // Wrap mutations: push prev state to past (debounced/coalesced), clear future.
  const setData = useCallback((updater) => {
    _setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next === prev) return prev;
      // schedule history push
      if (coalesceRef.current.pending == null) {
        coalesceRef.current.pending = prev;
      }
      if (coalesceRef.current.timer) clearTimeout(coalesceRef.current.timer);
      coalesceRef.current.timer = setTimeout(() => {
        const snapshot = coalesceRef.current.pending;
        coalesceRef.current.pending = null;
        coalesceRef.current.timer = null;
        setPast(p => {
          const np = [...p, snapshot];
          return np.length > HISTORY_CAP ? np.slice(np.length - HISTORY_CAP) : np;
        });
        setFuture([]);
      }, COALESCE_MS);
      return next;
    });
  }, []);

  const flushPending = useCallback(() => {
    if (coalesceRef.current.timer) {
      clearTimeout(coalesceRef.current.timer);
      const snapshot = coalesceRef.current.pending;
      coalesceRef.current.pending = null;
      coalesceRef.current.timer = null;
      if (snapshot) {
        setPast(p => {
          const np = [...p, snapshot];
          return np.length > HISTORY_CAP ? np.slice(np.length - HISTORY_CAP) : np;
        });
        setFuture([]);
      }
    }
  }, []);

  const undo = useCallback(() => {
    flushPending();
    setPast(p => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture(f => [..._snapshot(), ...f]);
      _setData(prev);
      return p.slice(0, -1);
    });
  }, [flushPending]);

  // little helper so undo can read current data inside the setPast callback
  const dataRef = useRefA(data);
  useEffectA(() => { dataRef.current = data; }, [data]);
  function _snapshot() { return [dataRef.current]; }

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast(p => [...p, dataRef.current]);
      _setData(next);
      return f.slice(1);
    });
  }, []);

  // keyboard shortcuts
  useEffectA(() => {
    const onKey = (e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      // Ignore if typing in a contentEditable that handles its own undo
      const t = e.target;
      const inEdit = t && (t.isContentEditable || /input|textarea|select/i.test(t.tagName || ""));
      if (inEdit) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  useEffectA(() => { saveState(data); }, [data]);

  // On mount, pull the shared bestiary state from Supabase so every user sees
  // whatever admins/staff have published. Server state wins over the local
  // cache for the initial load; subsequent admin edits then push back up.
  useEffectA(() => {
    let cancelled = false;
    loadFromSupabase().then(serverState => {
      if (cancelled || !serverState) return;
      _setData(serverState);
      _lastSyncedIds = new Set(serverState.order);
    });
    return () => { cancelled = true; };
  }, []);

  // ---------- mutation helpers ----------
  const updateEntry = useCallback((id, next) => {
    setData(d => ({ ...d, entries: { ...d.entries, [id]: { ...next, id } } }));
  }, []);

  const deleteEntry = useCallback((id) => {
    setData(d => {
      const e = { ...d.entries }; delete e[id];
      return { entries: e, order: d.order.filter(x => x !== id) };
    });
  }, []);

  const addEntry = useCallback(() => {
    const m = makeBlankMonster();
    setData(d => ({ entries: { ...d.entries, [m.id]: m }, order: [m.id, ...d.order] }));
    setEditing(true);
    requestAnimationFrame(() => {
      const el = document.getElementById("entry-" + m.id);
      if (el) el.scrollIntoView ? el.scrollIntoView({behavior:"smooth", block:"start"}) : null;
    });
  }, []);

  const resetAll = () => {
    if (!confirm("Reset bestiary to seed entries? Your edits will be lost.")) return;
    localStorage.removeItem(STORE_KEY);
    location.reload();
  };

  // ---------- filter ----------
  const visibleOrder = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.order.filter(id => {
      const m = data.entries[id];
      if (!m) return false;
      if (q && !(m.name.toLowerCase().includes(q) ||
                 (m.lore || "").toLowerCase().includes(q) ||
                 (m.traits || []).some(t => t.toLowerCase().includes(q)))) return false;
      if (filterFaction && !m.factions.includes(filterFaction)) return false;
      if (filterElement && !m.elements.includes(filterElement)) return false;
      if (filterTier && m.tier !== filterTier) return false;
      if (filterLayout && m.layout !== filterLayout) return false;
      return true;
    });
  }, [data, search, filterFaction, filterElement, filterTier, filterLayout]);

  // ---------- alphabetize ----------
  const alphabetize = () => {
    setData(d => ({
      ...d,
      order: [...d.order].sort((a,b) => (d.entries[a].name||"").localeCompare(d.entries[b].name||""))
    }));
  };

  // ---------- drag reorder ----------
  const dragId = useRefA(null);
  const onDragStart = (id) => (e) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch {}
  };
  const onDragOver = (id) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (targetId) => (e) => {
    e.preventDefault();
    const src = dragId.current; dragId.current = null;
    if (!src || src === targetId) return;
    setData(d => {
      const order = [...d.order];
      const from = order.indexOf(src);
      const to = order.indexOf(targetId);
      if (from === -1 || to === -1) return d;
      order.splice(from, 1);
      order.splice(to, 0, src);
      return { ...d, order };
    });
  };

  // ---------- render ----------
  // Group consecutive cards into 'card-grid' blocks; render bosses as solo spreads.
  const renderBlocks = () => {
    const blocks = [];
    let buf = [];
    const flush = () => {
      if (buf.length) {
        blocks.push({ kind:"cards", ids: buf });
        buf = [];
      }
    };
    visibleOrder.forEach(id => {
      const m = data.entries[id];
      if (!m) return;
      if (m.layout === "boss") {
        flush();
        blocks.push({ kind:"boss", id });
      } else {
        buf.push(id);
      }
    });
    flush();
    return blocks;
  };

  const blocks = renderBlocks();

  return (
    <div className={"ms-app" + (editing ? " editing" : "")}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        order={data.order}
        entries={data.entries}
        editing={editing}
        onSelect={(id) => {
          const el = document.getElementById("entry-" + id);
          if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onReorder={(from, to) => {
          setData(d => {
            const order = [...d.order];
            const item = order.splice(from, 1)[0];
            order.splice(to, 0, item);
            return { ...d, order };
          });
        }}
        onAlphabetize={alphabetize}
      />

      <div className="ms-main">
        <Topbar
          search={search} setSearch={setSearch}
          filterFaction={filterFaction} setFilterFaction={setFilterFaction}
          filterElement={filterElement} setFilterElement={setFilterElement}
          filterTier={filterTier} setFilterTier={setFilterTier}
          filterLayout={filterLayout} setFilterLayout={setFilterLayout}
          editing={editing} setEditing={setEditing} canEdit={canEdit}
          onAdd={addEntry}
          onReset={resetAll}
          onUndo={undo} onRedo={redo}
          canUndo={past.length > 0 || coalesceRef.current.pending != null}
          canRedo={future.length > 0}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(s => !s)}
          visibleCount={visibleOrder.length}
          totalCount={data.order.length}
        />

        <main className="ms-book">
          <CoverHeader />

          {blocks.map((b, i) => {
            if (b.kind === "boss") {
              const m = data.entries[b.id];
              return (
                <div key={b.id} id={"entry-" + b.id}
                  className="ms-block ms-block-boss"
                  onDragOver={onDragOver(b.id)}
                  onDrop={onDrop(b.id)}>
                  <BossSpread
                    entry={m}
                    editing={editing}
                    allEntries={data.entries}
                    onChange={(next) => updateEntry(b.id, next)}
                    onDelete={() => deleteEntry(b.id)}
                    onLayoutToggle={(layout) => updateEntry(b.id, { ...m, layout })}
                    dragHandleProps={{
                      draggable: editing,
                      onDragStart: onDragStart(b.id),
                    }}
                  />
                </div>
              );
            }
            return (
              <div key={"cards-" + i} className="ms-block ms-block-cards">
                <div className="ms-card-grid">
                  {b.ids.map(id => {
                    const m = data.entries[id];
                    return (
                      <div key={id} id={"entry-" + id}
                        onDragOver={onDragOver(id)}
                        onDrop={onDrop(id)}>
                        <GruntCard
                          entry={m}
                          editing={editing}
                          allEntries={data.entries}
                          onChange={(next) => updateEntry(id, next)}
                          onDelete={() => deleteEntry(id)}
                          onLayoutToggle={(layout) => updateEntry(id, { ...m, layout })}
                          dragHandleProps={{
                            draggable: editing,
                            onDragStart: onDragStart(id),
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {visibleOrder.length === 0 && (
            <div className="ms-empty">
              <Flourish width={320} />
              <h2 style={{ margin: "1em 0", font: "700 28px 'IM Fell English SC', serif", color: "#3a1a0c" }}>
                No entries found.
              </h2>
              <p style={{ opacity: 0.7, maxWidth: 420, textAlign:"center" }}>
                Adjust your filters above, or summon a new beast into the registry.
              </p>
              <Flourish width={320} flip />
            </div>
          )}

          <Colophon count={data.order.length} />
        </main>
      </div>
    </div>
  );
}

// =====================================================================
function Topbar({
  search, setSearch,
  filterFaction, setFilterFaction,
  filterElement, setFilterElement,
  filterTier, setFilterTier,
  filterLayout, setFilterLayout,
  editing, setEditing, canEdit,
  onAdd, onReset, onUndo, onRedo, canUndo, canRedo,
  sidebarOpen, onToggleSidebar, visibleCount, totalCount,
}) {
  return (
    <header className="ms-topbar" style={{paddingRight:32}}>
      {/* Row 1 — extra gap (18px) + a 32px right padding so the toolbar never
          grazes the right edge; brand on the left, buttons spaced to the
          middle area, empty right margin. */}
      <div className="ms-topbar-row1" style={{gap:18}}>
        <button className="ms-icon-btn" onClick={onToggleSidebar} title="Index">
          {sidebarOpen ? "▣" : "▤"}
        </button>
        <div className="ms-brand" style={{flex:'0 1 auto', minWidth:0, overflow:'hidden', maxWidth:'40%'}}>
          <span className="ms-brand-sub" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block'}}>A bestiary of</span>
          <h1 className="ms-brand-title" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', margin:0}}>The Mythic Spellbook</h1>
        </div>
        {/* Subtle divider keeps brand and action group visually separate even
            when the row gets crowded — no chance of them looking like one blob. */}
        <span aria-hidden="true" style={{order:1, width:1, height:28, background:'#3a2a14', opacity:0.6, marginLeft:'auto'}} />
        <div className="ms-topbar-controls" style={{order:2, marginRight:'auto'}}>
          <span className="ms-count">{visibleCount}<span style={{opacity:0.5}}> / {totalCount}</span></span>
          {canEdit ? (
            <>
              <button className="ms-icon-btn faded" onClick={onUndo} disabled={!canUndo}
                title="Undo (⌘Z / Ctrl+Z)" style={{ opacity: canUndo ? 1 : 0.35 }}>↶ Undo</button>
              <button className="ms-icon-btn faded" onClick={onRedo} disabled={!canRedo}
                title="Redo (⇧⌘Z / Ctrl+Y)" style={{ opacity: canRedo ? 1 : 0.35 }}>Redo ↷</button>
              <button className={"ms-icon-btn" + (editing ? " on" : "")} onClick={() => setEditing(e => !e)}>
                {editing ? "✓ Done" : "✎ Edit"}
              </button>
              <button className="ms-icon-btn" onClick={onAdd} title="Add new entry">+ Beast</button>
              <button className="ms-icon-btn faded" onClick={onReset} title="Reset to seed">↺</button>
            </>
          ) : (
            <span className="ms-count" style={{borderLeft:'1px solid #3a2a14', borderRight:'none', paddingLeft:8, marginLeft:2, opacity:0.7, fontStyle:'italic'}}>
              read-only
            </span>
          )}
        </div>
      </div>
      {/* Filters on the LEFT so they're always visible/clickable even if the
          search expands or the right edge gets covered by an OS overlay.
          Search is capped at 280px instead of flex:1 so it can't push the
          filters off-screen. flex-wrap on the row handles narrow widths. */}
      <div className="ms-topbar-row2">
        <select className="ms-filter" value={filterFaction} onChange={(e) => setFilterFaction(e.target.value)}>
          <option value="">All Factions</option>
          {window.MS.FACTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <select className="ms-filter" value={filterElement} onChange={(e) => setFilterElement(e.target.value)}>
          <option value="">All Elements</option>
          {window.MS.ELEMENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <select className="ms-filter" value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="">All Tiers</option>
          {window.MS.TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select className="ms-filter" value={filterLayout} onChange={(e) => setFilterLayout(e.target.value)}>
          <option value="">All Layouts</option>
          <option value="boss">Boss spreads</option>
          <option value="card">Grunt cards</option>
        </select>
        <input
          className="ms-search"
          placeholder="Search by name, lore, trait…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{flex:'0 1 280px', minWidth:160}}
        />
        {(search || filterFaction || filterElement || filterTier || filterLayout) && (
          <button className="ms-icon-btn faded" onClick={() => {
            setSearch(""); setFilterFaction(""); setFilterElement(""); setFilterTier(""); setFilterLayout("");
          }}>clear</button>
        )}
      </div>
    </header>
  );
}

// =====================================================================
function Sidebar({ open, onClose, order, entries, editing, onSelect, onReorder, onAlphabetize }) {
  const dragFrom = useRefA(null);
  if (!open) return null;
  return (
    <aside className="ms-sidebar">
      <div className="ms-sidebar-head">
        <h2 className="ms-sidebar-title">Index</h2>
        <button className="ms-icon-btn small" onClick={onClose} title="Hide index">×</button>
      </div>
      <div className="ms-sidebar-actions">
        <button className="ms-mini" onClick={onAlphabetize}>A→Z</button>
        <span className="ms-mini-label" style={{ marginLeft:8, fontSize:11 }}>
          {editing ? "drag to reorder" : "click to jump"}
        </span>
      </div>
      <ol className="ms-index">
        {order.map((id, i) => {
          const m = entries[id];
          if (!m) return null;
          const t = window.MS.TIER_MAP[m.tier];
          return (
            <li
              key={id}
              draggable={editing}
              onDragStart={() => { dragFrom.current = i; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragFrom.current != null) onReorder(dragFrom.current, i); dragFrom.current = null; }}
              className={"ms-index-item" + (m.layout === "boss" ? " boss" : "")}
              onClick={() => onSelect(id)}
            >
              <span className="ms-index-num">{String(i+1).padStart(3,"0")}</span>
              <span className="ms-index-name">{m.name}</span>
              <span className="ms-index-tier" style={{ color: t.ink }}>{"✦".repeat(t.rank)}</span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

// =====================================================================
function CoverHeader() {
  return (
    <div className="ms-cover">
      <div className="ms-cover-frame">
        <div className="ms-cover-eyebrow">⸸ VOLUME I ⸸</div>
        <h1 className="ms-cover-title">Bestiarivm</h1>
        <h2 className="ms-cover-sub">of the Mythic Spellbook</h2>
        <Flourish width={420} />
        <p className="ms-cover-blurb">
          A field-record of every named horror, jinn, construct, godling and minor god that walks the
          pages of our world. Stat-blocks are gathered from the testimony of survivors and the
          paperwork of the dead. Where two accounts disagree, we have chosen the grimmer.
        </p>
        <Flourish width={420} flip />
        <div className="ms-cover-legend">
          <span>✦ Common</span><span>✦✦ Uncommon</span><span>✦✦✦ Rare</span>
          <span>✦✦✦✦ Elite</span><span>✦✦✦✦✦ Legendary</span><span>✦✦✦✦✦✦ Mythic</span>
        </div>
      </div>
    </div>
  );
}

function Colophon({ count }) {
  return (
    <footer className="ms-colophon">
      <Flourish width={360} />
      <p>Set in iron and parchment. Plates by the hands of the chapter-house.</p>
      <p style={{opacity:0.6}}>{count} entries logged. The bestiary remains incomplete by design.</p>
      <Flourish width={360} flip />
    </footer>
  );
}

// =====================================================================
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
