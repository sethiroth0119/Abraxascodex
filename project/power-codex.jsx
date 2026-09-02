/* ============================================================================
   POWER CODEX — scaling, forms and weapons
   Comics live or die on whether a fight reads as fair. That needs the thing
   most world bibles leave out: an explicit, comparable statement of how strong
   everyone is, what shapes they can take, and what they carry.

   A profile attaches to something that already exists — a hero, an article, a
   card — rather than duplicating it. The Comic Studio reads these so a panel
   can say which form a character is in and how hard they hit.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useMemo } = React;
  const UI = () => window.WorldOSUI;

  // Classic comic power scaling. Ordered, so two profiles can be compared.
  const TIERS = [
    { id: 'street',      name: 'Street',       rank: 1, color: '#8a8a8a', note: 'Trained human. A knife is a real threat.' },
    { id: 'enhanced',    name: 'Enhanced',     rank: 2, color: '#9dbfcf', note: 'Beyond peak human. Shrugs off a fall.' },
    { id: 'city',        name: 'City',         rank: 3, color: '#138c64', note: 'Can level a block. Armies matter.' },
    { id: 'national',    name: 'National',     rank: 4, color: '#ffd37a', note: 'A standing army is an inconvenience.' },
    { id: 'continental', name: 'Continental',  rank: 5, color: '#ab763e', note: 'Reshapes coastlines.' },
    { id: 'planetary',   name: 'Planetary',    rank: 6, color: '#ffab00', note: 'The world itself is at stake.' },
    { id: 'stellar',     name: 'Stellar',      rank: 7, color: '#a05d68', note: 'Stars and systems.' },
    { id: 'cosmic',      name: 'Cosmic',       rank: 8, color: '#b44539', note: 'Reality bends. Few can perceive them.' },
    { id: 'abstract',    name: 'Abstract',     rank: 9, color: '#6f456f', note: 'A concept wearing a shape.' },
  ];
  const tierOf = (id) => TIERS.find(t => t.id === id) || TIERS[0];

  const STATS = [
    { id: 'str',  name: 'Strength' },
    { id: 'spd',  name: 'Speed' },
    { id: 'dur',  name: 'Durability' },
    { id: 'int',  name: 'Intellect' },
    { id: 'mag',  name: 'Power' },
    { id: 'will', name: 'Will' },
  ];

  const WEAPON_KINDS = ['Blade', 'Blunt', 'Polearm', 'Ranged', 'Focus', 'Relic', 'Firearm', 'Natural', 'Vehicle', 'Other'];

  window.PowerCodexData = { TIERS, tierOf, STATS, WEAPON_KINDS };

  function PowerCodex() {
    const [profiles, setProfiles] = window.useEntities('powerProfiles');
    const [openId, setOpenId] = useState(null);
    const [newOpen, setNewOpen] = useState(false);
    const [tierFilter, setTierFilter] = useState('All');
    const U = UI();

    const live = useMemo(() => (profiles || []).filter(p => p && !p._deleted), [profiles]);
    const shown = tierFilter === 'All' ? live : live.filter(p => p.tier === tierFilter);
    const update = (id, patch) => setProfiles((profiles || []).map(p => p.id === id ? { ...p, ...patch } : p));
    const open = live.find(p => p.id === openId) || null;

    if (open) return <ProfileEditor profile={open} update={update} onBack={() => setOpenId(null)}
      onDelete={() => { update(open.id, { _deleted: true }); setOpenId(null); }}/>;

    // ordered strongest first — the whole point is comparison
    const ranked = shown.slice().sort((a, b) =>
      (tierOf(b.tier).rank - tierOf(a.tier).rank) || ((b.rating || 0) - (a.rating || 0)));

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Power Codex</h1>
            <div className="page-sub">{live.length} profile{live.length === 1 ? '' : 's'} · strongest first</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-gold" onClick={() => setNewOpen(true)}>+ New profile</button>
          </div>
        </div>

        <div className="asset-bar">
          <div className="chip-row">
            <span className={`chip ${tierFilter === 'All' ? 'on' : ''}`} onClick={() => setTierFilter('All')}>All tiers</span>
            {TIERS.map(t => (
              <span key={t.id} className={`chip ${tierFilter === t.id ? 'on' : ''}`}
                onClick={() => setTierFilter(t.id)} style={{ borderColor: tierFilter === t.id ? t.color : undefined }}>
                {t.name}
              </span>
            ))}
          </div>
        </div>

        {live.length === 0 ? (
          <U.EmptyState
            title="No power profiles yet"
            body="Give a character a tier, a set of stats, the forms they can take and the weapons they carry. The Comic Studio reads these so a panel can show which form someone is in and how hard they hit."
            action={<button className="btn btn-gold" onClick={() => setNewOpen(true)}>Create the first profile</button>}/>
        ) : (
          <div className="pc-grid">
            {ranked.map(p => {
              const t = tierOf(p.tier);
              return (
                <div key={p.id} className="pc-card" onClick={() => setOpenId(p.id)}>
                  <div className="pc-card-head">
                    <span className="pc-tier" style={{ color: t.color, borderColor: t.color }}>{t.name}</span>
                    <span className="pc-rating">{p.rating || 0}</span>
                  </div>
                  <div className="pc-name">{p.name}</div>
                  {p.epithet && <div className="pc-epithet">{p.epithet}</div>}
                  <div className="pc-bars">
                    {STATS.map(s => (
                      <div key={s.id} className="pc-bar" title={s.name + ' ' + ((p.stats || {})[s.id] || 0)}>
                        <i style={{ width: ((p.stats || {})[s.id] || 0) + '%', background: t.color }}/>
                      </div>
                    ))}
                  </div>
                  <div className="pc-meta">
                    <span>{(p.forms || []).length} form{(p.forms || []).length === 1 ? '' : 's'}</span>
                    <span>{(p.weapons || []).length} weapon{(p.weapons || []).length === 1 ? '' : 's'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <U.Modal open={newOpen} title="New power profile" onClose={() => setNewOpen(false)}>
          <NewProfileForm onCreate={(p) => { setProfiles((profiles || []).concat(p)); setNewOpen(false); setOpenId(p.id); }}/>
        </U.Modal>
      </div>
    );
  }

  function NewProfileForm({ onCreate }) {
    const [subject, setSubject] = useState([]);
    const [name, setName] = useState('');
    const U = UI();
    // picking an existing entity fills the name, so profiles stay tied to canon
    const picked = subject[0] ? window.WorldOS.resolve(subject[0]) : null;
    const finalName = name.trim() || (picked ? picked.name : '');
    return (
      <>
        <U.Field label="Who is this? — pick a hero, article or card">
          <U.EntityLink value={subject} onChange={v => setSubject(v.slice(-1))}/>
        </U.Field>
        <U.Field label={picked ? 'Name (from ' + picked.name + ')' : 'Name'}>
          <U.Text value={finalName} onChange={e => setName(e.target.value)} placeholder="Aurel of the Ninth Gate"/>
        </U.Field>
        <div className="wos-modal-actions">
          <button className="btn btn-gold" disabled={!finalName} onClick={() => onCreate({
            id: window.makeId ? window.makeId() : 'pp_' + Date.now(),
            name: finalName, epithet: '', subject: subject[0] || null,
            tier: 'street', rating: 10, stats: { str: 20, spd: 20, dur: 20, int: 20, mag: 20, will: 20 },
            scaling: '', weaknesses: '', portrait: null,
            forms: [], weapons: [], links: subject.slice(),
            createdAt: new Date().toISOString(),
          })}>Create profile</button>
        </div>
      </>
    );
  }

  function ProfileEditor({ profile, update, onBack, onDelete }) {
    const U = UI();
    const t = tierOf(profile.tier);
    const forms = profile.forms || [];
    const weapons = profile.weapons || [];

    const setForm = (id, patch) => update(profile.id, { forms: forms.map(f => f.id === id ? { ...f, ...patch } : f) });
    const addForm = () => update(profile.id, { forms: forms.concat({
      id: window.makeId ? window.makeId() : 'f_' + Date.now(),
      name: 'New form', trigger: '', tier: profile.tier, rating: profile.rating || 10,
      description: '', drawback: '', image: null,
    }) });
    const dropForm = (id) => update(profile.id, { forms: forms.filter(f => f.id !== id) });

    const setWeapon = (id, patch) => update(profile.id, { weapons: weapons.map(w => w.id === id ? { ...w, ...patch } : w) });
    const addWeapon = () => update(profile.id, { weapons: weapons.concat({
      id: window.makeId ? window.makeId() : 'w_' + Date.now(),
      name: 'New weapon', kind: 'Blade', description: '', rating: 10, image: null,
    }) });
    const dropWeapon = (id) => update(profile.id, { weapons: weapons.filter(w => w.id !== id) });

    const setStat = (k, v) => update(profile.id, { stats: { ...(profile.stats || {}), [k]: Number(v) } });

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <button className="btn btn-ghost" onClick={onBack}>← Power Codex</button>
            <h1 className="page-title" style={{ marginTop: 8 }}>{profile.name}</h1>
            <div className="page-sub" style={{ color: t.color }}>{t.name} · {t.note}</div>
          </div>
        </div>

        <div className="wb-editor">
          <div className="wb-main">
            <div className="panel"><div className="panel-body">
              <div className="field-row">
                <U.Field label="Name">
                  <U.Text value={profile.name} onChange={e => update(profile.id, { name: e.target.value })}/>
                </U.Field>
                <U.Field label="Epithet">
                  <U.Text value={profile.epithet || ''} onChange={e => update(profile.id, { epithet: e.target.value })}
                    placeholder="the Last Warden"/>
                </U.Field>
              </div>
              <div className="field-row">
                <U.Field label="Power tier">
                  <U.Select value={profile.tier} onChange={e => update(profile.id, { tier: e.target.value })}
                    options={TIERS.map(x => ({ value: x.id, label: x.name + ' — ' + x.note }))}/>
                </U.Field>
                <U.Field label="Rating within tier (0–100)">
                  <U.Text type="number" min="0" max="100" value={profile.rating || 0}
                    onChange={e => update(profile.id, { rating: Number(e.target.value) })}/>
                </U.Field>
              </div>
            </div></div>

            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <div className="wos-side-head">Stats</div>
              {STATS.map(s => (
                <div key={s.id} className="pc-stat-row">
                  <label>{s.name}</label>
                  <input type="range" min="0" max="100" value={(profile.stats || {})[s.id] || 0}
                    onChange={e => setStat(s.id, e.target.value)}/>
                  <span className="pc-stat-val">{(profile.stats || {})[s.id] || 0}</span>
                </div>
              ))}
            </div></div>

            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <div className="wos-side-head">Forms</div>
              <div className="wos-dim" style={{ fontSize: 13, marginBottom: 10 }}>
                Alternate shapes, ascensions, possessions. Each carries its own tier, so a
                transformation actually changes what the character can survive.
              </div>
              {forms.map(f => {
                const ft = tierOf(f.tier);
                return (
                  <div key={f.id} className="pc-form" style={{ borderLeftColor: ft.color }}>
                    <div className="pc-form-top">
                      <input className="field-input" value={f.name} style={{ flex: 1 }}
                        onChange={e => setForm(f.id, { name: e.target.value })}/>
                      <select className="field-select" style={{ maxWidth: 150 }} value={f.tier}
                        onChange={e => setForm(f.id, { tier: e.target.value })}>
                        {TIERS.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                      <input className="field-input" type="number" min="0" max="100" style={{ width: 74 }}
                        value={f.rating || 0} onChange={e => setForm(f.id, { rating: Number(e.target.value) })}/>
                      <button className="btn btn-ghost wos-mini" onClick={() => dropForm(f.id)}>×</button>
                    </div>
                    <input className="field-input" value={f.trigger || ''} placeholder="What triggers it?"
                      onChange={e => setForm(f.id, { trigger: e.target.value })}/>
                    <textarea className="field-area" value={f.description || ''} placeholder="What changes…"
                      onChange={e => setForm(f.id, { description: e.target.value })}/>
                    <input className="field-input" value={f.drawback || ''} placeholder="Cost or drawback"
                      onChange={e => setForm(f.id, { drawback: e.target.value })}/>
                    <U.ImageDrop value={f.image} onChange={v => setForm(f.id, { image: v })}
                      preset="art" height={120} folder="forms" label="Art for this form"/>
                  </div>
                );
              })}
              <button className="btn" onClick={addForm}>+ Add form</button>
            </div></div>

            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <div className="wos-side-head">Weapons &amp; gear</div>
              {weapons.map(w => (
                <div key={w.id} className="pc-weapon">
                  <div className="pc-form-top">
                    <input className="field-input" value={w.name} style={{ flex: 1 }}
                      onChange={e => setWeapon(w.id, { name: e.target.value })}/>
                    <select className="field-select" style={{ maxWidth: 130 }} value={w.kind}
                      onChange={e => setWeapon(w.id, { kind: e.target.value })}>
                      {WEAPON_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <input className="field-input" type="number" min="0" max="100" style={{ width: 74 }}
                      value={w.rating || 0} onChange={e => setWeapon(w.id, { rating: Number(e.target.value) })}/>
                    <button className="btn btn-ghost wos-mini" onClick={() => dropWeapon(w.id)}>×</button>
                  </div>
                  <textarea className="field-area" value={w.description || ''} placeholder="What it does…"
                    onChange={e => setWeapon(w.id, { description: e.target.value })}/>
                </div>
              ))}
              <button className="btn" onClick={addWeapon}>+ Add weapon</button>
            </div></div>
          </div>

          <aside className="wb-side">
            <div className="panel"><div className="panel-body">
              <div className="wos-side-head">Portrait</div>
              <U.ImageDrop value={profile.portrait} onChange={v => update(profile.id, { portrait: v })}
                preset="art" height={160} folder="portraits" label="Drop a portrait"/>
            </div></div>
            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <div className="wos-side-head">Scaling notes</div>
              <U.Field label="How they compare">
                <U.Area value={profile.scaling || ''} onChange={e => update(profile.id, { scaling: e.target.value })}
                  placeholder="Held the gate alone against a Continental threat, but only for a night…"/>
              </U.Field>
              <U.Field label="Weaknesses">
                <U.Area value={profile.weaknesses || ''} onChange={e => update(profile.id, { weaknesses: e.target.value })}/>
              </U.Field>
              <U.Field label="Connected to">
                <U.EntityLink value={profile.links || []} onChange={v => update(profile.id, { links: v })}/>
              </U.Field>
            </div></div>
            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <button className="btn btn-ghost" onClick={onDelete}>Delete profile</button>
            </div></div>
          </aside>
        </div>
      </div>
    );
  }

  window.PowerCodex = PowerCodex;

  window.registerWorldOS({
    id: 'powerCodex',
    nav: { section: 'World OS', item: { id: 'powerCodex', label: 'Power Codex', icon: 'star', badge: null } },
    routes: { powerCodex: () => <PowerCodex/> },
    collections: [['powerProfiles', 'WORLD_POWER_PROFILES']],
    styles: `
      .pc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
      .pc-card{border:1px solid var(--rule);border-radius:var(--r-md);background:var(--parchment-2);
        padding:14px;cursor:pointer;transition:border-color .15s,transform .15s}
      .pc-card:hover{border-color:var(--gold-deep);transform:translateY(-2px)}
      .pc-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .pc-tier{font-size:9px;letter-spacing:.2em;text-transform:uppercase;border:1px solid;
        border-radius:99px;padding:1px 8px}
      .pc-rating{font-family:var(--mono);font-size:12px;color:var(--ink-dim)}
      .pc-name{font-family:var(--display);font-size:18px;color:var(--ink);margin-top:8px}
      .pc-epithet{font-size:12px;color:var(--ink-faint);font-style:italic}
      .pc-bars{display:flex;gap:3px;margin-top:10px}
      .pc-bar{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
      .pc-bar i{display:block;height:100%;border-radius:3px}
      .pc-meta{display:flex;gap:12px;margin-top:10px;font-size:10px;letter-spacing:.14em;
        text-transform:uppercase;color:var(--ink-faint)}
      .pc-stat-row{display:flex;align-items:center;gap:12px;margin-bottom:7px}
      .pc-stat-row label{width:90px;font-size:12px;color:var(--ink-dim)}
      .pc-stat-row input[type=range]{flex:1;accent-color:var(--gold)}
      .pc-stat-val{width:34px;text-align:right;font-family:var(--mono);font-size:12px;color:var(--ink)}
      .pc-form,.pc-weapon{border:1px solid var(--rule);border-left:3px solid var(--gold-deep);
        border-radius:var(--r-sm);padding:10px;margin-bottom:10px;background:var(--parchment-3);
        display:flex;flex-direction:column;gap:8px}
      .pc-form-top{display:flex;gap:8px;align-items:center}
    `,
  });
})();
