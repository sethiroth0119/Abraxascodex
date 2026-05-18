// Heroes & NPCs — roster, character creator, full detail view with portrait upload
const KINDS = ['Hero','NPC','Villain','Ally','Bystander','Faction Leader'];

const ALIGNMENTS = ['Lawful Verdant','Lawful Lumen','Lawful Pyric','Chaotic Ashen','Chaotic Rotten',
  'True Neutral','Neutral Tide','Unaligned','Beyond alignment'];

// ---------- Portrait wrapper (image-slot + emoji fallback) ----------
const Portrait = ({ id, glyph, color, w, h, ph='Drop portrait' }) => {
  // wrap in a div so we can layer a placeholder glyph; the slot itself sits on top
  return (
    <div style={{position:'relative',width:w,height:h,borderRadius:6,overflow:'hidden',
                 border:`1px solid ${color||'var(--rule-strong)'}`,background:`linear-gradient(160deg,${(color||'#888')}25, #0d0a05)`}}>
      <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',
                   fontFamily:'var(--display)',color:color||'var(--gold)',fontSize:Math.max(28, h*0.36),opacity:.5,pointerEvents:'none'}}>
        {glyph}
      </div>
      <image-slot id={id} shape="rect" placeholder={ph}
        style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block',background:'transparent',border:'none'}}>
      </image-slot>
    </div>
  );
};

