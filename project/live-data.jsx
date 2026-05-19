// Live Data — pulls from playmythicspellbook.com API
// Tabs: Live Stats · Corporations · Nodes · Updates · Game Update Publisher

const MS_API = 'https://playmythicspellbook.com/api/v1';
const msGet = p => fetch(MS_API + p, { headers: { accept: 'application/json' } }).then(r => r.json());

const MythicSpellbook = {
  health:       ()    => msGet('/health'),
  corporations: (n=200) => msGet('/corporations?limit=' + n),
  reserve:      ()    => msGet('/reserve'),
  tax:          ()    => msGet('/tax'),
  nodes:        (n=300) => msGet('/nodes?limit=' + n),
  updates:      (n=50)  => msGet('/updates?limit=' + n),
};

// ── helpers ──────────────────────────────────────────────────────────────────
function useLive(fetcher, deps = []) {
  const [data,    setData]    = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error,   setError]   = React.useState(null);

  const load = React.useCallback(() => {
    setLoading(true); setError(null);
    fetcher()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message || 'Request failed'); setLoading(false); });
  }, deps);

  React.useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

function LiveBadge({ ok }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.14em', textTransform:'uppercase',
      padding:'2px 8px', borderRadius:99,
      background: ok ? 'rgba(74,152,80,.15)' : 'rgba(204,34,34,.15)',
      border: `1px solid ${ok ? 'rgba(74,152,80,.4)' : 'rgba(204,34,34,.4)'}`,
      color: ok ? '#6fcc74' : '#f03030',
    }}>
      <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',boxShadow:'0 0 6px currentColor'}}/>
      {ok ? 'Online' : 'Offline'}
    </span>
  );
}

function Spinner() {
  return <span style={{display:'inline-block',width:16,height:16,border:'2px solid var(--rule)',borderTopColor:'var(--gold)',borderRadius:'50%',animation:'spin .7s linear infinite'}} />;
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{background:'var(--parchment-2)',border:'1px solid var(--rule)',borderRadius:'var(--r-md)',padding:'16px 20px',flex:1,minWidth:140}}>
      <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.18em',textTransform:'uppercase',color:'var(--ink-faint)',marginBottom:6}}>{label}</div>
      <div style={{fontFamily:'var(--display)',fontSize:28,color:color||'var(--ink)',lineHeight:1}}>{value ?? '—'}</div>
      {sub && <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',marginTop:4}}>{sub}</div>}
    </div>
  );
}

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n/1_000_000).toFixed(2)+'M';
  if (n >= 1_000) return (n/1_000).toFixed(1)+'K';
  return String(n);
}

