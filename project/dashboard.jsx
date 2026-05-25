// Compact live-server status widget for the dashboard
const LiveStatusWidget = ({ setRoute }) => {
  const [status, setStatus] = React.useState(null);
  const [updates, setUpdates] = React.useState([]);
  const [err, setErr] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const MS_API = 'https://playmythicspellbook.com/api/v1';
    Promise.all([
      fetch(`${MS_API}/stats`).then(r=>r.json()).catch(()=>null),
      fetch(`${MS_API}/updates?limit=3`).then(r=>r.json()).catch(()=>[]),
    ]).then(([s, u]) => {
      if (cancelled) return;
      setStatus(s);
      setUpdates(Array.isArray(u) ? u : []);
    }).catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="panel" style={{gridColumn:'span 2'}}>
      <div className="panel-head">
        <div className="panel-title" style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:8,height:8,borderRadius:'50%',background: err ? '#666' : status ? '#ffffff' : '#666',display:'inline-block',boxShadow: err ? 'none' : status ? '0 0 6px #ffffff' : 'none'}}/>
          Live Server Status
        </div>
        <button className="btn btn-ghost" style={{fontSize:11}} onClick={() => setRoute('live')}>Open Live Data <Icon name="chevron" size={11}/></button>
      </div>
      <div className="panel-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div>
          {status ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {[['Health', status.health ?? '—'], ['Reserve', status.reserve ?? '—'], ['Tax Rate', status.tax_rate ?? '—']].map(([k,v]) => (
                <div key={k} style={{background:'var(--parchment-3)',borderRadius:6,padding:'8px 10px',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:18,color:'#ffffff'}}>{v}</div>
                  <div style={{fontSize:10,color:'var(--ink-faint)',marginTop:2,textTransform:'uppercase',letterSpacing:'.1em'}}>{k}</div>
                </div>
              ))}
            </div>
          ) : err ? (
            <div style={{color:'var(--ink-faint)',fontSize:12,padding:'8px 0'}}>Could not reach server</div>
          ) : (
            <div style={{color:'var(--ink-faint)',fontSize:12,padding:'8px 0'}}>Loading…</div>
          )}
        </div>
        <div>
          <div style={{fontSize:10,color:'var(--ink-faint)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Recent Updates</div>
          {updates.length === 0 && !err && <div style={{color:'var(--ink-faint)',fontSize:12}}>No updates yet</div>}
          {updates.map((u,i) => (
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'4px 0',borderBottom:'1px dashed var(--rule)'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'var(--gold)',marginTop:5,flexShrink:0}}/>
              <div>
                <div style={{fontSize:12,color:'var(--ink)'}}>{u.title || u.type || 'Update'}</div>
                <div style={{fontSize:10,color:'var(--ink-faint)'}}>{u.published_at ? new Date(u.published_at).toLocaleDateString() : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Forge Hall (dashboard)
const Dashboard = ({ setRoute }) => {
  const featured = window.CARDS.slice(0, 4);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">❧</span>Forge Hall</h1>
          <div className="page-sub">A studio overview, last lit · 3 minutes ago</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setRoute('cards')}>
            <Icon name="search" size={14} /> Open Codex
          </button>
          <button className="btn btn-primary"
                  onClick={() => { window.__pendingNewCard = true; setRoute('cards'); }}>
            <Icon name="add" size={14} /> New Card
          </button>
        </div>
      </div>

      <div className="dash-grid">
        <div className="tile">
          <div className="tile-label">Cards in canon</div>
          <div className="tile-num">{window.CARDS.length}</div>
          <div className="tile-delta" style={{color:"var(--ink-faint)"}}>in canon</div>
          <div className="glyph">⚔</div>
        </div>
        <div className="tile">
          <div className="tile-label">Heroes & NPCs</div>
          <div className="tile-num">{window.HEROES.length}</div>
          <div className="tile-delta" style={{color:"var(--ink-faint)"}}>named souls</div>
          <div className="glyph">☥</div>
        </div>
        <div className="tile">
          <div className="tile-label">Lore entries</div>
          <div className="tile-num">{(window.LORE_ENTRIES||[]).length}</div>
          <div className="tile-delta" style={{color:"var(--ink-faint)"}}>entries</div>
          <div className="glyph">✦</div>
        </div>
        <div className="tile">
          <div className="tile-label">Art final</div>
          <div className="tile-num">—</div>
          <div className="bar" style={{marginTop:10}}><i style={{width:"0%"}}/></div>
          <div className="glyph">✎</div>
        </div>
        <div className="tile">
          <div className="tile-label">Avg. mana cost</div>
          <div className="tile-num">{window.CARDS.length ? (window.CARDS.reduce((s,c)=>s+(c.cost||0),0) / window.CARDS.length).toFixed(1) : "—"}</div>
          <div className="tile-delta" style={{color:"var(--ink-faint)"}}>avg mana cost</div>
          <div className="glyph">☉</div>
        </div>
        <div className="tile">
          <div className="tile-label">Active campaigns</div>
          <div className="tile-num">{(window.CAMPAIGNS||[]).length}</div>
          <div className="tile-delta" style={{color:"var(--ink-faint)"}}>active arcs</div>
          <div className="glyph">❦</div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Recently forged <span className="ornament">·</span> Mythic Spellbook</div>
          <div className="btn-ghost btn" onClick={() => setRoute('cards')}>Open Card Forge <Icon name="chevron" size={12} /></div>
        </div>
        <div className="card-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))'}}>
          {featured.map(c => <SpellCard key={c.id} card={c} onClick={() => setRoute('cards')} />)}
        </div>
      </div>

      <div className="section" style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:18}}>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Element coverage · 21 types</div><div className="wiki-meta">last patch · v0.41</div></div>
          <div className="panel-body" style={{maxHeight:480,overflow:'auto'}}>
            {window.ELEMENTS.map((e,i) => {
              const count = window.CARDS.filter(c => c.element === e.id).length;
              const max = Math.max(...window.ELEMENTS.map(x => window.CARDS.filter(c=>c.element===x.id).length), 3);
              const pct = (count / max) * 100;
              return (
                <div key={e.id} style={{display:'grid',gridTemplateColumns:'150px 1fr 50px',gap:14,alignItems:'center',padding:'6px 0',borderBottom:'1px dashed var(--rule)'}}>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{fontSize:16,lineHeight:1}}>{e.icon}</span>
                    <span style={{fontFamily:'var(--display)',fontSize:13,letterSpacing:'.08em',color:e.color}}>{e.name}</span>
                  </div>
                  <div className="bar"><i style={{width:`${Math.max(pct,3)}%`,background:`linear-gradient(90deg, ${e.color}, ${e.color}88)`}}/></div>
                  <div style={{fontFamily:'var(--mono)',fontSize:11,color: count===0?'var(--ink-faint)':'var(--ink-dim)',textAlign:'right'}}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Studio activity</div></div>
          <div className="panel-body">
            {window.ACTIVITY.map((a,i) => (
              <div key={i} className="feed-item">
                <div className="feed-dot" style={{background: a.who==='You' ? 'var(--gold-bright)' : 'var(--gold)'}}/>
                <div>
                  <div><b style={{color:'var(--gold-bright)'}}>{a.who}</b> <span style={{color:'var(--ink-dim)'}}>{a.what}</span> <span style={{color:'var(--ink)'}}>{a.target}</span></div>
                  <div className="feed-meta">{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <LiveStatusWidget setRoute={setRoute}/>
      </div>

      <div className="divider">❧ · ❧</div>
    </div>
  );
};

window.Dashboard = Dashboard;
