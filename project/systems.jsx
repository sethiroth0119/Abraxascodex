// Game Systems — design documents the team can read, edit, comment on.
// First entry: the Gym Core Wars System.

window.SYSTEMS = window.SYSTEMS || [];

function relativeTimeS(ts) {
  if(!ts) return '—';
  const d = Date.now() - ts;
  if(d < 60_000) return 'just now';
  if(d < 3_600_000) return Math.floor(d/60_000) + 'm ago';
  if(d < 86_400_000) return Math.floor(d/3_600_000) + 'h ago';
  return Math.floor(d/86_400_000) + 'd ago';
}

// Minimal markdown renderer for system bodies
function renderSystemBody(body) {
  if(!body) return '';
  return body
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
    .replace(/\*(.+?)\*/g,'<i>$1</i>')
    .split(/\n\n+/).map(para => {
      // bullet block
      if(/^\s*•/.test(para)) {
        const items = para.split(/\n/).filter(l=>l.trim()).map(l => l.replace(/^\s*•\s*/, ''));
        return `<ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
      }
      return `<p>${para.replace(/\n/g,'<br/>')}</p>`;
    }).join('\n');
}

const SYSTEM_STATUSES = ['Drafting','In design','Prototyping','In production','Shipped','Shelved'];

const SystemsPage = () => {
  const [systems, setSystems] = window.useEntities ? window.useEntities('systems') : React.useState(window.SYSTEMS);
  const [sel, setSel] = React.useState(systems[0]?.id);
  const [editing, setEditing] = React.useState(false);
  const [editPhase, setEditPhase] = React.useState(null);
  const [draft, setDraft] = React.useState('');
  const settings = (window.SETTINGS||{});
  const me = settings.designerName || 'You';

  React.useEffect(() => { if(!systems.find(s=>s.id===sel) && systems.length) setSel(systems[0].id); }, [systems, sel]);

  const current = systems.find(s => s.id === sel);

  // Expose to Athena
  React.useEffect(() => {
    if(current) {
      window.STATE = window.STATE || {};
      window.STATE.athenaFocus = { kind:'system', data: current };
      window.dispatchEvent(new CustomEvent('studio:focus-change'));
    }
  }, [sel, current]);

  // Only admin + staff can create or destroy game systems. Everyone else
  // sees the page but the "New system" / delete controls are hidden.
  const canCreate = (window.CURRENT_ROLE === 'admin' || window.CURRENT_ROLE === 'staff');

  const update = (id, patch) => setSystems(systems.map(s => s.id===id ? {...s, ...patch, updated: Date.now()} : s));
  const updatePhase = (sysId, phaseId, patch) => {
    const s = systems.find(x=>x.id===sysId);
    update(sysId, { phases: s.phases.map(p => p.id===phaseId ? {...p, ...patch} : p) });
  };
  const addPhase = (sysId) => {
    const s = systems.find(x=>x.id===sysId);
    const phaseId = 'p' + Date.now().toString(36);
    update(sysId, { phases: [...s.phases, { id:phaseId, title:'New Phase', icon:'✦', body:'Describe this phase…', owner:me, estimate:'', complete:0 }] });
    setEditPhase(phaseId);
  };
  const removePhase = (sysId, phaseId) => {
    if(!confirm('Remove this phase?')) return;
    const s = systems.find(x=>x.id===sysId);
    update(sysId, { phases: s.phases.filter(p => p.id!==phaseId) });
  };
  const movePhase = (sysId, phaseId, dir) => {
    const s = systems.find(x=>x.id===sysId);
    const i = s.phases.findIndex(p=>p.id===phaseId);
    const j = i + dir;
    if(j<0 || j>=s.phases.length) return;
    const next = [...s.phases];
    [next[i], next[j]] = [next[j], next[i]];
    update(sysId, { phases: next });
  };

  const addComment = (text) => {
    if(!text.trim()) return;
    update(current.id, { comments:[...(current.comments||[]), { who:me, when:Date.now(), text }] });
    setDraft('');
  };

  const askAthena = async () => {
    const placeholder = { who:'Athena', when:Date.now(), text:'(thinking…)' };
    update(current.id, { comments:[...(current.comments||[]), placeholder] });
    try {
      const sys = `You are Athena, a creative AI helping a small game studio. Read this game-system design document and give a concise, useful perspective (3-6 sentences).
- Flag one risk or gap
- Suggest one design tweak that strengthens it
- Reference specific phases by name`;
      const phasesText = current.phases.map(p => `[${p.title}] ${p.body.replace(/\*\*/g,'').slice(0,200)}…`).join('\n\n');
      const reply = await window.claude.complete({
        messages:[{ role:'user', content: `${sys}\n\nSYSTEM: ${current.name}\nTAGLINE: ${current.tagline}\n\nSUMMARY: ${current.summary}\n\nPHASES:\n${phasesText}` }],
      });
      const fresh = systems.find(s=>s.id===current.id);
      const cleaned = (fresh.comments||[]).filter(c => !(c.who==='Athena' && c.text==='(thinking…)'));
      update(current.id, { comments:[...cleaned, { who:'Athena', when:Date.now(), text: reply }] });
    } catch(err) {
      const fresh = systems.find(s=>s.id===current.id);
      const cleaned = (fresh.comments||[]).filter(c => !(c.who==='Athena' && c.text==='(thinking…)'));
      update(current.id, { comments:[...cleaned, { who:'Athena', when:Date.now(), text:`(stumbled: ${err.message||err})` }] });
    }
  };

  const create = () => {
    const id = (window.makeId ? window.makeId('sys') : 'sys-'+Date.now().toString(36));
    const s = { id, name:'New System', tagline:'(tagline)', icon:'✦', color:'#c9a14a',
                status:'Drafting', author:me, created:Date.now(), updated:Date.now(),
                summary:'Describe the system in 2-3 sentences.', pillars:[], designGoals:[],
                phases:[], finalGoal:'', comments:[] };
    setSystems([s, ...systems]); setSel(id); setEditing(true);
  };
  const remove = (id) => {
    if(!current) return;
    if(!confirm(`Delete the system "${current.name}"?`)) return;
    setSystems(systems.filter(s=>s.id!==id)); setSel(systems[0]?.id);
  };

  const overallProgress = current ? Math.round(current.phases.reduce((s,p)=>s+(p.complete||0),0) / Math.max(current.phases.length,1)) : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⚙</span>Game Systems</h1>
          <div className="page-sub">{systems.length} system{systems.length!==1?'s':''} · structured design docs the team can work and build on</div>
        </div>
        <div className="page-actions">
          {canCreate && (
            <button className="btn btn-primary" onClick={create}>
              <Icon name="add" size={14}/> New system
            </button>
          )}
        </div>
      </div>

      {!current ? (
        <div className="panel" style={{padding:'48px 32px', textAlign:'center'}}>
          <div style={{fontSize:48, opacity:0.3, marginBottom:14}}>⚙</div>
          <div style={{fontFamily:'var(--display)', fontSize:22, letterSpacing:'.06em', color:'var(--gold-bright)', marginBottom:8}}>
            No systems yet
          </div>
          <div style={{fontFamily:'var(--serif)', fontStyle:'italic', color:'var(--ink-dim)', fontSize:14, maxWidth:480, margin:'0 auto 20px', lineHeight:1.5}}>
            {canCreate
              ? 'Game Systems are structured design docs the team can read, edit, and comment on. Click "New system" above to draft your first one.'
              : 'No game systems have been published yet. Only admin and staff can create them — check back later, or ask your team lead.'}
          </div>
          {canCreate && (
            <button className="btn btn-primary" onClick={create}>
              <Icon name="add" size={14}/> Forge first system
            </button>
          )}
        </div>
      ) : (
      <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:24,alignItems:'start'}}>
        {/* sidebar list */}
        <aside className="wiki-toc">
          <div className="toc-h">Systems</div>
          {systems.map(s => (
            <div key={s.id} className={`toc-item ${sel===s.id?'active':''}`} onClick={()=>{setSel(s.id); setEditing(false); setEditPhase(null);}}>
              <span style={{marginRight:6}}>{s.icon}</span>{s.name}
              <div style={{fontSize:10,color:'var(--ink-faint)',marginTop:2,fontFamily:'var(--mono)'}}>{s.status}</div>
            </div>
          ))}
        </aside>

        {/* main body */}
        <div style={{minWidth:0}}>
          {/* Header card */}
          <div className="panel" style={{marginBottom:18,position:'relative',overflow:'hidden',borderColor:current.color+'44'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:current.color,boxShadow:`0 0 12px ${current.color}`}}/>
            <div style={{position:'absolute',right:-30,bottom:-40,fontSize:200,opacity:.05,lineHeight:1,pointerEvents:'none'}}>{current.icon}</div>
            <div className="panel-body">
              <div style={{display:'flex',alignItems:'flex-start',gap:18}}>
                <div style={{fontSize:60,lineHeight:1,filter:`drop-shadow(0 0 12px ${current.color}66)`}}>{current.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)',marginBottom:4}}>
                    Game System · last edited {relativeTimeS(current.updated)} by {current.author}
                  </div>
                  {editing ? (
                    <>
                      <input value={current.name} onChange={e=>update(current.id,{name:e.target.value})}
                        style={{width:'100%',background:'transparent',border:'none',outline:'none',
                          fontFamily:'var(--display)',fontSize:38,letterSpacing:'.04em',color:current.color,padding:0,fontWeight:500}}/>
                      <input value={current.tagline||''} onChange={e=>update(current.id,{tagline:e.target.value})}
                        placeholder="tagline"
                        style={{width:'100%',background:'transparent',border:'none',outline:'none',
                          fontFamily:'var(--serif)',fontStyle:'italic',fontSize:16,color:'var(--ink-dim)',padding:0,marginTop:4}}/>
                    </>
                  ) : (
                    <>
                      <h1 style={{margin:0,fontFamily:'var(--display)',fontSize:38,letterSpacing:'.04em',color:current.color,fontWeight:500,lineHeight:1.05}}>{current.name}</h1>
                      <div style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:16,color:'var(--ink-dim)',marginTop:4}}>{current.tagline}</div>
                    </>
                  )}
                  <div style={{display:'flex',gap:8,marginTop:10,alignItems:'center',flexWrap:'wrap'}}>
                    {editing ? (
                      <>
                        <select className="field-select" value={current.status} onChange={e=>update(current.id,{status:e.target.value})} style={{width:160,padding:'4px 8px',fontSize:11}}>
                          {SYSTEM_STATUSES.map(s=><option key={s}>{s}</option>)}
                        </select>
                        <input className="field-input" type="color" value={current.color} onChange={e=>update(current.id,{color:e.target.value})} style={{width:60,height:30,padding:2}}/>
                        <input className="field-input" value={current.icon} maxLength={4} onChange={e=>update(current.id,{icon:e.target.value})} style={{width:60,textAlign:'center',fontSize:18}}/>
                      </>
                    ) : (
                      <>
                        <span className="pill" style={{borderColor:current.color,color:current.color}}>{current.status}</span>
                        <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>{current.phases.length} phases</span>
                        <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--gold-bright)'}}>{overallProgress}% complete</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  {!editing && <button className="btn" onClick={()=>setEditing(true)}><Icon name="pencil" size={12}/> Edit</button>}
                  {editing && <button className="btn btn-primary" onClick={()=>setEditing(false)}><Icon name="check" size={12}/> Done</button>}
                  {canCreate && <button className="btn" onClick={()=>remove(current.id)} style={{color:'var(--ember)'}} title="Delete this system">✕</button>}
                </div>
              </div>

              {/* progress bar */}
              <div className="bar" style={{marginTop:14}}><i style={{width:`${overallProgress}%`, background:`linear-gradient(90deg, ${current.color}, var(--gold-bright))`}}/></div>
            </div>
          </div>

          {/* Summary / Pillars / Goals */}
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:18,marginBottom:18}}>
            <div className="panel">
              <div className="panel-head"><div className="panel-title">Summary</div></div>
              <div className="panel-body">
                {editing ? (
                  <textarea className="field-area" rows="5" value={current.summary||''} onChange={e=>update(current.id,{summary:e.target.value})}/>
                ) : (
                  <div style={{fontFamily:'var(--serif)',fontSize:14.5,lineHeight:1.6,color:'var(--ink)'}}>{current.summary}</div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><div className="panel-title">Pillars</div>
                {editing && <button className="btn btn-ghost" style={{padding:4}} onClick={()=>update(current.id,{pillars:[...(current.pillars||[]),'New pillar']})}><Icon name="add" size={12}/></button>}
              </div>
              <div className="panel-body" style={{fontFamily:'var(--serif)',fontSize:13,lineHeight:1.5,color:'var(--ink)'}}>
                {(current.pillars||[]).map((p,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0',borderBottom:'1px dashed var(--rule)'}}>
                    <span style={{color:current.color}}>●</span>
                    {editing ? (
                      <>
                        <input value={p} onChange={e=>{const next=[...current.pillars]; next[i]=e.target.value; update(current.id,{pillars:next});}}
                          style={{flex:1,background:'transparent',border:'none',outline:'none',color:'var(--ink)',fontFamily:'var(--serif)',padding:0}}/>
                        <span style={{cursor:'pointer',color:'var(--ink-faint)'}} onClick={()=>update(current.id,{pillars:current.pillars.filter((_,j)=>j!==i)})}>×</span>
                      </>
                    ) : <span style={{flex:1}}>{p}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><div className="panel-title">Design goals</div>
                {editing && <button className="btn btn-ghost" style={{padding:4}} onClick={()=>update(current.id,{designGoals:[...(current.designGoals||[]),'New goal']})}><Icon name="add" size={12}/></button>}
              </div>
              <div className="panel-body" style={{fontFamily:'var(--serif)',fontSize:13,lineHeight:1.5,color:'var(--ink)'}}>
                {(current.designGoals||[]).map((g,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0',borderBottom:'1px dashed var(--rule)'}}>
                    <span style={{color:'var(--gold)'}}>✦</span>
                    {editing ? (
                      <>
                        <input value={g} onChange={e=>{const next=[...current.designGoals]; next[i]=e.target.value; update(current.id,{designGoals:next});}}
                          style={{flex:1,background:'transparent',border:'none',outline:'none',color:'var(--ink)',fontFamily:'var(--serif)',padding:0}}/>
                        <span style={{cursor:'pointer',color:'var(--ink-faint)'}} onClick={()=>update(current.id,{designGoals:current.designGoals.filter((_,j)=>j!==i)})}>×</span>
                      </>
                    ) : <span style={{flex:1}}>{g}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Phases */}
          <div style={{marginBottom:18}}>
            <div className="section-head" style={{marginBottom:12}}>
              <div className="section-title">Phases <span className="ornament">·</span> {current.phases.length} steps</div>
              <button className="btn" onClick={()=>addPhase(current.id)}><Icon name="add" size={12}/> Add phase</button>
            </div>

            <div style={{display:'grid',gap:12}}>
              {current.phases.map((p, idx) => {
                const isEdit = editPhase === p.id;
                return (
                  <div key={p.id} className="panel system-phase" style={{borderLeft:`3px solid ${current.color}`}}>
                    <div className="panel-head" style={{cursor:'pointer'}} onClick={()=>setEditPhase(isEdit?null:p.id)}>
                      <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
                        <span style={{fontFamily:'var(--mono)',fontSize:11,color:current.color,letterSpacing:'.14em',width:36}}>PH {String(idx+1).padStart(2,'0')}</span>
                        <span style={{fontSize:18}}>{p.icon}</span>
                        {isEdit ? (
                          <input value={p.title} onChange={e=>updatePhase(current.id, p.id, {title:e.target.value})} onClick={e=>e.stopPropagation()}
                            style={{flex:1,background:'transparent',border:'none',outline:'none',fontFamily:'var(--display)',fontSize:15,letterSpacing:'.06em',color:'var(--gold-bright)',padding:0,textTransform:'uppercase'}}/>
                        ) : (
                          <span style={{fontFamily:'var(--display)',fontSize:15,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--gold-bright)'}}>{p.title}</span>
                        )}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                        <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>{p.owner||'—'}</span>
                        <div style={{width:60,height:5,background:'var(--vellum)',borderRadius:99,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${p.complete||0}%`,background:`linear-gradient(90deg, ${current.color}, var(--gold-bright))`}}/>
                        </div>
                        <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--gold-bright)',width:32,textAlign:'right'}}>{p.complete||0}%</span>
                        <Icon name="chevron" size={12}/>
                      </div>
                    </div>

                    {isEdit && (
                      <div className="panel-body">
                        <div style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 140px 100px',gap:8,marginBottom:14,alignItems:'flex-end'}}>
                          <div className="field" style={{margin:0}}>
                            <label className="field-label">Icon</label>
                            <input className="field-input" value={p.icon} maxLength={4} style={{textAlign:'center',fontSize:18}} onChange={e=>updatePhase(current.id,p.id,{icon:e.target.value})}/>
                          </div>
                          <div className="field" style={{margin:0}}>
                            <label className="field-label">Owner</label>
                            <input className="field-input" value={p.owner||''} onChange={e=>updatePhase(current.id,p.id,{owner:e.target.value})}/>
                          </div>
                          <div className="field" style={{margin:0}}>
                            <label className="field-label">Estimate</label>
                            <input className="field-input" value={p.estimate||''} placeholder="e.g. 3 weeks" onChange={e=>updatePhase(current.id,p.id,{estimate:e.target.value})}/>
                          </div>
                          <div className="field" style={{margin:0}}>
                            <label className="field-label">% complete ({p.complete||0})</label>
                            <input type="range" min="0" max="100" step="5" value={p.complete||0} onChange={e=>updatePhase(current.id,p.id,{complete:+e.target.value})}/>
                          </div>
                          <div style={{display:'flex',gap:4}}>
                            <button className="btn" style={{padding:'6px 8px'}} onClick={()=>movePhase(current.id,p.id,-1)} disabled={idx===0}>↑</button>
                            <button className="btn" style={{padding:'6px 8px'}} onClick={()=>movePhase(current.id,p.id,1)} disabled={idx===current.phases.length-1}>↓</button>
                          </div>
                        </div>
                        <div className="field" style={{margin:0}}>
                          <label className="field-label">Body (supports **bold**, *italic*, • bullets, blank lines)</label>
                          <textarea className="field-area" rows="10" value={p.body||''} onChange={e=>updatePhase(current.id,p.id,{body:e.target.value})}/>
                        </div>
                        <div style={{marginTop:10}}>
                          <button className="btn" onClick={()=>removePhase(current.id,p.id)} style={{color:'var(--ember)'}}>✕ Remove phase</button>
                        </div>
                      </div>
                    )}

                    {!isEdit && (
                      <div className="panel-body" style={{paddingTop:8}}>
                        <div className="system-body" dangerouslySetInnerHTML={{__html: renderSystemBody(p.body)}}/>
                        <div style={{display:'flex',gap:14,marginTop:10,fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',letterSpacing:'.08em'}}>
                          <span>OWNER · <span style={{color:'var(--ink-dim)'}}>{p.owner||'—'}</span></span>
                          <span>ESTIMATE · <span style={{color:'var(--ink-dim)'}}>{p.estimate||'—'}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {current.phases.length===0 && <div style={{padding:30,color:'var(--ink-faint)',fontStyle:'italic',textAlign:'center',border:'1px dashed var(--rule)',borderRadius:6}}>No phases yet. Add one to start.</div>}
            </div>
          </div>

          {/* Final goal */}
          <div className="panel" style={{marginBottom:18,background:`linear-gradient(180deg, ${current.color}10, var(--parchment))`,borderColor:current.color+'33'}}>
            <div className="panel-head" style={{borderColor:current.color+'33'}}>
              <div className="panel-title" style={{color:current.color}}>★ Final design goal</div>
            </div>
            <div className="panel-body">
              {editing ? (
                <textarea className="field-area" rows="5" value={current.finalGoal||''} onChange={e=>update(current.id,{finalGoal:e.target.value})}/>
              ) : (
                <div className="system-body" style={{fontSize:15}} dangerouslySetInnerHTML={{__html: renderSystemBody(current.finalGoal)}}/>
              )}
            </div>
          </div>

          {/* Discussion */}
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Discussion · {(current.comments||[]).length}</div>
              <button className="btn" onClick={askAthena}>🦉 Ask Athena</button>
            </div>
            <div className="panel-body">
              {(current.comments||[]).map((c,i) => (
                <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px dashed var(--rule)'}}>
                  <div className="avatar" style={{background: c.who==='Athena'?'linear-gradient(135deg,#5a4a7a,#1a142a)':'linear-gradient(135deg,#5a4a2a,#2a1f0a)',flex:'none'}}>
                    {c.who==='Athena' ? '🦉' : c.who[0]}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'var(--display)',fontSize:12,color: c.who==='Athena'?'#d2b8ff':'var(--gold-bright)',letterSpacing:'.06em'}}>
                      {c.who} <span style={{color:'var(--ink-faint)',fontSize:10,marginLeft:8,fontFamily:'var(--mono)'}}>{relativeTimeS(c.when)}</span>
                    </div>
                    <div style={{fontFamily:'var(--serif)',fontSize:14,color:'var(--ink)',marginTop:4,lineHeight:1.5}}>{c.text}</div>
                  </div>
                </div>
              ))}
              <textarea className="field-area" rows="3" value={draft} onChange={e=>setDraft(e.target.value)} placeholder={`Comment as ${me}…`} style={{marginTop:10}}/>
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <button className="btn btn-primary" onClick={()=>addComment(draft)}>Post</button>
                <div style={{marginLeft:'auto',fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>posting as {me}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

window.SystemsPage = SystemsPage;
