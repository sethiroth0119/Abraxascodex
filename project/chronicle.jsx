/* ============================================================================
   CHRONICLE — eras and history
   The studio already had a Timeline: a flat list where the era was free text
   and nothing sorted. This is the World Anvil treatment of the same idea —
   eras as real records with ranges and colour, events with numeric years so
   they order themselves, importance, links to whoever was involved, and
   parallel tracks so political and religious history can run side by side.

   It reads the old timeline rather than replacing it: "Import" pulls those
   entries in, matching their era text to an era record.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useMemo } = React;
  const UI = () => window.WorldOSUI;

  const IMPORTANCE = [
    { value: 3, label: 'Defining — the world changed' },
    { value: 2, label: 'Major' },
    { value: 1, label: 'Minor' },
  ];
  const ERA_COLORS = ['#ffab00', '#9dbfcf', '#138c64', '#a05d68', '#ab763e', '#b44539', '#6f456f'];

  function ChroniclePage() {
    const [eras, setEras] = window.useEntities('eras');
    const [events, setEvents] = window.useEntities('chronicleEvents');
    const [tracks, setTracks] = window.useEntities('chronicleTracks');
    const [openId, setOpenId] = useState(null);
    const [trackFilter, setTrackFilter] = useState('All');
    const [minImportance, setMinImportance] = useState(1);
    const [eraOpen, setEraOpen] = useState(false);
    const U = UI();

    const liveEras = (eras || []).filter(e => e && !e._deleted)
      .sort((a, b) => (a.startYear || 0) - (b.startYear || 0));
    const liveTracks = (tracks || []).filter(t => t && !t._deleted);
    const liveEvents = useMemo(
      () => (events || []).filter(e => e && !e._deleted),
      [events]);

    const shown = liveEvents
      .filter(e => trackFilter === 'All' || e.track === trackFilter)
      .filter(e => (e.importance || 1) >= minImportance)
      .sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0));

    const eraOf = (year) => liveEras.find(e =>
      Number(year) >= (e.startYear ?? -Infinity) && Number(year) <= (e.endYear ?? Infinity)) || null;

    const addEvent = () => {
      const ev = {
        id: window.makeId ? window.makeId() : 'ev_' + Date.now(),
        title: 'New event', year: liveEvents.length ? '' : 0, summary: '',
        importance: 2, track: liveTracks[0] ? liveTracks[0].name : '', links: [], visibility: 'private',
      };
      setEvents((events || []).concat(ev));
      setOpenId(ev.id);
    };

    /* Bring the old flat Timeline in rather than leaving two histories. */
    const importLegacy = () => {
      const legacy = Array.isArray(window.TIMELINE) ? window.TIMELINE : [];
      if (!legacy.length) { alert('The old Timeline page has no entries to import.'); return; }
      const already = new Set(liveEvents.map(e => (e.title || '').toLowerCase()));
      const made = legacy
        .filter(t => t && t.title && !already.has(String(t.title).toLowerCase()))
        .map((t, i) => ({
          id: window.makeId ? window.makeId() : 'ev_imp_' + Date.now() + '_' + i,
          title: t.title,
          year: (String(t.year || '').match(/-?\d+/) || [0])[0],
          summary: t.summary || '',
          importance: 2,
          track: '',
          era: t.era || '',
          links: [], visibility: 'private', imported: true,
        }));
      if (!made.length) { alert('Everything in the old Timeline is already here.'); return; }
      setEvents((events || []).concat(made));
      alert('Imported ' + made.length + ' event' + (made.length === 1 ? '' : 's') + ' from the old Timeline.');
    };

    const update = (id, patch) => setEvents((events || []).map(e => e.id === id ? { ...e, ...patch } : e));
    const open = liveEvents.find(e => e.id === openId) || null;

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Chronicle</h1>
            <div className="page-sub">
              {liveEras.length} era{liveEras.length === 1 ? '' : 's'} · {liveEvents.length} events
            </div>
          </div>
          <div className="page-actions">
            <button className="btn" onClick={importLegacy}>Import old Timeline</button>
            <button className="btn" onClick={() => setEraOpen(true)}>Eras</button>
            <button className="btn btn-gold" onClick={addEvent}>+ Event</button>
          </div>
        </div>

        <div className="asset-bar">
          <div className="chip-row">
            <span className={`chip ${trackFilter === 'All' ? 'on' : ''}`} onClick={() => setTrackFilter('All')}>All tracks</span>
            {liveTracks.map(t => (
              <span key={t.id} className={`chip ${trackFilter === t.name ? 'on' : ''}`}
                onClick={() => setTrackFilter(t.name)}>{t.name}</span>
            ))}
            <span className="chip" onClick={() => {
              const name = prompt('New track — e.g. Political, Religious, Arcane');
              if (name && name.trim()) setTracks((tracks || []).concat({
                id: window.makeId ? window.makeId() : 'tr_' + Date.now(), name: name.trim() }));
            }}>+ track</span>
          </div>
          <select className="field-select" style={{ maxWidth: 220 }} value={minImportance}
            onChange={e => setMinImportance(Number(e.target.value))}>
            <option value={1}>All events</option>
            <option value={2}>Major and above</option>
            <option value={3}>Defining only</option>
          </select>
        </div>

        {liveEvents.length === 0 ? (
          <U.EmptyState
            title="No history yet"
            body="Add events with a year and they sort themselves. Define eras and each event picks up the era it falls inside. If the old Timeline page has entries, import them."
            action={<>
              <button className="btn btn-gold" onClick={addEvent}>Add the first event</button>
              <button className="btn" style={{ marginLeft: 8 }} onClick={importLegacy}>Import old Timeline</button>
            </>}/>
        ) : (
          <div className="chron-rail">
            {shown.map(ev => {
              const era = eraOf(ev.year);
              const color = era ? era.color : 'var(--ink-faint)';
              return (
                <div key={ev.id} className={`chron-row imp-${ev.importance || 1}`} onClick={() => setOpenId(ev.id)}>
                  <div className="chron-year" style={{ color }}>{ev.year === '' ? '—' : ev.year}</div>
                  <div className="chron-dot" style={{ background: color, boxShadow: `0 0 10px ${color}` }}/>
                  <div className="chron-body">
                    <div className="chron-title">{ev.title}</div>
                    {ev.summary && <div className="chron-sum">{ev.summary}</div>}
                    <div className="chron-meta">
                      {era && <span style={{ color }}>{era.name}</span>}
                      {!era && ev.era && <span className="wos-dim">{ev.era}</span>}
                      {ev.track && <span className="wos-dim">{ev.track}</span>}
                      {(ev.links || []).length > 0 && <span className="wos-dim">{ev.links.length} linked</span>}
                      {ev.imported && <span className="wos-dim">imported</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {shown.length === 0 && <div className="wos-dim" style={{ padding: 20 }}>No events match that filter.</div>}
          </div>
        )}

        {/* event editor */}
        <U.Modal open={!!open} title={open ? open.title : ''} onClose={() => setOpenId(null)}>
          {open && (
            <>
              <U.Field label="Title">
                <U.Text value={open.title} onChange={e => update(open.id, { title: e.target.value })}/>
              </U.Field>
              <div className="field-row">
                <U.Field label="Year — numbers sort the rail">
                  <U.Text value={open.year} onChange={e => update(open.id, { year: e.target.value })}
                    placeholder="e.g. 412 or -80"/>
                </U.Field>
                <U.Field label="Importance">
                  <U.Select value={open.importance || 1}
                    onChange={e => update(open.id, { importance: Number(e.target.value) })}
                    options={IMPORTANCE}/>
                </U.Field>
              </div>
              <U.Field label="Track">
                <U.Select value={open.track || ''} onChange={e => update(open.id, { track: e.target.value })}
                  options={[{ value: '', label: '— none —' }].concat(liveTracks.map(t => ({ value: t.name, label: t.name })))}/>
              </U.Field>
              <U.Field label="What happened">
                <U.Area value={open.summary || ''} onChange={e => update(open.id, { summary: e.target.value })}/>
              </U.Field>
              <U.Field label="Who and what was involved">
                <U.EntityLink value={open.links || []} onChange={v => update(open.id, { links: v })}/>
              </U.Field>
              <U.Field label="Visibility">
                <U.Select value={open.visibility || 'private'}
                  onChange={e => update(open.id, { visibility: e.target.value })}
                  options={[{ value: 'public', label: 'Public' }, { value: 'subscriber', label: 'Subscribers' }, { value: 'private', label: 'Private — studio only' }]}/>
              </U.Field>
              <div className="wos-modal-actions">
                <button className="btn btn-ghost"
                  onClick={() => { update(open.id, { _deleted: true }); setOpenId(null); }}>Delete event</button>
              </div>
            </>
          )}
        </U.Modal>

        {/* era manager */}
        <U.Modal open={eraOpen} title="Eras" onClose={() => setEraOpen(false)}>
          <div className="wos-dim" style={{ fontSize: 13, marginBottom: 12 }}>
            An era is a named span of years. Events falling inside one pick up its name and colour automatically.
          </div>
          {liveEras.map(era => (
            <div key={era.id} className="chron-era-row">
              <input className="field-input" value={era.name} style={{ flex: 2 }}
                onChange={e => setEras((eras || []).map(x => x.id === era.id ? { ...x, name: e.target.value } : x))}/>
              <input className="field-input" value={era.startYear ?? ''} placeholder="from" style={{ width: 80 }}
                onChange={e => setEras((eras || []).map(x => x.id === era.id ? { ...x, startYear: Number(e.target.value) } : x))}/>
              <input className="field-input" value={era.endYear ?? ''} placeholder="to" style={{ width: 80 }}
                onChange={e => setEras((eras || []).map(x => x.id === era.id ? { ...x, endYear: Number(e.target.value) } : x))}/>
              <span className="chron-swatch" style={{ background: era.color }}
                onClick={() => setEras((eras || []).map(x => x.id === era.id
                  ? { ...x, color: ERA_COLORS[(ERA_COLORS.indexOf(x.color) + 1) % ERA_COLORS.length] } : x))}/>
              <button className="btn btn-ghost"
                onClick={() => setEras((eras || []).map(x => x.id === era.id ? { ...x, _deleted: true } : x))}>×</button>
            </div>
          ))}
          <button className="btn" onClick={() => setEras((eras || []).concat({
            id: window.makeId ? window.makeId() : 'era_' + Date.now(),
            name: 'New era', startYear: 0, endYear: 100,
            color: ERA_COLORS[liveEras.length % ERA_COLORS.length],
          }))}>+ Add era</button>
        </U.Modal>
      </div>
    );
  }

  window.ChroniclePage = ChroniclePage;

  window.registerWorldOS({
    id: 'chronicle',
    nav: { section: 'World OS', item: { id: 'chronicle', label: 'Chronicle', icon: 'clock', badge: null } },
    routes: { chronicle: () => <ChroniclePage/> },
    collections: [['eras', 'WORLD_ERAS'], ['chronicleEvents', 'WORLD_CHRON_EVENTS'], ['chronicleTracks', 'WORLD_CHRON_TRACKS']],
    styles: `
      .chron-rail{position:relative;margin-left:120px;padding-left:28px;border-left:1px solid var(--rule-strong)}
      .chron-row{position:relative;padding:12px 0 16px;cursor:pointer}
      .chron-row:hover .chron-title{color:var(--gold-bright)}
      .chron-year{position:absolute;left:-148px;top:12px;width:110px;text-align:right;font-family:var(--mono);font-size:12px}
      .chron-dot{position:absolute;left:-35px;top:16px;width:12px;height:12px;border-radius:50%;border:2px solid var(--parchment)}
      .chron-row.imp-3 .chron-dot{width:16px;height:16px;left:-37px}
      .chron-row.imp-1 .chron-dot{width:8px;height:8px;left:-33px;top:18px}
      .chron-title{font-family:var(--display);font-size:17px;color:var(--ink);transition:color .15s}
      .chron-row.imp-3 .chron-title{font-size:21px}
      .chron-sum{font-size:13px;color:var(--ink-dim);line-height:1.6;margin-top:3px;max-width:680px}
      .chron-meta{display:flex;gap:12px;margin-top:6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
      .chron-era-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
      .chron-swatch{width:26px;height:26px;border-radius:5px;border:1px solid var(--rule-strong);cursor:pointer;flex:none}
      @media (max-width:800px){.chron-rail{margin-left:0}.chron-year{position:static;width:auto;text-align:left;display:block;margin-bottom:2px}}
    `,
  });
})();
