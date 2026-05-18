// Concepts / Vision Board — brainstorm space for unit / character / hero / world concepts.
// Upload artwork via image-slot, vote, comment, link to canon when promoted.

window.CONCEPTS = window.CONCEPTS || [];

const CONCEPT_KINDS = [
  { id:'character', name:'Character', icon:'☥' },
  { id:'hero',      name:'Hero',      icon:'👑' },
  { id:'unit',      name:'Unit',      icon:'⚔' },
  { id:'card-art',  name:'Card art',  icon:'🃏' },
  { id:'location',  name:'Location',  icon:'🏛' },
  { id:'item',      name:'Item',      icon:'❖' },
  { id:'world',     name:'World',     icon:'✶' },
];
const CONCEPT_STATUSES = [
  { id:'idea',         name:'Idea',         color:'#7d8590' },
  { id:'shortlisted',  name:'Shortlisted',  color:'#c9a14a' },
  { id:'approved',     name:'Approved',     color:'#7a9a52' },
  { id:'archived',     name:'Archived',     color:'#4a3a5a' },
];

const ConceptsPage = () => {
  const [concepts, setConcepts] = window.useEntities ? window.useEntities('concepts') : React.useState(window.CONCEPTS);
  const [openId, setOpenId] = React.useState(null);
  const [filterKind, setFilterKind] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [q, setQ] = React.useState('');
  const settings = (window.SETTINGS||{});
  const me = settings.designerName || 'You';

  const open = concepts.find(c => c.id === openId);

  const update = (id, patch) => setConcepts(concepts.map(c => c.id===id ? {...c, ...patch} : c));
  const create = () => {
    const id = (window.makeId ? window.makeId('cc') : 'cc-'+Date.now().toString(36));
    const c = { id, title:'New concept', kind:'character', desc:'', vision:'',
                status:'idea', priority:'med', tags:[],
                author:me, created: Date.now(), votes:[], comments:[] };
    setConcepts([c, ...concepts]); setOpenId(id);
  };
  const remove = (id) => {
    if(!confirm('Delete this concept and its discussion?')) return;
    setConcepts(concepts.filter(c=>c.id!==id)); setOpenId(null);
  };
  const toggleVote = (id) => {
    const c = concepts.find(x=>x.id===id);
    const votes = c.votes||[];
    update(id, { votes: votes.includes(me) ? votes.filter(v=>v!==me) : [...votes, me] });
  };
  const addComment = (id, text) => {
    if(!text.trim()) return;
    const c = concepts.find(x=>x.id===id);
    update(id, { comments: [...(c.comments||[]), { who:me, when:Date.now(), text }] });
  };

  const askAthena = async (id) => {
    const c = concepts.find(x=>x.id===id);
    if(!c) return;
    const placeholder = { who:'Athena', when:Date.now(), text:'(thinking…)' };
    update(id, { comments:[...(c.comments||[]), placeholder] });
    try {
      const reply = await window.claude.complete({
        messages:[{ role:'user', content:
`You are Athena, advising a game studio on a concept brainstorm.
Read this concept and give 3-5 sentences of useful feedback:
- What works about this idea?
- One creative twist that pushes it further
- How it might connect to existing canon (factions/elements/heroes)

CONCEPT: ${c.title} (${c.kind})
DESCRIPTION: ${c.desc}
VISION: ${c.vision}
CURRENT TAGS: ${(c.tags||[]).join(', ')}` }],
      });
      const fresh = concepts.find(x=>x.id===id) || c;
      const cleaned = (fresh.comments||[]).filter(x => !(x.who==='Athena' && x.text==='(thinking…)'));
      update(id, { comments:[...cleaned, { who:'Athena', when:Date.now(), text: reply }] });
    } catch(err) {
      const fresh = concepts.find(x=>x.id===id) || c;
      const cleaned = (fresh.comments||[]).filter(x => !(x.who==='Athena' && x.text==='(thinking…)'));
      update(id, { comments:[...cleaned, { who:'Athena', when:Date.now(), text:`(stumbled: ${err.message||err})` }] });
    }
  };

  const filtered = concepts.filter(c =>
    (filterKind==='all' || c.kind===filterKind)
    && (filterStatus==='all' || c.status===filterStatus)
    && (!q || c.title.toLowerCase().includes(q.toLowerCase()) || (c.desc||'').toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">✎</span>Concepts &amp; Vision Board</h1>
          <div className="page-sub">{concepts.length} concepts · {concepts.filter(c=>c.status==='shortlisted').length} shortlisted · drop images on any card to upload</div>
        </div>
        <div className="page-actions">
          <div className="search" style={{width:220}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search ideas..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={create}><Icon name="add" size={14}/> New concept</button>
        </div>
      </div>

      {/* Filters */}
      <div className="chip-row" style={{marginBottom:10}}>
        <div className={`chip ${filterKind==='all'?'active':''}`} onClick={()=>setFilterKind('all')}>All kinds</div>
        {CONCEPT_KINDS.map(k => {
          const n = concepts.filter(c=>c.kind===k.id).length;
          return <div key={k.id} className={`chip ${filterKind===k.id?'active':''}`}
                      onClick={()=>setFilterKind(filterKind===k.id?'all':k.id)}>{k.icon} {k.name} ({n})</div>;
        })}
      </div>
      <div className="chip-row" style={{marginBottom:18}}>
        <div className={`chip ${filterStatus==='all'?'active':''}`} onClick={()=>setFilterStatus('all')}>All status</div>
        {CONCEPT_STATUSES.map(s => {
          const n = concepts.filter(c=>c.status===s.id).length;
          return <div key={s.id} className={`chip ${filterStatus===s.id?'active':''}`}
                      onClick={()=>setFilterStatus(filterStatus===s.id?'all':s.id)}
                      style={filterStatus===s.id?{borderColor:s.color,color:s.color,background:s.color+'20'}:{}}>{s.name} ({n})</div>;
        })}
      </div>

      {/* Grid */}
      <div className="concept-grid">
        {filtered.map(c => {
          const k = CONCEPT_KINDS.find(x=>x.id===c.kind);
          const s = CONCEPT_STATUSES.find(x=>x.id===c.status);
          const voted = (c.votes||[]).includes(me);
          return (
            <div key={c.id} className="concept-card" onClick={()=>setOpenId(c.id)}>
              <div className="concept-art">
                <image-slot id={`concept-${c.id}`} shape="rect" placeholder="Drop concept art"></image-slot>
                <div className="concept-badge">
                  <span className="pill" style={{borderColor:s?.color,color:s?.color,background:'rgba(0,0,0,.6)'}}>{s?.name}</span>
                </div>
              </div>
              <div className="concept-meta">
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14}}>{k?.icon}</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink-faint)',letterSpacing:'.14em',textTransform:'uppercase'}}>{k?.name}</span>
                </div>
                <div style={{fontFamily:'var(--display)',fontSize:16,letterSpacing:'.04em',color:'var(--ink)',marginTop:6}}>{c.title}</div>
                <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:12.5,marginTop:4,lineHeight:1.45,
                            display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{c.desc}</div>
                <div style={{display:'flex',gap:8,marginTop:10,fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>
                  <span>{c.author}</span>
                  <span style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
                    <button className="btn btn-ghost" style={{padding:'2px 6px',fontSize:11,color: voted?'var(--gold-bright)':'var(--ink-faint)'}}
                      onClick={e=>{e.stopPropagation(); toggleVote(c.id);}} title="Vote for this concept">
                      ★ {(c.votes||[]).length}
                    </button>
                    <span>💬 {(c.comments||[]).length}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length===0 && <div style={{padding:40,color:'var(--ink-faint)',fontStyle:'italic',textAlign:'center',gridColumn:'1 / -1'}}>No concepts match. Try a different filter or create one.</div>}
      </div>

      {/* DETAIL OVERLAY */}
      {open && (() => {
        const k = CONCEPT_KINDS.find(x=>x.id===open.kind);
        const s = CONCEPT_STATUSES.find(x=>x.id===open.status);
        const voted = (open.votes||[]).includes(me);
        return (
          <div className="hero-overlay" onClick={()=>setOpenId(null)}>
            <div className="hero-sheet" onClick={e=>e.stopPropagation()}>
              <button className="sheet-close" onClick={()=>setOpenId(null)}>✕</button>
              <div className="sheet-grid">
                {/* LEFT — big image + meta */}
                <aside className="sheet-portrait-col">
                  <div style={{position:'relative',width:'100%',height:480,borderRadius:6,overflow:'hidden',
                    border:`1px solid ${s?.color||'var(--rule-strong)'}`,background:`linear-gradient(160deg,${(s?.color||'#888')}25, #0d0a05)`}}>
                    <image-slot id={`concept-detail-${open.id}`} shape="rect" placeholder="Drop a high-res concept image"
                      style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block',background:'transparent',border:'none'}}></image-slot>
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                    <span className="pill" style={{borderColor:s?.color,color:s?.color}}>{s?.name}</span>
                    <span className="pill">{k?.icon} {k?.name}</span>
                    {(open.tags||[]).map(t => <span key={t} className="pill">{t}</span>)}
                  </div>

                  <div style={{marginTop:14,display:'flex',gap:8}}>
                    <button className={`btn ${voted?'btn-primary':''}`} onClick={()=>toggleVote(open.id)} style={{flex:1}}>
                      ★ Vote ({(open.votes||[]).length})
                    </button>
                    <button className="btn" onClick={()=>askAthena(open.id)}>🦉 Ask Athena</button>
                  </div>
                  {(open.votes||[]).length > 0 && (
                    <div style={{marginTop:10,fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',letterSpacing:'.12em'}}>
                      VOTED BY: {open.votes.join(', ')}
                    </div>
                  )}
                </aside>

                {/* RIGHT */}
                <main className="sheet-main">
                  <div className="sheet-header">
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)'}}>
                        Concept · {open.author} · {window.relativeTimeT ? window.relativeTimeT(open.created):''}
                      </div>
                      <input value={open.title} onChange={e=>update(open.id,{title:e.target.value})}
                        style={{width:'100%',background:'transparent',border:'none',outline:'none',
                          fontFamily:'var(--display)',fontSize:36,letterSpacing:'.04em',color:'var(--ink)',padding:0,marginTop:4}}/>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <select className="field-select" value={open.kind} onChange={e=>update(open.id,{kind:e.target.value})} style={{width:130}}>
                        {CONCEPT_KINDS.map(k=><option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
                      </select>
                      <select className="field-select" value={open.status} onChange={e=>update(open.id,{status:e.target.value})} style={{width:130}}>
                        {CONCEPT_STATUSES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <section style={{marginTop:18}}>
                    <div style={{fontFamily:'var(--display)',fontSize:11,letterSpacing:'.24em',textTransform:'uppercase',color:'var(--gold)',marginBottom:6}}>Description</div>
                    <textarea className="field-area" rows="3" value={open.desc||''} onChange={e=>update(open.id,{desc:e.target.value})}
                      placeholder="What is this thing? Why are we considering it?"/>
                  </section>

                  <section style={{marginTop:14}}>
                    <div style={{fontFamily:'var(--display)',fontSize:11,letterSpacing:'.24em',textTransform:'uppercase',color:'var(--gold)',marginBottom:6}}>Visual vision</div>
                    <textarea className="field-area" rows="3" value={open.vision||''} onChange={e=>update(open.id,{vision:e.target.value})}
                      placeholder="Composition, palette, mood, references…"/>
                  </section>

                  <section style={{marginTop:14}}>
                    <div style={{fontFamily:'var(--display)',fontSize:11,letterSpacing:'.24em',textTransform:'uppercase',color:'var(--gold)',marginBottom:6}}>Tags</div>
                    <div className="chip-row">
                      {(open.tags||[]).map((t,i) => (
                        <span key={i} className="chip active">{t}
                          <span style={{marginLeft:6,opacity:.7,cursor:'pointer'}} onClick={()=>update(open.id,{tags: open.tags.filter((_,j)=>j!==i)})}>×</span>
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
                  </section>

                  <section style={{marginTop:18,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                    <div style={{fontFamily:'var(--display)',fontSize:11,letterSpacing:'.24em',textTransform:'uppercase',color:'var(--gold)',marginBottom:6}}>
                      Discussion · {(open.comments||[]).length}
                    </div>
                    {(open.comments||[]).map((c,i) => (
                      <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px dashed var(--rule)'}}>
                        <div className="avatar" style={{background: c.who==='Athena'?'linear-gradient(135deg,#5a4a7a,#1a142a)':'linear-gradient(135deg,#5a4a2a,#2a1f0a)',flex:'none'}}>
                          {c.who==='Athena' ? '🦉' : c.who[0]}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:'var(--display)',fontSize:12,color: c.who==='Athena'?'#d2b8ff':'var(--gold-bright)',letterSpacing:'.06em'}}>
                            {c.who} <span style={{color:'var(--ink-faint)',fontSize:10,marginLeft:8,fontFamily:'var(--mono)'}}>{window.relativeTimeT?window.relativeTimeT(c.when):''}</span>
                          </div>
                          <div style={{fontFamily:'var(--serif)',fontSize:14,color:'var(--ink)',marginTop:4,lineHeight:1.5}}>{c.text}</div>
                        </div>
                      </div>
                    ))}
                    <textarea className="field-area" rows="2" placeholder={`Add a thought as ${me}…`}
                      onKeyDown={e => { if(e.key==='Enter' && (e.ctrlKey||e.metaKey)) { addComment(open.id, e.target.value); e.target.value=''; }}}
                      style={{marginTop:10}}/>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',marginTop:4}}>⌘/Ctrl + Enter to post</div>
                  </section>

                  <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid var(--rule)',display:'flex',gap:8}}>
                    <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)'}}>✕ Delete</button>
                  </div>
                </main>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

window.ConceptsPage = ConceptsPage;
