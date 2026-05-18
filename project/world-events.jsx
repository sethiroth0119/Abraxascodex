// World Events — Dynamic AI-controlled events that reshape the economy.
// Team can author event templates, tune severity, view live "simulated" status,
// nerf/buff via per-resource modifier sliders.

window.WORLD_EVENTS = window.WORLD_EVENTS || [
  {
    id:'we-camp-famine', name:'Camp Famine', icon:'🍞', severity:'2',
    type:'negative', enabled:true,
    duration:{min:180, max:480}, // minutes
    announceStart:'WORLD EVENT: CAMP FAMINE DETECTED\nFood and Water supplies have dropped across survivor territories. Food and Water are now harder to find for the next 6 hours. Medicine prices may rise due to sickness risk.',
    announceEnd:'WORLD EVENT ENDED: CAMP FAMINE\nFood and Water drops have returned to normal. Market prices may remain unstable while players recover.',
    description:'Camps run dry. Famine spreads through survivor territories.',
    triggerConditions:['Over-farming of Food + Water', 'Server economy oversupply', 'Random'],
    affectedZones:['Camp grounds','Farming villages','Shelter districts'],
    modifiers:[
      { resource:'food',     pct:-70 },
      { resource:'water',    pct:-60 },
      { resource:'medicine', pct:-25 },
    ],
    triggers:240, lastFired: Date.now() - 5*86400_000,
    notes:'',
  },
  {
    id:'we-scp', name:'SCP Outbreak', icon:'⚠️', severity:'3',
    type:'mixed', enabled:true,
    duration:{min:240, max:600},
    announceStart:'WORLD EVENT: SCP OUTBREAK\nAn SCP containment breach has spread through abandoned zones. Corrupted Essence drops are increased, but Medicine, Ammo, and Supplies are harder to gather.',
    announceEnd:'WORLD EVENT ENDED: SCP OUTBREAK\nContainment restored. Anomaly drop rates have returned to normal.',
    description:'A containment breach spreads anomalies through abandoned zones.',
    triggerConditions:['SCP zones over-explored','High Memory Shard supply','Random'],
    affectedZones:['Abandoned facilities','SCP containment sites','Anomaly fields'],
    modifiers:[
      { resource:'medicine',          pct:-50 },
      { resource:'ammo',              pct:-30 },
      { resource:'supplies',          pct:-40 },
      { resource:'corrupted-essence', pct:+80 },
      { resource:'dna',               pct:+30 },
    ],
    triggers:120, lastFired: Date.now() - 3*86400_000,
    notes:'',
  },
  {
    id:'we-dim-storm', name:'Dimensional Storm', icon:'🌀', severity:'3',
    type:'mixed', enabled:true,
    duration:{min:180, max:480},
    announceStart:'WORLD EVENT: DIMENSIONAL STORM\nReality folds across abandoned zones. Memory Shards bloom; Fuel grows scarce.',
    announceEnd:'WORLD EVENT ENDED: DIMENSIONAL STORM\nThe storm has passed.',
    description:'A reality storm warps drops and pulls anomalies through.',
    triggerConditions:['High Anomaly Core circulation','Random'],
    affectedZones:['Anomaly fields','Void tears','Old battlefields'],
    modifiers:[
      { resource:'fuel',              pct:-50 },
      { resource:'memory-shards',     pct:+100 },
      { resource:'corrupted-essence', pct:+50 },
      { resource:'metal',             pct:-20 },
    ],
    triggers:80, lastFired: Date.now() - 8*86400_000,
    notes:'',
  },
  {
    id:'we-infected', name:'Infected Invasion', icon:'🦠', severity:'3',
    type:'negative', enabled:true,
    duration:{min:240, max:720},
    announceStart:'WORLD EVENT: INFECTED INVASION\nThe Infected have surged through survivor districts. Medicine is critically scarce.',
    announceEnd:'WORLD EVENT ENDED: INFECTED INVASION\nThe surge has retreated. Stabilising supplies.',
    description:'Infected hordes overrun survivor districts.',
    triggerConditions:['High infection rate','Low Medicine in circulation'],
    affectedZones:['Abandoned Hospital','City Sewers','Old Shelter District'],
    modifiers:[
      { resource:'medicine', pct:-75 },
      { resource:'food',     pct:-35 },
      { resource:'ammo',     pct:-45 },
      { resource:'dna',      pct:+70 },
    ],
    triggers:60, lastFired: Date.now() - 86400_000,
    notes:'',
  },
  {
    id:'we-relic-corruption', name:'Relic Corruption', icon:'❖', severity:'2',
    type:'mixed', enabled:true,
    duration:{min:120, max:360},
    announceStart:'WORLD EVENT: RELIC CORRUPTION\nRelic fields hum with corruption. Bonus drops, but medical sites suffer.',
    announceEnd:'WORLD EVENT ENDED: RELIC CORRUPTION\nFields stabilised.',
    description:'Relic fields radiate corruption, boosting cursed loot and crippling supply chains.',
    triggerConditions:['High Relic Shard supply','Random'],
    affectedZones:['Relic fields','Old shrines','Cursed ruins'],
    modifiers:[
      { resource:'memory-shards',     pct:+60 },
      { resource:'corrupted-essence', pct:+100 },
      { resource:'medicine',          pct:-30 },
      { resource:'supplies',          pct:-35 },
    ],
    triggers:55, lastFired: Date.now() - 4*86400_000,
    notes:'',
  },
  {
    id:'we-city-collapse', name:'City Collapse', icon:'🏚', severity:'2',
    type:'mixed', enabled:true,
    duration:{min:180, max:480},
    announceStart:'WORLD EVENT: CITY COLLAPSE\nA major district has fallen. Scavenge while you can — but power and water break first.',
    announceEnd:'WORLD EVENT ENDED: CITY COLLAPSE\nThe rubble has settled.',
    description:'A district collapses, flooding the market with metal but choking utilities.',
    triggerConditions:['Random','Server timer'],
    affectedZones:['Collapsed downtown','Old industrial sector'],
    modifiers:[
      { resource:'metal',     pct:+80 },
      { resource:'fuel',      pct:-40 },
      { resource:'water',     pct:-50 },
      { resource:'supplies',  pct:+30 },
      { resource:'medicine',  pct:-30 },
    ],
    triggers:40, lastFired: Date.now() - 9*86400_000,
    notes:'',
  },
  {
    id:'we-resource-boom', name:'Resource Boom', icon:'📈', severity:'1',
    type:'positive', enabled:true,
    duration:{min:60, max:180},
    announceStart:'WORLD EVENT: RESOURCE BOOM\nA supply surge sweeps the regions. Common drops are up — go scavenge.',
    announceEnd:'WORLD EVENT ENDED: RESOURCE BOOM\nThe surge has passed.',
    description:'A short-lived surge in common resource availability.',
    triggerConditions:['Random','Counter to recent scarcity'],
    affectedZones:['All overworld'],
    modifiers:[
      { resource:'metal',    pct:+50 },
      { resource:'fuel',     pct:+40 },
      { resource:'supplies', pct:+60 },
    ],
    triggers:90, lastFired: Date.now() - 2*86400_000,
    notes:'',
  },
  {
    id:'we-clean-water', name:'Clean Water Discovery', icon:'💧', severity:'1',
    type:'positive', enabled:true,
    duration:{min:60, max:180},
    announceStart:'WORLD EVENT: CLEAN WATER DISCOVERY\nA spring runs clean. Water is abundant in nearby zones for a short time.',
    announceEnd:'WORLD EVENT ENDED: CLEAN WATER DISCOVERY\nThe spring has run dry.',
    description:'A fresh water source surfaces, easing scarcity.',
    triggerConditions:['Counter to drought events','Random'],
    affectedZones:['Riverside','Old aqueducts'],
    modifiers:[
      { resource:'water', pct:+100 },
    ],
    triggers:30, lastFired: Date.now() - 12*86400_000,
    notes:'',
  },
];

