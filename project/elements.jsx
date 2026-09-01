// Elements & Type Chart — interactive (create / edit / delete)
const ElementsPage = () => {
  const [elements, setElements] = window.useEntities ? window.useEntities('elements') : React.useState(window.ELEMENTS);
  const [sel, setSel] = React.useState(elements[0]?.id || 'fire');
  const [hover, setHover] = React.useState(null);
  const [editing, setEditing] = React.useState(false);

  // Ensure sel is valid
  React.useEffect(() => { if(!elements.find(e=>e.id===sel) && elements.length) setSel(elements[0].id); }, [elements, sel]);

  const E = elements;
  const sample = E.find(e => e.id === sel) || E[0];
  if(!sample) return null;

  const effectiveness = (aId, bId) => {
    const A = E.find(e=>e.id===aId), B = E.find(e=>e.id===bId);
    if(!A||!B||aId===bId) return 1;
    if(A.strongVs.includes(bId)) return 2;
    if(B.strongVs.includes(aId)) return 0.5;
    return 1;
  };
  window.effectiveness = effectiveness;

  const update = (id, patch) => setElements(E.map(e => e.id===id ? {...e, ...patch} : e));
  const toggleStrong = (id, target) => {
    const e = E.find(x=>x.id===id);
    const next = e.strongVs.includes(target) ? e.strongVs.filter(t=>t!==target) : [...e.strongVs, target];
    update(id, { strongVs: next });
  };
  const createElement = () => {
    const id = (window.makeId ? window.makeId('el') : 'el-'+Date.now().toString(36));
    const newEl = { id, name:'New Element', icon:'✦', color:'#888888', strongVs:[] };
    setElements([...E, newEl]);
    setSel(id);
    setEditing(true);
  };
  const deleteElement = (id) => {
    if(E.length <= 1) { alert('At least one element is required.'); return; }
    if(!confirm(`Delete "${sample.name}"? References on cards will become invalid.`)) return;
    setElements(E.filter(e=>e.id!==id).map(e => ({...e, strongVs: e.strongVs.filter(t=>t!==id)})));
    setSel(E[0].id);
  };

  const cardCount = id => (window.CARDS||[]).filter(c => (c.elements||[c.element]).includes(id)).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">✸</span>Elements</h1>
          <div className="page-sub">{E.length} elements · type chart governing every Mythic Spellbook match</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={()=>window.exportStudio && window.exportStudio()}><Icon name="upload" size={14}/> Export</button>
          {!window.IS_VIEWER && <button className="btn btn-primary" onClick={createElement}><Icon name="add" size={14}/> New element</button>}
        </div>
      </div>

      <div className="elem-grid">
        {E.map(e => (
          <div key={e.id} className={`elem-tile ${e.id===sel?'active':''}`}
               style={{borderColor: e.id===sel ? e.color : undefined, color: e.color}}
               onClick={()=>{setSel(e.id); setEditing(false);}}>
            <div className="elem-hue" style={{background: e.color, boxShadow:`0 0 12px ${e.color}`}}/>
            <div className="elem-icon">{e.icon}</div>
            <div className="elem-name" style={{color:'var(--ink)'}}>{e.name}</div>
            <div className="elem-strong">
              {e.strongVs.map(s => {
                const t = E.find(x=>x.id===s);
                return t ? <span key={s} title={`strong vs ${t.name}`}>{t.icon}</span> : null;
              })}
            </div>
            <div style={{marginTop:8,fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',letterSpacing:'.08em'}}>
              {cardCount(e.id)} CARDS · #{e.id.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Detail strip with edit mode */}
      <div className="section">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title" style={{color: sample.color}}>{sample.icon} {sample.name}</div>
            <div style={{display:'flex',gap:6}}>
              {!window.IS_VIEWER && !editing && <button className="btn" onClick={()=>setEditing(true)}><Icon name="pencil" size={12}/> Edit</button>}
              {!window.IS_VIEWER && editing && <button className="btn btn-primary" onClick={()=>setEditing(false)}><Icon name="check" size={12}/> Done</button>}
              {!window.IS_VIEWER && <button className="btn" onClick={()=>deleteElement(sample.id)} style={{color:'var(--ember)'}}>✕ Delete</button>}
            </div>
          </div>
          <div className="panel-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
            {editing ? (
              <div>
                <div className="field"><label className="field-label">Name</label>
                  <input className="field-input" value={sample.name} onChange={e=>update(sample.id,{name:e.target.value})}/></div>
                <div className="field-row">
                  <div className="field"><label className="field-label">Icon (emoji)</label>
                    <input className="field-input" value={sample.icon} maxLength={4} style={{textAlign:'center',fontSize:22}} onChange={e=>update(sample.id,{icon:e.target.value})}/></div>
                  <div className="field"><label className="field-label">Color</label>
                    <input className="field-input" type="color" value={sample.color} style={{height:38,padding:2}} onChange={e=>update(sample.id,{color:e.target.value})}/></div>
                </div>
                <div className="field"><label className="field-label">Id</label>
                  <input className="field-input" value={sample.id} disabled style={{fontFamily:'var(--mono)',opacity:.6}}/></div>
                <div className="field"><label className="field-label">Strong against (toggle ×2 damage)</label>
                  <div className="chip-row" style={{maxHeight:160,overflow:'auto'}}>
                    {E.filter(o=>o.id!==sample.id).map(o => {
                      const active = sample.strongVs.includes(o.id);
                      return <div key={o.id} className={`chip ${active?'active':''}`}
                        onClick={()=>toggleStrong(sample.id, o.id)}
                        style={active ? {borderColor:o.color,color:o.color,background:o.color+'20'} : {}}>
                        <span style={{fontSize:13}}>{o.icon}</span>{o.name}
                      </div>;
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="field-label">Strong against (×2 damage)</div>
                <div className="chip-row" style={{marginTop:8}}>
                  {sample.strongVs.map(s => {
                    const t = E.find(x=>x.id===s);
                    return t ? <span key={s} className="chip active" style={{borderColor:t.color,color:t.color}}>{t.icon} {t.name}</span> : null;
                  })}
                  {sample.strongVs.length===0 && <span style={{fontStyle:'italic',color:'var(--ink-faint)'}}>None set yet.</span>}
                </div>
                <div className="field-label" style={{marginTop:18}}>Weak against (×0.5 damage from)</div>
                <div className="chip-row" style={{marginTop:8}}>
                  {E.filter(o => o.strongVs.includes(sample.id) && !sample.strongVs.includes(o.id)).map(o =>
                    <span key={o.id} className="chip" style={{borderColor:o.color,color:o.color}}>{o.icon} {o.name}</span>
                  )}
                </div>
                <div className="field-label" style={{marginTop:18}}>Mutual rivalries (both ×2)</div>
                <div className="chip-row" style={{marginTop:8}}>
                  {E.filter(o => o.strongVs.includes(sample.id) && sample.strongVs.includes(o.id)).map(o =>
                    <span key={o.id} className="chip" style={{borderColor:'var(--ember)',color:'var(--ember)'}}>{o.icon} {o.name}</span>
                  )}
                </div>
              </div>
            )}
            <div>
              <div className="field-label">Formula</div>
              <div style={{background:'rgba(201,161,74,.06)',border:'1px solid var(--rule)',borderRadius:6,padding:14,fontFamily:'var(--mono)',fontSize:12,lineHeight:1.7,marginTop:6}}>
                <div>if <span style={{color:sample.color}}>B</span> in <span style={{color:sample.color}}>A.strongVs</span> → <b style={{color:'var(--verdant)'}}>A → B = ×2</b></div>
                <div>if A in B.strongVs &amp; B not in A.strongVs → <b style={{color:'var(--ember)'}}>×0.5</b></div>
                <div>mutual entries → both <b style={{color:'var(--gold-bright)'}}>×2</b></div>
                <div>otherwise → <b>×1</b></div>
              </div>
              <div style={{marginTop:14,fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:13,lineHeight:1.5}}>
                {cardCount(sample.id)} cards reference {sample.name}. Drives every elemental interaction in battle.
              </div>
              {window.WorldOSPanel && <window.WorldOSPanel kind="element" id={sample.id} name={sample.name}/>}
            </div>
          </div>
        </div>
      </div>

      {/* The Big Matrix */}
      <div className="section">
        <div className="section-head">
          <div className="section-title">Type chart <span className="ornament">·</span> attacker → defender</div>
          {hover && <div className="wiki-meta">
            {E.find(e=>e.id===hover[0])?.icon} {E.find(e=>e.id===hover[0])?.name}
            <span style={{color:'var(--ink-faint)'}}> attacks </span>
            {E.find(e=>e.id===hover[1])?.icon} {E.find(e=>e.id===hover[1])?.name}
            <span style={{color:'var(--gold-bright)',marginLeft:8}}>= ×{effectiveness(hover[0],hover[1])}</span>
          </div>}
        </div>
        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th className="corner"></th>
                {E.map(c => (
                  <th key={c.id} className="col-head" style={{color:c.color}} title={c.name}>
                    <span style={{display:'inline-block',marginBottom:2}}>{c.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {E.map(r => (
                <tr key={r.id}>
                  <th className="row-head" style={{color:r.color}} title={r.name}>{r.icon} {r.name}</th>
                  {E.map(c => {
                    const eff = effectiveness(r.id, c.id);
                    const cls = r.id===c.id ? 'eff-same' : eff===2 ? 'eff-strong' : eff===0.5 ? 'eff-weak' : 'eff-neutral';
                    const label = r.id===c.id ? '—' : eff===2 ? '×2' : eff===0.5 ? '½' : '·';
                    return (
                      <td key={c.id} className={cls}
                          onMouseEnter={()=>setHover([r.id, c.id])}
                          onMouseLeave={()=>setHover(null)}>
                        {label}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="matrix-legend">
          <span><span className="sw" style={{background:'#7a9a52'}}/> ×2 super-effective</span>
          <span><span className="sw" style={{background:'#c45a2f'}}/> ×0.5 resisted</span>
          <span><span className="sw" style={{background:'var(--vellum)'}}/> same element</span>
          <span><span className="sw" style={{background:'transparent',border:'1px solid var(--rule)'}}/> ×1 neutral</span>
        </div>
      </div>
    </div>
  );
};

window.ElementsPage = ElementsPage;
