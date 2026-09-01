/* ============================================================================
   WORLD OS CONTEXT
   A single panel that any existing studio page can drop in to show what the
   rest of the world says about the thing being viewed:

     <window.WorldOSPanel kind="hero" id={hero.id} name={hero.name}/>

   The World OS pages store their links pointing outward — an article names a
   hero, a quest names a faction. This reads that in reverse, so a page that
   predates the World OS gains its own context without knowing anything about
   how the World OS works.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useMemo } = React;

  const GROUPS = [
    { key: 'articles',      title: 'Articles',      empty: 'No article covers this yet.' },
    { key: 'relationships', title: 'Relationships', empty: 'Not connected to anything yet.' },
    { key: 'pins',          title: 'On the map',    empty: 'Not pinned to any map.' },
    { key: 'quests',        title: 'Quests',        empty: 'Not used in a quest.' },
    { key: 'events',        title: 'History',       empty: 'Not tied to any event.' },
    { key: 'assets',        title: 'Images',        empty: 'No images filed against this.' },
  ];

  const REL_LABEL = {
    ally: 'allied with', enemy: 'enemy of', family: 'kin of', member: 'member of',
    rules: 'rules', serves: 'serves', loves: 'loves', betrayed: 'betrayed',
    created: 'created', located: 'located in', knows: 'knows of',
  };

  function WorldOSPanel({ kind, id, name, title = 'Across the world' }) {
    const [tick, setTick] = useState(0);
    const ref = { kind, id };

    // Recomputed on mount and whenever the studio reports a data change, so a
    // link made on another page shows up without a reload.
    React.useEffect(() => {
      const bump = () => setTick(t => t + 1);
      window.addEventListener('studio:data-change', bump);
      return () => window.removeEventListener('studio:data-change', bump);
    }, []);

    const links = useMemo(
      () => (window.WorldOS ? window.WorldOS.backlinks(ref) : null),
      [kind, id, tick]);

    if (!links) return null;
    const total = GROUPS.reduce((n, g) => n + links[g.key].length, 0);
    const go = (route) => { if (window.studioNavigate) window.studioNavigate(route); };

    return (
      <div className="woc">
        <div className="woc-head">
          <span className="woc-title">{title}</span>
          <span className="woc-count">{total === 0 ? 'nothing linked yet' : total + ' connection' + (total === 1 ? '' : 's')}</span>
        </div>

        {total === 0 ? (
          <div className="woc-empty">
            Nothing in the World OS refers to {name || 'this'} yet. Link it from an
            article, a map pin, a quest or the relationship graph and it will show up here.
          </div>
        ) : (
          <div className="woc-groups">
            {GROUPS.map(g => {
              const rows = links[g.key];
              if (!rows.length) return null;
              return (
                <div key={g.key} className="woc-group">
                  <div className="woc-group-head">{g.title} <span className="woc-n">{rows.length}</span></div>

                  {g.key === 'relationships' ? rows.map(r => (
                    <div key={r.id} className="woc-row" onClick={() => go(r.route)}>
                      <span className="woc-row-main">
                        {r.direction === 'out'
                          ? <>{REL_LABEL[r.type] || r.type} <b>{r.otherName}</b></>
                          : <><b>{r.otherName}</b> {REL_LABEL[r.type] || r.type} {name || 'this'}</>}
                      </span>
                      {r.note && <span className="woc-row-meta">{r.note}</span>}
                    </div>
                  )) : g.key === 'assets' ? (
                    <div className="woc-assets">
                      {rows.map(a => (
                        <img key={a.id} src={window.WorldOS.imageSrc(a.image)} alt={a.name}
                          title={a.name} onClick={() => go(a.route)}/>
                      ))}
                    </div>
                  ) : rows.map(r => (
                    <div key={r.id} className="woc-row" onClick={() => go(r.route)}>
                      <span className="woc-row-main"><b>{r.name}</b></span>
                      {r.meta && <span className="woc-row-meta">{r.meta}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* Compact variant for list rows — a single count badge. */
  function WorldOSBadge({ kind, id }) {
    const n = window.WorldOS ? window.WorldOS.backlinkCount({ kind, id }) : 0;
    if (!n) return null;
    return <span className="woc-badge" title={n + ' World OS connection' + (n === 1 ? '' : 's')}>{n}</span>;
  }

  window.WorldOSPanel = WorldOSPanel;
  window.WorldOSBadge = WorldOSBadge;

  const css = `
    .woc{border:1px solid var(--rule);border-left:3px solid var(--gold-deep);border-radius:var(--r-md);
      background:var(--parchment-2);padding:14px 16px;margin-top:20px}
    .woc-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px}
    .woc-title{font-family:var(--display);font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
    .woc-count{font-size:11px;color:var(--ink-faint)}
    .woc-empty{font-size:13px;color:var(--ink-faint);line-height:1.6}
    .woc-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
    .woc-group-head{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);
      margin-bottom:6px;display:flex;gap:6px;align-items:center}
    .woc-n{background:rgba(255,171,0,.14);color:var(--gold);border-radius:99px;padding:0 6px;font-size:10px}
    .woc-row{display:flex;flex-direction:column;gap:1px;padding:5px 8px;border-radius:var(--r-sm);
      cursor:pointer;transition:background .12s}
    .woc-row:hover{background:rgba(255,171,0,.10)}
    .woc-row-main{font-size:13px;color:var(--ink)}
    .woc-row-meta{font-size:11px;color:var(--ink-faint)}
    .woc-assets{display:flex;gap:6px;flex-wrap:wrap}
    .woc-assets img{width:52px;height:52px;object-fit:cover;border-radius:var(--r-sm);
      border:1px solid var(--rule);cursor:pointer}
    .woc-assets img:hover{border-color:var(--gold)}
    .woc-badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;
      border-radius:99px;background:rgba(255,171,0,.16);color:var(--gold);font-size:10px;
      font-family:var(--mono);margin-left:6px;vertical-align:middle}
  `;
  if (!document.getElementById('world-os-context-style')) {
    const el = document.createElement('style');
    el.id = 'world-os-context-style';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
