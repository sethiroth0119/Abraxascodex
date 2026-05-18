// Factions — 40 entries, searchable + full CRUD
const FactionsPage = () => {
  const [factions, setFactions] = window.useEntities ? window.useEntities('factions') : React.useState(window.FACTIONS);
  const [sel, setSel] = React.useState(factions[0]?.id);
  const [q, setQ] = React.useState('');
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => { if(!factions.find(f=>f.id===sel) && factions.length) setSel(factions[0].id); }, [factions, sel]);

  const filtered = factions.filter(f =>
    !q || f.name.toLowerCase().includes(q.toLowerCase()) || f.desc.toLowerCase().includes(q.toLowerCase())
  );
  const selF = factions.find(f => f.id === sel);

  const update = (id, patch) => setFactions(factions.map(f => f.id===id ? {...f, ...patch} : f));
  const createFaction = () => {
    const id = (window.makeId ? window.makeId('fac') : 'fac-'+Date.now().toString(36));
    const f = { id, name:'New Faction', icon:'✶', color:'#888888', desc:'Describe this faction…' };
    setFactions([f, ...factions]);
    setSel(id);
    setEditing(true);
  };
  const deleteFaction = (id) => {
    if(!confirm(`Delete "${selF.name}"? Cards still referencing it will be orphaned.`)) return;
    setFactions(factions.filter(f=>f.id!==id));
    setSel(factions[0]?.id);
  };

  const cards = selF ? (window.CARDS||[]).filter(c => (c.factions||[c.faction]||[]).includes(selF.id)) : [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">✶</span>Factions</h1>
          <div className="page-sub">{factions.length} unit types · creatures, classes, and forces of Abraxas</div>
        </div>
        <div className="page-actions">
          <div className="search" style={{width:240}}>
            <Icon name="search" size={14}/>
            <input placeholder="Filter factions..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={createFaction}><Icon name="add" size={14}/> New faction</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:24,alignItems:'start'}}>
        <div className="fac-grid">
          {filtered.map(f => (
            <div key={f.id} className="fac-tile"
                 onClick={()=>{setSel(f.id); setEditing(false);}}
                 style={{borderColor: f.id===sel?f.color:'var(--rule)',
                         boxShadow: f.id===sel ? `0 0 0 1px ${f.color}, 0 10px 30px -10px rgba(0,0,0,.6)` : 'none'}}>
              <div className="fac-hue" style={{background:f.color, boxShadow:`0 0 12px ${f.color}`}}/>
              <div className="fac-icon">{f.icon}</div>
              <div className="fac-name">{f.name}</div>
              <div className="fac-desc">{f.desc}</div>
            </div>
          ))}
          {filtered.length===0 && <div style={{padding:30,color:'var(--ink-faint)',fontStyle:'italic'}}>No factions match "{q}".</div>}
        </div>

        {selF && (
          <div className="panel" style={{position:'sticky',top:0}}>
            <div className="panel-head">
              <div className="panel-title" style={{color:selF.color}}>{selF.icon} {selF.name}</div>
              <div style={{display:'flex',gap:6}}>
                {!editing && <button className="btn" onClick={()=>setEditing(true)}><Icon name="pencil" size={12}/></button>}
                {editing && <button className="btn btn-primary" onClick={()=>setEditing(false)}><Icon name="check" size={12}/></button>}
                <button className="btn" onClick={()=>deleteFaction(selF.id)} style={{color:'var(--ember)'}}>✕</button>
              </div>
            </div>
            <div className="panel-body">
              <div style={{display:'flex',gap:14,alignItems:'center'}}>
                <div style={{width:64,height:64,borderRadius:'50%',display:'grid',placeItems:'center',fontSize:32,
                  background:`radial-gradient(circle at 30% 30%, ${selF.color}, #1a1408)`,
                  boxShadow:`0 0 18px ${selF.color}33, inset 0 0 0 1px rgba(0,0,0,.4)`}}>{selF.icon}</div>
                {!editing && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:13,lineHeight:1.5}}>"{selF.desc}"</div>}
              </div>

              {editing ? (
                <div style={{marginTop:18,display:'grid',gap:10}}>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Name</label>
                    <input className="field-input" value={selF.name} onChange={e=>update(selF.id,{name:e.target.value})}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'90px 1fr',gap:8}}>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Icon</label>
                      <input className="field-input" value={selF.icon} maxLength={4} style={{textAlign:'center',fontSize:22}} onChange={e=>update(selF.id,{icon:e.target.value})}/>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Color</label>
                      <input className="field-input" type="color" value={selF.color} style={{height:38,padding:2}} onChange={e=>update(selF.id,{color:e.target.value})}/>
                    </div>
                  </div>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Description</label>
                    <textarea className="field-area" rows="3" value={selF.desc||''} onChange={e=>update(selF.id,{desc:e.target.value})}/>
                  </div>
                </div>
              ) : (
                <dl className="kv" style={{marginTop:18}}>
                  <dt>Faction id</dt><dd style={{fontFamily:'var(--mono)'}}>{selF.id}</dd>
                  <dt>Cards</dt><dd>{cards.length} in canon</dd>
                  <dt>Asset</dt><dd style={{fontFamily:'var(--mono)',fontSize:11}}>factions/{selF.name}.png</dd>
                </dl>
              )}

              {cards.length > 0 && !editing && (
                <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                  <div className="field-label" style={{marginBottom:8}}>Cards using this faction</div>
                  {cards.map(c => {
                    const elemId = (c.elements||[c.element])[0];
                    const el = window.ELEMENTS.find(e=>e.id===elemId);
                    return (
                      <div key={c.id} className="mini-card" style={{width:'100%',marginBottom:6,display:'flex'}}>
                        <span style={{color:el?.color}}>{el?.icon}</span>
                        <span style={{flex:1,color:'var(--ink)',fontFamily:'var(--display)',letterSpacing:'.04em'}}>{c.name}</span>
                        <span className={`pill r-${c.rarity}`}>{c.rarity}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

window.FactionsPage = FactionsPage;
