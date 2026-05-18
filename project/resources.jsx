// Resources — every craftable/lootable in the game, with category, tier, and purpose.
// Editable, CRUD, persists. Athena can suggest recipes / crafts using these.

const RESOURCE_CATEGORIES = [
  { id:'core',     name:'Core Survival',      icon:'🍞', color:'#c9a14a',
    desc:'Constantly needed for camps, systems, and world events.' },
  { id:'biomut',   name:'Biological & Mutation', icon:'🧬', color:'#7a9a52',
    desc:'Evolution, cloning, experiments, SCP systems, advanced survivor upgrades.' },
  { id:'scp',      name:'SCP / Anomaly',      icon:'⚠️', color:'#a878d4',
    desc:'Dangerous and highly valuable. Forbidden crafting.' },
  { id:'camp',     name:'Camp & Industrial',  icon:'🏗', color:'#7d8590',
    desc:'Maintaining large camps and infrastructure.' },
  { id:'trade',    name:'Trade & Black Market', icon:'💰', color:'#d4a86a',
    desc:'Economy-focused — currency, contracts, smuggling.' },
  { id:'event',    name:'Rare Event',         icon:'★', color:'#d2b8ff',
    desc:'Appears during world events or legendary encounters.' },
];

const RESOURCE_TIERS = [
  { id:'1', name:'Tier 1 · Essential',  color:'#7a9a52' },
  { id:'2', name:'Tier 2 · Valuable',   color:'#c9a14a' },
  { id:'3', name:'Tier 3 · High-end',   color:'#a878d4' },
  { id:'4', name:'Tier 4 · Legendary',  color:'#cc2a3a' },
];

