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
          <button className="btn"><Icon name="search" size={14} /> Open Codex</button>
          <button className="btn btn-primary"><Icon name="add" size={14} /> New Card</button>
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

      <div className="divider">❧ · ❧</div>
    </div>
  );
};

window.Dashboard = Dashboard;
