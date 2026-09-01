// Bug Tracker — players (and team) report bugs, team triages and responds.
// Each bug has: title, description, category, severity, status, reporter, reproSteps, expected, actual, build/version, attachments, responses[].

window.BUGS = window.BUGS || [];

const BUG_CATEGORIES = [
  { id:'gameplay',   name:'Gameplay',         icon:'⚔', color:'#c45a2f' },
  { id:'card',       name:'Card / Rules',     icon:'🃏', color:'#c9a14a' },
  { id:'ui',         name:'UI / Interface',   icon:'🖥', color:'#6c92d4' },
  { id:'audio',      name:'Audio / Music',    icon:'🔊', color:'#7fc4e6' },
  { id:'art',        name:'Art / Visuals',    icon:'🎨', color:'#a878d4' },
  { id:'performance',name:'Performance',      icon:'⏱', color:'#7d8590' },
  { id:'crash',      name:'Crash / Hard bug', icon:'💥', color:'#cc2a3a' },
  { id:'network',    name:'Network / Online', icon:'📡', color:'#5aa8ff' },
  { id:'economy',    name:'Economy / Shop',   icon:'🔥', color:'#ff7755' },
  { id:'tutorial',   name:'Tutorial / Onboarding', icon:'📖', color:'#7a9a52' },
  { id:'localization',name:'Localization / Text',  icon:'✎', color:'#b6d4ff' },
  { id:'balance',    name:'Balance feedback', icon:'⚖', color:'#ffd166' },
  { id:'other',      name:'Other',            icon:'◇', color:'#9aa0a6' },
];

const BUG_SEVERITIES = [
  { id:'low',      name:'Low (cosmetic)',    color:'#7d8590' },
  { id:'med',      name:'Medium',            color:'#c9a14a' },
  { id:'high',     name:'High (blocking)',   color:'#ff7755' },
  { id:'critical', name:'Critical (crash)',  color:'#cc2a3a' },
];

const BUG_STATUSES = [
  { id:'open',         name:'Open',          color:'#c9a14a' },
  { id:'triaged',      name:'Triaged',       color:'#6c92d4' },
  { id:'in-progress',  name:'In progress',   color:'#a878d4' },
  { id:'needs-info',   name:'Needs info',    color:'#ffd166' },
  { id:'fixed',        name:'Fixed',         color:'#7a9a52' },
  { id:'wont-fix',     name:'Won\'t fix',    color:'#7d8590' },
  { id:'duplicate',    name:'Duplicate',     color:'#4a3a5a' },
];

function rtBug(ts) {
  if(!ts) return '—';
  const d = Date.now() - ts;
  if(d < 60_000) return 'just now';
  if(d < 3_600_000) return Math.floor(d/60_000) + 'm ago';
  if(d < 86_400_000) return Math.floor(d/3_600_000) + 'h ago';
  return Math.floor(d/86_400_000) + 'd ago';
}

