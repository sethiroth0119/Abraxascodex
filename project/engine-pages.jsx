// Moves / Passives / Statuses / Natures — full CRUD reference pages

// =============== MOVES ===============
const MovesPage = () => {
  const [moves, setMoves] = window.useEntities ? window.useEntities('moves') : React.useState(window.MOVES);
  const [sel, setSel] = React.useState(moves[0]?.id);
  const [q, setQ] = React.useState('');
  const [filterElem, setFilterElem] = React.useState('all');
  const [filterKind, setFilterKind] = React.useState('all');
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => { if(!moves.find(m=>m.id===sel) && moves.length) setSel(moves[0].id); }, [moves, sel]);

  const filtered = moves.filter(m =>
    (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.desc.toLowerCase().includes(q.toLowerCase()))
    && (filterElem==='all' || m.element===filterElem)
    && (filterKind==='all' || m.kind===filterKind)
  );
  const selM = moves.find(m => m.id === sel);
  const update = (id, patch) => setMoves(moves.map(m => m.id===id ? {...m, ...patch} : m));

  const createMove = () => {
    const id = (window.makeId ? window.makeId('move') : 'move-'+Date.now().toString(36));
    const m = { id, name:'New Move', element:(window.ELEMENTS[0]||{}).id||'fire', kind:'Physical',
                target:'Enemy', power:20, acc:95, cost:1, range:1, status:'', desc:'A new move. Describe its effect.' };
    setMoves([m, ...moves]);
    setSel(id); setEditing(true);
  };
  const deleteMove = (id) => {
    if(!confirm(`Delete "${selM.name}"? Cards' learnsets will need to be re-checked.`)) return;
    setMoves(moves.filter(m=>m.id!==id));
    setSel(moves[0]?.id);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⚔</span>Moves</h1>
          <div className="page-sub">{moves.length} moves in the catalog · max 4 known per unit</div>
        </div>
        <div className="page-actions">
          <div className="search" style={{width:220}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search moves..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={createMove}><Icon name="add" size={14}/> New move</button>
        </div>
      </div>

      <div style={{display:'flex',gap:14,marginBottom:14,flexWrap:'wrap'}}>
        <div className="chip-row">
          <div className={`chip ${filterKind==='all'?'active':''}`} onClick={()=>setFilterKind('all')}>All kinds</div>
          {(window.MOVE_KINDS||[]).map(k =>
            <div key={k} className={`chip ${filterKind===k?'active':''}`} onClick={()=>setFilterKind(k)}>{k}</div>)}
        </div>
      </div>

      <div className="chip-row" style={{marginBottom:18}}>
        <div className={`chip ${filterElem==='all'?'active':''}`} onClick={()=>setFilterElem('all')}>All elements</div>
        {(window.ELEMENTS||[]).map(e =>
          <div key={e.id} className={`chip ${filterElem===e.id?'active':''}`} onClick={()=>setFilterElem(filterElem===e.id?'all':e.id)}
               style={filterElem===e.id ? {borderColor:e.color,color:e.color,background:e.color+'20'} : {}}>
            <span style={{fontSize:13}}>{e.icon}</span>{e.name}
          </div>)}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:24,alignItems:'start'}}>
        <div className="panel">
          <table className="ledger">
            <thead><tr><th></th><th>Move</th><th>Kind</th><th>Target</th><th style={{textAlign:'right'}}>Pow</th><th style={{textAlign:'right'}}>Acc</th><th style={{textAlign:'right'}}>Cost</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(m => {
                const e = (window.ELEMENTS||[]).find(x=>x.id===m.element);
                const s = m.status ? (window.STATUSES||[]).find(x=>x.id===m.status) : null;
                return (
                  <tr key={m.id} style={{cursor:'pointer',borderLeft: m.id===sel?`3px solid ${e?.color}`:'3px solid transparent'}} onClick={()=>{setSel(m.id);setEditing(false);}}>
                    <td style={{width:36}}><span style={{fontSize:18}}>{e?.icon}</span></td>
                    <td style={{fontFamily:'var(--display)',color:'var(--ink)'}}>{m.name}</td>
                    <td>{m.kind}</td>
                    <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-dim)'}}>{m.target}</td>
                    <td style={{textAlign:'right',fontFamily:'var(--mono)',color:m.power?'var(--ember)':'var(--ink-faint)'}}>{m.power||'—'}</td>
                    <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--ink-dim)'}}>{m.acc}</td>
                    <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--gold-bright)'}}>{m.cost}⚡</td>
                    <td>{s ? <span className="pill" style={{borderColor:s.color,color:s.color}}>{s.icon} {s.name}</span> : <span style={{color:'var(--ink-faint)'}}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selM && (() => {
          const e = (window.ELEMENTS||[]).find(x=>x.id===selM.element);
          const s = selM.status ? (window.STATUSES||[]).find(x=>x.id===selM.status) : null;
          const userCards = (window.CARDS||[]).filter(c => (c.learnset||[]).some(l => l.m === selM.id));
          return (
            <div className="panel" style={{position:'sticky',top:0}}>
              <div className="panel-head"><div className="panel-title" style={{color:e?.color}}>{e?.icon} {selM.name}</div>
                <div style={{display:'flex',gap:6}}>
                  {!editing && <button className="btn" onClick={()=>setEditing(true)}><Icon name="pencil" size={12}/></button>}
                  {editing && <button className="btn btn-primary" onClick={()=>setEditing(false)}><Icon name="check" size={12}/></button>}
                  <button className="btn" onClick={()=>deleteMove(selM.id)} style={{color:'var(--ember)'}}>✕</button>
                </div>
              </div>
              <div className="panel-body">
                {editing ? (
                  <div style={{display:'grid',gap:10}}>
                    <div className="field" style={{margin:0}}><label className="field-label">Name</label>
                      <input className="field-input" value={selM.name} onChange={ev=>update(selM.id,{name:ev.target.value})}/></div>
                    <div className="field-row">
                      <div className="field" style={{margin:0}}><label className="field-label">Element</label>
                        <select className="field-select" value={selM.element} onChange={ev=>update(selM.id,{element:ev.target.value})}>
                          {(window.ELEMENTS||[]).map(el => <option key={el.id} value={el.id}>{el.icon} {el.name}</option>)}
                        </select></div>
                      <div className="field" style={{margin:0}}><label className="field-label">Kind</label>
                        <select className="field-select" value={selM.kind} onChange={ev=>update(selM.id,{kind:ev.target.value})}>
                          {(window.MOVE_KINDS||['Physical','Magical','Support','Field']).map(k => <option key={k}>{k}</option>)}
                        </select></div>
                    </div>
                    <div className="field-row">
                      <div className="field" style={{margin:0}}><label className="field-label">Target</label>
                        <select className="field-select" value={selM.target} onChange={ev=>update(selM.id,{target:ev.target.value})}>
                          {(window.MOVE_TARGETS||['Enemy','Ally','Self','All Enemies','All Allies','Tile','Line','Aura']).map(t => <option key={t}>{t}</option>)}
                        </select></div>
                      <div className="field" style={{margin:0}}><label className="field-label">Applies status</label>
                        <select className="field-select" value={selM.status||''} onChange={ev=>update(selM.id,{status:ev.target.value})}>
                          <option value="">— none —</option>
                          {(window.STATUSES||[]).map(st => <option key={st.id} value={st.id}>{st.icon} {st.name}</option>)}
                        </select></div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
                      <div className="field" style={{margin:0}}><label className="field-label">Power</label>
                        <input type="number" className="field-input" value={selM.power} onChange={ev=>update(selM.id,{power:+ev.target.value||0})}/></div>
                      <div className="field" style={{margin:0}}><label className="field-label">Acc %</label>
                        <input type="number" className="field-input" value={selM.acc} onChange={ev=>update(selM.id,{acc:+ev.target.value||0})}/></div>
                      <div className="field" style={{margin:0}}><label className="field-label">Cost ⚡</label>
                        <input type="number" className="field-input" value={selM.cost} onChange={ev=>update(selM.id,{cost:+ev.target.value||0})}/></div>
                      <div className="field" style={{margin:0}}><label className="field-label">Range</label>
                        <input type="number" className="field-input" value={selM.range} onChange={ev=>update(selM.id,{range:+ev.target.value||0})}/></div>
                    </div>
                    <div className="field" style={{margin:0}}><label className="field-label">Description</label>
                      <textarea className="field-area" rows="3" value={selM.desc||''} onChange={ev=>update(selM.id,{desc:ev.target.value})}/></div>
                  </div>
                ) : (
                  <>
                    <dl className="kv">
                      <dt>Element</dt><dd>{e?.icon} {e?.name}</dd>
                      <dt>Kind</dt><dd>{selM.kind}</dd>
                      <dt>Target</dt><dd>{selM.target}</dd>
                      <dt>Power</dt><dd style={{fontFamily:'var(--mono)',color:'var(--ember)'}}>{selM.power}</dd>
                      <dt>Accuracy</dt><dd style={{fontFamily:'var(--mono)'}}>{selM.acc}%</dd>
                      <dt>Cost</dt><dd style={{fontFamily:'var(--mono)',color:'var(--gold-bright)'}}>{selM.cost} ⚡</dd>
                      <dt>Range</dt><dd>{selM.range}</dd>
                      <dt>Status</dt><dd>{s ? <span style={{color:s.color}}>{s.icon} {s.name}</span> : '—'}</dd>
                    </dl>
                    <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--rule)',fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink)',fontSize:14}}>
                      "{selM.desc}"
                    </div>
                  </>
                )}
                <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                  <div className="field-label" style={{marginBottom:8}}>In {userCards.length} learnsets</div>
                  {userCards.map(c => (
                    <div key={c.id} className="mini-card" style={{width:'100%',marginBottom:6}}>
                      <span style={{color:'var(--gold)'}}>♦</span>
                      <span style={{flex:1}}>{c.name}</span>
                      <span className="pill" style={{fontSize:9}}>Lv {(c.learnset||[]).find(l=>l.m===selM.id)?.lvl}</span>
                    </div>
                  ))}
                  {userCards.length===0 && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)'}}>Unassigned. Try it on a card in the Forge.</div>}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// =============== STATUSES ===============
const StatusesPage = () => {
  const [statuses, setStatuses] = window.useEntities ? window.useEntities('statuses') : React.useState(window.STATUSES);
  const [editId, setEditId] = React.useState(null);

  const update = (id, patch) => setStatuses(statuses.map(s => s.id===id ? {...s, ...patch} : s));
  const createStatus = () => {
    const id = (window.makeId ? window.makeId('st') : 'st-'+Date.now().toString(36));
    const s = { id, name:'New Status', icon:'✦', color:'#888888', trigger:'turnStart', desc:'Describe trigger and effect.' };
    setStatuses([...statuses, s]);
    setEditId(id);
  };
  const deleteStatus = (id) => {
    if(!confirm('Delete this status?')) return;
    setStatuses(statuses.filter(s=>s.id!==id));
    if(editId===id) setEditId(null);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">☠</span>Status Effects</h1>
          <div className="page-sub">{statuses.length} statuses · the lexicon of how units suffer and shine</div>
        </div>
        <div className="page-actions"><button className="btn btn-primary" onClick={createStatus}><Icon name="add" size={14}/> New status</button></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
        {statuses.map(s => (
          <div key={s.id} className="elem-tile" style={{borderTop:`3px solid ${s.color}`,cursor:'default'}}>
            {editId === s.id ? (
              <div style={{display:'grid',gap:8}}>
                <div className="field" style={{margin:0}}><label className="field-label">Name</label>
                  <input className="field-input" value={s.name} onChange={e=>update(s.id,{name:e.target.value})}/></div>
                <div style={{display:'grid',gridTemplateColumns:'70px 1fr 110px',gap:6}}>
                  <input className="field-input" value={s.icon} maxLength={4} style={{textAlign:'center',fontSize:18}} onChange={e=>update(s.id,{icon:e.target.value})}/>
                  <input className="field-input" type="color" value={s.color} style={{height:38,padding:2}} onChange={e=>update(s.id,{color:e.target.value})}/>
                  <select className="field-select" value={s.trigger} onChange={e=>update(s.id,{trigger:e.target.value})}>
                    {['turnStart','turnEnd','preTurn','preAction','preMove','onAction','onAttack','onHit','onTarget','onCast','onKill','onDeath','aura','countdown','instant'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <textarea className="field-area" rows="2" value={s.desc||''} onChange={e=>update(s.id,{desc:e.target.value})}/>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-primary" style={{flex:1}} onClick={()=>setEditId(null)}><Icon name="check" size={12}/> Done</button>
                  <button className="btn" onClick={()=>deleteStatus(s.id)} style={{color:'var(--ember)'}}>✕</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:22}}>{s.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'var(--display)',fontSize:15,letterSpacing:'.06em',color:s.color}}>{s.name}</div>
                    <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.16em',color:'var(--ink-faint)',textTransform:'uppercase'}}>{s.trigger}</div>
                  </div>
                  <button className="btn btn-ghost" onClick={()=>setEditId(s.id)} style={{padding:4}}><Icon name="pencil" size={12}/></button>
                </div>
                <div style={{marginTop:8,fontFamily:'var(--serif)',fontSize:12.5,color:'var(--ink-dim)',lineHeight:1.45}}>{s.desc}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== PASSIVES ===============
const PassivesPage = () => {
  const [passives, setPassives] = window.useEntities ? window.useEntities('passives') : React.useState(window.PASSIVES);
  const [cat, setCat] = React.useState('all');
  const [editId, setEditId] = React.useState(null);

  const cats = window.PASSIVE_CATEGORIES || ['offense','defense','utility','aura','ward','weather','tribal','elemental'];
  const filtered = passives.filter(p => cat==='all' || p.cat===cat);
  const editing = editId ? passives.find(p => p.id===editId) : null;

  const update = (id, patch) => setPassives(passives.map(p => p.id===id ? {...p, ...patch} : p));
  const createPassive = () => {
    const id = (window.makeId ? window.makeId('p') : 'p-'+Date.now().toString(36));
    const p = { id, name:'New Passive', cat:'offense', desc:'Describe the passive effect.' };
    setPassives([p, ...passives]);
    setEditId(id);
  };
  const deletePassive = (id) => {
    if(!confirm('Delete this passive?')) return;
    setPassives(passives.filter(p=>p.id!==id));
    if(editId===id) setEditId(null);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">✦</span>Passives</h1>
          <div className="page-sub">{passives.length} passives in the catalog</div>
        </div>
        <div className="page-actions"><button className="btn btn-primary" onClick={createPassive}><Icon name="add" size={14}/> New passive</button></div>
      </div>

      <div className="chip-row" style={{marginBottom:18}}>
        <div className={`chip ${cat==='all'?'active':''}`} onClick={()=>setCat('all')}>All</div>
        {cats.map(c => <div key={c} className={`chip ${cat===c?'active':''}`} onClick={()=>setCat(c)}>{c}</div>)}
      </div>

      <div style={{display:'grid',gridTemplateColumns: editing?'1fr 360px':'1fr',gap:24,alignItems:'start'}}>
        <div className="panel">
          <table className="ledger">
            <thead><tr><th>Name</th><th>Category</th><th>Effect</th><th style={{textAlign:'right'}}>Used by</th><th></th></tr></thead>
            <tbody>
              {filtered.map(p => {
                const used = (window.CARDS||[]).filter(c => c.passive===p.id || c.passive2===p.id).length;
                return (
                  <tr key={p.id} style={{cursor:'pointer',background: p.id===editId?'rgba(201,161,74,.06)':undefined}} onClick={()=>setEditId(p.id)}>
                    <td style={{fontFamily:'var(--display)',color:'var(--gold-bright)',letterSpacing:'.04em'}}>{p.name}</td>
                    <td><span className="pill">{p.cat}</span></td>
                    <td style={{fontFamily:'var(--serif)',color:'var(--ink)',fontSize:13}}>{p.desc}</td>
                    <td style={{textAlign:'right',fontFamily:'var(--mono)',color: used>0?'var(--gold-bright)':'var(--ink-faint)'}}>{used}</td>
                    <td><Icon name="chevron" size={12}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="panel" style={{position:'sticky',top:0}}>
            <div className="panel-head"><div className="panel-title">Edit passive</div>
              <button className="btn" onClick={()=>setEditId(null)}>✕</button>
            </div>
            <div className="panel-body" style={{display:'grid',gap:10}}>
              <div className="field" style={{margin:0}}><label className="field-label">Name</label>
                <input className="field-input" value={editing.name} onChange={e=>update(editing.id,{name:e.target.value})}/></div>
              <div className="field" style={{margin:0}}><label className="field-label">Category</label>
                <select className="field-select" value={editing.cat} onChange={e=>update(editing.id,{cat:e.target.value})}>
                  {cats.map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div className="field" style={{margin:0}}><label className="field-label">Effect</label>
                <textarea className="field-area" rows="3" value={editing.desc||''} onChange={e=>update(editing.id,{desc:e.target.value})}/></div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-primary" style={{flex:1}} onClick={()=>setEditId(null)}><Icon name="check" size={12}/> Done</button>
                <button className="btn" onClick={()=>deletePassive(editing.id)} style={{color:'var(--ember)'}}>✕ Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =============== NATURES + TRAITS reference (read-only for now) ===============
const NaturesPage = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="page-title"><span className="ornament">✶</span>Natures &amp; Traits</h1>
        <div className="page-sub">{(window.NATURES||[]).length} natures (±10%) · {(window.TRAITS||[]).length} traits (flat package)</div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
      <div className="panel">
        <div className="panel-head"><div className="panel-title">Natures</div></div>
        <div className="panel-body">
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
            {(window.NATURES||[]).map(n => (
              <div key={n.id} style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:8,alignItems:'center',
                   padding:'6px 10px',background:'var(--parchment-2)',border:'1px solid var(--rule)',borderRadius:4}}>
                <span style={{fontFamily:'var(--display)',letterSpacing:'.06em'}}>{n.name}</span>
                {n.plus ? <span style={{color:'var(--verdant)',fontFamily:'var(--mono)',fontSize:11}}>+{n.plus}</span> : <span style={{color:'var(--ink-faint)',fontFamily:'var(--mono)',fontSize:11}}>—</span>}
                {n.minus ? <span style={{color:'var(--ember)',fontFamily:'var(--mono)',fontSize:11}}>-{n.minus}</span> : <span style={{color:'var(--ink-faint)',fontFamily:'var(--mono)',fontSize:11}}>—</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><div className="panel-title">Traits</div></div>
        <div className="panel-body">
          <table className="ledger">
            <thead><tr><th>Trait</th><th>Rarity</th><th>Effect</th></tr></thead>
            <tbody>
              {(window.TRAITS||[]).map(t => (
                <tr key={t.id}>
                  <td style={{fontFamily:'var(--display)',color:'var(--gold-bright)'}}>{t.name}</td>
                  <td><span className={`pill r-${t.rarity}`}>{t.rarity}</span></td>
                  <td style={{fontFamily:'var(--serif)',fontSize:12.5,color:'var(--ink-dim)'}}>{t.stats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { MovesPage, StatusesPage, PassivesPage, NaturesPage });
