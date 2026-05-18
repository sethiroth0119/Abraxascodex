// Ideas & Future Updates — captures suggestions, roadmap items, and "someday" features.
// Distinct from Tasks (which are concrete work) and Concepts (which are art/character brainstorms).
// Each idea has a status pipeline + voting + planned-version + comments.

window.IDEAS = window.IDEAS || [];

const IDEA_CATEGORIES = [
  { id:'feature',   name:'New feature',     icon:'✨', color:'#c9a14a' },
  { id:'gameplay',  name:'Gameplay',        icon:'⚔', color:'#c45a2f' },
  { id:'card',      name:'Card / Mechanic', icon:'🃏', color:'#a878d4' },
  { id:'system',    name:'System / Mode',   icon:'⚙', color:'#6c92d4' },
  { id:'ux',        name:'UX / Polish',     icon:'🖥', color:'#7fc4e6' },
  { id:'art',       name:'Art / Style',     icon:'🎨', color:'#d4a86a' },
  { id:'audio',     name:'Audio / Music',   icon:'🔊', color:'#7fc4e6' },
  { id:'social',    name:'Social / Online', icon:'🤝', color:'#7a9a52' },
  { id:'economy',   name:'Economy',         icon:'🔥', color:'#ff7755' },
  { id:'lore',      name:'Lore / Story',    icon:'❦', color:'#ffd166' },
  { id:'tooling',   name:'Studio tooling',  icon:'🛠', color:'#7d8590' },
  { id:'wild',      name:'Wild card',       icon:'★', color:'#d2b8ff' },
];

const IDEA_STATUSES = [
  { id:'idea',         name:'Idea',           color:'#7d8590' },
  { id:'discussing',   name:'Discussing',     color:'#c9a14a' },
  { id:'shortlisted',  name:'Shortlisted',    color:'#6c92d4' },
  { id:'planned',      name:'Planned',        color:'#a878d4' },
  { id:'in-progress',  name:'In progress',    color:'#ffd166' },
  { id:'shipped',      name:'Shipped',        color:'#7a9a52' },
  { id:'parked',       name:'Parked',         color:'#4a3a5a' },
  { id:'wont-do',      name:'Won\'t do',      color:'#3a3a3a' },
];

const IMPACT_LEVELS = [
  { id:'low',     name:'Low impact',     color:'#7d8590' },
  { id:'med',     name:'Medium impact',  color:'#c9a14a' },
  { id:'high',    name:'High impact',    color:'#ff7755' },
  { id:'massive', name:'Massive',        color:'#d2b8ff' },
];

const EFFORT_LEVELS = [
  { id:'xs', name:'XS · hours',    color:'#7a9a52' },
  { id:'s',  name:'S · 1-2 days',  color:'#c9a14a' },
  { id:'m',  name:'M · 1 week',    color:'#6c92d4' },
  { id:'l',  name:'L · 2-4 weeks', color:'#a878d4' },
  { id:'xl', name:'XL · months',   color:'#cc2a3a' },
];

function rtIdea(ts) {
  if(!ts) return '—';
  const d = Date.now() - ts;
  if(d < 60_000) return 'just now';
  if(d < 3_600_000) return Math.floor(d/60_000) + 'm ago';
  if(d < 86_400_000) return Math.floor(d/3_600_000) + 'h ago';
  return Math.floor(d/86_400_000) + 'd ago';
}