// Default seed — full canonical resource set from the design doc
window.RESOURCES = window.RESOURCES || [
  // CORE SURVIVAL — most are Tier 1
  { id:'food',          name:'Food',          icon:'🍞', category:'core',   tier:'1', purpose:'Feeds survivors, prevents morale loss, supports camp growth' },
  { id:'water',         name:'Water',         icon:'💧', category:'core',   tier:'1', purpose:'Hydration, farming, medical use, camp sustainability' },
  { id:'medicine',      name:'Medicine',      icon:'💊', category:'core',   tier:'1', purpose:'Healing injuries, curing infection, reviving survivors' },
  { id:'supplies',      name:'Supplies',      icon:'📦', category:'core',   tier:'1', purpose:'Generic crafting, repairs, camp operations' },
  { id:'fuel',          name:'Fuel',          icon:'⛽', category:'core',   tier:'1', purpose:'Powers generators, vehicles, drones, labs' },
  { id:'ammo',          name:'Ammo',          icon:'🔫', category:'core',   tier:'1', purpose:'Firearms, turrets, defense systems' },
  { id:'metal',         name:'Metal',         icon:'⚙', category:'core',   tier:'1', purpose:'Construction, weapons, camp upgrades' },
  { id:'wood',          name:'Wood',          icon:'🪵', category:'core',   tier:'1', purpose:'Barricades, camp expansion, crafting' },
  { id:'fabric',        name:'Fabric',        icon:'🧵', category:'core',   tier:'1', purpose:'Armor, medical wraps, survivor gear' },
  { id:'electronics',   name:'Electronics',   icon:'🔌', category:'core',   tier:'2', purpose:'Drones, scanners, advanced crafting' },
  { id:'batteries',     name:'Batteries',     icon:'🔋', category:'core',   tier:'2', purpose:'Portable power, field devices, robotics' },

  // BIO + MUTATION
  { id:'dna',           name:'DNA',           icon:'🧬', category:'biomut', tier:'2', purpose:'Cloning, fusion, evolution, genetic crafting' },
  { id:'mutant-organs', name:'Mutant Organs', icon:'🫀', category:'biomut', tier:'2', purpose:'Advanced biological upgrades and dark crafting' },
  { id:'bio-samples',   name:'Bio Samples',   icon:'🧪', category:'biomut', tier:'2', purpose:'Lab research and mutation studies' },
  { id:'blood-samples', name:'Blood Samples', icon:'🩸', category:'biomut', tier:'2', purpose:'Medical testing, infection analysis' },
  { id:'neural-tissue', name:'Neural Tissue', icon:'🧠', category:'biomut', tier:'2', purpose:'AI-linked units and memory extraction' },
  { id:'bone-fragments',name:'Bone Fragments',icon:'🦴', category:'biomut', tier:'2', purpose:'Dark crafting and relic fusion' },
  { id:'toxic-spores',  name:'Toxic Spores',  icon:'☣️', category:'biomut', tier:'2', purpose:'Poison crafting and contamination events' },

  // SCP / ANOMALY
  { id:'corrupted-essence', name:'Corrupted Essence', icon:'🦠', category:'scp', tier:'2', purpose:'Mutation systems, cursed upgrades, forbidden crafting' },
  { id:'memory-shards',     name:'Memory Shards',     icon:'💠', category:'scp', tier:'2', purpose:'Skill transfer, lore unlocks, revive systems' },
  { id:'relic-shards',      name:'Relic Shards',      icon:'❖', category:'scp', tier:'2', purpose:'Crafting relic weapons and artifacts' },
  { id:'void-fragments',    name:'Void Fragments',    icon:'⚫', category:'scp', tier:'3', purpose:'Reality-based crafting and unstable powers' },
  { id:'anomaly-cores',     name:'Anomaly Cores',     icon:'🌀', category:'scp', tier:'3', purpose:'High-tier crafting and dimensional systems' },
  { id:'kalon-fragments',   name:'Kalon Fragments',   icon:'⟁', category:'scp', tier:'3', purpose:'Kalon upgrades and evolution systems' },
  { id:'dark-matter',       name:'Dark Matter',       icon:'🌌', category:'scp', tier:'4', purpose:'Endgame crafting and legendary upgrades' },
  { id:'echo-dust',         name:'Echo Dust',         icon:'👻', category:'scp', tier:'3', purpose:'Ghost units and memory reconstruction' },

  // CAMP + INDUSTRIAL
  { id:'concrete',        name:'Concrete',        icon:'🧱', category:'camp', tier:'1', purpose:'Heavy structures and fortifications' },
  { id:'circuit-boards',  name:'Circuit Boards',  icon:'🖥', category:'camp', tier:'2', purpose:'Advanced electronics and AI systems' },
  { id:'mechanical-parts',name:'Mechanical Parts',icon:'⚙', category:'camp', tier:'2', purpose:'Vehicles, generators, turrets' },
  { id:'copper-wiring',   name:'Copper Wiring',   icon:'🧰', category:'camp', tier:'1', purpose:'Camp power systems' },
  { id:'gasoline',        name:'Gasoline',        icon:'⛽', category:'camp', tier:'1', purpose:'Vehicles and heavy machinery' },
  { id:'solar-cells',     name:'Solar Cells',     icon:'☀', category:'camp', tier:'2', purpose:'Renewable camp energy' },
  { id:'steel-plates',    name:'Steel Plates',    icon:'🛡', category:'camp', tier:'2', purpose:'Reinforced buildings and armored units' },

  // TRADE + BLACK MARKET
  { id:'credits',          name:'Credits',           icon:'💵', category:'trade', tier:'1', purpose:'Standard market currency' },
  { id:'black-market-tokens', name:'Black Market Tokens', icon:'🎟', category:'trade', tier:'2', purpose:'Underground market currency' },
  { id:'intel-files',      name:'Intel Files',       icon:'📡', category:'trade', tier:'2', purpose:'Missions, contracts, hidden zones' },
  { id:'forgery-kits',     name:'Forgery Kits',      icon:'📝', category:'trade', tier:'2', purpose:'Smuggling and fake identities' },
  { id:'contraband',       name:'Contraband',        icon:'📦', category:'trade', tier:'3', purpose:'Rare black market trade goods' },
  { id:'encrypted-data',   name:'Encrypted Data',    icon:'🔐', category:'trade', tier:'3', purpose:'AI research and advanced crafting' },

  // RARE EVENT
  { id:'ancient-tome',       name:'Ancient Tome',        icon:'📖', category:'event', tier:'3', purpose:'Unlocks rare abilities and lore' },
  { id:'world-seeds',        name:'World Seeds',         icon:'🌱', category:'event', tier:'4', purpose:'Legendary crafting and world systems' },
  { id:'dimensional-crystals',name:'Dimensional Crystals',icon:'💎', category:'event', tier:'4', purpose:'Portal systems and endgame upgrades' },
  { id:'phoenix-ash',        name:'Phoenix Ash',         icon:'🔥', category:'event', tier:'4', purpose:'Resurrection crafting' },
  { id:'frozen-hearts',      name:'Frozen Hearts',       icon:'❄', category:'event', tier:'3', purpose:'Cryo crafting and frost mutations' },
  { id:'living-flame',       name:'Living Flame',        icon:'🌋', category:'event', tier:'3', purpose:'Fire upgrades and destruction builds' },
];

