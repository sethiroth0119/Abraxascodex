// Card Forge — the heart of Mythic Spellbook
// Full engine schema: type ∈ unit/hero/spell/trap/location/weather/wall
// elements[] (1-2), factions[] (multi), full 6-stat block, passives, learnset, kalonForm

const RARITY_BASE_COST = { common:200, uncommon:600, rare:1500, epic:4000, legendary:12000, mythic:35000 };

const computePrice = (card) => {
  const base = RARITY_BASE_COST[card.rarity] || 200;
  const costMult = 1 + (card.cost || 0) * 0.08;
  const stat = (card.hp||0) + (card.atk||0)*2 + (card.def||0)*1.5 + (card.mag||0)*2 + (card.res||0)*1.5 + (card.spd||0)*5;
  const typeMult = card.type==='hero'?1.5 : card.type==='unit'?1.0 : card.type==='wall'?0.8 : 0.9;
  const passiveBonus = (card.passive?60:0) + (card.passive2?60:0);
  const kalonBonus = card.kalonForm ? 200 : 0;
  return Math.round((base + stat*8 + passiveBonus + kalonBonus) * costMult * typeMult);
};

// --- Community Voting ----------------------------------------------------
// Each card has three vote categories: Best Card, Best Art, Best Balance.
// Backed by the `card_votes` Supabase table (see supabase-card-votes.sql).
// Failures (e.g. table not yet created) degrade silently so the inspector
// still works — counts just stay at 0.
const VOTE_CATEGORIES = [
  { id:'best_card',    label:'Best Card',    icon:'🏆' },
  { id:'best_art',     label:'Best Art',     icon:'🎨' },
  { id:'best_balance', label:'Best Balance', icon:'⚖️' },
];

const CardVotes = ({ cardId }) => {
  const [counts, setCounts]   = React.useState({ best_card:0, best_art:0, best_balance:0 });
  const [myVotes, setMyVotes] = React.useState(new Set());
  const [busy, setBusy]       = React.useState(false);
  // Always store err as a string so render-time .includes() can't throw.
  const [err, setErr]         = React.useState('');

  const loadVotes = React.useCallback(async () => {
    try {
      if (!cardId || !window.supabaseClient) return;
      const { data, error } = await window.supabaseClient
        .from('card_votes').select('user_id, category').eq('card_id', cardId);
      if (error) { setErr(String(error.message || error)); return; }
      const c = { best_card:0, best_art:0, best_balance:0 };
      const mine = new Set();
      const me = window.CURRENT_USER && window.CURRENT_USER.id;
      for (const v of (data || [])) {
        c[v.category] = (c[v.category] || 0) + 1;
        if (v.user_id === me) mine.add(v.category);
      }
      setCounts(c); setMyVotes(mine); setErr('');
    } catch (e) { setErr(String(e && e.message || e || 'unknown error')); }
  }, [cardId]);

  React.useEffect(() => { loadVotes(); }, [loadVotes]);

  const toggle = async (category) => {
    if (busy || !window.supabaseClient || !window.CURRENT_USER) return;
    setBusy(true);
    try {
      const me = window.CURRENT_USER.id;
      if (myVotes.has(category)) {
        await window.supabaseClient.from('card_votes')
          .delete().eq('card_id', cardId).eq('user_id', me).eq('category', category);
      } else {
        await window.supabaseClient.from('card_votes')
          .insert({ card_id: cardId, user_id: me, category });
      }
      await loadVotes();
    } catch (e) { setErr(String(e && e.message || e || 'unknown error')); }
    finally    { setBusy(false); }
  };

  return (
    <div className="field span-3">
      <label className="field-label">Community Vote</label>
      <div className="chip-row">
        {VOTE_CATEGORIES.map(c => (
          <div key={c.id}
               className={`chip ${myVotes.has(c.id) ? 'active' : ''}`}
               onClick={() => toggle(c.id)}
               style={{cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1}}
               title={myVotes.has(c.id) ? `Click to remove your ${c.label} vote` : `Vote ${c.label}`}>
            <span style={{fontSize:14, marginRight:2}}>{c.icon}</span>
            {c.label} · {counts[c.id] || 0}
          </div>
        ))}
      </div>
      {err && <div style={{fontSize:11, color:'var(--ember)', marginTop:6}}>
        Voting unavailable: {String(err).indexOf('relation') >= 0
          ? 'run supabase-card-votes.sql in your Supabase dashboard first.'
          : String(err)}
      </div>}
    </div>
  );
};

