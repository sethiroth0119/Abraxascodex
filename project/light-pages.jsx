// Editable supporting pages: Timeline, Campaigns, Items & Relics, Playtest, Activity, Settings

// Seed campaigns + items + settings the first time
window.CAMPAIGNS = window.CAMPAIGNS || [];

window.ITEMS = window.ITEMS || [];

window.SETTINGS = window.SETTINGS || {
  studioName: 'Mythic story of Abraxas',
  worldName: 'Hidn Studios',
  designerName: 'Aurel',
  designerRole: 'Lead Designer',
  discordUrl: '',
  discordServer: '',
};

// =========== TIMELINE ===========
const TimelinePage = () => {
  const [timeline, setTimeline] = window.useEntities ? window.useEntities('timeline') : React.useState(window.TIMELINE);
  const [editId, setEditId] = React.useState(null);

  const update = (i, patch) => setTimeline(timeline.map((t,idx) => idx===i ? {...t, ...patch} : t));
  const addEvent = () => {
    const fresh = { era:'Post-Ash (PA)', year:'', title:'New Event', summary:'Describe the event…' };
    setTimeline([...timeline, fresh]);
    setEditId(timeline.length);
  };
  const removeEvent = (i) => {
    if(!confirm('Remove this event from the timeline?')) return;
    setTimeline(timeline.filter((_,idx) => idx!==i));
    setEditId(null);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⌖</span>Timeline</h1>
          <div className="page-sub">Three eras · {timeline.length} pinned moments · click any event to edit</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={addEvent}><Icon name="add" size={14}/> Pin event</button>
        </div>
      </div>

      <div style={{position:'relative',padding:'20px 0 20px 40px',borderLeft:'1px solid var(--rule-strong)',marginLeft:60}}>
        {timeline.map((t,i) => {
          const isEdit = editId === i;
          return (
            <div key={i} style={{position:'relative',padding:'14px 0 22px'}}>
              <div style={{position:'absolute',left:-50,top:18,width:14,height:14,borderRadius:'50%',
                background:'radial-gradient(circle at 30% 30%, var(--gold-bright), var(--gold-deep))',
                border:'2px solid var(--parchment)', boxShadow:'0 0 10px rgba(201,161,74,.5)'}}/>
              <div style={{position:'absolute',left:-160,top:18,width:90,textAlign:'right',fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>
                {isEdit
                  ? <input className="field-input" value={t.era} onChange={e=>update(i,{era:e.target.value})} style={{fontSize:10,padding:'2px 4px',textAlign:'right'}}/>
                  : t.era}
              </div>

              {isEdit ? (
                <div style={{padding:'10px 14px',background:'var(--parchment-2)',border:'1px solid var(--rule)',borderRadius:6,maxWidth:740}}>
                  <div style={{display:'grid',gridTemplateColumns:'120px 1fr',gap:8,marginBottom:6}}>
                    <input className="field-input" placeholder="Year" value={t.year} onChange={e=>update(i,{year:e.target.value})} style={{fontFamily:'var(--display)',fontSize:18,color:'var(--gold-bright)'}}/>
                    <input className="field-input" placeholder="Title" value={t.title} onChange={e=>update(i,{title:e.target.value})} style={{fontFamily:'var(--display)',fontSize:16}}/>
                  </div>
                  <textarea className="field-area" value={t.summary} rows="2" onChange={e=>update(i,{summary:e.target.value})} placeholder="Summary"/>
                  <div style={{display:'flex',gap:6,marginTop:8}}>
                    <button className="btn btn-primary" onClick={()=>setEditId(null)}><Icon name="check" size={12}/> Done</button>
                    <button className="btn" onClick={()=>removeEvent(i)} style={{color:'var(--ember)',marginLeft:'auto'}}>✕ Remove</button>
                  </div>
                </div>
              ) : (
                <div style={{cursor:'pointer'}} onClick={()=>setEditId(i)}>
                  <div style={{display:'flex',alignItems:'baseline',gap:14}}>
                    <span style={{fontFamily:'var(--display)',fontSize:24,color:'var(--gold-bright)',letterSpacing:'.04em'}}>{t.year}</span>
                    <span style={{fontFamily:'var(--display)',fontSize:18,color:'var(--ink)',letterSpacing:'.04em'}}>{t.title}</span>
                    <Icon name="pencil" size={11}/>
                  </div>
                  <div style={{fontFamily:'var(--serif)',fontSize:14,color:'var(--ink-dim)',marginTop:4,fontStyle:'italic',maxWidth:680}}>{t.summary}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =========== CAMPAIGNS ===========
const CampaignsPage = () => {
  const [campaigns, setCampaigns] = window.useEntities ? window.useEntities('campaigns') : React.useState(window.CAMPAIGNS);
  const [openId, setOpenId] = React.useState(null);

  const open = campaigns.find(c => c.id === openId);
  const update = (id, patch) => setCampaigns(campaigns.map(c => c.id===id ? {...c, ...patch} : c));
  const create = () => {
    const id = (window.makeId ? window.makeId('cmp') : 'cmp-'+Date.now().toString(36));
    const c = { id, name:'New Campaign', status:'Outlined', acts:1, sessions:0, color:'#c9a14a',
                blurb:'Describe the campaign in one or two sentences.', leadCharacter:'', startYear:'142 PA' };
    setCampaigns([c, ...campaigns]);
    setOpenId(id);
  };
  const remove = (id) => {
    if(!confirm('Delete this campaign?')) return;
    setCampaigns(campaigns.filter(c=>c.id!==id));
    setOpenId(null);
  };

  const STATUSES_C = ['Outlined','Drafting','Playtesting','In production','Published','Shelved'];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⚐</span>Campaigns</h1>
          <div className="page-sub">{campaigns.length} arcs · {campaigns.reduce((s,c)=>s+(c.sessions||0),0)} sessions logged</div>
        </div>
        <div className="page-actions"><button className="btn btn-primary" onClick={create}><Icon name="add" size={14}/> New campaign</button></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:18}}>
        {campaigns.map(c => (
          <div key={c.id} className="panel" style={{padding:0,overflow:'hidden',cursor:'pointer',
                borderColor: openId===c.id ? c.color : undefined,
                boxShadow: openId===c.id ? `0 0 0 1px ${c.color}` : undefined}}
               onClick={()=>setOpenId(c.id)}>
            <div style={{height:90,background:`linear-gradient(135deg, ${c.color}40, transparent), repeating-linear-gradient(45deg, rgba(255,255,255,.03) 0 6px, transparent 6px 12px), var(--parchment-3)`,
              borderBottom:'1px solid var(--rule)',position:'relative',display:'flex',alignItems:'flex-end',padding:14}}>
              <span className="pill" style={{borderColor:c.color,color:c.color}}>{c.status}</span>
              <span style={{position:'absolute',right:14,bottom:14,fontFamily:'var(--display)',fontSize:48,color:c.color,opacity:.3,lineHeight:1}}>{c.acts}</span>
            </div>
            <div style={{padding:'14px 16px'}}>
              <div style={{fontFamily:'var(--display)',fontSize:20,letterSpacing:'.06em',color:'var(--ink)'}}>{c.name}</div>
              <div style={{fontFamily:'var(--serif)',fontSize:13,color:'var(--ink-dim)',fontStyle:'italic',marginTop:6,lineHeight:1.5}}>{c.blurb}</div>
              <div style={{display:'flex',gap:14,marginTop:12,fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>
                <span>{c.acts} acts</span><span>{c.sessions||0} sessions</span>
                {c.leadCharacter && <span>lead · <span style={{color:'var(--ink)'}}>{c.leadCharacter}</span></span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit overlay */}
      {open && (
        <div className="hero-overlay" onClick={()=>setOpenId(null)}>
          <div className="hero-sheet" onClick={e=>e.stopPropagation()} style={{maxWidth:760}}>
            <button className="sheet-close" onClick={()=>setOpenId(null)}>✕</button>
            <div style={{padding:'28px 32px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)',marginBottom:6}}>Campaign · {open.id}</div>
                  <input value={open.name} onChange={e=>update(open.id,{name:e.target.value})}
                    style={{width:'100%',background:'transparent',border:'none',outline:'none',
                      fontFamily:'var(--display)',fontSize:36,letterSpacing:'.04em',color:'var(--ink)',padding:0}}/>
                </div>
                <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)'}}>✕ Delete</button>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:14}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Status</label>
                  <select className="field-select" value={open.status} onChange={e=>update(open.id,{status:e.target.value})}>
                    {STATUSES_C.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Acts</label>
                  <input type="number" className="field-input" value={open.acts} onChange={e=>update(open.id,{acts:+e.target.value||1})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Sessions</label>
                  <input type="number" className="field-input" value={open.sessions||0} onChange={e=>update(open.id,{sessions:+e.target.value||0})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Color</label>
                  <input type="color" className="field-input" value={open.color} onChange={e=>update(open.id,{color:e.target.value})} style={{height:38,padding:2}}/>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Lead character</label>
                  <input className="field-input" value={open.leadCharacter||''} onChange={e=>update(open.id,{leadCharacter:e.target.value})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Start year</label>
                  <input className="field-input" value={open.startYear||''} onChange={e=>update(open.id,{startYear:e.target.value})}/>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Pitch / blurb</label>
                <textarea className="field-area" rows="3" value={open.blurb} onChange={e=>update(open.id,{blurb:e.target.value})}/>
              </div>

              <div className="field">
                <label className="field-label">Notes (full plot, beats, NPCs)</label>
                <textarea className="field-area" rows="8" value={open.notes||''} onChange={e=>update(open.id,{notes:e.target.value})}
                  placeholder="Write the full campaign outline here. Use markdown if you like."/>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========== ITEMS & RELICS ===========
const RelicsPage = () => {
  const [items, setItems] = window.useEntities ? window.useEntities('items') : React.useState(window.ITEMS);
  const [openId, setOpenId] = React.useState(null);
  const [q, setQ] = React.useState('');

  const open = items.find(i => i.id === openId);
  const update = (id, patch) => setItems(items.map(it => it.id===id ? {...it, ...patch} : it));
  const create = () => {
    const id = (window.makeId ? window.makeId('itm') : 'itm-'+Date.now().toString(36));
    const it = { id, name:'Untitled Relic', kind:'Item', element:(window.ELEMENTS[0]||{}).id||'fire', rarity:'common', desc:'A description', tags:[], artist:'TBD' };
    setItems([it, ...items]); setOpenId(id);
  };
  const remove = (id) => {
    if(!confirm('Delete this item?')) return;
    setItems(items.filter(i=>i.id!==id)); setOpenId(null);
  };

  const filtered = items.filter(it => !q || it.name.toLowerCase().includes(q.toLowerCase()) || (it.desc||'').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">❖</span>Items &amp; Relics</h1>
          <div className="page-sub">{items.length} artefacts catalogued · click any row to edit</div>
        </div>
        <div className="page-actions">
          <div className="search" style={{width:220}}>
            <Icon name="search" size={14}/>
            <input placeholder="Filter..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={create}><Icon name="add" size={14}/> New item</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns: openId?'1fr 380px':'1fr',gap:24,alignItems:'start'}}>
        <div className="panel">
          <table className="ledger">
            <thead><tr><th></th><th>Name</th><th>Kind</th><th>Element</th><th>Rarity</th><th>Description</th><th style={{textAlign:'right'}}>Value</th></tr></thead>
            <tbody>
              {filtered.map(it => {
                const e = window.ELEMENTS.find(x=>x.id===it.element) || window.ELEMENTS[0];
                const val = window.computePrice ? window.computePrice({...it, type:'relic', cost:0, hp:0, atk:0, def:0, mag:0, res:0, spd:0}) : 240;
                return (
                  <tr key={it.id} style={{cursor:'pointer',background: it.id===openId?'rgba(201,161,74,.05)':undefined}} onClick={()=>setOpenId(it.id)}>
                    <td style={{width:50}}>
                      <div style={{width:32,height:44,border:`1px solid ${e.color}`,borderRadius:3,
                        background:`linear-gradient(160deg,${e.color}30, #0d0a05)`,display:'grid',placeItems:'center',
                        fontSize:18}}>{e.icon}</div>
                    </td>
                    <td style={{fontFamily:'var(--display)',letterSpacing:'.04em'}}>{it.name}</td>
                    <td>{it.kind}</td>
                    <td><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:e.color,marginRight:6,verticalAlign:'middle'}}/>{e.icon} {e.name}</td>
                    <td><span className={`pill r-${it.rarity}`}>{it.rarity}</span></td>
                    <td style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',maxWidth:340}}>{(it.desc||'').replace(/<[^>]+>/g,'')}</td>
                    <td style={{textAlign:'right'}}><span className="coin">{val.toLocaleString()}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {open && (
          <div className="panel" style={{position:'sticky',top:0}}>
            <div className="panel-head"><div className="panel-title">Edit item</div>
              <button className="btn" onClick={()=>setOpenId(null)}>✕</button>
            </div>
            <div className="panel-body" style={{display:'grid',gap:10}}>
              <div className="field" style={{margin:0}}><label className="field-label">Name</label>
                <input className="field-input" value={open.name} onChange={e=>update(open.id,{name:e.target.value})}/></div>
              <div className="field-row">
                <div className="field" style={{margin:0}}><label className="field-label">Kind</label>
                  <select className="field-select" value={open.kind} onChange={e=>update(open.id,{kind:e.target.value})}>
                    {['Item','Relic','Consumable','Quest','Trinket'].map(k=><option key={k}>{k}</option>)}
                  </select></div>
                <div className="field" style={{margin:0}}><label className="field-label">Rarity</label>
                  <select className="field-select" value={open.rarity} onChange={e=>update(open.id,{rarity:e.target.value})}>
                    {window.RARITIES.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                  </select></div>
              </div>
              <div className="field" style={{margin:0}}><label className="field-label">Element</label>
                <select className="field-select" value={open.element} onChange={e=>update(open.id,{element:e.target.value})}>
                  {window.ELEMENTS.map(e=><option key={e.id} value={e.id}>{e.icon} {e.name}</option>)}
                </select></div>
              <div className="field" style={{margin:0}}><label className="field-label">Description</label>
                <textarea className="field-area" rows="3" value={open.desc||''} onChange={e=>update(open.id,{desc:e.target.value})}/></div>
              <div className="field" style={{margin:0}}><label className="field-label">Artist</label>
                <input className="field-input" value={open.artist||''} onChange={e=>update(open.id,{artist:e.target.value})}/></div>
              <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)'}}>✕ Delete item</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =========== PLAYTEST ===========
const PlaytestPage = () => {
  const matches = [
    { p1:'Solveig (Nature)',  p2:'Mar (Fire)',     result:'P1 71%', games:32, color:'#6ad880'},
    { p1:'Ardun (Light)',     p2:'Suzerain (Shadow)', result:'P2 58%', games:24, color:'#a878d4'},
    { p1:'Sael (Water)',      p2:'Abraxas (Void)', result:'P2 64%', games:18, color:'#4a3a5a'},
    { p1:'Mar (Fire)',        p2:'Ardun (Light)',  result:'P1 51%', games:40, color:'#ff7755'},
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⚗</span>Playtest Bench</h1>
          <div className="page-sub">{matches.reduce((s,m)=>s+m.games,0)} simulated matches · v0.41 build</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="upload" size={14}/> Import deck</button>
          <button className="btn btn-primary"><Icon name="flask" size={14}/> Run 1,000 sims</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Archetype matchups</div></div>
          <div className="panel-body">
            {matches.map((m,i)=> {
              const p = parseInt(m.result.split(' ')[1]);
              return (
                <div key={i} style={{padding:'10px 0',borderBottom:'1px dashed var(--rule)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontFamily:'var(--display)',letterSpacing:'.04em'}}>
                    <span>{m.p1}</span><span style={{color:'var(--ink-faint)'}}>vs</span><span>{m.p2}</span>
                  </div>
                  <div style={{display:'flex',height:6,background:'var(--vellum)',borderRadius:99,overflow:'hidden',border:'1px solid var(--rule)'}}>
                    <div style={{width:`${p}%`,background:m.color}}/>
                    <div style={{flex:1,background:'var(--rule-strong)'}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>
                    <span>{m.result}</span><span>{m.games} games</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Balance flags</div></div>
          <div className="panel-body" style={{fontSize:13,lineHeight:1.6}}>
            <div style={{padding:10,border:'1px solid var(--ember)',borderRadius:6,marginBottom:10}}>
              <span className="pill" style={{borderColor:'var(--ember)',color:'var(--ember)'}}>over-tuned</span>
              <div style={{marginTop:6,fontFamily:'var(--serif)'}}>Embergate, Last Breath wins 73% as a finisher in the Mar deck. Consider cost 6.</div>
            </div>
            <div style={{padding:10,border:'1px solid var(--gold-deep)',borderRadius:6,marginBottom:10}}>
              <span className="pill" style={{borderColor:'var(--gold-bright)',color:'var(--gold-bright)'}}>watch</span>
              <div style={{marginTop:6,fontFamily:'var(--serif)'}}>Abraxas's "unmake" interaction with Loom-Cut is creating non-games.</div>
            </div>
            <div style={{padding:10,border:'1px solid var(--verdant)',borderRadius:6}}>
              <span className="pill" style={{borderColor:'var(--verdant)',color:'var(--verdant)'}}>stable</span>
              <div style={{marginTop:6,fontFamily:'var(--serif)'}}>Solveig's anthem is now in-band after the Halnwood Watcher cost nudge.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========== ACTIVITY ===========
const ActivityPage = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="page-title"><span className="ornament">⌘</span>Activity</h1>
        <div className="page-sub">All edits to canon</div>
      </div>
    </div>
    <div className="panel">
      <div className="panel-body">
        {[...window.ACTIVITY, ...window.ACTIVITY].map((a,i) => (
          <div key={i} className="feed-item">
            <div className="feed-dot" style={{background: a.who==='You' ? 'var(--gold-bright)' : 'var(--gold)'}}/>
            <div style={{flex:1}}>
              <div><b style={{color:'var(--gold-bright)'}}>{a.who}</b> <span style={{color:'var(--ink-dim)'}}>{a.what}</span> <span style={{color:'var(--ink)'}}>{a.target}</span></div>
              <div className="feed-meta">{a.when}</div>
            </div>
            <button className="btn btn-ghost"><Icon name="eye" size={12}/></button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// =========== SETTINGS ===========
const SettingsPage = () => {
  const [settings, setSettings] = window.useEntities ? window.useEntities('settings') : React.useState(window.SETTINGS);
  const update = (patch) => setSettings({...settings, ...patch});

  const counts = {
    cards:     (window.CARDS||[]).length,
    heroes:    (window.HEROES||[]).length,
    elements:  (window.ELEMENTS||[]).length,
    factions:  (window.FACTIONS||[]).length,
    moves:     (window.MOVES||[]).length,
    passives:  (window.PASSIVES||[]).length,
    statuses:  (window.STATUSES||[]).length,
    lore:      (window.LORE_ENTRIES||[]).length,
    timeline:  (window.TIMELINE||[]).length,
    campaigns: (window.CAMPAIGNS||[]).length,
    items:     (window.ITEMS||[]).length,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⚙</span>Studio Settings</h1>
          <div className="page-sub">Brand identity · author info · data management</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Brand &amp; identity</div></div>
          <div className="panel-body" style={{display:'grid',gap:12}}>
            <div className="field" style={{margin:0}}>
              <label className="field-label">Studio name (in sidebar)</label>
              <input className="field-input" value={settings.studioName||''} onChange={e=>update({studioName:e.target.value})}/>
            </div>
            <div className="field" style={{margin:0}}>
              <label className="field-label">World name</label>
              <input className="field-input" value={settings.worldName||''} onChange={e=>update({worldName:e.target.value})}/>
            </div>
            <div className="field" style={{margin:0}}>
              <label className="field-label">Your designer name</label>
              <input className="field-input" value={settings.designerName||''} onChange={e=>update({designerName:e.target.value})}/>
            </div>
            <div className="field" style={{margin:0}}>
              <label className="field-label">Your role</label>
              <input className="field-input" value={settings.designerRole||''} onChange={e=>update({designerRole:e.target.value})}/>
            </div>
            <div style={{paddingTop:12,marginTop:6,borderTop:'1px solid var(--rule)'}}>
              <div style={{fontFamily:'var(--display)',fontSize:11,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--gold)',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>💬</span> Discord integration
              </div>
              <div className="field" style={{margin:0,marginBottom:8}}>
                <label className="field-label">Discord invite URL</label>
                <input className="field-input" value={settings.discordUrl||''} onChange={e=>update({discordUrl:e.target.value})}
                       placeholder="https://discord.gg/your-invite"/>
              </div>
              <div className="field" style={{margin:0}}>
                <label className="field-label">Server name (shown in topbar)</label>
                <input className="field-input" value={settings.discordServer||''} onChange={e=>update({discordServer:e.target.value})}
                       placeholder="e.g. Hidn Studios"/>
              </div>
              <div style={{marginTop:8,fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)',fontSize:12,lineHeight:1.5}}>
                Once set, a Discord button appears in the topbar — one click takes the team straight to the server.
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div className="panel-title">Data &amp; backup</div></div>
          <div className="panel-body">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:14}}>
              {Object.entries(counts).map(([k,n]) => (
                <div key={k} style={{padding:'6px 10px',background:'var(--parchment-2)',border:'1px solid var(--rule)',borderRadius:4,
                  display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)',letterSpacing:'.06em'}}>{k}</span>
                  <span style={{fontFamily:'var(--display)',color:'var(--gold-bright)'}}>{n}</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn" onClick={()=>window.exportStudio && window.exportStudio()} style={{flex:1}}>
                <Icon name="upload" size={12}/> Export JSON
              </button>
              <button className="btn" onClick={()=>window.resetStudio && window.resetStudio()} style={{color:'var(--ember)'}}>
                ✕ Reset all data
              </button>
            </div>
            <div style={{marginTop:10,fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)',fontSize:12,lineHeight:1.5}}>
              Reset wipes localStorage and reloads the page with the original seed data. Export downloads a JSON snapshot you can keep as a backup.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { TimelinePage, CampaignsPage, RelicsPage, PlaytestPage, ActivityPage, SettingsPage });
