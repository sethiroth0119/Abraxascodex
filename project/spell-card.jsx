// SpellCard — Mythic Spellbook card. Renders new engine schema:
//   type ∈ unit/hero/spell/trap/location/weather/wall
//   elements[] (1-2), factions[] (multi)
//   units & heroes: HP/ATK/DEF/MAG/RES/SPD stat block
//   passive / passive2, optional kalonForm
const SpellCard = ({ card, onClick, style, slotId }) => {
  if(!card) return null;

  // normalize legacy → new schema
  const elements = card.elements || (card.element ? [card.element] : ['fire']);
  const factions = card.factions || (card.faction ? [card.faction] : []);
  const type = card.type || 'unit';
  const showStats = (type==='unit' || type==='hero' || type==='wall');

  const elemList = elements.map(id => window.ELEMENTS.find(e=>e.id===id)).filter(Boolean);
  const facList  = factions.map(id => window.FACTIONS.find(f=>f.id===id)).filter(Boolean);
  const primaryElem = elemList[0] || window.ELEMENTS[0];
  const secondaryElem = elemList[1];
  const primaryFac = facList[0];

  const typeMeta = (window.CARD_TYPES||[]).find(t=>t.id===type) || {name:type,icon:'•'};
  const passive  = card.passive  ? (window.PASSIVES||[]).find(p=>p.id===card.passive)  : null;
  const passive2 = card.passive2 ? (window.PASSIVES||[]).find(p=>p.id===card.passive2) : null;
  const kalon    = card.kalonForm ? (window.KALON_FORMS||[]).find(k=>k.id===card.kalonForm) : null;

  return (
    <div className="spell-card" style={{ ...style, '--elem': primaryElem.color, '--elem2': secondaryElem?.color || 'transparent', '--frame': 'var(--gold)' }} onClick={onClick}>
      <div className="frame-corners" />
      <div className="frame-corners2" />
      <div className="sc-rarity" data-r={card.rarity} title={card.rarity} />

      {/* Header */}
      <div className="sc-head">
        <div className="sc-cost" title={`Energy cost ${card.cost}`}>{card.cost ?? 0}</div>
        <div className="sc-name">{card.name}</div>
        <div className="sc-elems">
          {elemList.map((e,i) => (
            <div key={e.id} className="sc-elem" title={e.name}
                 style={{background:e.color, boxShadow:`0 0 8px ${e.color}, inset 0 0 0 1px rgba(0,0,0,.5)`}}>
              <span className="sc-elem-icon">{e.icon}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Type ribbon */}
      <div className="sc-typeline">
        <span className="sc-type-icon">{typeMeta.icon}</span>
        <span className="sc-type-name">{typeMeta.name}</span>
        {primaryFac && <><span className="sc-typedot">·</span><span style={{color:primaryFac.color}}>{primaryFac.icon} {primaryFac.name}</span></>}
        {facList.length > 1 && <span className="sc-typedot">+{facList.length - 1}</span>}
      </div>

      {/* Art */}
      <div className={`sc-art ${slotId?'has-slot':''}`} style={{borderColor: primaryElem.color+'66'}}>
        {slotId
          ? <image-slot id={slotId} shape="rect" placeholder="Drop card art"></image-slot>
          : <div className="sc-art-emoji" aria-hidden="true">{primaryElem.icon}</div>}
        {!slotId && <div className="sc-art-label">{card.artist === 'TBD' ? '◇ art pending' : `art · ${card.artist || '—'}`}</div>}
        {kalon && <div className="sc-kalon" title={`Kalon form: ${kalon.name}`}>⟁ kalon · {kalon.name}</div>}
      </div>

      {/* Passive line */}
      {passive && (
        <div className="sc-passive">
          <b>{passive.name}</b>
          {passive2 && <> + <b>{passive2.name}</b></>}
        </div>
      )}

      {/* Ability text */}
      {card.text && <div className="sc-text" dangerouslySetInnerHTML={{ __html: card.text }} />}

      {/* Stat block */}
      {showStats && (
        <div className="sc-stats">
          {[
            ['hp', card.hp, '#cc2a3a'],
            ['atk', card.atk, '#d4af37'],
            ['def', card.def, '#7a8aa0'],
            ['mag', card.mag, '#a070d9'],
            ['res', card.res, '#5aa8ff'],
            ['spd', card.spd, '#6ad880'],
          ].map(([k,v,c]) => (
            <div key={k} className="sc-stat" style={{color:c}}>
              <div className="sc-stat-key">{k.toUpperCase()}</div>
              <div className="sc-stat-val">{v ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* For non-stat cards, show secondary detail at bottom */}
      {!showStats && (
        <div className="sc-foot-meta">
          {card.set && <span>{card.set}</span>}
          <span style={{color:'var(--gold-deep)'}}>·</span>
          <span>{card.rarity}</span>
        </div>
      )}
    </div>
  );
};

window.SpellCard = SpellCard;