const CardForge = () => {
  // Defensive: window.CARDS *should* be an array (data.jsx + store.jsx hydrate),
  // but if a stale localStorage entry or a load-order quirk leaves it
  // undefined / null / non-array, fall back to [] so nothing downstream
  // explodes (e.g. spreads, .find, .map all assume array).
  const seed = Array.isArray(window.CARDS) ? window.CARDS : [];
  const [cards, setCards] = window.useEntities ? window.useEntities('cards') : React.useState(seed);
  const [selectedId, setSelectedId] = React.useState(seed[0]?.id);
  const [filterType, setFilterType] = React.useState('all');
  const [filterElem, setFilterElem] = React.useState('all');
  const [filterRarity, setFilterRarity] = React.useState('all');
  const [tab, setTab] = React.useState('design');
  const [toast, setToast] = React.useState(null);

  // Expose state to Athena
  React.useEffect(() => {
    window.STATE = window.STATE || {};
    window.STATE.cards = cards;
    window.STATE.selectedCard = cards.find(c => c.id === selectedId);
    window.STATE.athenaFocus = { kind:'card', data: cards.find(c => c.id === selectedId) };
    window.dispatchEvent(new CustomEvent('studio:focus-change'));
  }, [cards, selectedId]);

  const selected = cards.find(c => c.id === selectedId);
  const isStatCard = selected && (selected.type==='unit'||selected.type==='hero'||selected.type==='wall');

  const createCard = () => {
    const id = 'c' + Date.now().toString(36);
    const nc = { id, name:'Untitled Sigil', type:'unit',
      elements:['arcane'], factions:[], cost:1,
      hp:20, atk:5, def:5, mag:5, res:5, spd:2,
      rarity:'common', text:'Write the rules here.', passive:null, passive2:null,
      learnset:[], kalonForm:null,
      artist:'TBD', set:'Working', status:'WIP', tags:[] };
    // Functional updater + array guard — never blow up even if `cards`
    // is briefly undefined (e.g. across a hot re-render or a bad cache).
    setCards(prev => [nc, ...(Array.isArray(prev) ? prev : [])]);
    setSelectedId(id);
    showToast('New card forged');
  };

  // Auto-create a card when navigated here from the dashboard's "New Card" button.
  // Wrapped in try/catch so a transient render error can't blank the whole page.
  React.useEffect(() => {
    if (window.__pendingNewCard) {
      window.__pendingNewCard = false;
      try { createCard(); }
      catch (e) { console.warn('[card-forge] auto-create failed:', e && e.message); }
    }
  }, []);

  const update = (patch) => selected && setCards(cards.map(c => c.id === selectedId ? { ...c, ...patch } : c));
  const toggleArr = (key, val, max) => {
    const arr = selected[key] || [];
    let next;
    if(arr.includes(val)) next = arr.filter(x=>x!==val);
    else if(max && arr.length >= max) next = [...arr.slice(1), val];
    else next = [...arr, val];
    update({ [key]: next });
  };

  const filtered = cards.filter(c => {
    if(filterType !== 'all' && c.type !== filterType) return false;
    if(filterElem !== 'all' && !(c.elements||[]).includes(filterElem)) return false;
    if(filterRarity !== 'all' && c.rarity !== filterRarity) return false;
    return true;
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1600); };

  return (
    <div className="page" style={{maxWidth:'none'}}>
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⚔</span>Card Forge</h1>
          <div className="page-sub">{filtered.length} of {cards.length} cards · Engine v0.41 · 7 card types · 21 elements · 40 factions</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => showToast('Exported to card_catalog')}><Icon name="upload" size={14}/> Publish</button>
          <button className="btn"><Icon name="eye" size={14}/> Playtest</button>
          <button className="btn btn-primary" onClick={createCard}>
            <Icon name="add" size={14}/> New Card
          </button>
        </div>
      </div>

      {/* filter row */}
      <div style={{display:'flex',gap:14,marginBottom:18,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div className="chip-row" style={{minWidth:0}}>
          <div className={`chip ${filterType==='all'?'active':''}`} onClick={()=>setFilterType('all')}>All Types</div>
          {window.CARD_TYPES.map(t =>
            <div key={t.id} className={`chip ${filterType===t.id?'active':''}`} onClick={()=>setFilterType(t.id)}>
              <span style={{fontSize:13}}>{t.icon}</span>{t.name}
            </div>)}
        </div>
        <div className="chip-row">
          {window.RARITIES.map(r =>
            <div key={r.id} className={`chip ${filterRarity===r.id?'active':''}`} onClick={()=>setFilterRarity(filterRarity===r.id?'all':r.id)}
                 style={filterRarity===r.id ? {borderColor:r.color,color:r.color,background:r.color+'20'} : {}}>
              <span className="dot" style={{background:r.color, boxShadow:`0 0 6px ${r.color}`}}/>{r.name}
            </div>)}
        </div>
      </div>

      <div className="chip-row" style={{marginBottom:16}}>
        <div className={`chip ${filterElem==='all'?'active':''}`} onClick={()=>setFilterElem('all')}>All Elements</div>
        {window.ELEMENTS.map(e =>
          <div key={e.id} className={`chip ${filterElem===e.id?'active':''}`} onClick={()=>setFilterElem(filterElem===e.id?'all':e.id)}
               style={filterElem===e.id ? {borderColor:e.color,color:e.color,background:e.color+'20'} : {}}
               title={e.name}>
            <span style={{fontSize:13}}>{e.icon}</span>{e.name}
          </div>)}
      </div>

      {!selected && (
        <div className="panel" style={{padding:'60px 40px',textAlign:'center'}}>
          <div style={{fontSize:64,opacity:.3,marginBottom:14}}>⚔</div>
          <div style={{fontFamily:'var(--display)',fontSize:22,letterSpacing:'.06em',color:'var(--gold-bright)',marginBottom:8}}>No cards yet</div>
          <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:14,marginBottom:24,maxWidth:480,marginLeft:'auto',marginRight:'auto',lineHeight:1.5}}>
            Forge your first card to begin the Mythic Spellbook catalog. You can edit every stat, passive, learnset move, and piece of art on the next screen.
          </div>
          <button className="btn btn-primary" onClick={createCard}><Icon name="add" size={14}/> Forge first card</button>
        </div>
      )}

      {selected && <div className="builder">
        {/* LIST */}
        <div className="panel builder-list">
          <div className="panel-head">
            <div className="panel-title">Codex · {filtered.length}</div>
            <button className="btn btn-primary" onClick={createCard}
                    style={{marginLeft:'auto',padding:'4px 10px',fontSize:12}}
                    title="Forge a new card">
              <Icon name="add" size={12}/> New
            </button>
          </div>
          <div>
            {filtered.map(c => {
              const elemId = (c.elements||[c.element])[0] || 'fire';
              const e = window.ELEMENTS.find(x=>x.id===elemId);
              const t = window.CARD_TYPES.find(x=>x.id===c.type) || {icon:'•'};
              return (
                <div key={c.id} className={`list-row ${c.id===selectedId?'active':''}`} onClick={()=>setSelectedId(c.id)}>
                  <div className="list-thumb" style={{borderColor:e.color, color:e.color}}>{e.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="list-name" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.name}</div>
                    <div className="list-meta">{t.icon} {c.type} · {c.cost} ⚡ · {c.rarity}</div>
                  </div>
                  <span className={`pill r-${c.rarity}`}>{c.rarity[0].toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="builder-main">
        {/* STAGE */}
        <div className="panel stage-bg grain" style={{position:'relative',minHeight:480}}>
          <div className="panel-head" style={{background:'transparent',border:'none'}}>
            <div className="tabs" style={{margin:0,border:'none'}}>
              <div className={`tab ${tab==='design'?'active':''}`} onClick={()=>setTab('design')}>Design</div>
              <div className={`tab ${tab==='moves'?'active':''}`} onClick={()=>setTab('moves')}>Learnset</div>
              <div className={`tab ${tab==='balance'?'active':''}`} onClick={()=>setTab('balance')}>Balance</div>
              <div className={`tab ${tab==='lore'?'active':''}`} onClick={()=>setTab('lore')}>Lore</div>
              <div className={`tab ${tab==='comments'?'active':''}`} onClick={()=>setTab('comments')}>Comments</div>
            </div>
            <div className="page-actions">
              <span className="pill" style={{color: selected.status==='Final'?'var(--verdant)':'var(--ember)', borderColor:'currentColor'}}>{selected.status}</span>
            </div>
          </div>

          <div className="builder-stage">
            {tab !== 'comments' && tab !== 'moves' && <SpellCard card={selected} slotId={`card-${selected.id}`} />}

            {tab === 'design' && (
              <div style={{display:'flex',gap:8,fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>
                <span>Drop art on the card</span> · <span>Edit fields in inspector</span> · <span>{selected.id}</span>
              </div>
            )}

            {tab === 'moves' && (
              <div style={{width:'100%',maxWidth:680, padding:'0 20px'}}>
                <div className="field-label" style={{marginBottom:8}}>Learnset · {(selected.learnset||[]).length} moves</div>
                {(selected.learnset||[]).length === 0 && (
                  <div style={{padding:30,textAlign:'center',color:'var(--ink-faint)',fontFamily:'var(--serif)',fontStyle:'italic',
                       border:'1px dashed var(--rule)',borderRadius:6}}>
                    No moves yet. Add some below — they unlock at the chosen level.
                  </div>
                )}
                {(selected.learnset||[]).map((entry,i) => {
                  const move = (window.MOVES||[]).find(m=>m.id===entry.m);
                  const elem = move && window.ELEMENTS.find(e=>e.id===move.element);
                  return (
                    <div key={i} style={{display:'grid',gridTemplateColumns:'60px 1fr auto',gap:14,alignItems:'center',
                         padding:'10px 14px',borderBottom:'1px solid var(--rule)',
                         borderLeft:`3px solid ${elem?.color||'var(--rule)'}`,background:'rgba(201,161,74,.03)',marginBottom:4,borderRadius:'0 6px 6px 0'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)'}}>Lv</span>
                        <input type="number" min="1" max="50" value={entry.lvl}
                               onChange={ev => {
                                 const next = [...selected.learnset];
                                 next[i] = {...entry, lvl: +ev.target.value};
                                 update({learnset: next});
                               }}
                               style={{width:46,background:'var(--parchment-2)',border:'1px solid var(--rule)',color:'var(--ink)',
                                       padding:'3px 6px',borderRadius:3,fontFamily:'var(--mono)',fontSize:12}}/>
                      </div>
                      <div>
                        {move ? (
                          <>
                            <div style={{fontFamily:'var(--display)',fontSize:14,color:'var(--ink)'}}>
                              {elem?.icon} {move.name}
                              <span className="pill" style={{marginLeft:8,fontSize:9}}>{move.kind}</span>
                              <span className="pill" style={{marginLeft:4,fontSize:9}}>{move.target}</span>
                            </div>
                            <div style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:12,marginTop:2}}>
                              {move.desc} <span style={{fontFamily:'var(--mono)',color:'var(--ink-faint)',marginLeft:8}}>pow {move.power} · acc {move.acc} · cost {move.cost}⚡</span>
                            </div>
                          </>
                        ) : <span style={{color:'var(--ember)'}}>Unknown move "{entry.m}"</span>}
                      </div>
                      <button className="btn btn-ghost" onClick={() => update({learnset: selected.learnset.filter((_,j)=>j!==i)})}>✕</button>
                    </div>
                  );
                })}

                <div style={{marginTop:14,padding:14,border:'1px solid var(--rule)',borderRadius:6}}>
                  <div className="field-label" style={{marginBottom:8}}>Add move from catalog</div>
                  <select className="field-select" onChange={ev => {
                    if(!ev.target.value) return;
                    update({learnset:[...(selected.learnset||[]), {lvl:1, m:ev.target.value}]});
                    ev.target.value = '';
                  }} defaultValue="">
                    <option value="">— pick a move —</option>
                    {(window.MOVES||[]).map(m => {
                      const e = window.ELEMENTS.find(x=>x.id===m.element);
                      return <option key={m.id} value={m.id}>{e?.icon} {m.name} · {m.kind} · pow {m.power}</option>;
                    })}
                  </select>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink-faint)',marginTop:6}}>
                    Max 4 known moves at any time · learnset is the catalog
                  </div>
                </div>
              </div>
            )}

            {tab === 'lore' && (
              <div style={{maxWidth:540, fontFamily:'var(--serif)', fontStyle:'italic', color:'var(--ink-dim)', fontSize:15, textAlign:'center', padding:'0 20px'}}>
                <div style={{color:'var(--gold)',fontFamily:'var(--display)',letterSpacing:'.2em',textTransform:'uppercase',fontSize:11,marginBottom:8}}>Flavor &amp; Provenance</div>
                "The card called {selected.name} was first inked by {selected.artist} for the set <b style={{color:'var(--gold-bright)'}}>{selected.set}</b>.
                It is bound to {(selected.factions||[]).map(f=>window.FACTIONS.find(x=>x.id===f)?.name).filter(Boolean).join(', ') || 'no faction yet'}."
              </div>
            )}

            {tab === 'balance' && (
              <div style={{width:'100%',maxWidth:520, fontFamily:'var(--mono)', fontSize:12, color:'var(--ink-dim)'}}>
                {[
                  ['Mana curve position', `${selected.cost} / 10`, (selected.cost/10)*100],
                  ['Stat total',          `${(selected.hp||0)+(selected.atk||0)+(selected.def||0)+(selected.mag||0)+(selected.res||0)+(selected.spd||0)}`, Math.min((((selected.hp||0)+(selected.atk||0)+(selected.def||0)+(selected.mag||0)+(selected.res||0)+(selected.spd||0))/250)*100,100)],
                  ['Rarity weighting',    selected.rarity, ({common:10,uncommon:25,rare:45,epic:65,legendary:85,mythic:100})[selected.rarity]],
                  ['Element coverage',    `${(selected.elements||[]).length}/2`, ((selected.elements||[]).length/2)*100],
                  ['Faction coverage',    `${(selected.factions||[]).length}`, Math.min((selected.factions||[]).length*25, 100)],
                  ['Learnset depth',      `${(selected.learnset||[]).length} moves`, Math.min((selected.learnset||[]).length*25, 100)],
                ].map(([k,v,p],i) => (
                  <div key={i} style={{display:'grid',gridTemplateColumns:'180px 1fr 100px',alignItems:'center',gap:12,padding:'6px 0'}}>
                    <span>{k}</span>
                    <div className="bar"><i style={{width:`${p}%`}}/></div>
                    <span style={{textAlign:'right',color:'var(--gold-bright)'}}>{v}</span>
                  </div>
                ))}
                <div style={{marginTop:14,padding:12,border:'1px solid var(--rule)',borderRadius:6,fontStyle:'italic',fontFamily:'var(--serif)',color:'var(--ink-dim)'}}>
                  <b style={{color:'var(--gold)'}}>Auto-priced:</b> {computePrice(selected).toLocaleString()} 🔥 · Ask Athena for a balance review.
                </div>
              </div>
            )}

            {tab === 'comments' && (
              <div style={{width:'100%',maxWidth:520,padding:'0 20px'}}>
                {[].map((c,i) => (
                  <div key={i} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px dashed var(--rule)'}}>
                    <div className="avatar" style={{background: c.who==='Athena'?'linear-gradient(135deg,#5a4a7a,#1a142a)':'linear-gradient(135deg,#5a4a2a,#2a1f0a)'}}>{c.who==='Athena' ? '🦉' : c.who[0]}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'var(--display)',color: c.who==='Athena'?'var(--aether)':'var(--gold-bright)',letterSpacing:'.06em'}}>
                        {c.who} <span style={{color:'var(--ink-faint)',fontSize:11,marginLeft:8,fontFamily:'var(--mono)'}}>{c.when} ago</span>
                      </div>
                      <div style={{fontFamily:'var(--serif)',fontSize:14,color:'var(--ink)',marginTop:4}}>{c.text}</div>
                    </div>
                  </div>
                ))}
                <div style={{display:'flex',gap:8,marginTop:10}}>
                  <input className="field-input" placeholder="Add a comment..." style={{flex:1}}/>
                  <button className="btn btn-primary">Post</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* INSPECTOR — now full-width below stage */}
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Inspector</div>
            <span className="wiki-meta">🔥 {computePrice(selected).toLocaleString()}</span>
          </div>
          <div className="panel-body">
            <div className="inspector-grid">
              <div className="field span-3">
                <label className="field-label">Name</label>
                <input className="field-input" value={selected.name} onChange={e=>update({name:e.target.value})}/>
              </div>

              <div className="field">
                <label className="field-label">Card type</label>
                <select className="field-select" value={selected.type} onChange={e=>update({type:e.target.value})}>
                  {window.CARD_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Rarity</label>
                <select className="field-select" value={selected.rarity} onChange={e=>update({rarity:e.target.value})}>
                  {window.RARITIES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Cost ⚡ (1-10)</label>
                <input type="number" min="0" max="10" className="field-input" value={selected.cost} onChange={e=>update({cost:+e.target.value||0})}/>
              </div>

              <div className="field span-3">
                <label className="field-label">Elements (1–2)</label>
                <div className="chip-row">
                  {window.ELEMENTS.map(e => {
                    const active = (selected.elements||[]).includes(e.id);
                    return (
                      <div key={e.id} className={`chip ${active?'active':''}`}
                           onClick={()=>toggleArr('elements', e.id, 2)}
                           style={active ? {borderColor:e.color,color:e.color,background:e.color+'20'} : {}}>
                        <span style={{fontSize:13,marginRight:2}}>{e.icon}</span>{e.name}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="field span-3">
                <label className="field-label">Factions (any)</label>
                <div className="chip-row" style={{maxHeight:120,overflow:'auto'}}>
                  {window.FACTIONS.map(f => {
                    const active = (selected.factions||[]).includes(f.id);
                    return (
                      <div key={f.id} className={`chip ${active?'active':''}`}
                           onClick={()=>toggleArr('factions', f.id)}
                           style={active ? {borderColor:f.color,color:f.color,background:f.color+'20'} : {}}>
                        <span style={{fontSize:13,marginRight:2}}>{f.icon}</span>{f.name}
                      </div>
                    );
                  })}
                </div>
              </div>

              {isStatCard && (
                <div className="field span-3">
                  <label className="field-label">Stat block</label>
                  <div className="stat-grid" style={{gridTemplateColumns:'repeat(6,1fr)'}}>
                    {window.STAT_KEYS.map(s => (
                      <div key={s.id} className="stat-cell">
                        <label className="stat-cell-key">{s.name}</label>
                        <input type="number" className="field-input stat-cell-input"
                               value={selected[s.id] ?? 0}
                               onChange={e=>update({[s.id]: +e.target.value||0})}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="field span-3">
                <label className="field-label">Rules text</label>
                <textarea className="field-area" rows="3"
                          value={(selected.text||'').replace(/<\/?b>/g,'**')}
                          onChange={e=>update({text: e.target.value.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')})}/>
              </div>

              <div className="field">
                <label className="field-label">Passive</label>
                <select className="field-select" value={selected.passive||''} onChange={e=>update({passive:e.target.value||null})}>
                  <option value="">— none —</option>
                  {(window.PASSIVES||[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Passive 2</label>
                <select className="field-select" value={selected.passive2||''} onChange={e=>update({passive2:e.target.value||null})}>
                  <option value="">— none —</option>
                  {(window.PASSIVES||[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Kalon Form</label>
                <select className="field-select" value={selected.kalonForm||''} onChange={e=>update({kalonForm:e.target.value||null})}>
                  <option value="">— none —</option>
                  {(window.KALON_FORMS||[]).map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>

              {/* Mechanical wiring (ported from the live game) */}
              <div className="field">
                <label className="field-label">Trigger</label>
                <select className="field-select" value={selected.trigger||''} onChange={e=>update({trigger:e.target.value||null})}>
                  <option value="">— none —</option>
                  {(window.TRIGGERS||[]).map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Active Zone</label>
                <select className="field-select" value={selected.zone||''} onChange={e=>update({zone:e.target.value||null})}>
                  <option value="">— any —</option>
                  {(window.ZONES||[]).map(z => <option key={z.id} value={z.id}>{z.icon} {z.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Power Tier</label>
                <select className="field-select" value={selected.tier||''} onChange={e=>update({tier:e.target.value||null})}>
                  <option value="">— unrated —</option>
                  {(window.TIERS||[]).map(t => <option key={t.id} value={t.id}>{t.name} (P{t.power})</option>)}
                </select>
              </div>

              <div className="field">
                <label className="field-label">Set</label>
                <input className="field-input" value={selected.set||''} onChange={e=>update({set:e.target.value})}/>
              </div>
              <div className="field">
                <label className="field-label">Artist</label>
                <input className="field-input" value={selected.artist||''} onChange={e=>update({artist:e.target.value})}/>
              </div>
              <div className="field">
                <label className="field-label">Status</label>
                <select className="field-select" value={selected.status} onChange={e=>update({status:e.target.value})}>
                  {['Concept','Sketch','WIP','In review','Final'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="field span-2">
                <label className="field-label">Tags</label>
                <div className="chip-row">
                  {(selected.tags||[]).map(t => <span key={t} className="chip active">{t}</span>)}
                  <span className="chip"><Icon name="add" size={11}/> tag</span>
                </div>
              </div>

              {/* Community voting — Best Card / Best Art / Best Balance */}
              <CardVotes cardId={selected.id} />

              <div className="field">
                <label className="field-label">Auto-priced</label>
                <div style={{padding:'9px 12px',background:'rgba(201,161,74,.06)',border:'1px solid var(--rule)',borderRadius:6,
                  fontFamily:'var(--display)',fontSize:18,color:'var(--gold-bright)'}}>
                  🔥 {computePrice(selected).toLocaleString()}
                  <span style={{fontSize:10,color:'var(--ink-faint)',letterSpacing:'.18em',textTransform:'uppercase',marginLeft:6}}>Cinders</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

window.CardForge = CardForge;
window.computePrice = computePrice;
