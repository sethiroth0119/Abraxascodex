// =====================================================================
//  ENTRY — Boss Spread + Grunt Card + Stat Block + Kalon panel
// =====================================================================

const { useState, useRef, useEffect, Fragment } = React;
const { ELEMENTS, ELEMENT_MAP, FACTIONS, FACTION_MAP, TIERS, TIER_MAP, PASSIVES, PASSIVE_MAP } = window.MS;
const STAT_KEYS = ["hp","atk","def","mag","res","spd"];
const STAT_MAX = 30;

// ---------------------------------------------------------------------
// Editable text — click to edit. Uses contentEditable.
// ---------------------------------------------------------------------
function EditableText({ value, onChange, multiline = false, editing, placeholder, style = {}, as = "span" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== (value || "")) {
      ref.current.innerText = value || "";
    }
  }, [value]);

  const Comp = as;
  return (
    <Comp
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      className={editing ? "ms-edit-on" : ""}
      onBlur={(e) => {
        const text = e.currentTarget.innerText.replace(/\u200B/g, "").trim();
        if (text !== (value || "")) onChange(text);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      data-placeholder={placeholder}
      style={style}
    />
  );
}

// ---------------------------------------------------------------------
// Stat bar — visual fill 0..STAT_MAX
// ---------------------------------------------------------------------
function StatBar({ stat, value, editing, onChange, scheme }) {
  const pct = Math.max(0, Math.min(100, (value / STAT_MAX) * 100));
  const map = {
    hp: ["#7a1f1f","#3a0c0c"],
    atk:["#8a3414","#4a1808"],
    def:["#2a5a8a","#0c2a4a"],
    mag:["#6a2a8a","#2a0c4a"],
    res:["#1f6a6a","#0c2a2a"],
    spd:["#8a6a14","#3a2a08"],
  }[stat] || ["#3a2a14","#1a1408"];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"38px 1fr 30px", alignItems:"center", gap:10 }}>
      <StatIcon stat={stat} size={28} />
      <div style={{
        height: 10, position:"relative",
        background:"#d9c79a",
        border:"1px solid #3a1a0c",
        boxShadow:"inset 0 1px 1px rgba(0,0,0,0.25)",
      }}>
        <div style={{
          position:"absolute", left:0, top:0, bottom:0, width:`${pct}%`,
          background:`linear-gradient(180deg, ${map[0]} 0%, ${map[1]} 100%)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
        }} />
        {/* tick marks */}
        {[10,20].map(n => (
          <div key={n} style={{
            position:"absolute", left:`${(n/STAT_MAX)*100}%`, top:-1, bottom:-1,
            width:1, background:"rgba(58,26,12,0.35)",
          }} />
        ))}
      </div>
      {editing ? (
        <input
          type="number" min="0" max={STAT_MAX} value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(STAT_MAX, Number(e.target.value) || 0)))}
          style={{
            width: 36, padding:"1px 2px", textAlign:"right",
            font:"700 14px 'IM Fell English SC', serif",
            color:"#2a1408", background:"#f1e3c1",
            border:"1px solid #6a4a1a",
          }}
        />
      ) : (
        <span style={{
          textAlign:"right", font:"700 16px 'IM Fell English SC', serif",
          color:"#2a1408",
        }}>{value}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Stat block — full 6-stat list
// ---------------------------------------------------------------------
function StatBlock({ stats, editing, onChange, label = "Stat Block" }) {
  return (
    <div className="ms-statblock">
      <div className="ms-section-head">
        <span>{label}</span>
        <Flourish width={140} />
      </div>
      <div style={{ display:"grid", gap:8, marginTop:10 }}>
        {STAT_KEYS.map(k => (
          <StatBar
            key={k} stat={k} value={stats[k] ?? 0}
            editing={editing}
            onChange={(v) => onChange({ ...stats, [k]: v })}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Faction & Element chips list (selectable in edit mode)
// ---------------------------------------------------------------------
function FactionRow({ factions, editing, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ms-tagrow">
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
        {factions.map(id => (
          <span key={id} className="ms-chip">
            <FactionSeal id={id} size={22} withLabel />
            {editing ? (
              <button className="ms-x"
                onClick={() => onChange(factions.filter(x => x !== id))}>×</button>
            ) : null}
          </span>
        ))}
        {editing && (
          <button className="ms-add-btn" onClick={() => setOpen(o => !o)}>+ Faction</button>
        )}
      </div>
      {editing && open && (
        <div className="ms-picker">
          {FACTIONS.filter(f => !factions.includes(f.id)).map(f => (
            <button key={f.id} className="ms-pick-item"
              onClick={() => { onChange([...factions, f.id]); setOpen(false); }}>
              <FactionSeal id={f.id} size={20} />
              <span style={{ marginLeft:6 }}>{f.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ElementRow({ elements, editing, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ms-tagrow">
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
        {elements.map(id => (
          <span key={id} className="ms-chip">
            <ElementRune id={id} size={20} />
            {editing ? (
              <button className="ms-x"
                onClick={() => onChange(elements.filter(x => x !== id))}>×</button>
            ) : null}
          </span>
        ))}
        {editing && (
          <button className="ms-add-btn" onClick={() => setOpen(o => !o)}>+ Element</button>
        )}
      </div>
      {editing && open && (
        <div className="ms-picker">
          {ELEMENTS.filter(e => !elements.includes(e.id)).map(e => (
            <button key={e.id} className="ms-pick-item"
              onClick={() => { onChange([...elements, e.id]); setOpen(false); }}>
              <ElementChip id={e.id} size={18} />
              <span style={{ marginLeft:6 }}>{e.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Tier picker
// ---------------------------------------------------------------------
function TierPicker({ tier, editing, onChange }) {
  if (!editing) return <TierSigil id={tier} />;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {TIERS.map(t => (
        <button key={t.id}
          className={"ms-tier-btn" + (t.id === tier ? " on" : "")}
          onClick={() => onChange(t.id)}
          style={{ color: t.ink, borderColor: t.ink }}>
          <span style={{ marginRight:6 }}>{"✦".repeat(t.rank)}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Passives list
// ---------------------------------------------------------------------
function PassiveList({ passives, editing, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("All");

  const filtered = PASSIVES.filter(p =>
    !passives.includes(p.id) &&
    (group === "All" || p.group === group) &&
    (search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.effect.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="ms-passives">
      {!compact && (
        <div className="ms-section-head">
          <span>Passives & Traits</span>
          <Flourish width={140} />
        </div>
      )}
      <ul className="ms-passive-list" style={{ marginTop: compact ? 0 : 8 }}>
        {passives.length === 0 && !editing && (
          <li style={{ opacity:0.55, fontStyle:"italic" }}>— none —</li>
        )}
        {passives.map(pid => {
          const p = PASSIVE_MAP[pid];
          if (!p) return null;
          return (
            <li key={pid}>
              <span className="ms-p-name">{p.name}.</span>{" "}
              <span className="ms-p-effect">{p.effect}</span>
              {editing && (
                <button className="ms-x ms-x-inline"
                  onClick={() => onChange(passives.filter(x => x !== pid))}>×</button>
              )}
            </li>
          );
        })}
      </ul>
      {editing && (
        <div>
          <button className="ms-add-btn" onClick={() => setOpen(o => !o)}>
            {open ? "Close passive picker" : "+ Add Passive"}
          </button>
          {open && (
            <div className="ms-passive-picker">
              <div className="ms-pp-controls">
                <input
                  className="ms-input"
                  placeholder="search passives…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select className="ms-input" value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option>All</option>
                  {window.MS.PASSIVE_GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="ms-pp-list">
                {filtered.slice(0, 40).map(p => (
                  <button key={p.id} className="ms-pp-item"
                    onClick={() => { onChange([...passives, p.id]); }}>
                    <span style={{ font:"600 12px 'IM Fell English SC', serif", textTransform:"uppercase",
                      letterSpacing:".1em", color:"#6a1818", marginRight:6 }}>{p.group}</span>
                    <strong>{p.name}.</strong> <span style={{opacity:0.8}}>{p.effect}</span>
                  </button>
                ))}
                {filtered.length > 40 && <div style={{padding:"6px 8px", opacity:0.6}}>…{filtered.length - 40} more — refine search.</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Traits inline editor
// ---------------------------------------------------------------------
function TraitList({ traits, editing, onChange }) {
  if (!editing && traits.length === 0) return null;
  return (
    <div className="ms-traits">
      <div className="ms-mini-label">Traits</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {traits.map((t, i) => (
          <span key={i} className="ms-trait-chip">
            <EditableText
              value={t} editing={editing}
              onChange={(v) => { const c = [...traits]; if (v) c[i] = v; else c.splice(i,1); onChange(c); }}
              as="span"
            />
            {editing && (
              <button className="ms-x ms-x-inline"
                onClick={() => onChange(traits.filter((_, j) => j !== i))}>×</button>
            )}
          </span>
        ))}
        {editing && (
          <button className="ms-add-btn" onClick={() => onChange([...traits, "New trait"])}>+ Trait</button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Weakness / Resistance row
// ---------------------------------------------------------------------
function WeakResRow({ label, items, editing, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ms-wr">
      <span className="ms-mini-label">{label}:</span>
      <span style={{ display:"inline-flex", flexWrap:"wrap", gap:6, alignItems:"center", marginLeft:8 }}>
        {items.length === 0 && !editing && <span style={{opacity:0.55, fontStyle:"italic"}}>none</span>}
        {items.map(id => (
          <span key={id} className="ms-chip ms-chip-sm">
            <ElementRune id={id} size={16} />
            {editing && <button className="ms-x" onClick={() => onChange(items.filter(x => x !== id))}>×</button>}
          </span>
        ))}
        {editing && (
          <Fragment>
            <button className="ms-add-btn" onClick={() => setOpen(o => !o)}>+</button>
            {open && (
              <div className="ms-picker">
                {ELEMENTS.filter(e => !items.includes(e.id)).map(e => (
                  <button key={e.id} className="ms-pick-item"
                    onClick={() => { onChange([...items, e.id]); setOpen(false); }}>
                    <ElementChip id={e.id} size={16} /><span style={{marginLeft:6}}>{e.label}</span>
                  </button>
                ))}
              </div>
            )}
          </Fragment>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------
// Art frame with drop-to-upload
// ---------------------------------------------------------------------
function ArtFrame({ src, editing, onChange, alt, aspect = "2/3" }) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={"ms-art" + (drag ? " drag" : "") + (editing ? " editing" : "")}
      style={{ aspectRatio: aspect }}
      onDragOver={(e) => { if (editing) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        if (editing && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      }}
    >
      {src ? (
        <img src={src} alt={alt} draggable={false} />
      ) : (
        <div className="ms-art-empty">
          <div style={{ font:"600 13px 'IM Fell English SC'", letterSpacing:".15em", textTransform:"uppercase" }}>
            no plate
          </div>
          <div style={{ fontSize:11, opacity:0.6, marginTop:6 }}>drop image here</div>
        </div>
      )}
      {editing && (
        <button
          className="ms-art-upload"
          onClick={() => fileRef.current.click()}
          title="Replace plate"
        >change plate</button>
      )}
      <input
        ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Kalon awaken picker — blank OR pull an existing unit as the Kalon form
// ---------------------------------------------------------------------
function KalonAwaken({ parentName, parentId, allEntries, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const matches = !allEntries ? [] : Object.values(allEntries).filter(m => {
    if (m.id === parentId) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (m.name || "").toLowerCase().includes(q) ||
           (m.traits || []).some(t => t.toLowerCase().includes(q));
  }).sort((a,b) => (a.name||"").localeCompare(b.name||""));

  const linkUnit = (u) => {
    onChange({
      name: u.name,
      art: u.art,
      stats: { ...u.stats },
      passives: [...(u.passives || [])],
      traits: [...(u.traits || [])],
      lore: u.lore || "",
      _linkedFrom: u.id,
    });
    setOpen(false);
  };

  const blank = () => {
    onChange({
      name: `${parentName} — Kalon`,
      art: "",
      stats: {hp:20,atk:20,def:20,mag:20,res:20,spd:20},
      passives: [], traits: [], lore: "",
    });
    setOpen(false);
  };

  return (
    <div className="ms-kalon-stub">
      <Flourish width={140} />
      {!open ? (
        <button className="ms-add-btn" onClick={() => setOpen(true)}>
          + Awaken Kalon Form
        </button>
      ) : (
        <div className="ms-kalon-picker">
          <div className="ms-kalon-picker-head">
            <strong style={{font:"600 12px 'IM Fell English SC'", letterSpacing:".2em", textTransform:"uppercase", color:"#6b1818"}}>Awaken Kalon</strong>
            <button className="ms-x" onClick={() => setOpen(false)}>×</button>
          </div>
          <div style={{display:"flex", gap:6, marginBottom:8}}>
            <button className="ms-add-btn" onClick={blank}>+ Blank Kalon</button>
            <span style={{font:"italic 12px var(--serif)", color:"#6a5238", alignSelf:"center"}}>or link an existing unit:</span>
          </div>
          <input
            className="ms-input"
            style={{width:"100%"}}
            autoFocus
            placeholder="search bestiary by name or trait…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="ms-kalon-results">
            {matches.slice(0, 40).map(u => (
              <button key={u.id} className="ms-kalon-result" onClick={() => linkUnit(u)}>
                <span className="ms-kalon-result-thumb">
                  {u.art ? <img src={u.art} alt="" /> : <span style={{opacity:0.4}}>—</span>}
                </span>
                <span className="ms-kalon-result-body">
                  <strong>{u.name}</strong>
                  <span style={{opacity:0.65, fontSize:12, fontStyle:"italic"}}>
                    {(u.factions||[]).slice(0,2).map(id => (window.MS.FACTION_MAP[id]||{}).label).filter(Boolean).join(" · ")}
                  </span>
                </span>
                <TierSigil id={u.tier} size={11} withLabel={false} />
              </button>
            ))}
            {matches.length === 0 && (
              <div style={{padding:"10px 8px", fontStyle:"italic", color:"#6a5238"}}>No matches.</div>
            )}
            {matches.length > 40 && (
              <div style={{padding:"6px 8px", opacity:0.6, fontSize:12}}>…{matches.length - 40} more — refine search.</div>
            )}
          </div>
        </div>
      )}
      <Flourish width={140} flip />
    </div>
  );
}

// ---------------------------------------------------------------------
// Kalon panel — appears under boss spread when monster has kalon
// ---------------------------------------------------------------------
function KalonPanel({ kalon, editing, onChange, parentName, parentId, allEntries }) {
  if (!kalon) {
    if (!editing) return null;
    return (
      <KalonAwaken
        parentName={parentName}
        parentId={parentId}
        allEntries={allEntries}
        onChange={onChange}
      />
    );
  }

  const setK = (patch) => onChange({ ...kalon, ...patch });
  return (
    <div className="ms-kalon">
      <div className="ms-kalon-banner">
        <Flourish width={120} />
        <span className="ms-kalon-title">⚜ Kalon Form ⚜</span>
        <Flourish width={120} flip />
      </div>
      <div className="ms-kalon-grid">
        <ArtFrame
          src={kalon.art} editing={editing}
          onChange={(v) => setK({ art: v })}
          alt={kalon.name}
          aspect="2/3"
        />
        <div className="ms-kalon-body">
          <h3 className="ms-kalon-name">
            <EditableText value={kalon.name} editing={editing}
              onChange={(v) => setK({ name: v })} placeholder="Kalon name" />
          </h3>
          <p className="ms-kalon-lore">
            <EditableText value={kalon.lore} editing={editing} multiline
              onChange={(v) => setK({ lore: v })}
              placeholder="When the seal breaks, this form awakens. Describe it." />
          </p>
          <StatBlock
            stats={kalon.stats || {}}
            editing={editing}
            onChange={(s) => setK({ stats: s })}
            label="Kalon Stat Block"
          />
          <TraitList traits={kalon.traits || []} editing={editing}
            onChange={(t) => setK({ traits: t })} />
          <PassiveList passives={kalon.passives || []} editing={editing}
            onChange={(p) => setK({ passives: p })} />
          {editing && (
            <button className="ms-add-btn danger"
              onClick={() => onChange(null)}>× Remove Kalon Form</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Boss spread — full page
// ---------------------------------------------------------------------
window.BossSpread = function BossSpread({ entry, editing, onChange, onDelete, onLayoutToggle, dragHandleProps, allEntries }) {
  const set = (patch) => onChange({ ...entry, ...patch });
  const dropCap = (entry.lore || "T").trim()[0] || "T";
  return (
    <article className="ms-spread" data-screen-label={`Boss · ${entry.name}`}>
      <CornerOrnament corner="tl" />
      <CornerOrnament corner="tr" />
      <CornerOrnament corner="bl" />
      <CornerOrnament corner="br" />

      <header className="ms-spread-head">
        <div className="ms-handle" {...dragHandleProps} title="Drag to reorder">⋮⋮</div>
        <h2 className="ms-name">
          <EditableText value={entry.name} editing={editing}
            onChange={(v) => set({ name: v })} placeholder="Monster name" />
        </h2>
        <div className="ms-tier-row">
          <TierPicker tier={entry.tier} editing={editing} onChange={(v) => set({ tier: v })} />
        </div>
        <div className="ms-spread-controls">
          {editing && (
            <button className="ms-mini" onClick={() => onLayoutToggle(entry.layout === "boss" ? "card" : "boss")}>
              switch to {entry.layout === "boss" ? "card" : "boss"}
            </button>
          )}
          {editing && <button className="ms-mini danger" onClick={onDelete}>delete</button>}
        </div>
      </header>

      <div className="ms-spread-body">
        <div className="ms-spread-left">
          <ArtFrame
            src={entry.art} editing={editing}
            onChange={(v) => set({ art: v })}
            alt={entry.name}
            aspect="2/3"
          />
          <div className="ms-art-caption">
            <em>Plate.</em> <EditableText value={entry.name} editing={editing}
              onChange={(v) => set({ name: v })} />
          </div>
        </div>

        <div className="ms-spread-right">
          <div className="ms-tagblock">
            <FactionRow factions={entry.factions} editing={editing}
              onChange={(f) => set({ factions: f })} />
            <ElementRow elements={entry.elements} editing={editing}
              onChange={(e) => set({ elements: e })} />
          </div>

          <p className="ms-lore">
            <span className="ms-dropcap">{dropCap}</span>
            <EditableText value={entry.lore.slice(1)} editing={editing}
              onChange={(v) => set({ lore: dropCap + v })}
              multiline
              placeholder="Lore. Speak its grim history." />
          </p>

          <div className="ms-grid-2">
            <div className="ms-block">
              <div className="ms-mini-label">Habitat</div>
              <p className="ms-prose">
                <EditableText value={entry.habitat} editing={editing}
                  onChange={(v) => set({ habitat: v })} multiline
                  placeholder="Where it is found." />
              </p>
            </div>
            <div className="ms-block">
              <div className="ms-mini-label">Tactics</div>
              <p className="ms-prose">
                <EditableText value={entry.tactics} editing={editing}
                  onChange={(v) => set({ tactics: v })} multiline
                  placeholder="How it fights." />
              </p>
            </div>
          </div>

          <StatBlock stats={entry.stats} editing={editing}
            onChange={(s) => set({ stats: s })} />

          <div className="ms-wr-block">
            <WeakResRow label="Weaknesses" items={entry.weaknesses || []} editing={editing}
              onChange={(v) => set({ weaknesses: v })} />
            <WeakResRow label="Resistances" items={entry.resistances || []} editing={editing}
              onChange={(v) => set({ resistances: v })} />
          </div>

          <TraitList traits={entry.traits || []} editing={editing}
            onChange={(t) => set({ traits: t })} />
          <PassiveList passives={entry.passives || []} editing={editing}
            onChange={(p) => set({ passives: p })} />
        </div>
      </div>

      <KalonPanel kalon={entry.kalon} editing={editing}
        onChange={(k) => set({ kalon: k })}
        parentName={entry.name} parentId={entry.id} allEntries={allEntries} />
    </article>
  );
};

// ---------------------------------------------------------------------
// Grunt card — compact
// ---------------------------------------------------------------------
window.GruntCard = function GruntCard({ entry, editing, onChange, onDelete, onLayoutToggle, onPromote, dragHandleProps, allEntries }) {
  const set = (patch) => onChange({ ...entry, ...patch });

  return (
    <article className="ms-card" data-screen-label={`Card · ${entry.name}`}>
      <div className="ms-card-handle" {...dragHandleProps} title="Drag">⋮⋮</div>
      <ArtFrame src={entry.art} editing={editing} onChange={(v) => set({ art: v })} alt={entry.name} aspect="3/4" />
      <div className="ms-card-body">
        <div className="ms-card-head">
          <h3 className="ms-card-name">
            <EditableText value={entry.name} editing={editing}
              onChange={(v) => set({ name: v })} placeholder="Name" />
          </h3>
          <TierSigil id={entry.tier} size={14} withLabel={false} />
        </div>
        {editing && (
          <div className="ms-card-tier-edit">
            <TierPicker tier={entry.tier} editing={editing} onChange={(v) => set({ tier: v })} />
          </div>
        )}
        <div className="ms-card-tags">
          <FactionRow factions={entry.factions} editing={editing}
            onChange={(f) => set({ factions: f })} />
          <ElementRow elements={entry.elements} editing={editing}
            onChange={(e) => set({ elements: e })} />
        </div>
        <div className="ms-card-stats">
          {STAT_KEYS.map(k => (
            <div key={k} className="ms-card-stat">
              <StatIcon stat={k} size={20} />
              {editing ? (
                <input
                  type="number" min="0" max={STAT_MAX} value={entry.stats[k] ?? 0}
                  onChange={(e) => set({ stats: { ...entry.stats, [k]: Math.max(0, Math.min(STAT_MAX, Number(e.target.value) || 0)) } })}
                  style={{
                    width: 30, padding:"1px 2px",
                    font:"700 12px 'IM Fell English SC', serif",
                    background:"#f1e3c1", border:"1px solid #6a4a1a", color:"#2a1408",
                  }}
                />
              ) : (
                <span className="ms-card-stat-val">{entry.stats[k]}</span>
              )}
            </div>
          ))}
        </div>
        <p className="ms-card-lore">
          <EditableText value={entry.lore} editing={editing}
            onChange={(v) => set({ lore: v })} multiline
            placeholder="Brief lore" />
        </p>
        <TraitList traits={entry.traits || []} editing={editing}
          onChange={(t) => set({ traits: t })} />
        <PassiveList passives={entry.passives || []} editing={editing} compact
          onChange={(p) => set({ passives: p })} />
        {editing && (
          <div className="ms-card-foot">
            <div className="ms-mini-label" style={{marginBottom:4}}>Habitat / Tactics / Defenses</div>
            <p className="ms-prose">
              <strong>Habitat. </strong>
              <EditableText value={entry.habitat} editing={editing}
                onChange={(v) => set({ habitat: v })} multiline placeholder="—" />
            </p>
            <p className="ms-prose">
              <strong>Tactics. </strong>
              <EditableText value={entry.tactics} editing={editing}
                onChange={(v) => set({ tactics: v })} multiline placeholder="—" />
            </p>
            <WeakResRow label="Weaknesses" items={entry.weaknesses || []} editing={editing}
              onChange={(v) => set({ weaknesses: v })} />
            <WeakResRow label="Resistances" items={entry.resistances || []} editing={editing}
              onChange={(v) => set({ resistances: v })} />
            <KalonPanel kalon={entry.kalon} editing={editing}
              onChange={(k) => set({ kalon: k })}
              parentName={entry.name} parentId={entry.id} allEntries={allEntries} />
            <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
              <button className="ms-mini" onClick={() => onLayoutToggle("boss")}>promote to boss spread</button>
              <button className="ms-mini danger" onClick={onDelete}>delete</button>
            </div>
          </div>
        )}
        {!editing && entry.kalon && (
          <div className="ms-card-kalon-hint">⚜ Has Kalon Form</div>
        )}
      </div>
    </article>
  );
};
