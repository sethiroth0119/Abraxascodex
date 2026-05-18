// Lineage / family tree — SVG rendered, fully interactive
const LineagePage = () => {
  const [lineage, setLineage] = window.useEntities ? window.useEntities('lineage') : React.useState(window.LINEAGE);
  const L = lineage;
  const [sel, setSel] = React.useState(L.root);
  const [edit, setEdit] = React.useState(false);

  // Layout: tier by generation; assign x positions left-to-right
  const tiers = [];
  const visit = (id, gen, seen=new Set()) => {
    if(!L.nodes[id] || seen.has(id)) return;
    seen.add(id);
    if(!tiers[gen]) tiers[gen] = [];
    tiers[gen].push(id);
    L.nodes[id].children.forEach(c => visit(c, gen + 1, seen));
  };
  visit(L.root, 0);

  const maxRow = Math.max(...tiers.map(t => t.length), 1);
  const W = Math.max(800, maxRow * 180);
  const H = Math.max(400, tiers.length * 130);
  const tierY = i => 70 + i * 130;

  const positions = {};
  tiers.forEach((row, gi) => {
    const step = W / (row.length + 1);
    row.forEach((id, i) => {
      positions[id] = { x: step * (i + 1), y: tierY(gi) };
    });
  });

  const edges = [];
  Object.entries(L.nodes).forEach(([id, n]) => {
    n.children.forEach(c => {
      if(positions[id] && positions[c]) edges.push({ from: positions[id], to: positions[c] });
    });
  });

  const selNode = L.nodes[sel];

  // ---- mutations ----
  const updateNode = (id, patch) => {
    setLineage({ ...L, nodes: { ...L.nodes, [id]: { ...L.nodes[id], ...patch } } });
  };

  const addChild = (parentId) => {
    const id = (window.makeId ? window.makeId('g') : 'g' + Date.now().toString(36));
    const child = { name:'New Scion', role:'Heir', born:'', died:null, glyph:'?', children:[] };
    setLineage({
      ...L,
      nodes: {
        ...L.nodes,
        [id]: child,
        [parentId]: { ...L.nodes[parentId], children: [...L.nodes[parentId].children, id] },
      },
    });
    setSel(id);
    setEdit(true);
  };

  const deleteNode = (id) => {
    if(id === L.root) { alert('Cannot delete the root. Promote a child first.'); return; }
    if(!confirm(`Delete "${L.nodes[id].name}" and all descendants?`)) return;
    // collect all descendants
    const toRemove = new Set([id]);
    const stack = [id];
    while(stack.length){
      const cur = stack.pop();
      const node = L.nodes[cur];
      if(node) node.children.forEach(c => { toRemove.add(c); stack.push(c); });
    }
    const nextNodes = {};
    for(const [k,v] of Object.entries(L.nodes)){
      if(toRemove.has(k)) continue;
      nextNodes[k] = { ...v, children: v.children.filter(c => !toRemove.has(c)) };
    }
    setLineage({ ...L, nodes: nextNodes });
    setSel(L.root);
  };

  const promoteRoot = (id) => {
    if(!confirm(`Make "${L.nodes[id].name}" the new root of this lineage?`)) return;
    setLineage({ ...L, root: id });
  };

  const expose = React.useEffect(() => {
    window.STATE = window.STATE || {};
    window.STATE.athenaFocus = { kind:'lineage-node', data: selNode };
    window.dispatchEvent(new CustomEvent('studio:focus-change'));
  }, [sel, selNode]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⚯</span>Lineages</h1>
          <div className="page-sub">House Tidemora · {Object.keys(L.nodes).length} souls across {tiers.length} generations · click a scion to inspect</div>
        </div>
        <div className="page-actions">
          {!window.IS_VIEWER && <button className="btn" onClick={() => addChild(L.root)}><Icon name="add" size={14}/> Add to root</button>}
          {!window.IS_VIEWER && <button className="btn btn-primary" onClick={() => selNode && addChild(sel)} disabled={!selNode}>
            <Icon name="add" size={14}/> Add child to {selNode?.glyph}
          </button>}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:24,alignItems:'start'}}>
        <div className="tree grain">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="tree-svg" style={{minHeight:Math.min(H, 700)}}>
            <defs>
              <linearGradient id="branch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold-deep)" stopOpacity=".8"/>
                <stop offset="100%" stopColor="var(--gold-deep)" stopOpacity=".3"/>
              </linearGradient>
              <radialGradient id="node" cx="30%" cy="30%">
                <stop offset="0%" stopColor="var(--gold-bright)"/>
                <stop offset="60%" stopColor="var(--gold-deep)"/>
                <stop offset="100%" stopColor="#1a1408"/>
              </radialGradient>
            </defs>
            {edges.map((e, i) => {
              const midY = (e.from.y + e.to.y) / 2;
              return (
                <path key={i}
                      d={`M ${e.from.x} ${e.from.y + 28} C ${e.from.x} ${midY}, ${e.to.x} ${midY}, ${e.to.x} ${e.to.y - 28}`}
                      fill="none" stroke="url(#branch)" strokeWidth="1.5"/>
              );
            })}
            {Object.entries(L.nodes).map(([id, n]) => {
              const p = positions[id]; if(!p) return null;
              const isSel = id === sel;
              const isRoot = id === L.root;
              const isDead = n.died !== null && n.died !== '';
              return (
                <g key={id} transform={`translate(${p.x}, ${p.y})`} style={{cursor:'pointer'}} onClick={()=>setSel(id)}>
                  <circle r="26" fill="url(#node)" stroke={isSel?'var(--gold-bright)':isRoot?'#ffd166':'var(--gold-deep)'} strokeWidth={isSel?2:isRoot?1.6:1} opacity={isDead?0.7:1}/>
                  {isSel && <circle r="34" fill="none" stroke="var(--gold-bright)" strokeWidth="1" strokeDasharray="3 3" opacity=".7"/>}
                  {isRoot && <circle r="30" fill="none" stroke="#ffd166" strokeWidth=".8" opacity=".7"/>}
                  <text textAnchor="middle" dy="5" fontFamily="var(--display)" fontSize="20" fill="#1a1408" fontWeight="700">{n.glyph}</text>
                  <text textAnchor="middle" y="46" fontFamily="var(--display)" fontSize="11" fill="var(--ink)" letterSpacing=".05em">
                    {n.name.length > 22 ? n.name.slice(0,20)+'…' : n.name}
                  </text>
                  <text textAnchor="middle" y="60" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">
                    {n.born}{n.died ? ` · ${String(n.died).split(' ')[0]}`: ''}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="panel" style={{alignSelf:'start'}}>
          <div className="panel-head"><div className="panel-title">Scion details</div>
            {sel===L.root && <span className="pill" style={{borderColor:'#ffd166',color:'#ffd166'}}>root</span>}
          </div>
          {selNode ? (
            <div className="panel-body">
              {!edit ? (
                <>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <div className="crest" style={{width:54,height:54,fontSize:24}}>{selNode.glyph}</div>
                    <div>
                      <div style={{fontFamily:'var(--display)',fontSize:17,lineHeight:1.1}}>{selNode.name}</div>
                      <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--gold)',fontSize:12,marginTop:2}}>{selNode.role}</div>
                    </div>
                  </div>
                  <dl className="kv" style={{marginTop:14}}>
                    <dt>Born</dt><dd>{selNode.born || '—'}</dd>
                    <dt>Died</dt><dd>{selNode.died ? selNode.died : <span style={{color:'var(--verdant)'}}>extant</span>}</dd>
                    <dt>House</dt><dd>Tidemora</dd>
                    <dt>Heirs</dt><dd>{selNode.children.length}</dd>
                  </dl>
                </>
              ) : (
                <div style={{display:'grid',gap:10}}>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Name</label>
                    <input className="field-input" value={selNode.name} onChange={e=>updateNode(sel,{name:e.target.value})}/>
                  </div>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Role</label>
                    <input className="field-input" value={selNode.role||''} onChange={e=>updateNode(sel,{role:e.target.value})}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'60px 1fr 1fr',gap:8}}>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Glyph</label>
                      <input className="field-input" value={selNode.glyph||''} maxLength={2} style={{textAlign:'center',fontFamily:'var(--display)',fontSize:16}} onChange={e=>updateNode(sel,{glyph:e.target.value})}/>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Born</label>
                      <input className="field-input" value={selNode.born||''} onChange={e=>updateNode(sel,{born:e.target.value})}/>
                    </div>
                    <div className="field" style={{margin:0}}>
                      <label className="field-label">Died</label>
                      <input className="field-input" value={selNode.died||''} placeholder="leave blank if alive" onChange={e=>updateNode(sel,{died:e.target.value||null})}/>
                    </div>
                  </div>
                </div>
              )}

              <div style={{display:'flex',gap:6,marginTop:14,flexWrap:'wrap'}}>
                {!window.IS_VIEWER && !edit && <button className="btn" style={{flex:1}} onClick={()=>setEdit(true)}><Icon name="pencil" size={12}/> Edit</button>}
                {!window.IS_VIEWER && edit && <button className="btn btn-primary" style={{flex:1}} onClick={()=>setEdit(false)}><Icon name="check" size={12}/> Done</button>}
                {!window.IS_VIEWER && <button className="btn" onClick={()=>addChild(sel)}><Icon name="add" size={12}/> Child</button>}
                {!window.IS_VIEWER && sel !== L.root && <button className="btn" onClick={()=>promoteRoot(sel)} title="Make this the lineage root">⌃ Root</button>}
                {!window.IS_VIEWER && sel !== L.root && <button className="btn" onClick={()=>deleteNode(sel)} style={{color:'var(--ember)'}}>✕ Delete</button>}
              </div>

              <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                <div style={{fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)',marginBottom:6}}>Notes</div>
                <textarea className="field-area"
                          value={selNode.notes||''}
                          onChange={e=>updateNode(sel,{notes:e.target.value})}
                          placeholder={`Lore for ${selNode.name} — secret parentage, sworn oaths, last words…`}
                          rows="5"/>
              </div>

              {selNode.children.length > 0 && (
                <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                  <div style={{fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)',marginBottom:6}}>Heirs · {selNode.children.length}</div>
                  {selNode.children.map(cid => {
                    const c = L.nodes[cid]; if(!c) return null;
                    return (
                      <div key={cid} className="mini-card" style={{width:'100%',marginBottom:6,cursor:'pointer'}} onClick={()=>setSel(cid)}>
                        <span style={{fontFamily:'var(--display)'}}>{c.glyph}</span>
                        <span style={{flex:1}}>{c.name}</span>
                        <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>{c.role}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div style={{padding:20,color:'var(--ink-faint)',fontStyle:'italic'}}>Select a scion in the tree.</div>
          )}
        </div>
      </div>
    </div>
  );
};

window.LineagePage = LineagePage;