// ---------- Roster Card ----------
const RosterCard = ({ h, onClick }) => {
  const f = window.FACTIONS.find(x=>x.id===h.faction);
  const e = window.ELEMENTS.find(x=>x.id===h.element);
  return (
    <div className="roster-card" onClick={onClick}>
      <Portrait id={`hero-${h.id}`} glyph={h.glyph} color={f?.color} w="100%" h={180} ph="Drop portrait"/>
      <div style={{padding:'12px 14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
          <span className="pill" style={{borderColor:f?.color,color:f?.color}}>{f?.icon} {f?.name}</span>
          <span className="pill" style={{borderColor:e?.color,color:e?.color}}>{e?.icon}</span>
          <span style={{marginLeft:'auto'}} className="pill">{h.kind}</span>
        </div>
        <div className="hero-name" style={{fontSize:16,marginTop:2}}>{h.name}</div>
        <div className="hero-title" style={{fontSize:12}}>{h.title}</div>
        <div style={{marginTop:8,fontFamily:'var(--serif)',fontSize:12.5,color:'var(--ink-dim)',fontStyle:'italic',
          display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',lineHeight:1.45}}>
          {h.mission || h.bio}
        </div>
      </div>
    </div>
  );
};

// ---------- Section ----------
const Sec = ({ title, children, side }) => (
  <section style={{marginTop:18}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
      <div style={{fontFamily:'var(--display)',fontSize:11,letterSpacing:'.24em',textTransform:'uppercase',color:'var(--gold)'}}>{title}</div>
      <div style={{flex:1,height:1,background:'linear-gradient(90deg,var(--gold-deep),transparent)'}}/>
      {side}
    </div>
    {children}
  </section>
);

// ---------- Detail Overlay ----------
const HeroDetail = ({ hero, heroes, onClose, onChange, onSelect, onDelete, startEditing }) => {
  const [edit, setEdit] = React.useState(!!startEditing);
  const f = window.FACTIONS.find(x=>x.id===hero.faction);
  const el = window.ELEMENTS.find(x=>x.id===hero.element);

  // helpers for chip-list editing
  const updArr = (key, value) => onChange({ ...hero, [key]: value });
  const updField = (key, value) => onChange({ ...hero, [key]: value });

  const ChipList = ({ items, color, onAdd, onRemove, placeholder }) => {
    const [v, setV] = React.useState('');
    return (
      <div className="chip-row">
        {(items||[]).map((t,i) => (
          <span key={i} className="chip active" style={{borderColor:color,color}}>
            {t}
            {edit && <span style={{marginLeft:6,opacity:.7,cursor:'pointer'}} onClick={()=>onRemove(i)}>×</span>}
          </span>
        ))}
        {edit && (
          <span className="chip" style={{padding:0,background:'transparent',border:'1px dashed var(--rule-strong)'}}>
            <input value={v} placeholder={placeholder||'+ add'}
              style={{background:'transparent',border:'none',outline:'none',color:'var(--ink)',padding:'4px 10px',fontFamily:'var(--body)',fontSize:11,width:120}}
              onChange={e=>setV(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter' && v.trim()){ onAdd(v.trim()); setV(''); }}}/>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="hero-overlay" onClick={onClose}>
      <div className="hero-sheet" onClick={e => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} title="Close">✕</button>

        <div className="sheet-grid">
          {/* LEFT — portrait + identity */}
          <aside className="sheet-portrait-col">
            <Portrait id={`hero-detail-${hero.id}`} glyph={hero.glyph} color={f?.color} w="100%" h={480} ph="Drop a full portrait"/>
            <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
              <span className="pill" style={{borderColor:f?.color,color:f?.color}}>{f?.icon} {f?.name}</span>
              <span className="pill" style={{borderColor:el?.color,color:el?.color}}>{el?.icon} {el?.name}</span>
              <span className="pill">{hero.kind}</span>
            </div>

            <Sec title="Identity">
              <div className="kv" style={{gridTemplateColumns:'90px 1fr'}}>
                <dt>Pronouns</dt>
                <dd>{edit
                  ? <input className="field-input" value={hero.pronouns||''} onChange={e=>updField('pronouns', e.target.value)} style={{padding:'2px 6px',fontSize:12}}/>
                  : (hero.pronouns||'—')}</dd>
                <dt>Age</dt>
                <dd>{edit
                  ? <input className="field-input" value={hero.age||''} onChange={e=>updField('age', e.target.value)} style={{padding:'2px 6px',fontSize:12}}/>
                  : (hero.age||'—')}</dd>
                <dt>Role</dt>
                <dd>{edit
                  ? <input className="field-input" value={hero.role||''} onChange={e=>updField('role', e.target.value)} style={{padding:'2px 6px',fontSize:12}}/>
                  : (hero.role||'—')}</dd>
                <dt>Align</dt>
                <dd>{edit
                  ? <select className="field-select" value={hero.alignment||''} onChange={e=>updField('alignment', e.target.value)} style={{padding:'2px 6px',fontSize:12}}>
                      <option value="">—</option>
                      {ALIGNMENTS.map(a => <option key={a}>{a}</option>)}
                    </select>
                  : (hero.alignment||'—')}</dd>
                <dt>Status</dt><dd style={{color:'var(--verdant)'}}>Canon</dd>
              </div>
            </Sec>

            <Sec title="Appearance">
              {edit
                ? <textarea className="field-area" rows="3" value={hero.appearance||''}
                            onChange={e=>updField('appearance', e.target.value)}/>
                : <p style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:13,lineHeight:1.5,margin:0}}>{hero.appearance||'—'}</p>}
            </Sec>
          </aside>

          {/* RIGHT — narrative */}
          <main className="sheet-main">
            <div className="sheet-header">
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)'}}>
                  {hero.kind} · {f?.name} · {el?.name}
                </div>
                {edit
                  ? <input value={hero.name} onChange={e=>updField('name', e.target.value)}
                           style={{background:'transparent',border:'none',outline:'none',fontFamily:'var(--display)',fontSize:38,letterSpacing:'.04em',color:'var(--ink)',width:'100%',padding:0,marginTop:4}}/>
                  : <h1 style={{fontFamily:'var(--display)',fontSize:42,letterSpacing:'.04em',color:'var(--ink)',margin:'4px 0 0',fontWeight:500,lineHeight:1.05}}>{hero.name}</h1>}
                {edit
                  ? <input value={hero.title||''} onChange={e=>updField('title', e.target.value)}
                           style={{background:'transparent',border:'none',outline:'none',fontFamily:'var(--serif)',fontStyle:'italic',fontSize:18,color:'var(--gold)',width:'100%',padding:0,marginTop:2}}/>
                  : <div style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:18,color:'var(--gold)',marginTop:2}}>{hero.title}</div>}
              </div>
              <div style={{display:'flex',gap:8}}>
                {!window.IS_VIEWER && !edit && <button className="btn" onClick={()=>setEdit(true)}><Icon name="pencil" size={12}/> Edit</button>}
                {!window.IS_VIEWER && edit && <button className="btn btn-primary" onClick={()=>setEdit(false)}><Icon name="check" size={12}/> Save</button>}
                {!window.IS_VIEWER && <button className="btn" onClick={()=>{ if(confirm('Delete this character?')) onDelete(hero.id); }}>✕ Delete</button>}
              </div>
            </div>

            {edit && (
              <Sec title="Faction & Element">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Kind</label>
                    <select className="field-select" value={hero.kind} onChange={e=>updField('kind', e.target.value)}>
                      {KINDS.map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Faction</label>
                    <select className="field-select" value={hero.faction} onChange={e=>updField('faction', e.target.value)}>
                      {window.FACTIONS.map(f => <option key={f.id} value={f.id}>{f.icon}  {f.name}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Element</label>
                    <select className="field-select" value={hero.element} onChange={e=>updField('element', e.target.value)}>
                      {window.ELEMENTS.map(e => <option key={e.id} value={e.id}>{e.icon}  {e.name}</option>)}
                    </select>
                  </div>
                </div>
              </Sec>
            )}

            <Sec title="Mission">
              {edit
                ? <textarea className="field-area" rows="2" value={hero.mission||''} onChange={e=>updField('mission', e.target.value)} placeholder="What drives them right now?"/>
                : <p style={{fontFamily:'var(--serif)',fontSize:16,lineHeight:1.5,color:'var(--ink)',margin:0,fontStyle:'italic'}}>"{hero.mission||'—'}"</p>}
            </Sec>

            <Sec title="Personality">
              <ChipList items={hero.personality} color="var(--gold-bright)"
                onAdd={v=>updArr('personality', [...(hero.personality||[]), v])}
                onRemove={i=>updArr('personality', hero.personality.filter((_,j)=>j!==i))}
                placeholder="+ trait"/>
            </Sec>

            <Sec title="Voice & manner">
              {edit
                ? <textarea className="field-area" rows="2" value={hero.voice||''} onChange={e=>updField('voice', e.target.value)} placeholder="How they speak, cadence, tics..."/>
                : <p style={{fontFamily:'var(--serif)',fontSize:14,lineHeight:1.55,color:'var(--ink-dim)',margin:0}}>{hero.voice||'—'}</p>}
            </Sec>

            <Sec title="Biography">
              {edit
                ? <textarea className="field-area" rows="3" value={hero.bio||''} onChange={e=>updField('bio', e.target.value)}/>
                : <p style={{fontFamily:'var(--serif)',fontSize:14,lineHeight:1.6,color:'var(--ink)',margin:0}}>{hero.bio||'—'}</p>}
            </Sec>

            <Sec title="Backstory">
              {edit
                ? <textarea className="field-area" rows="3" value={hero.backstory||''} onChange={e=>updField('backstory', e.target.value)}/>
                : <p style={{fontFamily:'var(--serif)',fontSize:14,lineHeight:1.6,color:'var(--ink-dim)',margin:0,fontStyle:'italic'}}>{hero.backstory||'—'}</p>}
            </Sec>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
              <Sec title="Abilities">
                <ChipList items={hero.abilities} color={el?.color||'var(--tide)'}
                  onAdd={v=>updArr('abilities', [...(hero.abilities||[]), v])}
                  onRemove={i=>updArr('abilities', hero.abilities.filter((_,j)=>j!==i))}
                  placeholder="+ ability"/>
              </Sec>
              <Sec title="Flaws">
                <ChipList items={hero.flaws} color="var(--ember)"
                  onAdd={v=>updArr('flaws', [...(hero.flaws||[]), v])}
                  onRemove={i=>updArr('flaws', hero.flaws.filter((_,j)=>j!==i))}
                  placeholder="+ flaw"/>
              </Sec>
              <Sec title="Bonds">
                <ChipList items={hero.bonds} color="var(--verdant)"
                  onAdd={v=>updArr('bonds', [...(hero.bonds||[]), v])}
                  onRemove={i=>updArr('bonds', hero.bonds.filter((_,j)=>j!==i))}
                  placeholder="+ bond"/>
              </Sec>
              <Sec title="Secrets">
                <ChipList items={hero.secrets} color="var(--umbra)"
                  onAdd={v=>updArr('secrets', [...(hero.secrets||[]), v])}
                  onRemove={i=>updArr('secrets', hero.secrets.filter((_,j)=>j!==i))}
                  placeholder="+ secret"/>
              </Sec>
            </div>

            <Sec title="Sample quotes">
              {(hero.quotes||[]).map((q,i) => (
                <blockquote key={i} style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:15,color:'var(--ink)',
                  borderLeft:`2px solid ${f?.color||'var(--gold)'}`,paddingLeft:14,margin:'8px 0',lineHeight:1.5,position:'relative'}}>
                  {edit
                    ? <textarea className="field-area" rows="2" value={q}
                        onChange={ev=>updArr('quotes', hero.quotes.map((x,j)=>j===i?ev.target.value:x))}/>
                    : q}
                  {edit && <span style={{position:'absolute',right:0,top:0,cursor:'pointer',color:'var(--ink-faint)'}}
                    onClick={()=>updArr('quotes', hero.quotes.filter((_,j)=>j!==i))}>✕</span>}
                </blockquote>
              ))}
              {edit && <button className="btn" onClick={()=>updArr('quotes', [...(hero.quotes||[]), 'New line...'])}><Icon name="add" size={12}/> Add quote</button>}
            </Sec>

            <Sec title="Relationships">
              {(hero.relations||[]).length === 0 && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)'}}>None recorded.</div>}
              {(hero.relations||[]).map((r,i) => {
                const other = heroes.find(x=>x.id===r.to);
                if(!other) return null;
                return (
                  <div key={i} className="rel-row" onClick={()=>onSelect(other.id)}>
                    <Portrait id={`hero-${other.id}`} glyph={other.glyph} color={window.FACTIONS.find(f=>f.id===other.faction)?.color} w={36} h={48}/>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'var(--display)',color:'var(--ink)',fontSize:14}}>{other.name}</div>
                      <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--gold)',fontSize:12}}>{r.kind}</div>
                    </div>
                    <Icon name="chevron" size={14}/>
                  </div>
                );
              })}
            </Sec>
          </main>
        </div>
      </div>
    </div>
  );
};

// ---------- Heroes Page ----------
const HeroesPage = () => {
  const [heroes, setHeroes] = window.useEntities ? window.useEntities('heroes') : React.useState(window.HEROES);
  const [openId, setOpenId] = React.useState(null);
  const [editNew, setEditNew] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');

  const openHero = heroes.find(h => h.id === openId);

  // Expose state to Athena
  React.useEffect(() => {
    window.STATE = window.STATE || {};
    window.STATE.heroes = heroes;
    window.STATE.athenaFocus = openHero ? { kind:'hero', data: openHero } : null;
    window.dispatchEvent(new CustomEvent('studio:focus-change'));
  }, [heroes, openHero]);

  const list = heroes.filter(h => {
    if(filter !== 'all' && h.kind.toLowerCase() !== filter) return false;
    if(q && !`${h.name} ${h.title} ${h.mission||''}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const updateHero = (next) => setHeroes(heroes.map(h => h.id === next.id ? next : h));

  const createHero = () => {
    const id = 'h' + (heroes.length + 1) + '-' + Date.now().toString(36);
    const blank = {
      id, name:'Unnamed', title:'(untitled)', kind:'NPC', faction:'warrior', element:'fire',
      glyph:'?', age:'', pronouns:'', alignment:'', role:'',
      bio:'', mission:'', personality:[], voice:'', appearance:'', backstory:'',
      abilities:[], flaws:[], bonds:[], secrets:[], quotes:[], relations:[],
    };
    setHeroes([blank, ...heroes]);
    setOpenId(id);
    setEditNew(true);
  };

  const deleteHero = (id) => {
    setHeroes(heroes.filter(h => h.id !== id));
    setOpenId(null);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">☥</span>Heroes &amp; NPCs</h1>
          <div className="page-sub">{heroes.length} named souls of Abraxas · click any to open the soul-sheet</div>
        </div>
        <div className="page-actions">
          <div className="search" style={{width:220}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search by name, mission..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          {!window.IS_VIEWER && <button className="btn btn-primary" onClick={createHero}><Icon name="add" size={14}/> New Character</button>}
        </div>
      </div>

      <div className="chip-row" style={{marginBottom:18}}>
        <div className={`chip ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>All ({heroes.length})</div>
        {KINDS.map(k => {
          const n = heroes.filter(h=>h.kind===k).length;
          return <div key={k} className={`chip ${filter===k.toLowerCase()?'active':''}`} onClick={()=>setFilter(k.toLowerCase())}>{k} ({n})</div>;
        })}
      </div>

      <div className="roster-grid">
        {list.map(h => <RosterCard key={h.id} h={h} onClick={()=>{ setOpenId(h.id); setEditNew(false); }}/>)}
        {list.length===0 && <div style={{padding:40,color:'var(--ink-faint)',fontStyle:'italic'}}>No characters match.</div>}
      </div>

      {openHero && (
        <HeroDetail
          hero={openHero}
          heroes={heroes}
          startEditing={editNew}
          onClose={()=>{ setOpenId(null); setEditNew(false); }}
          onChange={updateHero}
          onSelect={id => { setOpenId(id); setEditNew(false); }}
          onDelete={deleteHero}/>
      )}
    </div>
  );
};

window.HeroesPage = HeroesPage;
