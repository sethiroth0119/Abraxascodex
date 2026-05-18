// Economy — Cinders 🔥 / Sovereigns 👑 / Survival Resources 🧰
// Plus crafting costs, vendor markets, cashout vault.

const RESOURCE_KEYS = [
  { id:'food',     name:'Food',     icon:'🍞', desc:'Daily upkeep + Rest activities' },
  { id:'ammo',     name:'Ammo',     icon:'🔫', desc:'Loot runs, Strike ops' },
  { id:'water',    name:'Water',    icon:'💧', desc:'Daily upkeep, Infirmary' },
  { id:'medicine', name:'Medicine', icon:'💊', desc:'Recover trauma, treat injured' },
  { id:'supplies', name:'Supplies', icon:'📦', desc:'Base building + facility upgrades' },
  { id:'metal',    name:'Metal',    icon:'⚙', desc:'Construct crafting + Power Relay' },
  { id:'intel',    name:'Intel',    icon:'📡', desc:'Improves loot-run survival' },
];

const RARITY_CRAFT = {
  common:    { food:20, supplies:10, metal:5 },
  uncommon:  { food:40, supplies:25, metal:15, medicine:5 },
  rare:      { supplies:60, metal:40, medicine:20, intel:10 },
  epic:      { supplies:120, metal:80, medicine:50, intel:30, ammo:40 },
  legendary: { supplies:240, metal:180, medicine:120, intel:80, ammo:120 },
  mythic:    { supplies:500, metal:400, medicine:280, intel:200, ammo:300 },
};

