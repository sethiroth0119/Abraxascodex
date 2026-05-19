// Live Data — pulls from playmythicspellbook.com API
// Tabs: Live Stats · Corporations · Nodes · Updates · Game Update Publisher

const MS_API = 'https://playmythicspellbook.com/api/v1';
const msGet = p => fetch(MS_API + p, { headers: { accept: 'application/json' } }).then(r => r.json()).then(d => {
  // Detect upstream error shape {error: ..., detail: ...}
  if (d && typeof d === 'object' && !Array.isArray(d) && d.error) throw new Error(d.detail || d.error);
  return d;
});

const MythicSpellbook = {
  health:       ()      => msGet('/health'),
  corporations: (n=200) => msGet('/corporations?limit=' + n),
  reserve:      ()      => msGet('/reserve'),
  tax:          ()      => msGet('/tax'),
  nodes:        (n=300) => msGet('/nodes?limit=' + n),
  updates:      (n=50)  => msGet('/updates?limit=' + n),
};

// ── shared styles ─────────────────────────────────────────────────────────────
const PANEL = {
  background:'rgba(5,8,5,.88)',
  border:'1px solid rgba(255,255,255,.10)',
  borderRadius:10,
  padding:'16px 20px',
  backdropFilter:'blur(4px)',
};
const SECTION_HEAD = {
  fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.18em',
  textTransform:'uppercase',color:'rgba(255,255,255,.45)',marginBottom:12,
};
const LABEL_STYLE = {
  fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.14em',
  textTransform:'uppercase',color:'rgba(255,255,255,.45)',marginBottom:4,
};
const VALUE_STYLE = { color:'#ffffff',fontSize:22,fontFamily:'var(--mono)',fontWeight:600 };
const TEXT = { color:'#e8f0e8' };
const TEXT_DIM = { color:'rgba(232,240,232,.6)' };

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
      padding:'3px 10px', borderRadius:99,
      background: ok ? 'rgba(74,152,80,.20)' : 'rgba(204,34,34,.20)',
      border: `1px solid ${ok ? 'rgba(74,152,80,.5)' : 'rgba(204,34,34,.5)'}`,
      color: ok ? '#ffffff' : '#f06060',
    }}>
      <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',boxShadow:'0 0 6px currentColor'}}/>
      {ok ? 'Online' : 'Offline'}
    </span>
  );
}

function Spinner() {
  return <span style={{display:'inline-block',width:18,height:18,border:'2px solid rgba(255,255,255,.15)',borderTopColor:'var(--gold)',borderRadius:'50%',animation:'spin .7s linear infinite'}} />;
}

function ErrorBox({ msg }) {
  return (
    <div style={{padding:'12px 16px',background:'rgba(180,30,30,.12)',border:'1px solid rgba(200,60,60,.25)',borderRadius:8,fontFamily:'var(--mono)',fontSize:12,color:'#f08080'}}>
      ⚠ {msg}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{background:'rgba(0,0,0,.4)',border:'1px solid rgba(255,255,255,.10)',borderRadius:8,padding:'14px 18px',flex:1,minWidth:130}}>
      <div style={LABEL_STYLE}>{label}</div>
      <div style={{...VALUE_STYLE,color:color||'#ffffff'}}>{value ?? '—'}</div>
      {sub && <div style={{...TEXT_DIM,fontFamily:'var(--mono)',fontSize:10,marginTop:4}}>{sub}</div>}
    </div>
  );
}

