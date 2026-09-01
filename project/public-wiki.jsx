/* ============================================================================
   PUBLIC WIKI — the world as a reader sees it
   The World Bible records visibility per article and a level per secret. This
   is where those are actually enforced, and — more usefully — where you can
   stand in a reader's shoes and check what they can see before you publish.

   The audience switcher is the point of the page. Flip to Public and every
   private article and unrevealed secret disappears from view, so "what have I
   leaked?" stops being a question you answer by memory.

   Reuses the .wiki / .wiki-toc / .wiki-body styles the Lore Codex already
   ships, so it reads as part of the studio rather than beside it.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useMemo } = React;
  const UI = () => window.WorldOSUI;

  const AUDIENCES = [
    { id: 'studio',     label: 'Studio',     note: 'everything, including studio-only secrets' },
    { id: 'gm',         label: 'GM',         note: 'campaign leads: player and GM secrets' },
    { id: 'subscriber', label: 'Subscriber', note: 'followers: public and subscriber articles' },
    { id: 'public',     label: 'Public',     note: 'anyone: public articles only' },
  ];

  // Which article visibilities each audience may read.
  const CAN_READ = {
    studio:     ['public', 'subscriber', 'private'],
    gm:         ['public', 'subscriber', 'private'],
    subscriber: ['public', 'subscriber'],
    public:     ['public'],
  };
  // Which secret levels each audience may see.
  const CAN_SEE_SECRET = {
    studio:     ['studio', 'gm', 'player'],
    gm:         ['gm', 'player'],
    subscriber: ['player'],
    public:     ['player'],
  };

  function PublicWiki() {
    const [articles] = window.useEntities('articles');
    const [cats] = window.useEntities('articleCategories');
    const [audience, setAudience] = useState('public');
    const [openId, setOpenId] = useState(null);
    const [q, setQ] = useState('');
    const U = UI();

    const all = useMemo(() => (articles || []).filter(a => a && !a._deleted), [articles]);
    const readable = all.filter(a => CAN_READ[audience].includes(a.visibility || 'private'));
    const hiddenCount = all.length - readable.length;

    const shown = readable.filter(a => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return (a.title || '').toLowerCase().includes(s) || (a.excerpt || '').toLowerCase().includes(s);
    });

    const byCategory = useMemo(() => {
      const groups = {};
      for (const a of shown) {
        const key = a.category || 'Uncategorised';
        (groups[key] = groups[key] || []).push(a);
      }
      return groups;
    }, [shown]);

    // an article stays open only while the current audience may read it
    const open = readable.find(a => a.id === openId) || null;

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Public Wiki</h1>
            <div className="page-sub">
              {readable.length} of {all.length} articles visible
              {hiddenCount > 0 && <> · {hiddenCount} hidden from this audience</>}
            </div>
          </div>
          <div className="page-actions">
            <input className="field-input" placeholder="Search the wiki…" value={q}
              onChange={e => setQ(e.target.value)} style={{ maxWidth: 240 }}/>
          </div>
        </div>

        <div className="pw-audience">
          <span className="pw-audience-label">Reading as</span>
          {AUDIENCES.map(a => (
            <button key={a.id} className={`chip ${audience === a.id ? 'on' : ''}`}
              onClick={() => setAudience(a.id)} title={a.note}>{a.label}</button>
          ))}
          <span className="wos-dim pw-audience-note">
            {(AUDIENCES.find(a => a.id === audience) || {}).note}
          </span>
        </div>

        {all.length === 0 ? (
          <U.EmptyState
            title="Nothing to read yet"
            body="Write articles in the World Bible and they appear here, filtered to whatever audience you pick."/>
        ) : readable.length === 0 ? (
          <U.EmptyState
            title="Nothing is public yet"
            body={`All ${all.length} articles are hidden from a ${audience} reader. Change an article's visibility in the World Bible to publish it.`}/>
        ) : (
          <div className="wiki">
            <nav className="wiki-toc">
              {Object.keys(byCategory).sort().map(cat => (
                <div key={cat}>
                  <div className="toc-h">{cat}</div>
                  {byCategory[cat].map(a => (
                    <div key={a.id} className={`toc-item ${openId === a.id ? 'active' : ''}`}
                      onClick={() => setOpenId(a.id)}>{a.title}</div>
                  ))}
                </div>
              ))}
            </nav>

            <article className="wiki-body">
              {open
                ? <ArticleRead article={open} audience={audience} onOpen={setOpenId} all={readable}/>
                : <div className="pw-placeholder">
                    <h1>The World of Abraxas</h1>
                    <p className="wos-dim">
                      {readable.length} article{readable.length === 1 ? '' : 's'} available to a {audience} reader.
                      Pick one from the list.
                    </p>
                  </div>}
            </article>

            <aside className="wiki-side">
              <div className="panel"><div className="panel-body">
                <div className="wos-side-head">Visibility</div>
                {['public', 'subscriber', 'private'].map(v => {
                  const n = all.filter(a => (a.visibility || 'private') === v).length;
                  const readableNow = CAN_READ[audience].includes(v);
                  return (
                    <div key={v} className={`pw-vis-row ${readableNow ? '' : 'blocked'}`}>
                      <span>{v}</span><span className="wos-dim">{n}</span>
                      <span className="pw-vis-state">{readableNow ? 'visible' : 'hidden'}</span>
                    </div>
                  );
                })}
              </div></div>
            </aside>
          </div>
        )}
      </div>
    );
  }

  function ArticleRead({ article, audience, onOpen, all }) {
    const allowed = CAN_SEE_SECRET[audience] || [];
    const secrets = (article.secrets || []).filter(s => allowed.includes(s.level));
    const withheld = (article.secrets || []).length - secrets.length;
    const cover = window.WorldOS.imageSrc(article.cover);

    const body = article.body || {};
    const sections = Object.keys(body).filter(k => (body[k] || '').trim());

    return (
      <>
        {cover && <img src={cover} alt="" className="pw-cover"/>}
        <h1>{article.title}</h1>
        {article.excerpt && <p className="pw-excerpt">{article.excerpt}</p>}
        <div className="pw-badges">
          <span className={`wb-vis wb-vis-${article.visibility}`}>{article.visibility}</span>
          {article.category && <span className="wos-dim">{article.category}</span>}
          {(article.tags || []).map(t => <span key={t} className="pw-tag">{t}</span>)}
        </div>

        {sections.length === 0 && <p className="wos-dim">This article has no written sections yet.</p>}
        {sections.map(k => (
          <section key={k}>
            <h2>{k}</h2>
            {String(body[k]).split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
          </section>
        ))}

        {secrets.length > 0 && (
          <section className="pw-secrets">
            <h2>Secrets</h2>
            {secrets.map(s => (
              <div key={s.id} className={`pw-secret lvl-${s.level}`}>
                <div className="pw-secret-head">
                  {s.title} <span className="wos-dim">{s.level}</span>
                </div>
                <div>{s.body}</div>
              </div>
            ))}
          </section>
        )}
        {withheld > 0 && (
          <div className="pw-withheld">
            {withheld} secret{withheld === 1 ? '' : 's'} on this article {withheld === 1 ? 'is' : 'are'} withheld from a {audience} reader.
          </div>
        )}

        {(article.links || []).length > 0 && (
          <section>
            <h2>Connected</h2>
            <div className="chip-row">
              {(article.links || []).map(l => {
                const hit = window.WorldOS.resolve(l);
                const target = hit && l.kind === 'article' ? all.find(a => a.id === l.id) : null;
                return (
                  <span key={l.kind + l.id}
                    className={`chip ${target ? 'pw-link' : ''}`}
                    onClick={() => target && onOpen(target.id)}>
                    <span className="wos-dim">{l.kind}</span> {hit ? hit.name : l.id}
                  </span>
                );
              })}
            </div>
          </section>
        )}
      </>
    );
  }

  window.PublicWiki = PublicWiki;

  window.registerWorldOS({
    id: 'publicWiki',
    nav: { section: 'World OS', item: { id: 'publicWiki', label: 'Public Wiki', icon: 'scroll', badge: null } },
    routes: { publicWiki: () => <PublicWiki/> },
    collections: [],
    styles: `
      .pw-audience{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px;
        padding:10px 14px;border:1px solid var(--rule);border-radius:var(--r-md);background:var(--parchment-2)}
      .pw-audience-label{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
      .pw-audience .chip.on{border-color:var(--gold);color:var(--gold-bright);background:rgba(255,171,0,.12)}
      .pw-audience-note{font-size:12px;margin-left:6px}
      .wiki-side{position:sticky;top:0}
      .pw-cover{width:100%;max-height:280px;object-fit:cover;border-radius:var(--r-md);
        border:1px solid var(--rule);margin-bottom:18px}
      .pw-excerpt{font-size:17px;font-style:italic;color:var(--ink-dim);margin:0 0 12px}
      .pw-badges{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:18px;font-size:11px}
      .pw-tag{padding:1px 8px;border:1px solid var(--rule);border-radius:99px;color:var(--ink-dim)}
      .pw-placeholder h1{margin-bottom:10px}
      .pw-secrets h2{color:var(--aether);border-color:var(--aether)}
      .pw-secret{border:1px solid var(--aether);border-left-width:3px;border-radius:var(--r-sm);
        padding:12px 14px;margin-bottom:10px;background:rgba(160,93,104,.08);font-size:15px}
      .pw-secret-head{font-family:var(--display);color:var(--ink);margin-bottom:5px;
        display:flex;gap:10px;align-items:baseline;font-size:16px}
      .pw-secret-head .wos-dim{font-size:10px;letter-spacing:.2em;text-transform:uppercase}
      .pw-withheld{border:1px dashed var(--rule-strong);border-radius:var(--r-sm);padding:10px 14px;
        color:var(--ink-faint);font-size:13px;margin:12px 0}
      .pw-vis-row{display:flex;gap:10px;align-items:center;font-size:13px;padding:4px 0;
        text-transform:capitalize;color:var(--ink)}
      .pw-vis-row.blocked{opacity:.5}
      .pw-vis-row .wos-dim{margin-left:auto}
      .pw-vis-state{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint);min-width:52px;text-align:right}
      .pw-link{cursor:pointer;border-color:var(--gold-deep)}
      .pw-link:hover{background:rgba(255,171,0,.12)}
      @media (max-width:1100px){.wiki{grid-template-columns:1fr}.wiki-side{position:static}}
    `,
  });
})();