const EconomyPage = () => {
  const [tab, setTab] = React.useState('currencies');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">🔥</span>Economy</h1>
          <div className="page-sub">Cinders · Sovereigns (Aza) · 7 survival resources · crafting · vendor markets · cashout vault</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="upload" size={14}/> Export rules</button>
          <button className="btn btn-primary"><Icon name="check" size={14}/> Publish to catalog</button>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab==='currencies'?'active':''}`} onClick={()=>setTab('currencies')}>Currencies</div>
        <div className={`tab ${tab==='resources'?'active':''}`} onClick={()=>setTab('resources')}>Survival Resources</div>
        <div className={`tab ${tab==='crafting'?'active':''}`} onClick={()=>setTab('crafting')}>Crafting Costs</div>
        <div className={`tab ${tab==='markets'?'active':''}`} onClick={()=>setTab('markets')}>Markets &amp; Cashout</div>
      </div>

      {tab==='currencies' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:18}}>
          {[
            { icon:'🔥', name:'Cinders', code:'Profile.gems', color:'#ff7755', source:'Battles, dailies, achievements, selling. Cashout-eligible.', kicker:'In-game soft currency' },
            { icon:'👑', name:'Sovereigns (Aza)', code:'Profile.sovereigns', color:'#ffd166', source:'Premium · real money or tradeable in the resource exchange.', kicker:'Hard currency' },
            { icon:'🧰', name:'Survival Resources', code:'Profile.resources', color:'#7d8590', source:'Camp loot/missions · local-only persistence.', kicker:'7 distinct stacks' },
          ].map(c => (
            <div key={c.name} className="panel" style={{position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',right:-20,bottom:-20,fontSize:140,opacity:.06,lineHeight:1}}>{c.icon}</div>
              <div className="panel-head" style={{borderColor:c.color+'33'}}>
                <div className="panel-title" style={{color:c.color}}>{c.icon} {c.name}</div>
                <span className="wiki-meta">{c.kicker}</span>
              </div>
              <div className="panel-body">
                <div style={{fontFamily:'var(--serif)',fontSize:14,lineHeight:1.5,color:'var(--ink-dim)'}}>{c.source}</div>
                <div style={{marginTop:10,fontFamily:'var(--mono)',fontSize:11,color:'var(--ink-faint)'}}>{c.code}</div>
              </div>
            </div>
          ))}
          <div className="panel" style={{gridColumn:'1 / -1'}}>
            <div className="panel-head"><div className="panel-title">Sample card valuations · 🔥 Cinders</div></div>
            <table className="ledger">
              <thead>
                <tr>
                  <th>Card</th><th>Type</th><th>Elements</th><th>Rarity</th>
                  <th style={{textAlign:'right'}}>Cost ⚡</th>
                  <th style={{textAlign:'right'}}>Stat total</th>
                  <th style={{textAlign:'right'}}>Auto-price</th>
                </tr>
              </thead>
              <tbody>
                {window.CARDS.slice(0,10).map(c => {
                  const stat = (c.hp||0)+(c.atk||0)+(c.def||0)+(c.mag||0)+(c.res||0)+(c.spd||0);
                  return (
                    <tr key={c.id}>
                      <td style={{fontFamily:'var(--display)',color:'var(--ink)'}}>{c.name}</td>
                      <td>{c.type}</td>
                      <td>{(c.elements||[]).map(id => {
                        const e = window.ELEMENTS.find(x=>x.id===id);
                        return e ? <span key={id} style={{color:e.color,marginRight:4}}>{e.icon}</span> : null;
                      })}</td>
                      <td><span className={`pill r-${c.rarity}`}>{c.rarity}</span></td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)'}}>{c.cost}</td>
                      <td style={{textAlign:'right',fontFamily:'var(--mono)',color:stat?'var(--ink)':'var(--ink-faint)'}}>{stat||'—'}</td>
                      <td style={{textAlign:'right'}}><span style={{color:'#ff7755',fontFamily:'var(--mono)'}}>🔥 {window.computePrice(c).toLocaleString()}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='resources' && (
        <>
          <div className="elem-grid">
            {RESOURCE_KEYS.map(r => (
              <div key={r.id} className="elem-tile" style={{cursor:'default'}}>
                <div className="elem-icon">{r.icon}</div>
                <div className="elem-name">{r.name}</div>
                <div style={{marginTop:6,fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:12.5,lineHeight:1.4}}>{r.desc}</div>
              </div>
            ))}
          </div>

          <div className="section">
            <div className="section-head"><div className="section-title">Resource Exchange · player-to-player</div></div>
            <div className="panel">
              <div className="panel-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24,fontSize:13.5,lineHeight:1.55}}>
                <div>
                  <div style={{fontFamily:'var(--display)',color:'var(--gold)',letterSpacing:'.18em',fontSize:11,textTransform:'uppercase',marginBottom:6}}>List a stack</div>
                  Players post a resource stack priced in <b style={{color:'#ff7755'}}>🔥 Cinders</b>, <b style={{color:'#ffd166'}}>👑 Aza</b>, or 🔄 Barter (a specific custom card or item/relic).
                </div>
                <div>
                  <div style={{fontFamily:'var(--display)',color:'var(--gold)',letterSpacing:'.18em',fontSize:11,textTransform:'uppercase',marginBottom:6}}>Escrow</div>
                  On post, the resources lock in escrow. Atomic <code>open → sold</code> flip prevents double-sells. Cancel returns the stack.
                </div>
                <div>
                  <div style={{fontFamily:'var(--display)',color:'var(--gold)',letterSpacing:'.18em',fontSize:11,textTransform:'uppercase',marginBottom:6}}>Payout</div>
                  An offline sweep credits the seller. RLS-locked to listing owner / buyer. <span style={{fontFamily:'var(--mono)',color:'var(--ink-faint)'}}>Supabase resource_listings</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab==='crafting' && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Default craft costs by rarity</div>
            <span className="wiki-meta">override per-card in Forge → Craft Cost</span>
          </div>
          <table className="ledger">
            <thead>
              <tr>
                <th>Rarity</th>
                {RESOURCE_KEYS.map(r => <th key={r.id} style={{textAlign:'right'}}>{r.icon} {r.name}</th>)}
                <th style={{textAlign:'right'}}>Scrap refund (40%)</th>
              </tr>
            </thead>
            <tbody>
              {window.RARITIES.map(r => {
                const recipe = RARITY_CRAFT[r.id] || {};
                const total = Object.values(recipe).reduce((s,v)=>s+v,0);
                return (
                  <tr key={r.id}>
                    <td><span className={`pill r-${r.id}`}>{r.name}</span></td>
                    {RESOURCE_KEYS.map(k => (
                      <td key={k.id} style={{textAlign:'right',fontFamily:'var(--mono)', color: recipe[k.id]?'var(--ink)':'var(--ink-faint)'}}>
                        {recipe[k.id] || '—'}
                      </td>
                    ))}
                    <td style={{textAlign:'right',fontFamily:'var(--mono)',color:'var(--gold-bright)'}}>{Math.round(total*0.4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab==='markets' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Markets</div></div>
            <div className="panel-body" style={{fontSize:13.5,lineHeight:1.6}}>
              <dl className="kv">
                <dt>Vendor / Player Market</dt><dd>Unlock: 2 heroes Lv 15+ · NPCs restock every <b style={{color:'var(--gold-bright)'}}>6 hours</b>. Prices 5 – 9,999 🔥.</dd>
                <dt>Black Market</dt><dd>Admin-tunable per rarity. Catalog-synced.</dd>
                <dt>Tutor Shop</dt><dd>Unlock: account Lv 5. Buy moves with 👑 Sovereigns. Tutor-bought moves are <b style={{color:'var(--gold-bright)'}}>permanently protected</b>.</dd>
                <dt>Packs · Starter · Structure</dt><dd>Admin-authored. Starter pick gates new players (one free deck; its hero pinned).</dd>
              </dl>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Cashout Vault</div></div>
            <div className="panel-body" style={{fontSize:13.5,lineHeight:1.6}}>
              <dl className="kv">
                <dt>Unlock</dt><dd>1 hero at Lv 15</dd>
                <dt>Rate</dt><dd><b style={{color:'#ff7755'}}>5,000 🔥</b> per <b style={{color:'#7a9a52'}}>$1</b></dd>
                <dt>Threshold</dt><dd>Minimum <b style={{color:'var(--gold-bright)'}}>500,000 🔥</b> ($100)</dd>
                <dt>Structure</dt><dd>Tiered payout, escrow on request</dd>
              </dl>
              <div style={{marginTop:14,fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)'}}>
                "A Loom buys a kingdom or a question, depending on who is asking." — Sael of Tidemora
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.EconomyPage = EconomyPage;