function KVRow({ label, value, color }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'160px 1fr',gap:12,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.06)',alignItems:'center'}}>
      <div style={{...TEXT_DIM,fontFamily:'var(--mono)',fontSize:11}}>{label}</div>
      <div style={{fontFamily:'var(--mono)',fontSize:12,color:color||'#e8f0e8',fontWeight:500}}>{String(value)}</div>
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
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Status bar */}
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <LiveBadge ok={isUp} />
        <span style={{fontFamily:'var(--mono)',fontSize:11,...TEXT_DIM}}>playmythicspellbook.com</span>
        <button className="btn" onClick={reload} style={{marginLeft:'auto'}}>↻ Refresh</button>
      </div>

      {/* Health */}
      <div style={PANEL}>
        <div style={SECTION_HEAD}>Server Health</div>
        {health.loading ? <Spinner/> : health.error ? <ErrorBox msg={health.error}/>
          : (
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {Object.entries(health.data||{}).map(([k,v]) => (
                <div key={k} style={{background:'rgba(0,0,0,.4)',border:'1px solid rgba(255,255,255,.08)',borderRadius:6,padding:'6px 14px',fontFamily:'var(--mono)',fontSize:11}}>
                  <span style={TEXT_DIM}>{k}{'  '}</span>
                  <span style={{color:'#ffffff',fontWeight:600}}>{String(v)}</span>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Reserve + Tax */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={PANEL}>
          <div style={SECTION_HEAD}>Reserve</div>
          {reserve.loading ? <Spinner/> : reserve.error ? <ErrorBox msg={reserve.error}/>
            : (
              <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                {Object.entries(reserve.data||{}).map(([k,v]) => (
                  <StatBox key={k} label={k} value={typeof v==='number'?fmt(v):String(v)} color="var(--gold-bright)" />
                ))}
              </div>
            )
          }
        </div>
        <div style={PANEL}>
          <div style={SECTION_HEAD}>Tax</div>
          {tax.loading ? <Spinner/> : tax.error ? <ErrorBox msg={tax.error}/>
            : (
              <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                {Object.entries(tax.data||{}).map(([k,v]) => (
                  <StatBox key={k} label={k} value={typeof v==='number'?(v*100).toFixed(2)+'%':String(v)} color="#ffffff" />
                ))}
              </div>
            )
          }
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
        <input className="field-input" style={{flex:1,minWidth:200,background:'rgba(0,0,0,.5)',color:'#ffffff',border:'1px solid rgba(255,255,255,.15)'}} placeholder="Search corporations…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        {sortKeys.length>0 && (
          <select className="field-select" style={{width:160,background:'rgba(0,0,0,.5)',color:'#ffffff',border:'1px solid rgba(255,255,255,.15)'}} value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="name">Sort: Name</option>
            {sortKeys.map(k=><option key={k} value={k}>Sort: {k}</option>)}
          </select>
        )}
        <button className="btn" onClick={reload}>↻ Refresh</button>
        <span style={{fontFamily:'var(--mono)',fontSize:11,...TEXT_DIM}}>{corps.length} results</span>
      </div>

      {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div>
       : error ? <ErrorBox msg={error}/>
       : corps.length===0 ? <div style={{...TEXT_DIM,padding:20}}>No corporations found.</div>
       : (
        <div style={{...PANEL,padding:0,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'rgba(0,0,0,.4)'}}>
                  {Object.keys(corps[0]||{}).map(k=>(
                    <th key={k} style={{padding:'10px 14px',textAlign:'left',fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(255,255,255,.5)',cursor:'pointer',userSelect:'none',borderBottom:'1px solid rgba(255,255,255,.08)',whiteSpace:'nowrap'}} onClick={()=>setSort(k)}>
                      {k}{sort===k?' ↓':''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corps.map((c,i)=>(
                  <tr key={c.id||c.name||i} style={{borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                    {Object.values(c).map((v,j)=>(
                      <td key={j} style={{padding:'9px 14px',fontFamily:typeof v==='number'?'var(--mono)':'inherit',fontSize:12,
                        color:typeof v==='number'?'var(--gold-bright)':'#e8f0e8'}}>
                        {typeof v==='number' ? fmt(v) : String(v??'—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <input className="field-input" style={{flex:1,minWidth:200,background:'rgba(0,0,0,.5)',color:'#ffffff',border:'1px solid rgba(255,255,255,.15)'}} placeholder="Search nodes…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        {sortKeys.length>0 && (
          <select className="field-select" style={{width:160,background:'rgba(0,0,0,.5)',color:'#ffffff',border:'1px solid rgba(255,255,255,.15)'}} value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="name">Sort: Name</option>
            {sortKeys.map(k=><option key={k} value={k}>Sort: {k}</option>)}
          </select>
        )}
        <button className="btn" onClick={reload}>↻ Refresh</button>
        <span style={{fontFamily:'var(--mono)',fontSize:11,...TEXT_DIM}}>{nodes.length} results</span>
      </div>

      {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div>
       : error ? <ErrorBox msg={error}/>
       : nodes.length===0 ? <div style={{...TEXT_DIM,padding:20}}>No nodes found.</div>
       : (
        <div style={{...PANEL,padding:0,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'rgba(0,0,0,.4)'}}>
                  {Object.keys(nodes[0]||{}).map(k=>(
                    <th key={k} style={{padding:'10px 14px',textAlign:'left',fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(255,255,255,.5)',cursor:'pointer',userSelect:'none',borderBottom:'1px solid rgba(255,255,255,.08)',whiteSpace:'nowrap'}} onClick={()=>setSort(k)}>
                      {k}{sort===k?' ↓':''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nodes.map((n,i)=>(
                  <tr key={n.id||n.name||i} style={{borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                    {Object.values(n).map((v,j)=>(
                      <td key={j} style={{padding:'9px 14px',fontFamily:typeof v==='number'?'var(--mono)':'inherit',fontSize:12,
                        color:'#e8f0e8'}}>

                        {typeof v==='number' ? fmt(v) : String(v??'—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <span style={{fontFamily:'var(--mono)',fontSize:11,...TEXT_DIM}}>{updates.length} live updates</span>
        <button className="btn" onClick={reload}>↻ Refresh</button>
      </div>

      {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div>
       : error ? <ErrorBox msg={error}/>
       : updates.length===0 ? <div style={{...PANEL,...TEXT_DIM,fontSize:13,fontFamily:'var(--mono)'}}>No updates from server yet.</div>
       : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {updates.map((u,i) => (
            <div key={u.id||i} style={{
              ...PANEL,borderLeft:'3px solid var(--gold)',padding:'14px 18px'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap',marginBottom:6}}>
                <div style={{fontFamily:'var(--display)',fontSize:15,letterSpacing:'.06em',color:'#ffffff',fontWeight:600}}>
                  {u.title || u.name || `Update #${u.id||i+1}`}
                </div>
                {(u.date||u.created_at||u.timestamp) && (
                  <div style={{fontFamily:'var(--mono)',fontSize:10,...TEXT_DIM}}>
                    {new Date(u.date||u.created_at||u.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>
              {(u.body||u.description||u.content||u.message) && (
                <div style={{fontFamily:'var(--serif)',fontSize:13,color:'rgba(232,240,232,.75)',lineHeight:1.6}}>
                  {u.body||u.description||u.content||u.message}
                </div>
              )}
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
  { id:'patch',       label:'Patch Notes',  icon:'🔧', color:'#4a9850' },
  { id:'hotfix',      label:'Hotfix',       icon:'🚨', color:'#cc2222' },
  { id:'announcement',label:'Announcement', icon:'📣', color:'#c9a14a' },
  { id:'event',       label:'Live Event',   icon:'⚡', color:'#a48ad2' },
  { id:'maintenance', label:'Maintenance',  icon:'🛠', color:'#4a9090' },
  { id:'balance',     label:'Balance',      icon:'⚖️', color:'#e07030' },
];

const UPDATE_STATUSES = ['Draft','Scheduled','Published','Archived'];

function PublisherTab() {
  const [posts, setPosts] = window.useEntities ? window.useEntities('gameUpdates') : React.useState([]);
  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState({});

  function newPost() {
    setForm({ id:'upd-'+Date.now(), title:'', type:'patch', status:'Draft', version:'', body:'', tags:'', scheduledFor:'', publishedAt:'', createdAt:new Date().toISOString() });
    setEditing('new');
  }

  function editPost(p) { setForm({...p}); setEditing(p.id); }

  function save() {
    if (!form.title?.trim()) return;
    const updated = editing==='new' ? [...(posts||[]), form] : (posts||[]).map(p => p.id===editing ? form : p);
    setPosts(updated);
    setEditing(null);
  }

  function deletePost(id) {
    if (!confirm('Delete this update?')) return;
    setPosts((posts||[]).filter(p=>p.id!==id));
  }

  function publish(p) {
    setPosts((posts||[]).map(x => x.id===p.id ? {...x, status:'Published', publishedAt:new Date().toISOString()} : x));
  }

  const typeInfo = id => UPDATE_TYPES.find(t=>t.id===id) || UPDATE_TYPES[0];

  const inputStyle = { background:'rgba(0,0,0,.5)', color:'#ffffff', border:'1px solid rgba(255,255,255,.15)', borderRadius:6, padding:'8px 12px', width:'100%', fontFamily:'var(--body)', fontSize:13, outline:'none' };

  if (editing !== null) {
    return (
      <div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button className="btn" onClick={()=>setEditing(null)}>← Back</button>
          <div style={{fontFamily:'var(--display)',fontSize:18,letterSpacing:'.06em',color:'#ffffff'}}>
            {editing==='new' ? 'New Game Update' : 'Edit Update'}
          </div>
        </div>

        <div style={{...PANEL,display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[['Title','title','e.g. Patch 1.4.2 — Balance Pass'],['Version','version','e.g. v1.4.2'],['Tags','tags','balance, pvp, cards']].map(([lbl,key,ph])=>(
              <div key={key} style={key==='title'?{gridColumn:'span 2'}:{}}>
                <div style={{...LABEL_STYLE,marginBottom:6}}>{lbl}</div>
                <input style={inputStyle} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}/>
              </div>
            ))}
            <div>
              <div style={{...LABEL_STYLE,marginBottom:6}}>Type</div>
              <select style={{...inputStyle,cursor:'pointer'}} value={form.type||'patch'} onChange={e=>setForm({...form,type:e.target.value})}>
                {UPDATE_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{...LABEL_STYLE,marginBottom:6}}>Status</div>
              <select style={{...inputStyle,cursor:'pointer'}} value={form.status||'Draft'} onChange={e=>setForm({...form,status:e.target.value})}>
                {UPDATE_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <div style={{...LABEL_STYLE,marginBottom:6}}>Schedule For</div>
              <input type="datetime-local" style={inputStyle} value={(form.scheduledFor||'').slice(0,16)} onChange={e=>setForm({...form,scheduledFor:e.target.value})}/>
            </div>
          </div>

          <div>
            <div style={{...LABEL_STYLE,marginBottom:6}}>Body / Patch Notes</div>
            <textarea style={{...inputStyle,minHeight:280,resize:'vertical',lineHeight:1.6}} rows={12}
              value={form.body||''} onChange={e=>setForm({...form,body:e.target.value})}
              placeholder={`Write your patch notes here...\n\n## What's Changed\n- Improved X\n- Fixed Y\n- Buffed Z`}/>
          </div>

          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button className="btn" onClick={()=>setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!form.title?.trim()}>Save Update</button>
          </div>
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
          <div style={{fontFamily:'var(--display)',fontSize:22,letterSpacing:'.06em',color:'#ffffff'}}>Game Update Publisher</div>
          <div style={{fontFamily:'var(--mono)',fontSize:11,...TEXT_DIM,marginTop:3}}>Write, schedule, and publish game updates to your community.</div>
        </div>
        <button className="btn btn-primary" onClick={newPost}>+ New Update</button>
      </div>

      {UPDATE_STATUSES.map(status => {
        const items = byStatus(status);
        if (status==='Archived' && items.length===0) return null;
        return (
          <div key={status} style={{marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.5)'}}>
                {status}
              </div>
              <span style={{fontFamily:'var(--mono)',fontSize:10,color:'rgba(255,255,255,.35)',background:'rgba(255,255,255,.06)',padding:'1px 8px',borderRadius:8}}>
                {items.length}
              </span>
            </div>

            {items.length===0 ? (
              <div style={{padding:'12px 16px',border:'1px dashed rgba(255,255,255,.10)',borderRadius:8,fontFamily:'var(--mono)',fontSize:11,...TEXT_DIM}}>
                No {status.toLowerCase()} updates.
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {items.map(p => {
                  const ti = typeInfo(p.type);
                  return (
                    <div key={p.id} style={{
                      ...PANEL,borderLeft:`3px solid ${ti.color}`,
                      display:'grid',gridTemplateColumns:'1fr auto',gap:14,alignItems:'start'
                    }}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}>
                          <span style={{fontSize:14}}>{ti.icon}</span>
                          <span style={{fontFamily:'var(--display)',fontSize:15,letterSpacing:'.04em',color:'#ffffff',fontWeight:600}}>{p.title}</span>
                          {p.version && <span style={{fontFamily:'var(--mono)',fontSize:10,color:'rgba(255,255,255,.45)',background:'rgba(255,255,255,.07)',padding:'1px 7px',borderRadius:4}}>{p.version}</span>}
                          <span style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.08em',textTransform:'uppercase',color:ti.color}}>{ti.label}</span>
                        </div>
                        {p.body && (
                          <div style={{fontFamily:'var(--serif)',fontSize:12,color:'rgba(232,240,232,.65)',lineHeight:1.55,
                            overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                            {p.body}
                          </div>
                        )}
                        <div style={{display:'flex',gap:10,marginTop:6,fontFamily:'var(--mono)',fontSize:10,...TEXT_DIM,flexWrap:'wrap'}}>
                          {p.publishedAt && <span>Published {new Date(p.publishedAt).toLocaleDateString()}</span>}
                          {p.scheduledFor && p.status==='Scheduled' && <span>Scheduled {new Date(p.scheduledFor).toLocaleDateString()}</span>}
                          {p.tags && p.tags.split(',').map(t=>t.trim()).filter(Boolean).map(t=>(
                            <span key={t} style={{background:'rgba(255,255,255,.07)',padding:'1px 7px',borderRadius:4,color:'rgba(232,240,232,.5)'}}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                        {p.status==='Draft' && (
                          <button className="btn" style={{fontSize:11,padding:'4px 12px',background:'rgba(74,152,80,.18)',borderColor:'rgba(74,152,80,.4)',color:'#ffffff'}} onClick={()=>publish(p)}>
                            Publish
                          </button>
                        )}
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
    { id:'stats',     label:'Live Stats',      icon:'📡' },
    { id:'corps',     label:'Corporations',     icon:'🏢' },
    { id:'nodes',     label:'Nodes',            icon:'🌐' },
    { id:'livefeed',  label:'Live Updates',     icon:'📰' },
    { id:'publisher', label:'Update Publisher', icon:'✍️' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title" style={{color:'#ffffff'}}>
            <span className="ornament">📡</span>Live Data
          </div>
          <div className="page-sub" style={{color:'rgba(232,240,232,.55)'}}>playmythicspellbook.com · real-time</div>
        </div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:24,flexWrap:'wrap'}}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            display:'flex',alignItems:'center',gap:7,padding:'7px 16px',borderRadius:7,cursor:'pointer',
            fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.10em',textTransform:'uppercase',
            border: tab===t.id ? '1px solid rgba(255,255,255,.25)' : '1px solid rgba(255,255,255,.08)',
            background: tab===t.id ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.4)',
            color: tab===t.id ? '#ffffff' : 'rgba(232,240,232,.5)',
            backdropFilter:'blur(4px)',transition:'all .15s',
          }}>
            <span>{t.icon}</span>{t.label}
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