const ResourcesPage = () => {
  const [resources, setResources] = window.useEntities ? window.useEntities('resources') : React.useState(window.RESOURCES);
  const [openId, setOpenId] = React.useState(null);
  const [filterCat, setFilterCat] = React.useState('all');
  const [filterTier, setFilterTier] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [view, setView] = React.useState('grouped'); // grouped | tier | list
  const settings = (window.SETTINGS||{});
  const me = settings.designerName || 'Team';

  const open = resources.find(r => r.id === openId);

  const update = (id, patch) => setResources(resources.map(r => r.id===id ? {...r, ...patch} : r));
  const create = () => {
    const id = (window.makeId ? window.makeId('res') : 'res-'+Date.now().toString(36));
    const r = { id, name:'New Resource', icon:'◇', category:'core', tier:'1', purpose:'Describe what it is used for.' };
    setResources([r, ...resources]); setOpenId(id);
  };
  const remove = (id) => {
    if(!confirm('Delete this resource? Recipes referencing it may need to be re-checked.')) return;
    setResources(resources.filter(r=>r.id!==id)); setOpenId(null);
  };

  const filtered = resources.filter(r =>
    (filterCat==='all' || r.category===filterCat)
    && (filterTier==='all' || r.tier===filterTier)
    && (!q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.purpose||'').toLowerCase().includes(q.toLowerCase()))
  );

  // Group by category for the default view
  const byCat = {};
  RESOURCE_CATEGORIES.forEach(c => byCat[c.id] = []);
  filtered.forEach(r => { if(byCat[r.category]) byCat[r.category].push(r); });

  const byTier = {};
  RESOURCE_TIERS.forEach(t => byTier[t.id] = []);
  filtered.forEach(r => { if(byTier[r.tier]) byTier[r.tier].push(r); });

  const renderCard = (r) => {
    const cat = RESOURCE_CATEGORIES.find(c=>c.id===r.category);
    const tier = RESOURCE_TIERS.find(t=>t.id===r.tier);
    return (
      <div key={r.id} className="resource-card" onClick={()=>setOpenId(r.id)}
        style={{borderLeftColor: cat?.color,
                borderColor: openId===r.id?'var(--gold-bright)':'var(--rule)',
                boxShadow: openId===r.id?'0 0 0 1px var(--gold-bright)':undefined}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:28,lineHeight:1,flex:'none',filter:`drop-shadow(0 0 4px ${cat?.color}55)`}}>{r.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'var(--display)',fontSize:14,color:'var(--ink)',letterSpacing:'.02em',lineHeight:1.2}}>{r.name}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink-faint)',marginTop:2,letterSpacing:'.08em',textTransform:'uppercase'}}>
              <span style={{color:tier?.color}}>T{r.tier}</span>
              <span style={{margin:'0 4px',color:'var(--ink-faint)'}}>·</span>
              <span>{cat?.name}</span>
            </div>
          </div>
        </div>
        <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:12,marginTop:6,lineHeight:1.4,
                     display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{r.purpose}</div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">📦</span>Resources</h1>
          <div className="page-sub">
            {resources.length} resource{resources.length!==1?'s':''} across {RESOURCE_CATEGORIES.length} categories ·
            {' '}<span style={{color:'#7a9a52'}}>{resources.filter(r=>r.tier==='1').length} essential</span> ·
            {' '}<span style={{color:'#cc2a3a'}}>{resources.filter(r=>r.tier==='4').length} legendary</span>
          </div>
        </div>
        <div className="page-actions">
          <div className="chip-row">
            <div className={`chip ${view==='grouped'?'active':''}`} onClick={()=>setView('grouped')}>By category</div>
            <div className={`chip ${view==='tier'?'active':''}`} onClick={()=>setView('tier')}>By tier</div>
            <div className={`chip ${view==='list'?'active':''}`} onClick={()=>setView('list')}>List</div>
          </div>
          <div className="search" style={{width:200}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search resources..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={create}><Icon name="add" size={14}/> New resource</button>
        </div>
      </div>

      {/* Filters */}
      <div className="chip-row" style={{marginBottom:10}}>
        <div className={`chip ${filterCat==='all'?'active':''}`} onClick={()=>setFilterCat('all')}>All categories</div>
        {RESOURCE_CATEGORIES.map(c => {
          const n = resources.filter(r=>r.category===c.id).length;
          return <div key={c.id} className={`chip ${filterCat===c.id?'active':''}`}
                      onClick={()=>setFilterCat(filterCat===c.id?'all':c.id)}
                      style={filterCat===c.id?{borderColor:c.color,color:c.color,background:c.color+'20'}:{}}>
            {c.icon} {c.name} ({n})
          </div>;
        })}
      </div>
      <div className="chip-row" style={{marginBottom:18}}>
        <div className={`chip ${filterTier==='all'?'active':''}`} onClick={()=>setFilterTier('all')}>All tiers</div>
        {RESOURCE_TIERS.map(t => {
          const n = resources.filter(r=>r.tier===t.id).length;
          return <div key={t.id} className={`chip ${filterTier===t.id?'active':''}`}
                      onClick={()=>setFilterTier(filterTier===t.id?'all':t.id)}
                      style={filterTier===t.id?{borderColor:t.color,color:t.color,background:t.color+'20'}:{}}>
            <span className="dot" style={{background:t.color}}/>{t.name} ({n})
          </div>;
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns: openId?'1fr 380px':'1fr',gap:24,alignItems:'start'}}>
        <div>
          {/* GROUPED BY CATEGORY */}
          {view === 'grouped' && (
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              {RESOURCE_CATEGORIES.map(c => {
                const items = byCat[c.id] || [];
                if(items.length === 0) return null;
                return (
                  <div key={c.id}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span style={{fontSize:18,filter:`drop-shadow(0 0 8px ${c.color}55)`}}>{c.icon}</span>
                      <span style={{fontFamily:'var(--display)',fontSize:14,letterSpacing:'.16em',textTransform:'uppercase',color:c.color}}>{c.name}</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>{items.length}</span>
                      <div style={{flex:1,height:1,background:`linear-gradient(90deg, ${c.color}66, transparent)`,marginLeft:4}}/>
                    </div>
                    <div style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:12,color:'var(--ink-dim)',marginBottom:10,paddingLeft:28}}>{c.desc}</div>
                    <div className="resource-grid">
                      {items.map(renderCard)}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{padding:30,color:'var(--ink-faint)',fontStyle:'italic',textAlign:'center'}}>No resources match these filters.</div>}
            </div>
          )}

          {/* BY TIER */}
          {view === 'tier' && (
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              {RESOURCE_TIERS.map(t => {
                const items = byTier[t.id] || [];
                if(items.length === 0) return null;
                return (
                  <div key={t.id}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <span className="pill" style={{borderColor:t.color,color:t.color,fontSize:11}}>{t.name}</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>{items.length}</span>
                      <div style={{flex:1,height:1,background:`linear-gradient(90deg, ${t.color}66, transparent)`,marginLeft:4}}/>
                    </div>
                    <div className="resource-grid">
                      {items.map(renderCard)}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{padding:30,color:'var(--ink-faint)',fontStyle:'italic',textAlign:'center'}}>No resources match these filters.</div>}
            </div>
          )}

          {/* LIST */}
          {view === 'list' && (
            <div className="panel">
              <table className="ledger">
                <thead><tr>
                  <th></th><th>Name</th><th>Category</th><th>Tier</th><th>Purpose</th>
                </tr></thead>
                <tbody>
                  {filtered.map(r => {
                    const cat = RESOURCE_CATEGORIES.find(c=>c.id===r.category);
                    const tier = RESOURCE_TIERS.find(t=>t.id===r.tier);
                    return (
                      <tr key={r.id} style={{cursor:'pointer',background:r.id===openId?'rgba(201,161,74,.05)':undefined}} onClick={()=>setOpenId(r.id)}>
                        <td style={{fontSize:20,width:32}}>{r.icon}</td>
                        <td style={{fontFamily:'var(--display)',color:'var(--ink)'}}>{r.name}</td>
                        <td><span className="pill" style={{borderColor:cat?.color,color:cat?.color}}>{cat?.icon} {cat?.name}</span></td>
                        <td><span className="pill" style={{borderColor:tier?.color,color:tier?.color}}>{tier?.name.split(' ')[0]+' '+tier?.name.split(' ')[1]}</span></td>
                        <td style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:13,maxWidth:480}}>{r.purpose}</td>
                      </tr>
                    );
                  })}
                  {filtered.length===0 && <tr><td colSpan="5" style={{textAlign:'center',padding:30,color:'var(--ink-faint)',fontStyle:'italic'}}>No resources match.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DETAIL */}
        {open && (
          <div className="panel" style={{position:'sticky',top:0}}>
            <div className="panel-head">
              <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
                <span style={{fontSize:24,lineHeight:1}}>{open.icon}</span>
                <input value={open.name} onChange={e=>update(open.id,{name:e.target.value})}
                  style={{flex:1,background:'transparent',border:'none',outline:'none',
                    fontFamily:'var(--display)',fontSize:16,letterSpacing:'.04em',color:'var(--gold-bright)',padding:0}}/>
              </div>
              <button className="btn" onClick={()=>setOpenId(null)}>✕</button>
            </div>
            <div className="panel-body" style={{display:'grid',gap:10}}>
              <div style={{display:'grid',gridTemplateColumns:'80px 1fr',gap:8}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Icon</label>
                  <input className="field-input" value={open.icon} maxLength={4} style={{textAlign:'center',fontSize:18}}
                         onChange={e=>update(open.id,{icon:e.target.value})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">ID</label>
                  <input className="field-input" value={open.id} disabled style={{fontFamily:'var(--mono)',fontSize:11,opacity:.6}}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Category</label>
                  <select className="field-select" value={open.category} onChange={e=>update(open.id,{category:e.target.value})}>
                    {RESOURCE_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Tier</label>
                  <select className="field-select" value={open.tier} onChange={e=>update(open.id,{tier:e.target.value})}>
                    {RESOURCE_TIERS.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field" style={{margin:0}}>
                <label className="field-label">Purpose</label>
                <textarea className="field-area" rows="4" value={open.purpose||''} onChange={e=>update(open.id,{purpose:e.target.value})}/>
              </div>
              <div className="field" style={{margin:0}}>
                <label className="field-label">Crafting notes (optional)</label>
                <textarea className="field-area" rows="3" value={open.notes||''} onChange={e=>update(open.id,{notes:e.target.value})}
                  placeholder="Where it drops, what it crafts, alternative names…"/>
              </div>
              <div style={{display:'flex',gap:6,marginTop:6}}>
                <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)'}}>✕ Delete</button>
                <div style={{flex:1}}/>
                <button className="btn" onClick={async ()=>{
                  try {
                    const reply = await window.claude.complete({
                      messages:[{ role:'user', content:
`You are Athena, a creative AI for a game studio. Suggest 3 craftable items or upgrades that use the resource "${open.name}" (${open.purpose}). Be concise (one line each). Lean into the world of Abraxas (dark fantasy, illuminated-manuscript tone).` }],
                    });
                    update(open.id, { notes: (open.notes ? open.notes + '\n\n' : '') + '🦉 Athena suggestions:\n' + reply });
                  } catch(err) {
                    alert('Athena stumbled: ' + (err.message||err));
                  }
                }}>🦉 Suggest crafts</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

window.ResourcesPage = ResourcesPage;