// ── Tab: Live Stats ───────────────────────────────────────────────────────────
function StatsTab() {
  const health  = useLive(() => MythicSpellbook.health());
  const reserve = useLive(() => MythicSpellbook.reserve());
  const tax     = useLive(() => MythicSpellbook.tax());

  const isUp = !health.error && health.data;

  function reload() { health.reload(); reserve.reload(); tax.reload(); }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <LiveBadge ok={isUp} />
        <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>playmythicspellbook.com</span>
        <button className="btn" onClick={reload} style={{marginLeft:'auto'}}>↻ Refresh</button>
      </div>

      {/* Health */}
      <div className="panel" style={{marginBottom:18}}>
        <div className="panel-head"><div className="panel-title">Server Health</div></div>
        <div className="panel-body">
          {health.loading ? <Spinner/> : health.error
            ? <span style={{color:'var(--gold)',fontFamily:'var(--mono)',fontSize:12}}>⚠ {health.error}</span>
            : (
              <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                {Object.entries(health.data||{}).map(([k,v]) => (
                  <div key={k} style={{background:'var(--parchment-3)',border:'1px solid var(--rule)',borderRadius:'var(--r-sm)',padding:'6px 12px',fontFamily:'var(--mono)',fontSize:11}}>
                    <span style={{color:'var(--ink-faint)',marginRight:6}}>{k}</span>
                    <span style={{color: v==='ok'||v===true?'#6fcc74':'var(--ink)'}}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Reserve + Tax */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Reserve</div></div>
          <div className="panel-body">
            {reserve.loading ? <Spinner/> : reserve.error
              ? <span style={{color:'var(--gold)',fontFamily:'var(--mono)',fontSize:12}}>⚠ {reserve.error}</span>
              : (
                <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                  {Object.entries(reserve.data||{}).map(([k,v]) => (
                    <StatBox key={k} label={k} value={typeof v==='number'?fmt(v):String(v)} color="var(--gold-bright)" />
                  ))}
                </div>
              )
            }
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Tax</div></div>
          <div className="panel-body">
            {tax.loading ? <Spinner/> : tax.error
              ? <span style={{color:'var(--gold)',fontFamily:'var(--mono)',fontSize:12}}>⚠ {tax.error}</span>
              : (
                <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                  {Object.entries(tax.data||{}).map(([k,v]) => (
                    <StatBox key={k} label={k} value={typeof v==='number'?(v*100).toFixed(2)+'%':String(v)} color="var(--tide)" />
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Corporations ─────────────────────────────────────────────────────────
function CorporationsTab() {
  const { data, loading, error, reload } = useLive(() => MythicSpellbook.corporations(200));
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('name');

  const corps = React.useMemo(() => {
    if (!data) return [];
    const list = Array.isArray(data) ? data : (data.corporations || data.data || []);
    const q = search.toLowerCase();
    return list
      .filter(c => !q || JSON.stringify(c).toLowerCase().includes(q))
      .sort((a,b) => {
        if (sort==='name') return (a.name||'').localeCompare(b.name||'');
        const av = parseFloat(a[sort])||0, bv = parseFloat(b[sort])||0;
        return bv - av;
      });
  }, [data, search, sort]);

  const sortKeys = data && !loading ? (() => {
    const row = (Array.isArray(data)?data:data.corporations||data.data||[])[0]||{};
    return Object.keys(row).filter(k=>typeof row[k]==='number');
  })() : [];

  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <input className="field-input" style={{flex:1,minWidth:200}} placeholder="Search corporations…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        {sortKeys.length>0 && (
          <select className="field-select" style={{width:160}} value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="name">Sort: Name</option>
            {sortKeys.map(k=><option key={k} value={k}>Sort: {k}</option>)}
          </select>
        )}
        <button className="btn" onClick={reload}>↻ Refresh</button>
        <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>{corps.length} results</span>
      </div>

      {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div>
       : error ? <div style={{color:'var(--gold)',padding:20,fontFamily:'var(--mono)',fontSize:12}}>⚠ {error}</div>
       : corps.length===0 ? <div style={{color:'var(--ink-faint)',padding:20}}>No corporations found.</div>
       : (
        <div style={{overflowX:'auto'}}>
          <table className="ledger">
            <thead>
              <tr>
                {Object.keys(corps[0]||{}).map(k=>(
                  <th key={k} style={{cursor:'pointer',userSelect:'none'}} onClick={()=>setSort(k)}>
                    {k}{sort===k?' ↓':''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corps.map((c,i)=>(
                <tr key={c.id||c.name||i}>
                  {Object.values(c).map((v,j)=>(
                    <td key={j} style={{fontFamily:typeof v==='number'?'var(--mono)':'inherit',
                      color:typeof v==='number'?'var(--gold-bright)':'var(--ink)'}}>
                      {typeof v==='number' ? fmt(v) : String(v??'—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       )
      }
    </div>
  );
}

// ── Tab: Nodes ────────────────────────────────────────────────────────────────
function NodesTab() {
  const { data, loading, error, reload } = useLive(() => MythicSpellbook.nodes(300));
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('name');

  const nodes = React.useMemo(() => {
    if (!data) return [];
    const list = Array.isArray(data) ? data : (data.nodes || data.data || []);
    const q = search.toLowerCase();
    return list
      .filter(n => !q || JSON.stringify(n).toLowerCase().includes(q))
      .sort((a,b) => {
        if (sort==='name') return (a.name||'').localeCompare(b.name||'');
        return (parseFloat(b[sort])||0) - (parseFloat(a[sort])||0);
      });
  }, [data, search, sort]);

  const sortKeys = data && !loading ? (() => {
    const row = (Array.isArray(data)?data:data.nodes||data.data||[])[0]||{};
    return Object.keys(row).filter(k=>typeof row[k]==='number');
  })() : [];

  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <input className="field-input" style={{flex:1,minWidth:200}} placeholder="Search nodes…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        {sortKeys.length>0 && (
          <select className="field-select" style={{width:160}} value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="name">Sort: Name</option>
            {sortKeys.map(k=><option key={k} value={k}>Sort: {k}</option>)}
          </select>
        )}
        <button className="btn" onClick={reload}>↻ Refresh</button>
        <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>{nodes.length} results</span>
      </div>

      {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div>
       : error ? <div style={{color:'var(--gold)',padding:20,fontFamily:'var(--mono)',fontSize:12}}>⚠ {error}</div>
       : nodes.length===0 ? <div style={{color:'var(--ink-faint)',padding:20}}>No nodes found.</div>
       : (
        <div style={{overflowX:'auto'}}>
          <table className="ledger">
            <thead>
              <tr>
                {Object.keys(nodes[0]||{}).map(k=>(
                  <th key={k} style={{cursor:'pointer',userSelect:'none'}} onClick={()=>setSort(k)}>
                    {k}{sort===k?' ↓':''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodes.map((n,i)=>(
                <tr key={n.id||n.name||i}>
                  {Object.values(n).map((v,j)=>(
                    <td key={j} style={{fontFamily:typeof v==='number'?'var(--mono)':'inherit',
                      color:typeof v==='number'?'var(--tide)':'var(--ink)'}}>
                      {typeof v==='number' ? fmt(v) : String(v??'—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       )
      }
    </div>
  );
}

// ── Tab: Live Updates (from API) ──────────────────────────────────────────────
function LiveUpdatesTab() {
  const { data, loading, error, reload } = useLive(() => MythicSpellbook.updates(50));

  const updates = React.useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : (data.updates || data.data || []);
  }, [data]);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>{updates.length} live updates</span>
        <button className="btn" onClick={reload}>↻ Refresh</button>
      </div>

      {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div>
       : error ? <div style={{color:'var(--gold)',padding:20,fontFamily:'var(--mono)',fontSize:12}}>⚠ {error}</div>
       : updates.length===0 ? <div style={{color:'var(--ink-faint)',padding:20}}>No updates from server.</div>
       : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {updates.map((u,i) => (
            <div key={u.id||i} style={{
              background:'var(--parchment-2)',border:'1px solid var(--rule)',
              borderLeft:'3px solid var(--gold)',borderRadius:'var(--r-md)',padding:'14px 16px'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap',marginBottom:6}}>
                <div style={{fontFamily:'var(--display)',fontSize:14,letterSpacing:'.08em',color:'var(--ink)'}}>
                  {u.title || u.name || `Update #${u.id||i+1}`}
                </div>
                {(u.date||u.created_at||u.timestamp) && (
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>
                    {new Date(u.date||u.created_at||u.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>
              {(u.body||u.description||u.content||u.message) && (
                <div style={{fontFamily:'var(--serif)',fontSize:13,color:'var(--ink-dim)',lineHeight:1.55}}>
                  {u.body||u.description||u.content||u.message}
                </div>
              )}
              {Object.entries(u).filter(([k])=>!['id','title','name','body','description','content','message','date','created_at','timestamp'].includes(k)).map(([k,v])=>(
                <div key={k} style={{marginTop:6,fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>
                  <span style={{marginRight:8}}>{k}:</span>
                  <span style={{color:'var(--ink-dim)'}}>{String(v)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
       )
      }
    </div>
  );
}

// ── Tab: Game Update Publisher ────────────────────────────────────────────────
const UPDATE_TYPES = [
  { id:'patch',       label:'Patch Notes',      icon:'🔧', color:'#4a9850' },
  { id:'hotfix',      label:'Hotfix',           icon:'🚨', color:'#cc2222' },
  { id:'announcement',label:'Announcement',     icon:'📣', color:'#c9a14a' },
  { id:'event',       label:'Live Event',       icon:'⚡', color:'#a48ad2' },
  { id:'maintenance', label:'Maintenance',      icon:'🛠', color:'#4a9090' },
  { id:'balance',     label:'Balance Update',   icon:'⚖️', color:'#e07030' },
];

const UPDATE_STATUSES = ['Draft','Scheduled','Published','Archived'];

function PublisherTab() {
  const [posts, setPosts] = window.useEntities ? window.useEntities('gameUpdates') : React.useState([]);
  const [editing, setEditing] = React.useState(null); // null = list, 'new' = new, id = edit
  const [form, setForm] = React.useState({});

  function newPost() {
    setForm({
      id: 'upd-' + Date.now(),
      title: '',
      type: 'patch',
      status: 'Draft',
      version: '',
      body: '',
      tags: '',
      scheduledFor: '',
      publishedAt: '',
      createdAt: new Date().toISOString(),
    });
    setEditing('new');
  }

  function editPost(p) { setForm({...p}); setEditing(p.id); }

  function save() {
    if (!form.title?.trim()) return;
    const updated = editing==='new'
      ? [...(posts||[]), form]
      : (posts||[]).map(p => p.id===editing ? form : p);
    setPosts(updated);
    setEditing(null);
  }

  function deletePost(id) {
    if (!confirm('Delete this update?')) return;
    setPosts((posts||[]).filter(p=>p.id!==id));
  }

  function publish(p) {
    const now = new Date().toISOString();
    setPosts((posts||[]).map(x => x.id===p.id ? {...x, status:'Published', publishedAt:now} : x));
  }

  const typeInfo = id => UPDATE_TYPES.find(t=>t.id===id) || UPDATE_TYPES[0];

  if (editing !== null) {
    const ti = typeInfo(form.type);
    return (
      <div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button className="btn" onClick={()=>setEditing(null)}>← Back</button>
          <div style={{fontFamily:'var(--display)',fontSize:18,letterSpacing:'.08em',color:'var(--ink)'}}>
            {editing==='new' ? 'New Game Update' : 'Edit Update'}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          <div className="field">
            <div className="field-label">Title</div>
            <input className="field-input" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Patch 1.4.2 — Balance Pass"/>
          </div>
          <div className="field">
            <div className="field-label">Version</div>
            <input className="field-input" value={form.version||''} onChange={e=>setForm({...form,version:e.target.value})} placeholder="e.g. v1.4.2"/>
          </div>
          <div className="field">
            <div className="field-label">Type</div>
            <select className="field-select" value={form.type||'patch'} onChange={e=>setForm({...form,type:e.target.value})}>
              {UPDATE_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <div className="field-label">Status</div>
            <select className="field-select" value={form.status||'Draft'} onChange={e=>setForm({...form,status:e.target.value})}>
              {UPDATE_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <div className="field-label">Schedule For</div>
            <input className="field-input" type="datetime-local" value={(form.scheduledFor||'').slice(0,16)} onChange={e=>setForm({...form,scheduledFor:e.target.value})}/>
          </div>
          <div className="field">
            <div className="field-label">Tags (comma separated)</div>
            <input className="field-input" value={form.tags||''} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="e.g. balance, pvp, cards"/>
          </div>
        </div>

        <div className="field">
          <div className="field-label">Body / Patch Notes</div>
          <textarea className="field-area" rows={16} style={{minHeight:320,fontFamily:'var(--body)',fontStyle:'normal',fontSize:13}}
            value={form.body||''} onChange={e=>setForm({...form,body:e.target.value})}
            placeholder={`Write your patch notes here...\n\n## What's Changed\n- Improved X\n- Fixed Y\n- Buffed Z`}/>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
          <button className="btn" onClick={()=>setEditing(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!form.title?.trim()}>Save Update</button>
        </div>
      </div>
    );
  }

  const list = [...(posts||[])].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  const byStatus = s => list.filter(p=>p.status===s);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontFamily:'var(--display)',fontSize:22,letterSpacing:'.06em',color:'var(--ink)'}}>Game Update Publisher</div>
          <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)',marginTop:3}}>Write, schedule, and publish game updates to your community.</div>
        </div>
        <button className="btn btn-primary" onClick={newPost}>+ New Update</button>
      </div>

      {/* Status swimlanes */}
      {UPDATE_STATUSES.map(status => {
        const items = byStatus(status);
        if (status==='Archived' && items.length===0) return null;
        return (
          <div key={status} style={{marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{fontFamily:'var(--display)',fontSize:13,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--ink-faint)'}}>
                {status}
              </div>
              <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',background:'var(--vellum)',padding:'1px 6px',borderRadius:8}}>
                {items.length}
              </span>
            </div>

            {items.length===0 ? (
              <div style={{padding:'12px 16px',border:'1px dashed var(--rule)',borderRadius:'var(--r-md)',fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>
                No {status.toLowerCase()} updates.
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {items.map(p => {
                  const ti = typeInfo(p.type);
                  return (
                    <div key={p.id} style={{
                      background:'var(--parchment-2)',border:'1px solid var(--rule)',
                      borderLeft:`3px solid ${ti.color}`,borderRadius:'var(--r-md)',
                      padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr auto',gap:14,alignItems:'start'
                    }}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                          <span style={{fontSize:14}}>{ti.icon}</span>
                          <span style={{fontFamily:'var(--display)',fontSize:15,letterSpacing:'.04em',color:'var(--ink)'}}>{p.title}</span>
                          {p.version && <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',background:'var(--vellum)',padding:'1px 6px',borderRadius:4}}>{p.version}</span>}
                          <span style={{fontFamily:'var(--body)',fontSize:10,letterSpacing:'.08em',textTransform:'uppercase',color:ti.color}}>{ti.label}</span>
                        </div>
                        {p.body && (
                          <div style={{fontFamily:'var(--serif)',fontSize:12,color:'var(--ink-faint)',lineHeight:1.5,
                            overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                            {p.body}
                          </div>
                        )}
                        <div style={{display:'flex',gap:12,marginTop:6,fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>
                          {p.publishedAt && <span>Published {new Date(p.publishedAt).toLocaleDateString()}</span>}
                          {p.scheduledFor && p.status==='Scheduled' && <span>Scheduled {new Date(p.scheduledFor).toLocaleDateString()}</span>}
                          {p.tags && p.tags.split(',').map(t=>t.trim()).filter(Boolean).map(t=>(
                            <span key={t} style={{background:'var(--vellum)',padding:'1px 6px',borderRadius:4,color:'var(--ink-dim)'}}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                        {p.status==='Draft' && <button className="btn" style={{fontSize:11,padding:'4px 10px',background:'rgba(74,152,80,.15)',borderColor:'rgba(74,152,80,.4)',color:'#6fcc74'}} onClick={()=>publish(p)}>Publish</button>}
                        <button className="btn" style={{fontSize:11,padding:'4px 10px'}} onClick={()=>editPost(p)}>Edit</button>
                        <button className="btn" style={{fontSize:11,padding:'4px 10px',color:'var(--gold)'}} onClick={()=>deletePost(p.id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main LiveDataPage ─────────────────────────────────────────────────────────
const LiveDataPage = () => {
  const [tab, setTab] = React.useState('stats');

  const tabs = [
    { id:'stats',     label:'Live Stats',        icon:'📡' },
    { id:'corps',     label:'Corporations',       icon:'🏢' },
    { id:'nodes',     label:'Nodes',              icon:'🌐' },
    { id:'livefeed',  label:'Live Updates',       icon:'📰' },
    { id:'publisher', label:'Update Publisher',   icon:'✍️' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title"><span className="ornament">📡</span>Live Data</div>
          <div className="page-sub">playmythicspellbook.com · real-time</div>
        </div>
      </div>

      <div className="tabs" style={{marginBottom:24}}>
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
            <span style={{marginRight:6}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab==='stats'     && <StatsTab/>}
      {tab==='corps'     && <CorporationsTab/>}
      {tab==='nodes'     && <NodesTab/>}
      {tab==='livefeed'  && <LiveUpdatesTab/>}
      {tab==='publisher' && <PublisherTab/>}
    </div>
  );
};

window.LiveDataPage = LiveDataPage;