const IdeasPage = () => {
  const [ideas, setIdeas] = window.useEntities ? window.useEntities('ideas') : React.useState(window.IDEAS);
  const [openId, setOpenId] = React.useState(null);
  const [view, setView] = React.useState('roadmap'); // roadmap | list | matrix
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [filterCat, setFilterCat] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [createModal, setCreateModal] = React.useState(false);
  const [draft, setDraft] = React.useState({
    title:'', desc:'', category:'feature', status:'idea',
    impact:'med', effort:'m', targetVersion:'',
  });
  const [response, setResponse] = React.useState('');
  const settings = (window.SETTINGS||{});
  const me = settings.designerName || 'Team';

  const open = ideas.find(i => i.id === openId);

  const submitIdea = () => {
    if(!draft.title.trim()) return;
    const id = 'idea-' + Date.now().toString(36);
    const it = {
      id,
      title: draft.title.trim(),
      desc: draft.desc.trim(),
      category: draft.category,
      status: draft.status,
      impact: draft.impact,
      effort: draft.effort,
      targetVersion: draft.targetVersion.trim(),
      author: me,
      created: Date.now(),
      updated: Date.now(),
      votes: [me],
      comments: [],
      tags: [],
    };
    setIdeas([it, ...ideas]);
    setCreateModal(false);
    setDraft({ title:'', desc:'', category:'feature', status:'idea', impact:'med', effort:'m', targetVersion:'' });
    setOpenId(id);
  };

  const update = (id, patch) => setIdeas(ideas.map(it => it.id===id ? {...it, ...patch, updated: Date.now()} : it));
  const remove = (id) => {
    if(!confirm('Delete this idea? This is permanent.')) return;
    setIdeas(ideas.filter(it=>it.id!==id));
    setOpenId(null);
  };
  const toggleVote = (id) => {
    const it = ideas.find(x=>x.id===id);
    const v = it.votes || [];
    update(id, { votes: v.includes(me) ? v.filter(x=>x!==me) : [...v, me] });
  };
  const addComment = (id, text) => {
    if(!text.trim()) return;
    const it = ideas.find(x=>x.id===id);
    update(id, { comments: [...(it.comments||[]), { who:me, when:Date.now(), text }] });
    setResponse('');
  };

  const askAthena = async (id) => {
    const it = ideas.find(x=>x.id===id);
    if(!it) return;
    const placeholder = { who:'Athena', when:Date.now(), text:'(thinking…)' };
    update(id, { comments:[...(it.comments||[]), placeholder] });
    try {
      const reply = await window.claude.complete({
        messages:[{ role:'user', content:
`You are Athena, advising a small game studio on a feature idea for "Mythic story of Abraxas" (tactical card game).

Read this idea and give 3-5 sentences:
- One way the idea could go even further or surprise the player
- One concrete risk or scoping concern
- Whether it fits the studio's existing pillars

IDEA: ${it.title}
CATEGORY: ${it.category}
DESCRIPTION: ${it.desc}
IMPACT: ${it.impact} · EFFORT: ${it.effort} · TARGET: ${it.targetVersion || 'none'}` }],
      });
      const fresh = ideas.find(x=>x.id===id) || it;
      const cleaned = (fresh.comments||[]).filter(c => !(c.who==='Athena' && c.text==='(thinking…)'));
      update(id, { comments: [...cleaned, { who:'Athena', when:Date.now(), text: reply }] });
    } catch(err) {
      const fresh = ideas.find(x=>x.id===id) || it;
      const cleaned = (fresh.comments||[]).filter(c => !(c.who==='Athena' && c.text==='(thinking…)'));
      update(id, { comments:[...cleaned, { who:'Athena', when:Date.now(), text:`(stumbled: ${err.message||err})` }] });
    }
  };

  const filtered = ideas.filter(it =>
    (filterStatus==='all' || it.status===filterStatus)
    && (filterCat==='all' || it.category===filterCat)
    && (!q || it.title.toLowerCase().includes(q.toLowerCase()) || (it.desc||'').toLowerCase().includes(q.toLowerCase()))
  );

  // For roadmap view: group by status
  const byStatus = {};
  IDEA_STATUSES.forEach(s => byStatus[s.id] = []);
  filtered.forEach(it => { if(byStatus[it.status]) byStatus[it.status].push(it); });

  const renderCard = (it) => {
    const cat = IDEA_CATEGORIES.find(c=>c.id===it.category);
    const imp = IMPACT_LEVELS.find(x=>x.id===it.impact);
    const eff = EFFORT_LEVELS.find(x=>x.id===it.effort);
    const voted = (it.votes||[]).includes(me);
    return (
      <div key={it.id} className="idea-card" onClick={()=>setOpenId(it.id)}
        style={{borderLeftColor:cat?.color,
                borderColor: openId===it.id?'var(--gold-bright)':'var(--rule)',
                boxShadow: openId===it.id?'0 0 0 1px var(--gold-bright)':undefined}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,flexWrap:'wrap'}}>
          <span className="pill" style={{borderColor:cat?.color,color:cat?.color,fontSize:9}}>{cat?.icon} {cat?.name}</span>
          {it.targetVersion && <span className="pill" style={{fontSize:9,borderColor:'var(--gold-deep)',color:'var(--gold-bright)'}}>v{it.targetVersion}</span>}
        </div>
        <div style={{fontFamily:'var(--display)',fontSize:14,color:'var(--ink)',letterSpacing:'.02em',lineHeight:1.3}}>{it.title}</div>
        {it.desc && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:12,marginTop:4,lineHeight:1.4,
                                  display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{it.desc}</div>}
        <div style={{display:'flex',gap:8,marginTop:8,fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',alignItems:'center'}}>
          <span style={{color:imp?.color}}>{imp?.name.split(' ')[0]}</span>
          <span style={{color:'var(--ink-faint)'}}>·</span>
          <span style={{color:eff?.color}}>{eff?.name.split(' ')[0]}</span>
          <button className="btn btn-ghost"
                  style={{marginLeft:'auto',padding:'2px 6px',fontSize:11,color: voted?'var(--gold-bright)':'var(--ink-faint)'}}
                  onClick={e=>{e.stopPropagation(); toggleVote(it.id);}}>
            ★ {(it.votes||[]).length}
          </button>
          {(it.comments||[]).length > 0 && <span>💬 {it.comments.length}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">💡</span>Ideas &amp; Future Updates</h1>
          <div className="page-sub">{ideas.length} idea{ideas.length!==1?'s':''} · {ideas.filter(i=>i.status==='shipped').length} shipped · {ideas.filter(i=>i.status==='in-progress').length} in motion</div>
        </div>
        <div className="page-actions">
          <div className="chip-row">
            <div className={`chip ${view==='roadmap'?'active':''}`} onClick={()=>setView('roadmap')}>Roadmap</div>
            <div className={`chip ${view==='list'?'active':''}`} onClick={()=>setView('list')}>List</div>
            <div className={`chip ${view==='matrix'?'active':''}`} onClick={()=>setView('matrix')}>Impact / Effort</div>
          </div>
          <div className="search" style={{width:220}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search ideas..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={()=>setCreateModal(true)}><Icon name="add" size={14}/> New idea</button>
        </div>
      </div>

      {/* Filters */}
      <div className="chip-row" style={{marginBottom:18}}>
        <div className={`chip ${filterCat==='all'?'active':''}`} onClick={()=>setFilterCat('all')}>All categories</div>
        {IDEA_CATEGORIES.map(c => {
          const n = ideas.filter(i=>i.category===c.id).length;
          if(!n && filterCat !== c.id) return null;
          return <div key={c.id} className={`chip ${filterCat===c.id?'active':''}`}
                      onClick={()=>setFilterCat(filterCat===c.id?'all':c.id)}
                      style={filterCat===c.id?{borderColor:c.color,color:c.color,background:c.color+'20'}:{}}>
            {c.icon} {c.name} ({n})
          </div>;
        })}
      </div>

      {ideas.length === 0 && (
        <div className="panel" style={{padding:'60px 40px',textAlign:'center'}}>
          <div style={{fontSize:64,opacity:.3,marginBottom:14}}>💡</div>
          <div style={{fontFamily:'var(--display)',fontSize:22,letterSpacing:'.06em',color:'var(--gold-bright)',marginBottom:8}}>No ideas yet</div>
          <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:14,marginBottom:24,maxWidth:520,marginLeft:'auto',marginRight:'auto',lineHeight:1.5}}>
            This is where "what if…" lives. Pitch features, future updates, wild experiments. The team can vote, refine, and promote winners into tasks.
          </div>
          <button className="btn btn-primary" onClick={()=>setCreateModal(true)}><Icon name="add" size={14}/> Drop the first idea</button>
        </div>
      )}

      {ideas.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns: openId?'1fr 420px':'1fr',gap:24,alignItems:'start'}}>
          <div>
            {/* ROADMAP VIEW — column per status */}
            {view === 'roadmap' && (
              <div className="idea-roadmap">
                {IDEA_STATUSES.map(s => {
                  const items = byStatus[s.id] || [];
                  if(items.length === 0 && filterStatus !== s.id) return null;
                  return (
                    <div key={s.id} className="idea-col">
                      <div className="idea-col-head" style={{borderTopColor:s.color}}>
                        <span style={{color:s.color,fontFamily:'var(--display)',letterSpacing:'.16em',fontSize:11,textTransform:'uppercase'}}>{s.name}</span>
                        <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>{items.length}</span>
                      </div>
                      <div className="idea-col-list">
                        {items.map(renderCard)}
                        {items.length===0 && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)',fontSize:11,textAlign:'center',padding:10}}>—</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* LIST VIEW */}
            {view === 'list' && (
              <div className="panel">
                <table className="ledger">
                  <thead><tr>
                    <th>Title</th><th>Category</th><th>Status</th><th>Impact</th><th>Effort</th><th>Target</th><th style={{textAlign:'right'}}>★</th>
                  </tr></thead>
                  <tbody>
                    {filtered.sort((a,b)=>(b.votes||[]).length - (a.votes||[]).length).map(it => {
                      const cat = IDEA_CATEGORIES.find(c=>c.id===it.category);
                      const st = IDEA_STATUSES.find(s=>s.id===it.status);
                      const imp = IMPACT_LEVELS.find(x=>x.id===it.impact);
                      const eff = EFFORT_LEVELS.find(x=>x.id===it.effort);
                      return (
                        <tr key={it.id} style={{cursor:'pointer',background:it.id===openId?'rgba(201,161,74,.05)':undefined}} onClick={()=>setOpenId(it.id)}>
                          <td style={{fontFamily:'var(--display)',color:'var(--ink)'}}>{it.title}</td>
                          <td><span className="pill" style={{borderColor:cat?.color,color:cat?.color}}>{cat?.icon} {cat?.name}</span></td>
                          <td><span className="pill" style={{borderColor:st?.color,color:st?.color}}>{st?.name}</span></td>
                          <td style={{color:imp?.color,fontFamily:'var(--mono)',fontSize:11}}>{imp?.name.split(' ')[0]}</td>
                          <td style={{color:eff?.color,fontFamily:'var(--mono)',fontSize:11}}>{eff?.name.split(' ')[0]}</td>
                          <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--gold-bright)'}}>{it.targetVersion ? 'v'+it.targetVersion : '—'}</td>
                          <td style={{textAlign:'right',fontFamily:'var(--mono)',color: (it.votes||[]).length?'var(--gold-bright)':'var(--ink-faint)'}}>{(it.votes||[]).length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* IMPACT/EFFORT MATRIX */}
            {view === 'matrix' && (
              <div className="panel" style={{padding:24}}>
                <div className="idea-matrix">
                  <div className="idea-matrix-grid">
                    {/* axis labels */}
                    <div className="idea-matrix-y">Impact →</div>
                    <div className="idea-matrix-x">Effort →</div>
                    {IMPACT_LEVELS.slice().reverse().map((imp, ri) => (
                      <React.Fragment key={imp.id}>
                        <div className="idea-matrix-rowlabel" style={{color:imp.color,gridRow: ri+1}}>{imp.name.split(' ')[0]}</div>
                        {EFFORT_LEVELS.map((eff, ci) => {
                          const cell = filtered.filter(it => it.impact===imp.id && it.effort===eff.id);
                          // quadrant suggestion
                          const isQuickWin = imp.id !== 'low' && (eff.id==='xs' || eff.id==='s');
                          const isMoonshot = (imp.id==='high' || imp.id==='massive') && eff.id==='xl';
                          return (
                            <div key={eff.id} className={`idea-matrix-cell ${isQuickWin?'quickwin':''} ${isMoonshot?'moonshot':''}`}
                                 style={{gridRow: ri+1, gridColumn: ci+2}}>
                              {cell.map(it => (
                                <div key={it.id} className="idea-matrix-chip" onClick={()=>setOpenId(it.id)}
                                     title={it.title} style={{borderColor: IDEA_CATEGORIES.find(c=>c.id===it.category)?.color}}>
                                  {it.title}
                                  {(it.votes||[]).length > 0 && <span style={{marginLeft:6,color:'var(--gold-bright)',fontFamily:'var(--mono)',fontSize:9}}>★{it.votes.length}</span>}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {EFFORT_LEVELS.map((eff, ci) => (
                      <div key={eff.id} className="idea-matrix-collabel" style={{color:eff.color,gridColumn: ci+2}}>{eff.name.split(' ')[0]}</div>
                    ))}
                  </div>
                  <div style={{marginTop:14,display:'flex',gap:14,fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)',letterSpacing:'.06em'}}>
                    <span><span style={{display:'inline-block',width:12,height:12,background:'rgba(122,154,82,.15)',border:'1px solid var(--verdant)',marginRight:4,verticalAlign:'middle'}}/>Quick wins · do these first</span>
                    <span><span style={{display:'inline-block',width:12,height:12,background:'rgba(210,184,255,.10)',border:'1px solid #d2b8ff',marginRight:4,verticalAlign:'middle'}}/>Moonshots · big bets</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DETAIL */}
          {open && (() => {
            const cat = IDEA_CATEGORIES.find(c=>c.id===open.category);
            const st = IDEA_STATUSES.find(s=>s.id===open.status);
            const voted = (open.votes||[]).includes(me);
            return (
              <div className="panel" style={{position:'sticky',top:0,maxHeight:'calc(100vh - 200px)',overflow:'auto'}}>
                <div className="panel-head" style={{flexWrap:'wrap',gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <input value={open.title} onChange={e=>update(open.id,{title:e.target.value})}
                      style={{width:'100%',background:'transparent',border:'none',outline:'none',
                        fontFamily:'var(--display)',fontSize:18,letterSpacing:'.04em',color:'var(--gold-bright)',padding:0}}/>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',marginTop:2}}>
                      by {open.author} · {rtIdea(open.created)}
                    </div>
                  </div>
                  <button className="btn" onClick={()=>setOpenId(null)}>✕</button>
                </div>
                <div className="panel-body">
                  <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                    <button className={`btn ${voted?'btn-primary':''}`} onClick={()=>toggleVote(open.id)} style={{flex:1,minWidth:120}}>
                      ★ Upvote ({(open.votes||[]).length})
                    </button>
                    <button className="btn" onClick={()=>askAthena(open.id)}>🦉 Ask Athena</button>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Status</label>
                      <select className="field-select" value={open.status} onChange={e=>update(open.id,{status:e.target.value})}>
                        {IDEA_STATUSES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Category</label>
                      <select className="field-select" value={open.category} onChange={e=>update(open.id,{category:e.target.value})}>
                        {IDEA_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Impact</label>
                      <select className="field-select" value={open.impact} onChange={e=>update(open.id,{impact:e.target.value})}>
                        {IMPACT_LEVELS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Effort</label>
                      <select className="field-select" value={open.effort} onChange={e=>update(open.id,{effort:e.target.value})}>
                        {EFFORT_LEVELS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Target version</label>
                      <input className="field-input" value={open.targetVersion||''} onChange={e=>update(open.id,{targetVersion:e.target.value})} placeholder="0.5 / 1.0 / —"/>
                    </div>
                  </div>

                  <div className="field" style={{margin:0,marginBottom:12}}>
                    <label className="field-label">Description</label>
                    <textarea className="field-area" rows="5" value={open.desc||''} onChange={e=>update(open.id,{desc:e.target.value})}/>
                  </div>

                  <div className="field" style={{margin:0,marginBottom:14}}>
                    <label className="field-label">Tags</label>
                    <div className="chip-row">
                      {(open.tags||[]).map((t,i) => (
                        <span key={i} className="chip active">{t}
                          <span style={{marginLeft:6,opacity:.7,cursor:'pointer'}} onClick={()=>update(open.id,{tags:open.tags.filter((_,j)=>j!==i)})}>×</span>
                        </span>
                      ))}
                      <input
                        placeholder="+ tag"
                        onKeyDown={e => {
                          if(e.key==='Enter' && e.target.value.trim()){
                            update(open.id,{tags:[...(open.tags||[]), e.target.value.trim()]});
                            e.target.value='';
                          }
                        }}
                        style={{background:'transparent',border:'1px dashed var(--rule-strong)',borderRadius:99,color:'var(--ink)',padding:'4px 10px',fontSize:11,fontFamily:'var(--body)',width:90,outline:'none'}}/>
                    </div>
                  </div>

                  {/* Promote to task */}
                  <button className="btn" style={{width:'100%',marginBottom:10}}
                    onClick={()=>{
                      if(!window.TASKS) window.TASKS = [];
                      const tid = 't-' + Date.now().toString(36);
                      const newTask = {
                        id: tid, title: '[from idea] ' + open.title, desc: open.desc, status:'todo',
                        priority: open.impact==='massive'||open.impact==='high'?'high':'med',
                        assignee: me, due:null, created: Date.now(), tags:['from-idea'], comments:[],
                      };
                      try {
                        const raw = localStorage.getItem('mss:tasks');
                        const cur = raw ? JSON.parse(raw) : [];
                        localStorage.setItem('mss:tasks', JSON.stringify([newTask, ...cur]));
                        window.TASKS = [newTask, ...cur];
                      } catch(e) {}
                      update(open.id, { status:'planned' });
                      alert(`Promoted to a task. Open Tasks & To-Do to see it.`);
                    }}>
                    → Promote to Task
                  </button>

                  {/* Comments thread */}
                  <div style={{marginTop:10,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                    <div className="field-label" style={{marginBottom:8}}>Discussion · {(open.comments||[]).length}</div>
                    {(open.comments||[]).map((c,i) => (
                      <div key={i} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:'1px dashed var(--rule)'}}>
                        <div className="avatar" style={{flex:'none',width:28,height:28,fontSize:12,
                          background: c.who==='Athena'?'linear-gradient(135deg,#5a4a7a,#1a142a)':'linear-gradient(135deg,#5a4a2a,#2a1f0a)'}}>
                          {c.who==='Athena' ? '🦉' : c.who[0]}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:'var(--display)',fontSize:11,color:c.who==='Athena'?'#d2b8ff':'var(--gold-bright)',letterSpacing:'.06em'}}>
                            {c.who}
                            <span style={{color:'var(--ink-faint)',fontSize:9,marginLeft:8,fontFamily:'var(--mono)'}}>{rtIdea(c.when)}</span>
                          </div>
                          <div style={{fontFamily:'var(--serif)',fontSize:13,color:'var(--ink)',marginTop:2,lineHeight:1.5}}>{c.text}</div>
                        </div>
                      </div>
                    ))}
                    <textarea className="field-area" rows="2" value={response} onChange={e=>setResponse(e.target.value)}
                              placeholder={`Add a thought as ${me}…`} style={{marginTop:10}}/>
                    <div style={{display:'flex',gap:6,marginTop:6}}>
                      <button className="btn btn-primary" onClick={()=>addComment(open.id, response)} disabled={!response.trim()}>Post</button>
                      <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)',marginLeft:'auto'}}>✕ Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <div className="hero-overlay" onClick={()=>setCreateModal(false)}>
          <div className="hero-sheet" onClick={e=>e.stopPropagation()} style={{maxWidth:640}}>
            <button className="sheet-close" onClick={()=>setCreateModal(false)}>✕</button>
            <div style={{padding:'28px 32px'}}>
              <div style={{marginBottom:18}}>
                <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)'}}>Drop an idea</div>
                <h2 style={{margin:'4px 0 0',fontFamily:'var(--display)',fontSize:28,letterSpacing:'.04em',color:'var(--gold-bright)',fontWeight:500}}>
                  💡 What if…
                </h2>
                <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:13,marginTop:4}}>
                  Half-formed ideas welcome. The team will refine and vote.
                </div>
              </div>

              <div className="field">
                <label className="field-label">Idea title *</label>
                <input className="field-input" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}
                       placeholder="e.g. 'Players can name their own deck after defeating a Gym Leader'" autoFocus/>
              </div>

              <div className="field">
                <label className="field-label">Pitch</label>
                <textarea className="field-area" rows="4" value={draft.desc} onChange={e=>setDraft({...draft,desc:e.target.value})}
                          placeholder="Two or three sentences. Why does this matter? What does it unlock?"/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Category</label>
                  <select className="field-select" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}>
                    {IDEA_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Starting status</label>
                  <select className="field-select" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}>
                    {IDEA_STATUSES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:10}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Impact</label>
                  <select className="field-select" value={draft.impact} onChange={e=>setDraft({...draft,impact:e.target.value})}>
                    {IMPACT_LEVELS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Effort estimate</label>
                  <select className="field-select" value={draft.effort} onChange={e=>setDraft({...draft,effort:e.target.value})}>
                    {EFFORT_LEVELS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Target version (optional)</label>
                  <input className="field-input" value={draft.targetVersion} onChange={e=>setDraft({...draft,targetVersion:e.target.value})}
                         placeholder="0.5 / 1.0 / …"/>
                </div>
              </div>

              <div style={{display:'flex',gap:8,marginTop:20,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                <button className="btn" onClick={()=>setCreateModal(false)}>Cancel</button>
                <div style={{flex:1}}/>
                <button className="btn btn-primary" onClick={submitIdea} disabled={!draft.title.trim()}>
                  💡 Drop it in
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.IdeasPage = IdeasPage;
