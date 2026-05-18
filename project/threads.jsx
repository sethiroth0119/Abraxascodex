// Threads — team discussion (general + per-entity comments)

window.THREADS = window.THREADS || [];

function relativeTimeT(ts) {
  if(!ts) return '—';
  const d = Date.now() - ts;
  if(d < 60_000) return 'just now';
  if(d < 3_600_000) return Math.floor(d/60_000) + 'm ago';
  if(d < 86_400_000) return Math.floor(d/3_600_000) + 'h ago';
  return Math.floor(d/86_400_000) + 'd ago';
}

const SCOPE_LABELS = {
  general: '◇ General',
  card:    '⚔ Card',
  hero:    '☥ Character',
  concept: '✎ Concept',
  faction: '✶ Faction',
  lore:    '❦ Lore',
  task:    '⏵ Task',
};

const ThreadsPage = () => {
  const [threads, setThreads] = window.useEntities ? window.useEntities('threads') : React.useState(window.THREADS);
  const [openId, setOpenId] = React.useState(null);
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const settings = (window.SETTINGS||{});
  const me = settings.designerName || 'You';

  const open = threads.find(t => t.id === openId);

  const create = () => {
    const id = (window.makeId ? window.makeId('th') : 'th-'+Date.now().toString(36));
    const t = { id, title:'New Discussion', scope:'general', linkedId:null,
                author: me, created: Date.now(), status:'open', tags:[], posts:[] };
    setThreads([t, ...threads]); setOpenId(id);
  };
  const update = (id, patch) => setThreads(threads.map(t => t.id===id ? {...t, ...patch} : t));
  const remove = (id) => {
    if(!confirm('Delete this thread and all its comments?')) return;
    setThreads(threads.filter(t=>t.id!==id)); setOpenId(null);
  };
  const post = (id, text, who=me) => {
    if(!text.trim()) return;
    const t = threads.find(x=>x.id===id);
    update(id, { posts: [...t.posts, { id:'p'+Date.now(), who, when: Date.now(), text }] });
  };

  const filtered = threads.filter(t =>
    (filter==='all' || (filter==='open'?t.status==='open':filter==='resolved'?t.status==='resolved':t.scope===filter))
    && (!q || t.title.toLowerCase().includes(q.toLowerCase()) || (t.posts||[]).some(p=>p.text.toLowerCase().includes(q.toLowerCase())))
  );

  // ---- Athena helper for a thread ----
  const askAthena = async (id) => {
    const t = threads.find(x=>x.id===id);
    if(!t) return;
    update(id, { posts: [...t.posts, { id:'pwait'+Date.now(), who:'Athena', when:Date.now(), text:'(thinking…)' }] });
    try {
      const sys = `You are Athena, a creative AI helping a game studio. Read the discussion below. Give a concise, useful perspective. 3-5 sentences. Reference specifics from the thread. Don't be sycophantic.`;
      const dialogue = t.posts.map(p => `${p.who}: ${p.text}`).join('\n');
      const reply = await window.claude.complete({
        messages: [
          { role:'user', content: `${sys}\n\nTHREAD TITLE: ${t.title}\n\n${dialogue}\n\nYour turn:` },
        ],
      });
      // replace the placeholder
      const fresh = threads.find(x=>x.id===id) || t;
      const posts = fresh.posts.filter(p => p.id !== 'pwait'+Date.now());
      // simpler: drop last placeholder by author
      const cleaned = fresh.posts.filter(p => !(p.who==='Athena' && p.text==='(thinking…)'));
      update(id, { posts: [...cleaned, { id:'p'+Date.now(), who:'Athena', when:Date.now(), text: reply }] });
    } catch(err) {
      const cleaned = (threads.find(x=>x.id===id)||t).posts.filter(p => !(p.who==='Athena' && p.text==='(thinking…)'));
      update(id, { posts: [...cleaned, { id:'p'+Date.now(), who:'Athena', when:Date.now(), text:`(stumbled: ${err.message||err})` }] });
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">❝</span>Threads</h1>
          <div className="page-sub">{threads.length} discussions · {threads.filter(t=>t.status==='open').length} open · comments on anything in the studio</div>
        </div>
        <div className="page-actions">
          <div className="search" style={{width:240}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search threads..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={create}><Icon name="add" size={14}/> New Thread</button>
        </div>
      </div>

      <div className="chip-row" style={{marginBottom:16}}>
        <div className={`chip ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>All ({threads.length})</div>
        <div className={`chip ${filter==='open'?'active':''}`} onClick={()=>setFilter('open')}>Open ({threads.filter(t=>t.status==='open').length})</div>
        <div className={`chip ${filter==='resolved'?'active':''}`} onClick={()=>setFilter('resolved')}>Resolved ({threads.filter(t=>t.status==='resolved').length})</div>
        {Object.entries(SCOPE_LABELS).map(([k,l]) => {
          const n = threads.filter(t=>t.scope===k).length;
          if(!n) return null;
          return <div key={k} className={`chip ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>{l} ({n})</div>;
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns: openId?'380px 1fr':'1fr',gap:24,alignItems:'start'}}>
        {/* LIST */}
        <div className="panel">
          <div>
            {filtered.map(t => (
              <div key={t.id} onClick={()=>setOpenId(t.id)}
                style={{padding:'12px 16px',borderBottom:'1px solid var(--rule)',cursor:'pointer',
                  background: openId===t.id?'rgba(201,161,74,.06)':undefined,
                  borderLeft: openId===t.id?'3px solid var(--gold-bright)':'3px solid transparent'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontFamily:'var(--display)',fontSize:14,color:'var(--ink)',letterSpacing:'.04em'}}>{t.title}</span>
                  {t.status==='resolved' && <span className="pill" style={{borderColor:'var(--verdant)',color:'var(--verdant)'}}>resolved</span>}
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>
                  <span>{SCOPE_LABELS[t.scope]||t.scope}</span>
                  <span>·</span>
                  <span>{t.author}</span>
                  <span>·</span>
                  <span>{relativeTimeT(t.posts[t.posts.length-1]?.when || t.created)}</span>
                  <span style={{marginLeft:'auto',color:'var(--gold-bright)'}}>{t.posts.length} 💬</span>
                </div>
              </div>
            ))}
            {filtered.length===0 && <div style={{padding:30,color:'var(--ink-faint)',fontStyle:'italic',textAlign:'center'}}>No threads.</div>}
          </div>
        </div>

        {/* DETAIL */}
        {open && (
          <div className="panel">
            <div className="panel-head">
              <div style={{flex:1,minWidth:0}}>
                <input value={open.title} onChange={e=>update(open.id,{title:e.target.value})}
                  style={{width:'100%',background:'transparent',border:'none',outline:'none',
                    fontFamily:'var(--display)',fontSize:18,letterSpacing:'.06em',color:'var(--gold-bright)',padding:0}}/>
                <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',marginTop:2}}>
                  {SCOPE_LABELS[open.scope]} · started by {open.author} {relativeTimeT(open.created)}
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <select className="field-select" value={open.scope} onChange={e=>update(open.id,{scope:e.target.value})} style={{width:130,fontSize:11,padding:'4px 8px'}}>
                  {Object.entries(SCOPE_LABELS).map(([k,l])=><option key={k} value={k}>{l}</option>)}
                </select>
                <button className="btn" onClick={()=>update(open.id,{status: open.status==='open'?'resolved':'open'})}>
                  {open.status==='open' ? <><Icon name="check" size={12}/> Resolve</> : <>↺ Reopen</>}
                </button>
                <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)'}}>✕</button>
              </div>
            </div>
            <div className="panel-body">
              {open.posts.map(p => (
                <div key={p.id} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px dashed var(--rule)'}}>
                  <div className="avatar" style={{background: p.who==='Athena'?'linear-gradient(135deg,#5a4a7a,#1a142a)':'linear-gradient(135deg,#5a4a2a,#2a1f0a)',flex:'none'}}>
                    {p.who==='Athena' ? '🦉' : p.who[0]}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'var(--display)',color: p.who==='Athena'?'#d2b8ff':'var(--gold-bright)',letterSpacing:'.06em',fontSize:13}}>
                      {p.who} <span style={{color:'var(--ink-faint)',fontSize:10,marginLeft:8,fontFamily:'var(--mono)'}}>{relativeTimeT(p.when)}</span>
                    </div>
                    <div style={{fontFamily:'var(--serif)',fontSize:14,color:'var(--ink)',marginTop:4,lineHeight:1.5}}>{p.text}</div>
                  </div>
                </div>
              ))}

              <div style={{marginTop:14,paddingTop:14}}>
                <textarea className="field-area" rows="3" value={draft} onChange={e=>setDraft(e.target.value)}
                          placeholder={`Add a comment as ${me}…`}/>
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button className="btn btn-primary" onClick={()=>{post(open.id, draft); setDraft('');}}>
                    <Icon name="check" size={12}/> Post
                  </button>
                  <button className="btn" onClick={()=>askAthena(open.id)} title="Have Athena weigh in">
                    🦉 Ask Athena
                  </button>
                  <div style={{marginLeft:'auto',fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>posting as {me}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

window.ThreadsPage = ThreadsPage;
window.relativeTimeT = relativeTimeT;