const EVENT_SEVERITIES = [
  { id:'1', name:'Warning',     color:'#7d8590' },
  { id:'2', name:'Crisis',      color:'#c9a14a' },
  { id:'3', name:'Disaster',    color:'#ff7755' },
  { id:'4', name:'Catastrophe', color:'#cc2a3a' },
  { id:'5', name:'Extinction',  color:'#d2b8ff' },
];

const EVENT_TYPES = [
  { id:'negative', name:'Negative', color:'#cc2a3a' },
  { id:'positive', name:'Positive', color:'#7a9a52' },
  { id:'mixed',    name:'Mixed',    color:'#c9a14a' },
];

// New event types from the design doc — for the New Event picker
const TEMPLATE_NAMES = [
  'SCP Outbreak','Camp Famine','Dimensional Storm','Infected Invasion','Relic Corruption',
  'City Collapse','Fuel Shortage','Water Poisoning','Black Market Raid','Cult Uprising',
  'Kalon Instability','Tombstone Plague','Memory Collapse','Monster Migration','Resource Boom',
  'Power Grid Failure','Medical Crisis','Trade Route Ambush','Ancient Relic Awakening','Abandoned Zone Lockdown',
  'Clean Water Discovery','Medical Shipment Crash','Relic Surge','Survivor Caravan',
];

