/* ============================================================================
   WORLD BIBLE — the article system
   World Anvil's core idea: everything in the world is an article, articles are
   typed by template, filed into categories, and can hide content behind
   secrets that only the right readers see.

   Three things the studio did not have before:
     · templates      — a type-specific set of prompts, so a Character article
                        asks different questions than a Settlement
     · secrets        — blocks that stay hidden from players but stay attached
                        to the article for the studio
     · visibility     — public / subscriber / private, per article
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useMemo } = React;
  const UI = () => window.WorldOSUI;

  /* Template prompts are lifted from the shape World Anvil uses, adapted to
     Abraxas. Each field is just a labelled prose block. */
  const TEMPLATES = {
    character: { name: 'Character', icon: 'hero', fields: [
      'Physical Description', 'Personality', 'History', 'Motives & Goals',
      'Relationships', 'Speech & Mannerisms', 'Notable Possessions'] },
    settlement: { name: 'Settlement', icon: 'map', fields: [
      'Overview', 'Demographics', 'Government', 'Defences', 'Industry & Trade',
      'Architecture', 'History', 'Points of Interest'] },
    organization: { name: 'Organization', icon: 'faction', fields: [
      'Purpose', 'Structure', 'Culture', 'Assets', 'Allies & Enemies', 'History'] },
    species: { name: 'Species', icon: 'flask', fields: [
      'Anatomy', 'Biological Traits', 'Ecology & Habitat', 'Behaviour',
      'Civilisation & Culture', 'Relationship to Other Species'] },
    item: { name: 'Item / Artifact', icon: 'relic', fields: [
      'Description', 'Powers & Abilities', 'Origin', 'Significance', 'Current Location'] },
    location: { name: 'Location', icon: 'map', fields: [
      'Geography', 'Ecosystem', 'Climate', 'Natural Resources', 'History', 'Legends'] },
    myth: { name: 'Myth / Legend', icon: 'lore', fields: [
      'Summary', 'Historical Basis', 'Variations & Mutation', 'Cultural Reception'] },
    ritual: { name: 'Ritual / Tradition', icon: 'scroll', fields: [
      'Origin', 'Execution', 'Components & Tools', 'Participants', 'Observance'] },
    language: { name: 'Language', icon: 'scroll', fields: [
      'Writing System', 'Phonology', 'Common Phrases', 'Speakers', 'Dialects'] },
    plain: { name: 'Plain Article', icon: 'lore', fields: ['Content'] },
  };
  const TEMPLATE_IDS = Object.keys(TEMPLATES);

  const VISIBILITY = [
    { value: 'public',     label: 'Public — anyone can read' },
    { value: 'subscriber', label: 'Subscribers — followers only' },
    { value: 'private',    label: 'Private — studio only' },
  ];

  function WorldBible() {
    const [articles, setArticles] = window.useEntities('articles');
    const [cats, setCats] = window.useEntities('articleCategories');
    const [openId, setOpenId] = useState(null);
    const [q, setQ] = useState('');
    const [catFilter, setCatFilter] = useState('All');
    const [newOpen, setNewOpen] = useState(false);
    const U = UI();

    const live = useMemo(() => (articles || []).filter(a => a && !a._deleted), [articles]);
    const liveCats = (cats || []).filter(c => c && !c._deleted);

    const shown = live.filter(a => {
      if (catFilter !== 'All' && a.category !== catFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return (a.title || '').toLowerCase().includes(s)
          || (a.excerpt || '').toLowerCase().includes(s)
          || (a.tags || []).some(t => t.toLowerCase().includes(s));
    });

    const open = live.find(a => a.id === openId) || null;
    const update = (id, patch) => setArticles((articles || []).map(a => a.id === id ? { ...a, ...patch } : a));

    if (open) return <ArticleEditor article={open} update={update}
      onBack={() => setOpenId(null)} cats={liveCats}
      onDelete={() => { update(open.id, { _deleted: true }); setOpenId(null); }}/>;

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">World Bible</h1>
            <div className="page-sub">{live.length} article{live.length === 1 ? '' : 's'} · {liveCats.length} categories</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-gold" onClick={() => setNewOpen(true)}>+ New article</button>
          </div>
        </div>

        <div className="asset-bar">
          <input className="field-input" placeholder="Search articles…" value={q}
            onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }}/>
          <div className="chip-row">
            <span className={`chip ${catFilter === 'All' ? 'on' : ''}`} onClick={() => setCatFilter('All')}>All</span>
            {liveCats.map(c => (
              <span key={c.id} className={`chip ${catFilter === c.name ? 'on' : ''}`}
                onClick={() => setCatFilter(c.name)}>{c.name}</span>
            ))}
            <span className="chip" onClick={() => {
              const name = prompt('New category name');
              if (name && name.trim()) setCats((cats || []).concat({
                id: window.makeId ? window.makeId() : 'cat_' + Date.now(), name: name.trim() }));
            }}>+ category</span>
          </div>
        </div>

        {live.length === 0 ? (
          <U.EmptyState
            title="The bible is empty"
            body="Articles are the backbone of the world. Pick a template — Character, Settlement, Species, Myth — and it will ask you the right questions for that kind of entry."
            action={<button className="btn btn-gold" onClick={() => setNewOpen(true)}>Write the first article</button>}/>
        ) : (
          <div className="wb-grid">
            {shown.map(a => {
              const t = TEMPLATES[a.template] || TEMPLATES.plain;
              const secrets = (a.secrets || []).length;
              return (
                <div key={a.id} className="wb-card" onClick={() => setOpenId(a.id)}>
                  {a.cover && a.cover.dataUrl && <div className="wb-card-cover"><img src={a.cover.dataUrl} alt=""/></div>}
                  <div className="wb-card-body">
                    <div className="wb-card-kind">{t.name}</div>
                    <div className="wb-card-title">{a.title}</div>
                    {a.excerpt && <div className="wb-card-ex">{a.excerpt}</div>}
                    <div className="wb-card-foot">
                      <span className={`wb-vis wb-vis-${a.visibility}`}>{a.visibility}</span>
                      {a.category && <span className="wos-dim">{a.category}</span>}
                      {secrets > 0 && <span className="wb-secret-count">{secrets} secret{secrets === 1 ? '' : 's'}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {shown.length === 0 && <div className="wos-dim" style={{ padding: 20 }}>Nothing matches that search.</div>}
          </div>
        )}

        <NewArticleModal open={newOpen} onClose={() => setNewOpen(false)} cats={liveCats}
          onCreate={(a) => { setArticles((articles || []).concat(a)); setNewOpen(false); setOpenId(a.id); }}/>
      </div>
    );
  }

  function NewArticleModal({ open, onClose, onCreate, cats }) {
    const [title, setTitle] = useState('');
    const [template, setTemplate] = useState('character');
    const [category, setCategory] = useState('');
    const U = UI();
    const create = () => {
      if (!title.trim()) return;
      const t = TEMPLATES[template];
      onCreate({
        id: window.makeId ? window.makeId() : 'art_' + Date.now(),
        title: title.trim(), template, category, visibility: 'private',
        excerpt: '', cover: null, tags: [], links: [], secrets: [],
        body: t.fields.reduce((o, f) => (o[f] = '', o), {}),
        createdAt: new Date().toISOString(),
      });
      setTitle(''); setCategory('');
    };
    return (
      <U.Modal open={open} title="New article" onClose={onClose}>
        <U.Field label="Title">
          <U.Text value={title} onChange={e => setTitle(e.target.value)} placeholder="Aurel of the Ninth Gate"/>
        </U.Field>
        <U.Field label="Template">
          <U.Select value={template} onChange={e => setTemplate(e.target.value)}
            options={TEMPLATE_IDS.map(id => ({ value: id, label: TEMPLATES[id].name }))}/>
        </U.Field>
        <div className="wb-tpl-preview">
          Sections: {TEMPLATES[template].fields.join(' · ')}
        </div>
        <U.Field label="Category">
          <U.Select value={category} onChange={e => setCategory(e.target.value)}
            options={[{ value: '', label: '— none —' }].concat(cats.map(c => ({ value: c.name, label: c.name })))}/>
        </U.Field>
        <div className="wos-modal-actions">
          <button className="btn btn-gold" disabled={!title.trim()} onClick={create}>Create article</button>
        </div>
      </U.Modal>
    );
  }

  function ArticleEditor({ article, update, onBack, onDelete, cats }) {
    const U = UI();
    const t = TEMPLATES[article.template] || TEMPLATES.plain;
    const setBody = (field, v) => update(article.id, { body: { ...(article.body || {}), [field]: v } });

    const addSecret = () => update(article.id, {
      secrets: (article.secrets || []).concat({
        id: window.makeId ? window.makeId() : 'sec_' + Date.now(),
        title: 'New secret', body: '', level: 'studio',
      }),
    });
    const setSecret = (id, patch) => update(article.id, {
      secrets: (article.secrets || []).map(s => s.id === id ? { ...s, ...patch } : s),
    });
    const dropSecret = (id) => update(article.id, {
      secrets: (article.secrets || []).filter(s => s.id !== id),
    });

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <button className="btn btn-ghost" onClick={onBack}>← World Bible</button>
            <h1 className="page-title" style={{ marginTop: 8 }}>{article.title}</h1>
            <div className="page-sub">{t.name}</div>
          </div>
          <div className="page-actions">
            <select className="field-select" style={{ width: 220 }} value={article.visibility}
              onChange={e => update(article.id, { visibility: e.target.value })}>
              {VISIBILITY.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div className="wb-editor">
          <div className="wb-main">
            <div className="panel"><div className="panel-body">
              <U.Field label="Title">
                <U.Text value={article.title} onChange={e => update(article.id, { title: e.target.value })}/>
              </U.Field>
              <U.Field label="Excerpt — the one-line summary shown in listings">
                <U.Text value={article.excerpt || ''} onChange={e => update(article.id, { excerpt: e.target.value })}/>
              </U.Field>
            </div></div>

            {t.fields.map(f => (
              <div className="panel" key={f} style={{ marginTop: 12 }}>
                <div className="panel-body">
                  <U.Field label={f}>
                    <U.Area value={(article.body || {})[f] || ''} onChange={e => setBody(f, e.target.value)}
                      style={{ minHeight: 110 }} placeholder={`${f}…`}/>
                  </U.Field>
                </div>
              </div>
            ))}

            <div className="panel wb-secrets" style={{ marginTop: 12 }}>
              <div className="panel-body">
                <div className="wos-side-head">Secrets</div>
                <div className="wos-dim" style={{ fontSize: 13, marginBottom: 10 }}>
                  Kept out of anything a player reads, but attached to the article for the studio.
                </div>
                {(article.secrets || []).map(s => (
                  <div key={s.id} className="wb-secret">
                    <input className="field-input" value={s.title}
                      onChange={e => setSecret(s.id, { title: e.target.value })}/>
                    <textarea className="field-area" value={s.body}
                      onChange={e => setSecret(s.id, { body: e.target.value })}
                      placeholder="What is actually going on here…"/>
                    <div className="wb-secret-foot">
                      <select className="field-select" value={s.level}
                        onChange={e => setSecret(s.id, { level: e.target.value })} style={{ maxWidth: 200 }}>
                        <option value="studio">Studio only</option>
                        <option value="gm">GM / campaign lead</option>
                        <option value="player">Revealed to players</option>
                      </select>
                      <button className="btn btn-ghost" onClick={() => dropSecret(s.id)}>Remove</button>
                    </div>
                  </div>
                ))}
                <button className="btn" onClick={addSecret}>+ Add secret</button>
              </div>
            </div>
          </div>

          <aside className="wb-side">
            <div className="panel"><div className="panel-body">
              <div className="wos-side-head">Cover image</div>
              <U.ImageDrop value={article.cover} onChange={v => update(article.id, { cover: v })}
                preset="art" height={150} label="Drop a cover"/>
            </div></div>
            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <div className="wos-side-head">Filing</div>
              <U.Field label="Category">
                <U.Select value={article.category || ''} onChange={e => update(article.id, { category: e.target.value })}
                  options={[{ value: '', label: '— none —' }].concat(cats.map(c => ({ value: c.name, label: c.name })))}/>
              </U.Field>
              <U.Field label="Tags">
                <U.TagInput value={article.tags || []} onChange={v => update(article.id, { tags: v })}/>
              </U.Field>
              <U.Field label="Linked to">
                <U.EntityLink value={article.links || []} onChange={v => update(article.id, { links: v })}/>
              </U.Field>
            </div></div>
            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <button className="btn btn-ghost" onClick={onDelete}>Delete article</button>
            </div></div>
          </aside>
        </div>
      </div>
    );
  }

  window.WorldBible = WorldBible;

  window.registerWorldOS({
    id: 'worldBible',
    nav: { section: 'World OS', item: { id: 'worldBible', label: 'World Bible', icon: 'lore', badge: null } },
    routes: { worldBible: () => <WorldBible/> },
    collections: [['articles', 'WORLD_ARTICLES'], ['articleCategories', 'WORLD_ARTICLE_CATS']],
    styles: `
      .wb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
      .wb-card{border:1px solid var(--rule);border-radius:var(--r-md);overflow:hidden;background:var(--parchment-2);cursor:pointer;transition:border-color .15s,transform .15s}
      .wb-card:hover{border-color:var(--gold-deep);transform:translateY(-2px)}
      .wb-card-cover{height:120px;overflow:hidden;background:var(--parchment-3)}
      .wb-card-cover img{width:100%;height:100%;object-fit:cover}
      .wb-card-body{padding:12px 14px}
      .wb-card-kind{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
      .wb-card-title{font-family:var(--display);font-size:17px;color:var(--ink);margin:3px 0 5px}
      .wb-card-ex{font-size:13px;color:var(--ink-dim);line-height:1.5}
      .wb-card-foot{display:flex;gap:10px;align-items:center;margin-top:10px;font-size:11px;flex-wrap:wrap}
      .wb-vis{padding:1px 8px;border-radius:99px;border:1px solid var(--rule);text-transform:uppercase;letter-spacing:.14em;font-size:9px}
      .wb-vis-public{color:var(--verdant);border-color:var(--verdant)}
      .wb-vis-subscriber{color:var(--tide);border-color:var(--tide)}
      .wb-vis-private{color:var(--ink-faint)}
      .wb-secret-count{color:var(--aether)}
      .wb-tpl-preview{font-size:12px;color:var(--ink-faint);background:var(--parchment-3);border:1px solid var(--rule);border-radius:var(--r-sm);padding:8px 10px;margin-bottom:12px;line-height:1.6}
      .wb-editor{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start}
      .wb-secrets{border-color:var(--aether)}
      .wb-secret{border:1px solid var(--rule);border-radius:var(--r-sm);padding:10px;margin-bottom:10px;background:var(--parchment-3);display:flex;flex-direction:column;gap:8px}
      .wb-secret-foot{display:flex;gap:8px;align-items:center}
      @media (max-width:1100px){.wb-editor{grid-template-columns:1fr}}
    `,
  });
})();
