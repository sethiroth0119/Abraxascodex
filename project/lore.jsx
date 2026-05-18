// Lore Codex — full CRUD wiki with persistence

// Default entries (used the first time, or after a reset)
window.LORE_ENTRIES = window.LORE_ENTRIES || [];

const LORE_TYPES = ['World','Concept','Era','Event','Location','Organization','Artifact','Legend','Person','Other'];

// crude wiki-link parser: [[Some Page]] → bolded gold span; ## Heading → h2; **bold**; *italic*
function renderLore(body) {
  if(!body) return '';
  return body
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\[\[(.+?)\]\]/g,'<span class="linked">$1</span>')
    .replace(/^##\s+(.+)$/gm,'<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm,'<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
    .replace(/\*(.+?)\*/g,'<i>$1</i>')
    .split(/\n\n+/).map(para => {
      if(para.startsWith('<h2>')) return para;
      return `<p>${para.replace(/\n/g,'<br/>')}</p>`;
    }).join('\n');
}

function relativeTime(ts) {
  if(!ts) return '—';
  const d = Date.now() - ts;
  if(d < 60_000) return 'just now';
  if(d < 3_600_000) return Math.floor(d/60_000) + 'm ago';
  if(d < 86_400_000) return Math.floor(d/3_600_000) + 'h ago';
  return Math.floor(d/86_400_000) + 'd ago';
}