const BugsPage = () => {
  const [bugs, setBugs] = window.useEntities ? window.useEntities('bugs') : React.useState(window.BUGS);
  const [openId, setOpenId] = React.useState(null);
  const [reportModal, setReportModal] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [filterSeverity, setFilterSeverity] = React.useState('all');
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [draft, setDraft] = React.useState({
    title:'', description:'', category:'gameplay', severity:'med',
    reporter:'', email:'', reproSteps:'', expected:'', actual:'', build:'v0.1', platform:'',
  });
  // Each modal session gets a fresh slot id so uploads attach to the right bug after submit
  const [draftSlotId, setDraftSlotId] = React.useState(() => 'bug-draft-' + Date.now().toString(36));
  const [response, setResponse] = React.useState('');
  const settings = (window.SETTINGS||{});
  const me = settings.designerName || 'Team';

  const open = bugs.find(b => b.id === openId);

  // Connected Mythic Spellbook (game) identity — used to attribute reports to a
  // player account and to pay Cinder bounties. Reactive to connect/disconnect.
  const [msbId, setMsbId] = React.useState(window.msbIdentity ? window.msbIdentity() : null);
  React.useEffect(() => {
    const c = window.msbGetClient && window.msbGetClient();
    if (!c) return;
    const upd = (s) => setMsbId(s ? { userId: s.user.id, email: s.user.email } : null);
    c.auth.getSession().then(({ data }) => upd(data.session));
    let sub;
    try { sub = c.auth.onAuthStateChange((_e, s) => upd(s)).data; } catch (e) {}
    return () => { try { sub && sub.subscription && sub.subscription.unsubscribe(); } catch (e) {} };
  }, []);
  const isAdmin = (window.CURRENT_ROLE === 'admin');

  // Bug-bounty award state
  const [awardAmt, setAwardAmt] = React.useState(100);
  const [awardBusy, setAwardBusy] = React.useState(false);
  const [awardMsg, setAwardMsg] = React.useState('');
  React.useEffect(() => { setAwardMsg(''); }, [openId]);

  const submitBug = () => {
    if(!draft.title.trim()) return;
    const id = 'bug-' + Date.now().toString(36);
    const b = {
      id,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      severity: draft.severity,
      status: 'open',
      reporter: draft.reporter.trim() || 'Anonymous',
      email: draft.email.trim(),
      reproSteps: draft.reproSteps.trim(),
      expected: draft.expected.trim(),
      actual: draft.actual.trim(),
      build: draft.build.trim(),
      platform: draft.platform.trim(),
      created: Date.now(),
      updated: Date.now(),
      responses: [],
      votes: [],
      attachmentSlot: draftSlotId, // link to image-slot uploaded during the modal
      // Mythic Spellbook account (if connected) so the reporter can be paid a bounty.
      msbUserId: msbId && msbId.userId,
      msbEmail:  msbId && msbId.email,
    };
    setBugs([b, ...bugs]);
    setReportModal(false);
    setDraft({
      title:'', description:'', category:'gameplay', severity:'med',
      reporter:'', email:'', reproSteps:'', expected:'', actual:'', build:'v0.1', platform:'',
    });
    setDraftSlotId('bug-draft-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6));
    setOpenId(id);
  };

  const update = (id, patch) => setBugs(bugs.map(b => b.id===id ? {...b, ...patch, updated: Date.now()} : b));
  const remove = (id) => {
    if(!confirm('Delete this bug report? This is permanent.')) return;
    setBugs(bugs.filter(b=>b.id!==id));
    setOpenId(null);
  };

  const respond = (id, text, internal=false) => {
    if(!text.trim()) return;
    const b = bugs.find(x=>x.id===id);
    update(id, { responses: [...(b.responses||[]), { who:me, when:Date.now(), text, internal }] });
    setResponse('');
  };

  const toggleVote = (id) => {
    const b = bugs.find(x=>x.id===id);
    const votes = b.votes || [];
    update(id, { votes: votes.includes(me) ? votes.filter(v=>v!==me) : [...votes, me] });
  };

  // Pay a Cinder bounty to the reporter's Mythic Spellbook account. The RPC is
  // admin-gated server-side; the reporter must have filed while MSB-connected.
  const awardCinder = async (bug) => {
    if (!bug || !bug.msbUserId || !window.msbAwardCinder) return;
    const amt = Math.max(0, Math.floor(Number(awardAmt) || 0));
    if (!amt) { setAwardMsg('Enter a Cinder amount first.'); return; }
    setAwardBusy(true); setAwardMsg('');
    try {
      const res = await window.msbAwardCinder(bug.msbUserId, amt, `Bug bounty: ${bug.title}`);
      const prev = bug.reward && bug.reward.total || 0;
      update(bug.id, { reward: {
        total: prev + amt, currency: 'cinder', at: Date.now(),
        by: (msbId && msbId.email) || me, newBalance: res && res.new_balance,
      } });
      setAwardMsg('✓ Awarded ' + amt.toLocaleString() + ' Cinder'
        + (res && res.new_balance != null ? ' · their balance is now ' + Number(res.new_balance).toLocaleString() : ''));
    } catch (e) {
      const m = String(e && e.message || e);
      setAwardMsg(
        /not authorized/i.test(m) ? 'Only game admins (connected via Gaming Profiles) can pay bounties.'
        : /function|does not exist|schema cache/i.test(m) ? 'Run supabase-msb-bug-bounty.sql in the game database first.'
        : /not connected/i.test(m) ? 'Connect your Mythic Spellbook admin account in Gaming Profiles first.'
        : m);
    } finally { setAwardBusy(false); }
  };

  const filtered = bugs.filter(b =>
    (filterStatus==='all' || b.status===filterStatus)
    && (filterSeverity==='all' || b.severity===filterSeverity)
    && (filterCategory==='all' || b.category===filterCategory)
    && (!q || b.title.toLowerCase().includes(q.toLowerCase()) || (b.description||'').toLowerCase().includes(q.toLowerCase()))
  );

  // Stats
  const stats = {
    open: bugs.filter(b=>b.status==='open').length,
    inProgress: bugs.filter(b=>b.status==='in-progress').length,
    fixed: bugs.filter(b=>b.status==='fixed').length,
    critical: bugs.filter(b=>b.severity==='critical' && b.status!=='fixed' && b.status!=='wont-fix').length,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">🐞</span>Bug Tracker</h1>
          <div className="page-sub">
            {bugs.length} report{bugs.length!==1?'s':''} ·
            {' '}<span style={{color:'var(--gold-bright)'}}>{stats.open} open</span> ·
            {' '}<span style={{color:'var(--ember)'}}>{stats.critical} critical</span> ·
            {' '}<span style={{color:'var(--verdant)'}}>{stats.fixed} fixed</span>
          </div>
        </div>
        <div className="page-actions">
          <div className="search" style={{width:220}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search bugs..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={()=>setReportModal(true)}>
            <Icon name="add" size={14}/> Report a bug
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="chip-row" style={{marginBottom:10}}>
        <div className={`chip ${filterStatus==='all'?'active':''}`} onClick={()=>setFilterStatus('all')}>All status</div>
        {BUG_STATUSES.map(s => {
          const n = bugs.filter(b=>b.status===s.id).length;
          if(!n && filterStatus !== s.id) return null;
          return <div key={s.id} className={`chip ${filterStatus===s.id?'active':''}`}
                      onClick={()=>setFilterStatus(filterStatus===s.id?'all':s.id)}
                      style={filterStatus===s.id?{borderColor:s.color,color:s.color,background:s.color+'20'}:{}}>
            {s.name} ({n})
          </div>;
        })}
      </div>
      <div className="chip-row" style={{marginBottom:10}}>
        <div className={`chip ${filterSeverity==='all'?'active':''}`} onClick={()=>setFilterSeverity('all')}>All severity</div>
        {BUG_SEVERITIES.map(s =>
          <div key={s.id} className={`chip ${filterSeverity===s.id?'active':''}`}
               onClick={()=>setFilterSeverity(filterSeverity===s.id?'all':s.id)}
               style={filterSeverity===s.id?{borderColor:s.color,color:s.color,background:s.color+'20'}:{}}>
            <span className="dot" style={{background:s.color}}/>{s.name}
          </div>)}
      </div>
      <div className="chip-row" style={{marginBottom:18}}>
        <div className={`chip ${filterCategory==='all'?'active':''}`} onClick={()=>setFilterCategory('all')}>All categories</div>
        {BUG_CATEGORIES.map(c => {
          const n = bugs.filter(b=>b.category===c.id).length;
          if(!n && filterCategory !== c.id) return null;
          return <div key={c.id} className={`chip ${filterCategory===c.id?'active':''}`}
                      onClick={()=>setFilterCategory(filterCategory===c.id?'all':c.id)}
                      style={filterCategory===c.id?{borderColor:c.color,color:c.color,background:c.color+'20'}:{}}>
            {c.icon} {c.name} ({n})
          </div>;
        })}
      </div>

      {bugs.length === 0 && (
        <div className="panel" style={{padding:'60px 40px',textAlign:'center'}}>
          <div style={{fontSize:64,opacity:.3,marginBottom:14}}>🐞</div>
          <div style={{fontFamily:'var(--display)',fontSize:22,letterSpacing:'.06em',color:'var(--gold-bright)',marginBottom:8}}>No bug reports yet</div>
          <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:14,marginBottom:24,maxWidth:520,marginLeft:'auto',marginRight:'auto',lineHeight:1.5}}>
            Players and team members can file bugs here. Every report is triaged, prioritised, and answered with a response thread.
          </div>
          <button className="btn btn-primary" onClick={()=>setReportModal(true)}><Icon name="add" size={14}/> File first report</button>
        </div>
      )}

      {bugs.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns: openId?'1fr 460px':'1fr',gap:24,alignItems:'start'}}>
          <div className="panel">
            <table className="ledger">
              <thead><tr>
                <th>Title</th><th>Category</th><th>Severity</th><th>Status</th><th>Reporter</th><th>Filed</th><th style={{textAlign:'right'}}>★</th>
              </tr></thead>
              <tbody>
                {filtered.map(b => {
                  const cat = BUG_CATEGORIES.find(c=>c.id===b.category);
                  const sev = BUG_SEVERITIES.find(s=>s.id===b.severity);
                  const stat = BUG_STATUSES.find(s=>s.id===b.status);
                  return (
                    <tr key={b.id} style={{cursor:'pointer',background: b.id===openId?'rgba(201,161,74,.05)':undefined,
                                            borderLeft: b.id===openId?`3px solid ${sev?.color}`:'3px solid transparent'}}
                        onClick={()=>setOpenId(b.id)}>
                      <td style={{fontFamily:'var(--display)',letterSpacing:'.02em',color:'var(--ink)'}}>{b.title}</td>
                      <td><span className="pill" style={{borderColor:cat?.color,color:cat?.color}}>{cat?.icon} {cat?.name}</span></td>
                      <td><span className="pill" style={{borderColor:sev?.color,color:sev?.color}}>{sev?.name}</span></td>
                      <td><span className="pill" style={{borderColor:stat?.color,color:stat?.color}}>{stat?.name}</span></td>
                      <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-dim)'}}>{b.reporter}</td>
                      <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>{rtBug(b.created)}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:(b.votes||[]).length?'var(--gold-bright)':'var(--ink-faint)'}}>{(b.votes||[]).length}</td>
                    </tr>
                  );
                })}
                {filtered.length===0 && <tr><td colSpan="7" style={{textAlign:'center',padding:30,color:'var(--ink-faint)',fontStyle:'italic'}}>No bugs match these filters.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {open && (() => {
            const cat = BUG_CATEGORIES.find(c=>c.id===open.category);
            const sev = BUG_SEVERITIES.find(s=>s.id===open.severity);
            const stat = BUG_STATUSES.find(s=>s.id===open.status);
            const voted = (open.votes||[]).includes(me);
            return (
              <div className="panel" style={{position:'sticky',top:0,maxHeight:'calc(100vh - 200px)',overflow:'auto'}}>
                <div className="panel-head" style={{flexWrap:'wrap',gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <input value={open.title} onChange={e=>update(open.id,{title:e.target.value})}
                      style={{width:'100%',background:'transparent',border:'none',outline:'none',
                        fontFamily:'var(--display)',fontSize:16,letterSpacing:'.04em',color:'var(--ink)',padding:0}}/>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',marginTop:2}}>
                      #{open.id} · filed by {open.reporter} {rtBug(open.created)} · build {open.build}
                    </div>
                  </div>
                  <button className="btn" onClick={()=>setOpenId(null)}>✕</button>
                </div>
                <div className="panel-body">
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Status</label>
                      <select className="field-select" value={open.status} onChange={e=>update(open.id,{status:e.target.value})}>
                        {BUG_STATUSES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Severity</label>
                      <select className="field-select" value={open.severity} onChange={e=>update(open.id,{severity:e.target.value})}>
                        {BUG_SEVERITIES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Category</label>
                      <select className="field-select" value={open.category} onChange={e=>update(open.id,{category:e.target.value})}>
                        {BUG_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:8,marginBottom:14}}>
                    <button className={`btn ${voted?'btn-primary':''}`} onClick={()=>toggleVote(open.id)}>
                      ★ Reproduces for me ({(open.votes||[]).length})
                    </button>
                    <button className="btn" onClick={()=>remove(open.id)} style={{color:'var(--ember)',marginLeft:'auto'}}>✕ Delete</button>
                  </div>

                  {/* Bug Bounty — reward the reporter's Mythic Spellbook account with Cinder */}
                  <div style={{marginBottom:14,padding:12,borderRadius:6,border:'1px solid var(--rule)',background:'rgba(255,171,0,.05)'}}>
                    <div className="field-label" style={{marginBottom:6}}>🔥 Bug Bounty</div>
                    {open.reward && open.reward.total ? (
                      <div style={{fontSize:13,color:'var(--verdant)',marginBottom:8}}>
                        Paid <b>{Number(open.reward.total).toLocaleString()} Cinder</b> to this reporter
                        {open.reward.by ? <span style={{color:'var(--ink-faint)'}}> · by {open.reward.by}</span> : null}
                      </div>
                    ) : null}
                    {!open.msbUserId ? (
                      <div style={{fontSize:12,color:'var(--ink-faint)',fontStyle:'italic'}}>
                        Not linked to a Mythic Spellbook account, so it can’t be rewarded. Reporters must file while connected in Gaming Profiles.
                      </div>
                    ) : isAdmin ? (
                      <>
                        <div style={{fontSize:11,color:'var(--ink-faint)',marginBottom:8}}>Reporter: {open.msbEmail || open.msbUserId}</div>
                        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                          {[50,100,250,500].map(v=>(
                            <button key={v} className="btn" style={{padding:'4px 10px',fontSize:12}} onClick={()=>setAwardAmt(v)}>{v}</button>
                          ))}
                          <input className="field-input" type="number" min="1" value={awardAmt}
                            onChange={e=>setAwardAmt(e.target.value)} style={{width:88}}/>
                          <button className="btn btn-primary" disabled={awardBusy} onClick={()=>awardCinder(open)}>
                            {awardBusy ? 'Paying…' : '🔥 Award Cinder'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{fontSize:12,color:'var(--ink-faint)',fontStyle:'italic'}}>Admins can pay a Cinder bounty for this report.</div>
                    )}
                    {awardMsg && <div style={{fontSize:12,marginTop:8,color:/✓/.test(awardMsg)?'var(--verdant)':'var(--ember)'}}>{awardMsg}</div>}
                  </div>

                  <div className="field" style={{margin:0,marginBottom:12}}>
                    <label className="field-label">Description</label>
                    <textarea className="field-area" rows="3" value={open.description||''} onChange={e=>update(open.id,{description:e.target.value})}/>
                  </div>
                  <div className="field" style={{margin:0,marginBottom:12}}>
                    <label className="field-label">Steps to reproduce</label>
                    <textarea className="field-area" rows="3" value={open.reproSteps||''} onChange={e=>update(open.id,{reproSteps:e.target.value})}
                      placeholder="1. ... &#10;2. ... &#10;3. ..."/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Expected</label>
                      <textarea className="field-area" rows="2" value={open.expected||''} onChange={e=>update(open.id,{expected:e.target.value})}/>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Actual</label>
                      <textarea className="field-area" rows="2" value={open.actual||''} onChange={e=>update(open.id,{actual:e.target.value})}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Build / Version</label>
                      <input className="field-input" value={open.build||''} onChange={e=>update(open.id,{build:e.target.value})}/>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Platform</label>
                      <input className="field-input" value={open.platform||''} onChange={e=>update(open.id,{platform:e.target.value})}
                             placeholder="Windows / iOS / Steam Deck…"/>
                    </div>
                  </div>

                  {/* Attached art */}
                  <div className="field" style={{margin:0,marginBottom:14}}>
                    <label className="field-label">Screenshot / attachment</label>
                    <div style={{width:'100%',height:160,borderRadius:6,overflow:'hidden',border:'1px dashed var(--rule-strong)',background:'var(--parchment-3)'}}>
                      <image-slot id={open.attachmentSlot || `bug-${open.id}`} shape="rect" placeholder="Drop a screenshot or reference image"
                        style={{width:'100%',height:'100%',display:'block',border:'none',background:'transparent'}}></image-slot>
                    </div>
                  </div>

                  {/* Responses thread */}
                  <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                    <div className="field-label" style={{marginBottom:8}}>Team responses · {(open.responses||[]).length}</div>
                    {(open.responses||[]).map((r,i) => (
                      <div key={i} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:'1px dashed var(--rule)',
                        background: r.internal ? 'rgba(196,90,47,.04)' : 'transparent',
                        borderRadius: r.internal ? 4 : 0, paddingLeft: r.internal ? 8 : 0, paddingRight: r.internal ? 8 : 0}}>
                        <div className="avatar" style={{flex:'none',width:28,height:28,fontSize:12,
                          background:'linear-gradient(135deg,#5a4a2a,#2a1f0a)'}}>{r.who[0]}</div>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:'var(--display)',fontSize:11,color:'var(--gold-bright)',letterSpacing:'.06em'}}>
                            {r.who}
                            {r.internal && <span style={{color:'var(--ember)',marginLeft:6,fontSize:9}}>· INTERNAL</span>}
                            <span style={{color:'var(--ink-faint)',fontSize:9,marginLeft:8,fontFamily:'var(--mono)'}}>{rtBug(r.when)}</span>
                          </div>
                          <div style={{fontFamily:'var(--serif)',fontSize:13,color:'var(--ink)',marginTop:2,lineHeight:1.5}}>{r.text}</div>
                        </div>
                      </div>
                    ))}
                    <textarea className="field-area" rows="2" value={response} onChange={e=>setResponse(e.target.value)}
                              placeholder={`Reply to the reporter as ${me}...`} style={{marginTop:10}}/>
                    <div style={{display:'flex',gap:6,marginTop:6}}>
                      <button className="btn btn-primary" onClick={()=>respond(open.id, response, false)} disabled={!response.trim()}>
                        Post public reply
                      </button>
                      <button className="btn" onClick={()=>respond(open.id, response, true)} disabled={!response.trim()} title="Only the team sees this">
                        Internal note
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Report-a-bug modal */}
      {reportModal && (
        <div className="hero-overlay" onClick={()=>setReportModal(false)}>
          <div className="hero-sheet" onClick={e=>e.stopPropagation()} style={{maxWidth:720}}>
            <button className="sheet-close" onClick={()=>setReportModal(false)}>✕</button>
            <div style={{padding:'28px 32px'}}>
              <div style={{marginBottom:18}}>
                <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)'}}>Report a bug</div>
                <h2 style={{margin:'4px 0 0',fontFamily:'var(--display)',fontSize:28,letterSpacing:'.04em',color:'var(--gold-bright)',fontWeight:500}}>
                  Tell us what broke
                </h2>
                <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:13,marginTop:4}}>
                  The more detail you can share, the faster we can fix it.
                </div>
              </div>

              {/* Reward eligibility — tie the report to a Mythic Spellbook account */}
              <div style={{marginBottom:16,padding:'10px 14px',borderRadius:6,fontSize:12.5,lineHeight:1.5,
                border:'1px solid var(--rule)',
                background: msbId ? 'rgba(63,185,80,.08)' : 'rgba(255,171,0,.06)',
                color: msbId ? 'var(--verdant)' : 'var(--ink-dim)'}}>
                {msbId
                  ? <>✓ Filing as your Mythic Spellbook account (<b>{msbId.email}</b>) — eligible for Cinder bug bounties.</>
                  : <>💡 Connect your Mythic Spellbook account in <b>Gaming Profiles</b> before filing to be eligible for Cinder rewards.</>}
              </div>

              <div className="field">
                <label className="field-label">Title *</label>
                <input className="field-input" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}
                       placeholder="Short summary, like 'Solveig's anthem doesn't trigger on summon'"/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Category</label>
                  <select className="field-select" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}>
                    {BUG_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Severity</label>
                  <select className="field-select" value={draft.severity} onChange={e=>setDraft({...draft,severity:e.target.value})}>
                    {BUG_SEVERITIES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="field" style={{marginTop:10}}>
                <label className="field-label">Description</label>
                <textarea className="field-area" rows="3" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}
                          placeholder="What happened? Anything unusual leading up to it?"/>
              </div>

              <div className="field">
                <label className="field-label">Steps to reproduce</label>
                <textarea className="field-area" rows="3" value={draft.reproSteps} onChange={e=>setDraft({...draft,reproSteps:e.target.value})}
                          placeholder="1. Open Card Forge&#10;2. Click New Card&#10;3. ..."/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Expected behaviour</label>
                  <textarea className="field-area" rows="2" value={draft.expected} onChange={e=>setDraft({...draft,expected:e.target.value})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">What actually happened</label>
                  <textarea className="field-area" rows="2" value={draft.actual} onChange={e=>setDraft({...draft,actual:e.target.value})}/>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginTop:10}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Your name</label>
                  <input className="field-input" value={draft.reporter} onChange={e=>setDraft({...draft,reporter:e.target.value})}
                         placeholder={`Default: ${me}`}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Email (optional)</label>
                  <input className="field-input" type="email" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Build / Version</label>
                  <input className="field-input" value={draft.build} onChange={e=>setDraft({...draft,build:e.target.value})}/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Platform</label>
                  <input className="field-input" value={draft.platform} onChange={e=>setDraft({...draft,platform:e.target.value})}
                         placeholder="Windows / iOS / etc."/>
                </div>
              </div>

              {/* Screenshot / attachment upload */}
              <div className="field" style={{margin:0,marginTop:14}}>
                <label className="field-label">📎 Screenshot or attachment (optional)</label>
                <div style={{width:'100%',height:200,borderRadius:6,overflow:'hidden',border:'1px dashed var(--rule-strong)',background:'var(--parchment-3)',position:'relative'}}>
                  <image-slot id={draftSlotId} shape="rect" placeholder="Drop a screenshot, photo, or reference image (or click to browse)"
                    style={{width:'100%',height:'100%',display:'block',border:'none',background:'transparent'}}></image-slot>
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',marginTop:4,letterSpacing:'.06em'}}>
                  Drag &amp; drop an image, or click the area to pick one. Stays attached to this report after submission.
                </div>
              </div>

              <div style={{display:'flex',gap:8,marginTop:20,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                <button className="btn" onClick={()=>setReportModal(false)}>Cancel</button>
                <div style={{flex:1}}/>
                <button className="btn btn-primary" onClick={submitBug} disabled={!draft.title.trim()}>
                  Submit report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.BugsPage = BugsPage;
