// Tasks — kanban-style team task tracker, with Athena helper

window.TASKS = window.TASKS || [];

const TASK_COLUMNS = [
  { id:'backlog',     name:'Backlog',     color:'#7d8590' },
  { id:'todo',        name:'To do',       color:'#c9a14a' },
  { id:'in-progress', name:'In progress', color:'#4a8aa8' },
  { id:'review',      name:'In review',   color:'#a878d4' },
  { id:'done',        name:'Done',        color:'#7a9a52' },
];
const PRIORITIES = [
  { id:'low',      name:'Low',      color:'#7d8590' },
  { id:'med',      name:'Medium',   color:'#c9a14a' },
  { id:'high',     name:'High',     color:'#ff7755' },
  { id:'critical', name:'Critical', color:'#cc2a3a' },
];

const TasksPage = () => {
  const [tasks, setTasks] = window.useEntities ? window.useEntities('tasks') : React.useState(window.TASKS);
  const [openId, setOpenId] = React.useState(null);
  const [view, setView] = React.useState('kanban'); // kanban | list
  const [filterAssignee, setFilterAssignee] = React.useState('all');
  const [filterPriority, setFilterPriority] = React.useState('all');
  const [planModal, setPlanModal] = React.useState(false);
  const [planGoal, setPlanGoal] = React.useState('');
  const [planCount, setPlanCount] = React.useState(5);
  const [planPriority, setPlanPriority] = React.useState('med');
  const [planBusy, setPlanBusy] = React.useState(false);
  const [planError, setPlanError] = React.useState(null);
  const settings = (window.SETTINGS||{});
  const me = settings.designerName || 'You';

  const open = tasks.find(t => t.id === openId);

  const update = (id, patch) => setTasks(tasks.map(t => t.id===id ? {...t, ...patch} : t));
  const create = (status='todo') => {
    const id = (window.makeId ? window.makeId('t') : 't-'+Date.now().toString(36));
    const t = { id, title:'New task', desc:'', status, priority:'med', assignee: me, due:null, created: Date.now(), tags:[], comments:[] };
    setTasks([t, ...tasks]); setOpenId(id);
  };
  const remove = (id) => {
    if(!confirm('Delete this task?')) return;
    setTasks(tasks.filter(t=>t.id!==id)); setOpenId(null);
  };
  const addComment = (id, text) => {
    if(!text.trim()) return;
    const t = tasks.find(x=>x.id===id);
    update(id, { comments: [...(t.comments||[]), { who:me, when:Date.now(), text }] });
  };

  const assignees = Array.from(new Set(tasks.map(t=>t.assignee).filter(Boolean)));
  const filtered = tasks.filter(t =>
    (filterAssignee==='all' || t.assignee===filterAssignee)
    && (filterPriority==='all' || t.priority===filterPriority)
  );

  // ---- Athena helpers ----
  const askAthenaBreakdown = async () => {
    if(!planGoal.trim()) return;
    setPlanBusy(true); setPlanError(null);
    try {
      const reply = await window.claude.complete({
        messages:[{ role:'user', content: `Break this game-design goal into ${planCount} concrete tasks. Output ONLY a JSON array like [{"title":"...","desc":"...","priority":"low|med|high|critical"}], no prose, no markdown fences.\n\nGOAL: ${planGoal}\n\nContext: Mythic story of Abraxas (tactical card game).` }],
      });
      const jsonStart = reply.indexOf('[');
      const jsonEnd = reply.lastIndexOf(']');
      if(jsonStart<0 || jsonEnd<0) { setPlanError('Athena replied but no JSON found.'); setPlanBusy(false); return; }
      const list = JSON.parse(reply.slice(jsonStart, jsonEnd+1));
      const fresh = list.map((item,i) => ({
        id: 't-'+Date.now().toString(36)+'-'+i,
        title: item.title || 'Untitled',
        desc:  item.desc  || '',
        status: 'todo',
        priority: ['low','med','high','critical'].includes(item.priority) ? item.priority : planPriority,
        assignee: me, due:null, created: Date.now(), tags:['athena'], comments:[],
      }));
      setTasks([...fresh, ...tasks]);
      setPlanModal(false); setPlanGoal(''); setPlanBusy(false);
    } catch(err) {
      setPlanError(err.message || String(err));
      setPlanBusy(false);
    }
  };

  const askAthenaSuggest = async (id) => {
    const t = tasks.find(x=>x.id===id);
    if(!t) return;
    const placeholder = { who:'Athena', when:Date.now(), text:'(thinking…)' };
    update(id, { comments: [...(t.comments||[]), placeholder] });
    try {
      const reply = await window.claude.complete({
        messages:[{ role:'user', content: `You are Athena, advising on this game-design task. Be concise (3-5 sentences). Suggest a concrete next step or flag a risk.\n\nTASK: ${t.title}\nDETAILS: ${t.desc}\nSTATUS: ${t.status} · PRIORITY: ${t.priority}` }],
      });
      const fresh = tasks.find(x=>x.id===id) || t;
      const cleaned = (fresh.comments||[]).filter(c => !(c.who==='Athena' && c.text==='(thinking…)'));
      update(id, { comments: [...cleaned, { who:'Athena', when:Date.now(), text: reply }] });
    } catch(err) {
      const fresh = tasks.find(x=>x.id===id) || t;
      const cleaned = (fresh.comments||[]).filter(c => !(c.who==='Athena' && c.text==='(thinking…)'));
      update(id, { comments: [...cleaned, { who:'Athena', when:Date.now(), text:`(stumbled: ${err.message||err})` }] });
    }
  };

  const renderCard = (t) => {
    const p = PRIORITIES.find(x=>x.id===t.priority);
    const overdue = t.due && t.due < Date.now() && t.status !== 'done';
    return (
      <div key={t.id} className="task-card" onClick={()=>setOpenId(t.id)}
        style={{borderColor: openId===t.id?'var(--gold-bright)':'var(--rule)',
          boxShadow: openId===t.id?'0 0 0 1px var(--gold-bright)':undefined}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <span className="pill" style={{borderColor:p?.color,color:p?.color,fontSize:9}}>{p?.name}</span>
          {overdue && <span className="pill" style={{borderColor:'var(--ember)',color:'var(--ember)',fontSize:9}}>overdue</span>}
        </div>
        <div style={{fontFamily:'var(--display)',fontSize:13.5,color:'var(--ink)',lineHeight:1.3,letterSpacing:'.02em'}}>{t.title}</div>
        {t.desc && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:12,marginTop:4,lineHeight:1.4,
                                display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{t.desc}</div>}
        <div style={{display:'flex',gap:8,marginTop:8,fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>
          <span>{t.assignee}</span>
          {t.due && <span style={{color: overdue?'var(--ember)':'var(--ink-faint)'}}>{new Date(t.due).toLocaleDateString()}</span>}
          {(t.comments||[]).length > 0 && <span style={{marginLeft:'auto'}}>💬 {t.comments.length}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⏵</span>Tasks &amp; To-Do</h1>
          <div className="page-sub">{tasks.length} tasks · {tasks.filter(t=>t.status!=='done').length} open · {tasks.filter(t=>t.due&&t.due<Date.now()&&t.status!=='done').length} overdue</div>
        </div>
        <div className="page-actions">
          <div className="chip-row">
            <div className={`chip ${view==='kanban'?'active':''}`} onClick={()=>setView('kanban')}>Kanban</div>
            <div className={`chip ${view==='list'?'active':''}`} onClick={()=>setView('list')}>List</div>
          </div>
          <button className="btn" onClick={()=>{setPlanModal(true); setPlanError(null);}} title="Have Athena turn a goal into tasks">
            🦉 Plan with Athena
          </button>
          <button className="btn btn-primary" onClick={()=>create()}><Icon name="add" size={14}/> New task</button>
        </div>
      </div>

      <div className="chip-row" style={{marginBottom:16}}>
        <div className={`chip ${filterAssignee==='all'?'active':''}`} onClick={()=>setFilterAssignee('all')}>Everyone</div>
        {assignees.map(a => (
          <div key={a} className={`chip ${filterAssignee===a?'active':''}`} onClick={()=>setFilterAssignee(filterAssignee===a?'all':a)}>{a}</div>
        ))}
        <div style={{width:1,background:'var(--rule)',margin:'0 6px'}}/>
        {PRIORITIES.map(p => (
          <div key={p.id} className={`chip ${filterPriority===p.id?'active':''}`}
               onClick={()=>setFilterPriority(filterPriority===p.id?'all':p.id)}
               style={filterPriority===p.id?{borderColor:p.color,color:p.color,background:p.color+'20'}:{}}>
            <span className="dot" style={{background:p.color}}/>{p.name}
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns: openId?'1fr 380px':'1fr',gap:24,alignItems:'start'}}>
        {/* BOARD */}
        <div>
          {view === 'kanban' ? (
            <div className="kanban-grid">
              {TASK_COLUMNS.map(col => {
                const colTasks = filtered.filter(t => t.status === col.id);
                return (
                  <div key={col.id} className="kanban-col">
                    <div className="kanban-col-head" style={{borderTopColor: col.color}}>
                      <span style={{color:col.color,fontFamily:'var(--display)',letterSpacing:'.16em',fontSize:11,textTransform:'uppercase'}}>{col.name}</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>{colTasks.length}</span>
                      <button className="btn btn-ghost" style={{marginLeft:'auto',padding:2}} onClick={()=>create(col.id)} title={`New in ${col.name}`}>
                        <Icon name="add" size={12}/>
                      </button>
                    </div>
                    <div className="kanban-list">
                      {colTasks.map(renderCard)}
                      {colTasks.length===0 && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)',fontSize:11,textAlign:'center',padding:10}}>—</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel">
              <table className="ledger">
                <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th></tr></thead>
                <tbody>
                  {filtered.map(t => {
                    const col = TASK_COLUMNS.find(c=>c.id===t.status);
                    const p = PRIORITIES.find(x=>x.id===t.priority);
                    return (
                      <tr key={t.id} style={{cursor:'pointer'}} onClick={()=>setOpenId(t.id)}>
                        <td style={{fontFamily:'var(--display)',color:'var(--ink)'}}>{t.title}</td>
                        <td><span className="pill" style={{borderColor:col?.color,color:col?.color}}>{col?.name}</span></td>
                        <td><span className="pill" style={{borderColor:p?.color,color:p?.color}}>{p?.name}</span></td>
                        <td style={{fontFamily:'var(--mono)',fontSize:12}}>{t.assignee}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:12,color: t.due&&t.due<Date.now()&&t.status!=='done' ? 'var(--ember)':'var(--ink-dim)'}}>
                          {t.due ? new Date(t.due).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DETAIL */}
        {open && (
          <div className="panel" style={{position:'sticky',top:0}}>
            <div className="panel-head">
              <input value={open.title} onChange={e=>update(open.id,{title:e.target.value})}
                style={{flex:1,background:'transparent',border:'none',outline:'none',
                  fontFamily:'var(--display)',fontSize:16,letterSpacing:'.04em',color:'var(--ink)',padding:0}}/>
              <button className="btn" onClick={()=>setOpenId(null)}>✕</button>
            </div>
            <div className="panel-body" style={{display:'grid',gap:10}}>
              <div className="field-row">
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Status</label>
                  <select className="field-select" value={open.status} onChange={e=>update(open.id,{status:e.target.value})}>
                    {TASK_COLUMNS.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Priority</label>
                  <select className="field-select" value={open.priority} onChange={e=>update(open.id,{priority:e.target.value})}>
                    {PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Assignee</label>
                  <input className="field-input" value={open.assignee||''} onChange={e=>update(open.id,{assignee:e.target.value})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Due date</label>
                  <input type="date" className="field-input"
                    value={open.due ? new Date(open.due).toISOString().slice(0,10) : ''}
                    onChange={e=>update(open.id,{due: e.target.value ? new Date(e.target.value).getTime() : null})}/>
                </div>
              </div>
              <div className="field" style={{margin:0}}>
                <label className="field-label">Description</label>
                <textarea className="field-area" rows="4" value={open.desc||''} onChange={e=>update(open.id,{desc:e.target.value})}
                          placeholder="What needs to happen? Why does it matter?"/>
              </div>
              <div className="field" style={{margin:0}}>
                <label className="field-label">Tags</label>
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
              </div>

              <div style={{marginTop:8,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                <div style={{fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)',marginBottom:8,display:'flex',alignItems:'center'}}>
                  Comments
                  <button className="btn btn-ghost" style={{marginLeft:'auto',padding:'2px 8px',fontSize:11}} onClick={()=>askAthenaSuggest(open.id)}>🦉 Ask Athena</button>
                </div>
                {(open.comments||[]).map((c,i) => (
                  <div key={i} style={{padding:'8px 0',borderBottom:'1px dashed var(--rule)'}}>
                    <div style={{fontFamily:'var(--display)',fontSize:11,color:c.who==='Athena'?'#d2b8ff':'var(--gold-bright)',letterSpacing:'.08em'}}>
                      {c.who==='Athena'?'🦉 ':''}{c.who} <span style={{color:'var(--ink-faint)',fontSize:9,marginLeft:6,fontFamily:'var(--mono)'}}>{relativeTimeT ? window.relativeTimeT(c.when) : ''}</span>
                    </div>
                    <div style={{fontFamily:'var(--serif)',fontSize:13,color:'var(--ink)',marginTop:2,lineHeight:1.5}}>{c.text}</div>
                  </div>
                ))}
                <textarea className="field-area" rows="2" placeholder={`Comment as ${me}...`}
                  onKeyDown={e => { if(e.key==='Enter' && (e.ctrlKey||e.metaKey)) { addComment(open.id, e.target.value); e.target.value=''; }}}
                  style={{marginTop:8}}/>
                <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',marginTop:4}}>⌘/Ctrl + Enter to post</div>
              </div>

              <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)',marginTop:10}}>✕ Delete task</button>
            </div>
          </div>
        )}
      </div>

      {/* Plan-with-Athena modal */}
      {planModal && (
        <div className="hero-overlay" onClick={()=>!planBusy && setPlanModal(false)}>
          <div className="hero-sheet" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
            <button className="sheet-close" onClick={()=>!planBusy && setPlanModal(false)}>✕</button>
            <div style={{padding:'28px 32px'}}>
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18}}>
                <div style={{width:56,height:56,borderRadius:'50%',display:'grid',placeItems:'center',
                  background:'radial-gradient(circle at 30% 30%, #d2b8ff, #6b4ea8 60%, #1a0f2a)',
                  boxShadow:'0 0 16px rgba(164,138,210,.4)',fontSize:28,flex:'none'}}>🦉</div>
                <div>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)'}}>Athena · task planner</div>
                  <h2 style={{margin:'4px 0 0',fontFamily:'var(--display)',fontSize:26,letterSpacing:'.04em',color:'#d2b8ff',fontWeight:500}}>Plan a goal</h2>
                  <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:13,marginTop:2}}>
                    Describe a goal — I'll break it into concrete tasks and drop them straight into your To-Do column.
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Goal</label>
                <textarea className="field-area" rows="4"
                  autoFocus disabled={planBusy}
                  value={planGoal} onChange={e=>setPlanGoal(e.target.value)}
                  placeholder="e.g. 'Design three new Water-faction heroes for the Saelune expansion' or 'Audit all Mythic-rarity cards for balance'"/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label"># of tasks ({planCount})</label>
                  <input type="range" min="3" max="10" step="1" value={planCount} disabled={planBusy} onChange={e=>setPlanCount(+e.target.value)}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Default priority</label>
                  <select className="field-select" value={planPriority} disabled={planBusy} onChange={e=>setPlanPriority(e.target.value)}>
                    {PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {planError && <div style={{marginTop:12,padding:'10px 12px',border:'1px solid var(--ember)',borderRadius:6,
                fontFamily:'var(--serif)',fontSize:13,color:'var(--ember)'}}>
                Athena stumbled: {planError}
              </div>}

              <div style={{display:'flex',gap:8,marginTop:18,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                <button className="btn" onClick={()=>!planBusy && setPlanModal(false)} disabled={planBusy}>Cancel</button>
                <div style={{flex:1}}/>
                <button className="btn btn-primary"
                        onClick={askAthenaBreakdown}
                        disabled={planBusy || !planGoal.trim()}>
                  {planBusy ? '🦉 consulting the codex…' : `🦉 Generate ${planCount} tasks`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.TasksPage = TasksPage;