const LorePage = () => {
  const [entries, setEntries] = window.useEntities ? window.useEntities('lore') : React.useState(window.LORE_ENTRIES);
  const [sel, setSel] = React.useState(entries[0]?.id);
  const [editing, setEditing] = React.useState(false);
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    if(!entries.find(e=>e.id===sel) && entries.length) setSel(entries[0].id);
  }, [entries, sel]);

  // Expose to Athena
  React.useEffect(() => {
    window.STATE = window.STATE || {};
    const cur = entries.find(e=>e.id===sel);
    if(cur) {
      window.STATE.athenaFocus = { kind:'lore', data: cur };
      window.dispatchEvent(new CustomEvent('studio:focus-change'));
    }
  }, [sel, entries]);

  const current = entries.find(e => e.id === sel);
  const filtered = entries.filter(e =>
    !q || e.title.toLowerCase().includes(q.toLowerCase()) || (e.body||'').toLowerCase().includes(q.toLowerCase())
  );

  const update = (id, patch) => {
    setEntries(entries.map(e => e.id===id ? {...e, ...patch, updated: Date.now()} : e));
  };

  const createEntry = () => {
    const id = (window.makeId ? window.makeId('lore') : 'lore-'+Date.now().toString(36));
    const fresh = {
      id, title:'New Entry', sub:'(subtitle)',
      type:'Concept', era:'',
      body:'Start writing... use [[double brackets]] to link other entries, ## for headings, **bold**, *italic*.',
      infobox:[], tags:[], backlinks:[],
      updated: Date.now(), author:'You',
    };
    setEntries([fresh, ...entries]);
    setSel(id);
    setEditing(true);
  };

  const deleteEntry = (id) => {
    if(entries.length <= 1) { alert('At least one lore entry is required.'); return; }
    if(!confirm(`Delete "${current.title}"?`)) return;
    setEntries(entries.filter(e=>e.id!==id));
    setSel(entries[0].id);
  };

  // Derive headings from body for the on-this-page TOC
  const headings = ((current?.body || '').match(/^##\s+(.+)$/gm) || []).map(m => m.replace(/^##\s+/, ''));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">❦</span>Lore Codex</h1>
          <div className="page-sub">{entries.length} entries · last edit {current ? relativeTime(current.updated) : '—'}</div>
        </div>
        <div className="page-actions">
          <div className="search" style={{width:220}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search codex..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={createEntry}><Icon name="add" size={14}/> New Entry</button>
        </div>
      </div>

      {current && (
        <div className="wiki">
          <aside className="wiki-toc">
            <div className="toc-h">Codex</div>
            {filtered.map(e => (
              <div key={e.id} className={`toc-item ${sel===e.id?'active':''}`} onClick={()=>{setSel(e.id);setEditing(false);}}>
                {e.title}
                <div style={{fontSize:10,color:'var(--ink-faint)',marginTop:2,fontFamily:'var(--mono)'}}>{e.type}</div>
              </div>
            ))}
            {!editing && headings.length > 0 && (
              <>
                <div className="toc-h">On this page</div>
                {headings.map((h,i) => <div key={i} className="toc-item">{h}</div>)}
              </>
            )}
          </aside>

          <article className="wiki-body">
            {/* Header / title block */}
            {editing ? (
              <div style={{marginBottom:14}}>
                <input value={current.title} onChange={e=>update(current.id,{title:e.target.value})}
                  style={{width:'100%',background:'transparent',border:'none',outline:'none',
                    fontFamily:'var(--display)',fontSize:38,letterSpacing:'.06em',color:'var(--gold-bright)',padding:0,fontWeight:500}}/>
                <input value={current.sub||''} onChange={e=>update(current.id,{sub:e.target.value})}
                  placeholder="subtitle"
                  style={{width:'100%',background:'transparent',border:'none',outline:'none',
                    fontFamily:'var(--serif)',fontStyle:'italic',fontSize:16,color:'var(--ink-dim)',padding:0,marginTop:4}}/>
                <div style={{display:'flex',gap:10,marginTop:10}}>
                  <select className="field-select" value={current.type} onChange={e=>update(current.id,{type:e.target.value})} style={{width:160}}>
                    {LORE_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                  <input className="field-input" placeholder="Era" value={current.era||''} onChange={e=>update(current.id,{era:e.target.value})} style={{width:160}}/>
                  <input className="field-input" placeholder="Author" value={current.author||''} onChange={e=>update(current.id,{author:e.target.value})} style={{width:160}}/>
                </div>
              </div>
            ) : (
              <>
                <h1>{current.title}</h1>
                {current.sub && <div style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:18,color:'var(--gold)',marginTop:-2,marginBottom:6}}>{current.sub}</div>}
                <div className="wiki-meta">{current.type} · {current.era || 'no era'} · revised by {current.author} {relativeTime(current.updated)}</div>
              </>
            )}

            {/* Body */}
            {editing ? (
              <textarea className="field-area"
                value={current.body || ''}
                onChange={e=>update(current.id,{body:e.target.value})}
                rows="22"
                style={{width:'100%',fontFamily:'var(--serif)',fontSize:15,fontStyle:'normal',lineHeight:1.6,marginTop:14}}
                placeholder="Write the lore here. Use [[Page Name]] to link other entries, ## for headings, **bold**, *italic*."/>
            ) : (
              <div className="lore-body drop"
                   dangerouslySetInnerHTML={{__html: renderLore(current.body)}}/>
            )}

            {/* Action bar */}
            <div style={{display:'flex',gap:8,marginTop:24,paddingTop:18,borderTop:'1px solid var(--rule)'}}>
              {!editing && <button className="btn" onClick={()=>setEditing(true)}><Icon name="pencil" size={12}/> Edit</button>}
              {editing && <button className="btn btn-primary" onClick={()=>setEditing(false)}><Icon name="check" size={12}/> Done</button>}
              <button className="btn"><Icon name="comment" size={12}/> Threads (4)</button>
              <button className="btn" onClick={()=>{
                const copy = {...current, id: window.makeId?window.makeId('lore'):'lore-'+Date.now().toString(36),
                               title: current.title+' (copy)', updated: Date.now()};
                setEntries([copy, ...entries]); setSel(copy.id);
              }}>⧉ Duplicate</button>
              <button className="btn" onClick={()=>deleteEntry(current.id)} style={{color:'var(--ember)',marginLeft:'auto'}}>✕ Delete</button>
            </div>
          </article>

          {/* Side rail — infobox + backlinks */}
          <aside className="wiki-side">
            <div className="panel" style={{marginBottom:14}}>
              <div className="panel-head">
                <div className="panel-title">Infobox</div>
                {editing && <button className="btn btn-ghost" onClick={()=>update(current.id,{infobox:[...(current.infobox||[]),['','']]})} style={{padding:4}}><Icon name="add" size={12}/></button>}
              </div>
              <div className="panel-body">
                {!editing ? (
                  (current.infobox && current.infobox.length>0) ? (
                    <dl className="kv">
                      {current.infobox.map(([k,v],i) => <React.Fragment key={i}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}
                    </dl>
                  ) : <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-faint)',fontSize:12}}>No infobox fields.</div>
                ) : (
                  <div style={{display:'grid',gap:6}}>
                    {(current.infobox||[]).map(([k,v],i) => (
                      <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 24px',gap:4,alignItems:'center'}}>
                        <input className="field-input" placeholder="Key" value={k} onChange={e=>{
                          const next = [...current.infobox]; next[i] = [e.target.value, v]; update(current.id,{infobox:next});
                        }} style={{fontSize:11,padding:'4px 6px'}}/>
                        <input className="field-input" placeholder="Value" value={v} onChange={e=>{
                          const next = [...current.infobox]; next[i] = [k, e.target.value]; update(current.id,{infobox:next});
                        }} style={{fontSize:11,padding:'4px 6px'}}/>
                        <button className="btn btn-ghost" style={{padding:2,fontSize:11}} onClick={()=>{
                          update(current.id,{infobox: current.infobox.filter((_,j)=>j!==i)});
                        }}>✕</button>
                      </div>
                    ))}
                    {(current.infobox||[]).length===0 && <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>No fields. Press + above.</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="panel" style={{marginBottom:14}}>
              <div className="panel-head"><div className="panel-title">Tags</div></div>
              <div className="panel-body">
                <div className="chip-row">
                  {(current.tags||[]).map((t,i) => (
                    <span key={i} className="chip active">
                      {t}
                      {editing && <span style={{marginLeft:6,opacity:.7,cursor:'pointer'}} onClick={()=>update(current.id,{tags: current.tags.filter((_,j)=>j!==i)})}>×</span>}
                    </span>
                  ))}
                  {editing && <input
                    placeholder="+ tag"
                    onKeyDown={e => {
                      if(e.key==='Enter' && e.target.value.trim()){
                        update(current.id,{tags:[...(current.tags||[]), e.target.value.trim()]});
                        e.target.value = '';
                      }
                    }}
                    style={{background:'transparent',border:'1px dashed var(--rule-strong)',borderRadius:99,
                            color:'var(--ink)',padding:'4px 10px',fontSize:11,fontFamily:'var(--body)',width:90,outline:'none'}}/>}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><div className="panel-title">Backlinks · {(current.backlinks||[]).length}</div></div>
              <div className="panel-body" style={{fontSize:12}}>
                {(current.backlinks||[]).map(t => (
                  <div key={t} style={{padding:'7px 0',borderBottom:'1px dashed var(--rule)',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{color:'var(--gold)'}}>↪</span>
                    <span className="linked" style={{borderBottom:'1px dotted var(--gold-deep)',cursor:'pointer'}}>{t}</span>
                    {editing && <span style={{marginLeft:'auto',cursor:'pointer',color:'var(--ink-faint)'}}
                      onClick={()=>update(current.id,{backlinks: current.backlinks.filter(x=>x!==t)})}>×</span>}
                  </div>
                ))}
                {editing && <input
                  placeholder="+ add backlink"
                  onKeyDown={e => {
                    if(e.key==='Enter' && e.target.value.trim()){
                      update(current.id,{backlinks:[...(current.backlinks||[]), e.target.value.trim()]});
                      e.target.value = '';
                    }
                  }}
                  className="field-input"
                  style={{marginTop:8,fontSize:11,padding:'6px 8px'}}/>}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

window.LorePage = LorePage;