function fmtDuration(mins) {
  if(mins < 60) return mins + 'm';
  const h = Math.floor(mins/60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function rtWE(ts) {
  if(!ts) return 'never';
  const d = Date.now() - ts;
  if(d < 60_000) return 'just now';
  if(d < 3_600_000) return Math.floor(d/60_000) + 'm ago';
  if(d < 86_400_000) return Math.floor(d/3_600_000) + 'h ago';
  return Math.floor(d/86_400_000) + 'd ago';
}

const WorldEventsPage = () => {
  const [events, setEvents] = window.useEntities ? window.useEntities('worldEvents') : React.useState(window.WORLD_EVENTS);
  const [openId, setOpenId] = React.useState(events[0]?.id);
  const [view, setView] = React.useState('cards'); // cards | list | director
  const [filterSeverity, setFilterSeverity] = React.useState('all');
  const [filterType, setFilterType] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [createModal, setCreateModal] = React.useState(false);
  const [draft, setDraft] = React.useState({ name:'', icon:'⚠️', severity:'2', type:'negative', description:'' });

  React.useEffect(() => { if(!events.find(e=>e.id===openId) && events.length) setOpenId(events[0].id); }, [events, openId]);

  const open = events.find(e => e.id === openId);
  const update = (id, patch) => setEvents(events.map(e => e.id===id ? {...e, ...patch} : e));

  const submitNew = () => {
    if(!draft.name.trim()) return;
    const id = 'we-' + draft.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,30) + '-' + Date.now().toString(36).slice(-4);
    const e = {
      id, name: draft.name.trim(), icon: draft.icon||'⚠️', severity: draft.severity,
      type: draft.type, enabled: true,
      duration:{min:60, max:240},
      announceStart:`WORLD EVENT: ${draft.name.toUpperCase()}\n${draft.description||''}`,
      announceEnd:`WORLD EVENT ENDED: ${draft.name.toUpperCase()}\nConditions return to normal.`,
      description: draft.description.trim(),
      triggerConditions:['Random'],
      affectedZones:[],
      modifiers:[],
      triggers:0, lastFired:null, notes:'',
    };
    setEvents([e, ...events]); setOpenId(id); setCreateModal(false);
    setDraft({ name:'', icon:'⚠️', severity:'2', type:'negative', description:'' });
  };

  const remove = (id) => {
    if(!confirm('Delete this world event template? Players will no longer see it.')) return;
    setEvents(events.filter(e=>e.id!==id)); setOpenId(events[0]?.id);
  };

  const filtered = events.filter(e =>
    (filterSeverity==='all' || e.severity===filterSeverity)
    && (filterType==='all' || e.type===filterType)
    && (!q || e.name.toLowerCase().includes(q.toLowerCase()) || (e.description||'').toLowerCase().includes(q.toLowerCase()))
  );

  // ---- Director / monitoring view summary ----
  const recentlyFired = events.filter(e => e.lastFired && (Date.now()-e.lastFired) < 7*86400_000)
                              .sort((a,b)=>b.lastFired - a.lastFired);
  const mostTriggered = [...events].sort((a,b)=>(b.triggers||0)-(a.triggers||0)).slice(0,5);

  // Resource impact heatmap (sum of |pct| across all enabled events)
  const resourceHeat = {};
  events.filter(e=>e.enabled).forEach(e => (e.modifiers||[]).forEach(m => {
    resourceHeat[m.resource] = (resourceHeat[m.resource]||0) + Math.abs(m.pct);
  }));
  const topResources = Object.entries(resourceHeat).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const findRes = id => (window.RESOURCES||[]).find(r => r.id === id);

  const renderEventCard = (e) => {
    const sev = EVENT_SEVERITIES.find(s=>s.id===e.severity);
    const typ = EVENT_TYPES.find(t=>t.id===e.type);
    return (
      <div key={e.id} className="we-card" onClick={()=>setOpenId(e.id)}
        style={{borderLeftColor: sev?.color,
                opacity: e.enabled?1:0.5,
                borderColor: openId===e.id?'var(--gold-bright)':'var(--rule)',
                boxShadow: openId===e.id?'0 0 0 1px var(--gold-bright)':undefined}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:32,lineHeight:1,flex:'none',filter:`drop-shadow(0 0 6px ${sev?.color}66)`}}>{e.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'var(--display)',fontSize:15,color:'var(--ink)',letterSpacing:'.04em'}}>{e.name}</div>
            <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
              <span className="pill" style={{borderColor:sev?.color,color:sev?.color,fontSize:9}}>L{e.severity} · {sev?.name}</span>
              <span className="pill" style={{borderColor:typ?.color,color:typ?.color,fontSize:9}}>{typ?.name}</span>
              {!e.enabled && <span className="pill" style={{borderColor:'var(--ink-faint)',color:'var(--ink-faint)',fontSize:9}}>disabled</span>}
            </div>
          </div>
        </div>
        <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:12,marginTop:8,lineHeight:1.4,
                     display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{e.description}</div>
        <div style={{display:'flex',gap:10,marginTop:8,fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',letterSpacing:'.06em'}}>
          <span>⏱ {fmtDuration(e.duration.min)}–{fmtDuration(e.duration.max)}</span>
          <span>·</span>
          <span>{(e.modifiers||[]).length} mods</span>
          <span style={{marginLeft:'auto'}}>last · {rtWE(e.lastFired)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">🌪</span>World Events</h1>
          <div className="page-sub">
            {events.length} event template{events.length!==1?'s':''} ·
            {' '}<span style={{color:'var(--verdant)'}}>{events.filter(e=>e.enabled).length} live</span> ·
            {' '}<span style={{color:'var(--ink-faint)'}}>{events.filter(e=>!e.enabled).length} disabled</span>
          </div>
        </div>
        <div className="page-actions">
          <div className="chip-row">
            <div className={`chip ${view==='cards'?'active':''}`} onClick={()=>setView('cards')}>Cards</div>
            <div className={`chip ${view==='list'?'active':''}`} onClick={()=>setView('list')}>List</div>
            <div className={`chip ${view==='director'?'active':''}`} onClick={()=>setView('director')}>AI Director</div>
          </div>
          <div className="search" style={{width:200}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search events..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={()=>setCreateModal(true)}><Icon name="add" size={14}/> New event</button>
        </div>
      </div>

      <div className="chip-row" style={{marginBottom:10}}>
        <div className={`chip ${filterSeverity==='all'?'active':''}`} onClick={()=>setFilterSeverity('all')}>All severity</div>
        {EVENT_SEVERITIES.map(s => {
          const n = events.filter(e=>e.severity===s.id).length;
          if(!n && filterSeverity !== s.id) return null;
          return <div key={s.id} className={`chip ${filterSeverity===s.id?'active':''}`}
                      onClick={()=>setFilterSeverity(filterSeverity===s.id?'all':s.id)}
                      style={filterSeverity===s.id?{borderColor:s.color,color:s.color,background:s.color+'20'}:{}}>
            <span className="dot" style={{background:s.color}}/>L{s.id} {s.name} ({n})
          </div>;
        })}
      </div>
      <div className="chip-row" style={{marginBottom:18}}>
        <div className={`chip ${filterType==='all'?'active':''}`} onClick={()=>setFilterType('all')}>All types</div>
        {EVENT_TYPES.map(t => {
          const n = events.filter(e=>e.type===t.id).length;
          if(!n && filterType !== t.id) return null;
          return <div key={t.id} className={`chip ${filterType===t.id?'active':''}`}
                      onClick={()=>setFilterType(filterType===t.id?'all':t.id)}
                      style={filterType===t.id?{borderColor:t.color,color:t.color,background:t.color+'20'}:{}}>{t.name} ({n})</div>;
        })}
      </div>

      {view !== 'director' && (
        <div style={{display:'grid',gridTemplateColumns: open?'1fr 460px':'1fr',gap:24,alignItems:'start'}}>
          <div>
            {view === 'cards' && (
              <div className="we-grid">
                {filtered.map(renderEventCard)}
                {filtered.length===0 && <div style={{padding:40,color:'var(--ink-faint)',fontStyle:'italic',textAlign:'center',gridColumn:'1 / -1'}}>No events match.</div>}
              </div>
            )}
            {view === 'list' && (
              <div className="panel">
                <table className="ledger">
                  <thead><tr>
                    <th></th><th>Name</th><th>Severity</th><th>Type</th><th>Duration</th><th>Modifiers</th><th>Triggers</th><th>Last fired</th><th></th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(e => {
                      const sev = EVENT_SEVERITIES.find(s=>s.id===e.severity);
                      const typ = EVENT_TYPES.find(t=>t.id===e.type);
                      return (
                        <tr key={e.id} style={{cursor:'pointer',background: e.id===openId?'rgba(201,161,74,.05)':undefined,opacity:e.enabled?1:0.55}} onClick={()=>setOpenId(e.id)}>
                          <td style={{fontSize:18,width:32}}>{e.icon}</td>
                          <td style={{fontFamily:'var(--display)'}}>{e.name}</td>
                          <td><span className="pill" style={{borderColor:sev?.color,color:sev?.color}}>L{e.severity} {sev?.name}</span></td>
                          <td><span className="pill" style={{borderColor:typ?.color,color:typ?.color}}>{typ?.name}</span></td>
                          <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-dim)'}}>{fmtDuration(e.duration.min)}–{fmtDuration(e.duration.max)}</td>
                          <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-dim)'}}>{(e.modifiers||[]).length}</td>
                          <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--gold-bright)',textAlign:'right'}}>{e.triggers||0}</td>
                          <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>{rtWE(e.lastFired)}</td>
                          <td><label style={{cursor:'pointer'}} onClick={ev=>ev.stopPropagation()}><input type="checkbox" checked={e.enabled} onChange={ev=>update(e.id,{enabled:ev.target.checked})}/></label></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Editor panel */}
          {open && (() => {
            const sev = EVENT_SEVERITIES.find(s=>s.id===open.severity);
            return (
              <div className="panel" style={{position:'sticky',top:0,maxHeight:'calc(100vh - 200px)',overflow:'auto'}}>
                <div className="panel-head" style={{flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
                    <input value={open.icon} maxLength={4} onChange={e=>update(open.id,{icon:e.target.value})}
                      style={{width:42,background:'transparent',border:'1px solid var(--rule)',borderRadius:4,outline:'none',
                        fontSize:20,textAlign:'center',padding:'2px 4px',color:'var(--ink)'}}/>
                    <input value={open.name} onChange={e=>update(open.id,{name:e.target.value})}
                      style={{flex:1,background:'transparent',border:'none',outline:'none',
                        fontFamily:'var(--display)',fontSize:16,letterSpacing:'.04em',color:'var(--gold-bright)',padding:0}}/>
                  </div>
                  <button className="btn" onClick={()=>setOpenId(null)}>✕</button>
                </div>
                <div className="panel-body" style={{display:'grid',gap:10}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Severity</label>
                      <select className="field-select" value={open.severity} onChange={e=>update(open.id,{severity:e.target.value})}>
                        {EVENT_SEVERITIES.map(s=><option key={s.id} value={s.id}>L{s.id} {s.name}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Type</label>
                      <select className="field-select" value={open.type} onChange={e=>update(open.id,{type:e.target.value})}>
                        {EVENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Live?</label>
                      <button className="btn" style={{padding:'6px 8px',color:open.enabled?'var(--verdant)':'var(--ink-faint)'}}
                              onClick={()=>update(open.id,{enabled:!open.enabled})}>
                        {open.enabled ? '● ENABLED' : '○ disabled'}
                      </button>
                    </div>
                  </div>

                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Description</label>
                    <textarea className="field-area" rows="2" value={open.description||''} onChange={e=>update(open.id,{description:e.target.value})}/>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Min duration (min)</label>
                      <input type="number" className="field-input" value={open.duration.min}
                        onChange={e=>update(open.id,{duration:{...open.duration, min:+e.target.value||0}})}/>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Max duration (min)</label>
                      <input type="number" className="field-input" value={open.duration.max}
                        onChange={e=>update(open.id,{duration:{...open.duration, max:+e.target.value||0}})}/>
                    </div>
                  </div>

                  {/* Modifiers — nerf/buff */}
                  <div style={{paddingTop:10,borderTop:'1px solid var(--rule)'}}>
                    <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
                      <div className="field-label" style={{margin:0}}>Resource modifiers · nerf / buff</div>
                      <button className="btn btn-ghost" style={{marginLeft:'auto',padding:'2px 6px',fontSize:11}}
                        onClick={()=>{
                          const first = (window.RESOURCES||[])[0];
                          if(!first) return;
                          update(open.id,{modifiers:[...(open.modifiers||[]), {resource:first.id, pct:-25}]});
                        }}>
                        <Icon name="add" size={11}/> Add modifier
                      </button>
                    </div>
                    {(open.modifiers||[]).map((m,i) => {
                      const r = findRes(m.resource);
                      const pos = m.pct >= 0;
                      return (
                        <div key={i} style={{display:'grid',gridTemplateColumns:'24px 1fr 80px 24px',gap:6,alignItems:'center',padding:'5px 0',borderBottom:'1px dashed var(--rule)'}}>
                          <span style={{fontSize:16}}>{r?.icon || '◇'}</span>
                          <select className="field-select" value={m.resource} style={{padding:'3px 6px',fontSize:11}}
                            onChange={e=>{
                              const next=[...open.modifiers]; next[i]={...m,resource:e.target.value}; update(open.id,{modifiers:next});
                            }}>
                            {(window.RESOURCES||[]).map(r=><option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
                          </select>
                          <input type="number" value={m.pct} className="field-input"
                            style={{padding:'3px 6px',fontSize:12,textAlign:'right',fontFamily:'var(--mono)',
                              color: pos?'var(--verdant)':'var(--ember)'}}
                            onChange={e=>{
                              const next=[...open.modifiers]; next[i]={...m,pct:+e.target.value||0}; update(open.id,{modifiers:next});
                            }}/>
                          <button className="btn btn-ghost" style={{padding:'2px 4px',fontSize:11,color:'var(--ink-faint)'}}
                            onClick={()=>update(open.id,{modifiers:open.modifiers.filter((_,j)=>j!==i)})}>✕</button>
                        </div>
                      );
                    })}
                    {(open.modifiers||[]).length === 0 && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)',fontSize:12,padding:6}}>No modifiers. Add one above.</div>}
                  </div>

                  {/* Affected zones */}
                  <div style={{paddingTop:10,borderTop:'1px solid var(--rule)'}}>
                    <div className="field-label" style={{marginBottom:6}}>Affected zones</div>
                    <div className="chip-row">
                      {(open.affectedZones||[]).map((z,i) => (
                        <span key={i} className="chip active">{z}
                          <span style={{marginLeft:6,opacity:.7,cursor:'pointer'}} onClick={()=>update(open.id,{affectedZones:open.affectedZones.filter((_,j)=>j!==i)})}>×</span>
                        </span>
                      ))}
                      <input placeholder="+ zone"
                        onKeyDown={e=>{ if(e.key==='Enter'&&e.target.value.trim()){update(open.id,{affectedZones:[...(open.affectedZones||[]),e.target.value.trim()]}); e.target.value='';}}}
                        style={{background:'transparent',border:'1px dashed var(--rule-strong)',borderRadius:99,color:'var(--ink)',padding:'4px 10px',fontSize:11,fontFamily:'var(--body)',width:130,outline:'none'}}/>
                    </div>
                  </div>

                  {/* Trigger conditions */}
                  <div style={{paddingTop:10,borderTop:'1px solid var(--rule)'}}>
                    <div className="field-label" style={{marginBottom:6}}>Trigger conditions</div>
                    <div className="chip-row">
                      {(open.triggerConditions||[]).map((t,i) => (
                        <span key={i} className="chip active">{t}
                          <span style={{marginLeft:6,opacity:.7,cursor:'pointer'}} onClick={()=>update(open.id,{triggerConditions:open.triggerConditions.filter((_,j)=>j!==i)})}>×</span>
                        </span>
                      ))}
                      <input placeholder="+ condition"
                        onKeyDown={e=>{ if(e.key==='Enter'&&e.target.value.trim()){update(open.id,{triggerConditions:[...(open.triggerConditions||[]),e.target.value.trim()]}); e.target.value='';}}}
                        style={{background:'transparent',border:'1px dashed var(--rule-strong)',borderRadius:99,color:'var(--ink)',padding:'4px 10px',fontSize:11,fontFamily:'var(--body)',width:160,outline:'none'}}/>
                    </div>
                  </div>

                  {/* Announcements */}
                  <div className="field" style={{margin:0,marginTop:8}}>
                    <label className="field-label">World chat — start announcement</label>
                    <textarea className="field-area" rows="3" value={open.announceStart||''} onChange={e=>update(open.id,{announceStart:e.target.value})}/>
                  </div>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">World chat — end announcement</label>
                    <textarea className="field-area" rows="2" value={open.announceEnd||''} onChange={e=>update(open.id,{announceEnd:e.target.value})}/>
                  </div>

                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Team notes</label>
                    <textarea className="field-area" rows="3" value={open.notes||''} onChange={e=>update(open.id,{notes:e.target.value})}
                      placeholder="Tuning notes, why it was nerfed/buffed, related telemetry…"/>
                  </div>

                  <div style={{display:'flex',gap:6,marginTop:6}}>
                    <button className="btn" onClick={async ()=>{
                      try {
                        const reply = await window.claude.complete({
                          messages:[{ role:'user', content:
`You are Athena, the AI Event Director for "Mythic story of Abraxas".

Review this world event and suggest:
1. Whether it should be nerfed or buffed (and why)
2. One additional modifier that would make it more interesting
3. A balance risk to watch

Be concise (4-6 sentences).

EVENT: ${open.name}
SEVERITY: ${open.severity}/5  TYPE: ${open.type}
DESCRIPTION: ${open.description}
DURATION: ${fmtDuration(open.duration.min)}–${fmtDuration(open.duration.max)}
MODIFIERS:
${(open.modifiers||[]).map(m => `  ${findRes(m.resource)?.name || m.resource}: ${m.pct>0?'+':''}${m.pct}%`).join('\n') || '  (none)'}` }],
                        });
                        update(open.id,{notes: (open.notes ? open.notes + '\n\n' : '') + '🦉 Athena · balance review:\n' + reply});
                      } catch(err) { alert('Athena stumbled: '+(err.message||err)); }
                    }}>🦉 Balance review</button>
                    <button className="btn" onClick={()=>update(open.id,{triggers:(open.triggers||0)+1,lastFired:Date.now()})}>↻ Mark fired</button>
                    <div style={{flex:1}}/>
                    <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)'}}>✕ Delete</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* AI Director view */}
      {view === 'director' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Recently fired</div></div>
            <div className="panel-body">
              {recentlyFired.length === 0 && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)'}}>No events fired in the last 7 days.</div>}
              {recentlyFired.map(e => {
                const sev = EVENT_SEVERITIES.find(s=>s.id===e.severity);
                return (
                  <div key={e.id} style={{display:'flex',gap:10,alignItems:'center',padding:'8px 0',borderBottom:'1px dashed var(--rule)',cursor:'pointer'}} onClick={()=>{setView('cards');setOpenId(e.id);}}>
                    <span style={{fontSize:20}}>{e.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'var(--display)',fontSize:13,color:'var(--ink)'}}>{e.name}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>{rtWE(e.lastFired)} · fired {e.triggers||0}×</div>
                    </div>
                    <span className="pill" style={{borderColor:sev?.color,color:sev?.color,fontSize:9}}>L{e.severity}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Most-triggered (lifetime)</div></div>
            <div className="panel-body">
              {mostTriggered.map((e,i) => {
                const max = mostTriggered[0]?.triggers||1;
                const pct = ((e.triggers||0) / max) * 100;
                return (
                  <div key={e.id} style={{display:'grid',gridTemplateColumns:'24px 1fr 60px',gap:10,alignItems:'center',padding:'6px 0'}}>
                    <span style={{fontSize:16}}>{e.icon}</span>
                    <div>
                      <div style={{fontFamily:'var(--display)',fontSize:12,color:'var(--ink)'}}>{e.name}</div>
                      <div className="bar" style={{marginTop:3}}><i style={{width:`${pct}%`,background:'linear-gradient(90deg, var(--gold-deep), var(--gold-bright))'}}/></div>
                    </div>
                    <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--gold-bright)',textAlign:'right'}}>{e.triggers||0}×</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel" style={{gridColumn:'1 / -1'}}>
            <div className="panel-head"><div className="panel-title">Resource pressure · how much the economy is being pushed</div>
              <span className="wiki-meta">sum of |% modifiers| across all enabled events</span>
            </div>
            <div className="panel-body">
              {topResources.length === 0 && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)'}}>No resource modifiers yet.</div>}
              {topResources.map(([rid, total]) => {
                const r = findRes(rid);
                const max = topResources[0][1];
                const pct = (total/max)*100;
                return (
                  <div key={rid} style={{display:'grid',gridTemplateColumns:'32px 200px 1fr 80px',gap:14,alignItems:'center',padding:'6px 0',borderBottom:'1px dashed var(--rule)'}}>
                    <span style={{fontSize:18}}>{r?.icon||'◇'}</span>
                    <span style={{fontFamily:'var(--display)'}}>{r?.name||rid}</span>
                    <div className="bar"><i style={{width:`${pct}%`,background:`linear-gradient(90deg, var(--gold), ${total>200?'var(--ember)':'var(--gold-bright)'})`}}/></div>
                    <span style={{fontFamily:'var(--mono)',fontSize:11,color: total>200?'var(--ember)':'var(--gold-bright)',textAlign:'right'}}>±{total}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel" style={{gridColumn:'1 / -1'}}>
            <div className="panel-head"><div className="panel-title">AI Director rules</div></div>
            <div className="panel-body" style={{fontFamily:'var(--serif)',fontSize:13,lineHeight:1.6,color:'var(--ink)'}}>
              <ul style={{margin:0,paddingLeft:18}}>
                <li>Do not reduce the same resource too many times in a row</li>
                <li>Do not trigger Catastrophe events too often</li>
                <li>Do not make beginner players unable to progress</li>
                <li>Do not make essential resources impossible to get</li>
                <li>Always leave at least one alternative way to obtain affected resources</li>
                <li>Always announce affected resources clearly in world chat</li>
                <li>Always show event timer and affected zones to players</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <div className="hero-overlay" onClick={()=>setCreateModal(false)}>
          <div className="hero-sheet" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
            <button className="sheet-close" onClick={()=>setCreateModal(false)}>✕</button>
            <div style={{padding:'28px 32px'}}>
              <div style={{marginBottom:18}}>
                <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)'}}>New world event</div>
                <h2 style={{margin:'4px 0 0',fontFamily:'var(--display)',fontSize:26,letterSpacing:'.04em',color:'var(--gold-bright)',fontWeight:500}}>🌪 What just hit the world?</h2>
              </div>
              <div className="field">
                <label className="field-label">Event name</label>
                <input className="field-input" list="we-templates" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}
                  placeholder="e.g. Fuel Shortage, Black Market Raid…" autoFocus/>
                <datalist id="we-templates">
                  {TEMPLATE_NAMES.map(n=><option key={n} value={n}/>)}
                </datalist>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'80px 1fr 1fr',gap:8,marginTop:10}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Icon</label>
                  <input className="field-input" value={draft.icon} maxLength={4} style={{textAlign:'center',fontSize:18}}
                    onChange={e=>setDraft({...draft,icon:e.target.value})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Severity</label>
                  <select className="field-select" value={draft.severity} onChange={e=>setDraft({...draft,severity:e.target.value})}>
                    {EVENT_SEVERITIES.map(s=><option key={s.id} value={s.id}>L{s.id} {s.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Type</label>
                  <select className="field-select" value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}>
                    {EVENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field" style={{marginTop:10}}>
                <label className="field-label">Description (1-2 sentences)</label>
                <textarea className="field-area" rows="3" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/>
              </div>
              <div style={{display:'flex',gap:8,marginTop:18,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                <button className="btn" onClick={()=>setCreateModal(false)}>Cancel</button>
                <div style={{flex:1}}/>
                <button className="btn btn-primary" onClick={submitNew} disabled={!draft.name.trim()}>Create event</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.WorldEventsPage = WorldEventsPage;
