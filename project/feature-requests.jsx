/* ============================================================================
   FEATURE REQUESTS — players ask, staff answer
   A sibling of the Bug Tracker: a player describes something they want in
   Mythic Spellbook, attaches screenshots or a sketch, and the studio triages
   it and replies.

   Two deliberate differences from bugs:
   · Votes. The value of a request is how many players want it, so everyone
     can back one. Votes live in public.feature_votes, one row per player per
     request — they cannot sit inside the request record the way bug votes do,
     because only staff may update a request.
   · A public-facing status ladder (submitted → under review → planned → in
     progress → shipped), because "will this happen?" is the question players
     actually care about.

   Per-row storage and surfaced save errors both come straight from the bug
   tracker's history: a single shared collection silently lost every member's
   report, and nothing said so.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const sb = () => window.supabaseClient;

  const FR_CATEGORIES = [
    { id: 'gameplay',  name: 'Gameplay',          color: '#c45a2f' },
    { id: 'cards',     name: 'Cards / Rules',     color: '#c9a14a' },
    { id: 'content',   name: 'New content',       color: '#a878d4' },
    { id: 'ui',        name: 'UI / Interface',    color: '#6c92d4' },
    { id: 'social',    name: 'Social / Guilds',   color: '#7fc4e6' },
    { id: 'economy',   name: 'Economy / Shop',    color: '#ff7755' },
    { id: 'qol',       name: 'Quality of life',   color: '#7a9a52' },
    { id: 'events',    name: 'Events / Modes',    color: '#ffd166' },
    { id: 'other',     name: 'Other',             color: '#9aa0a6' },
  ];
  const FR_STATUSES = [
    { id: 'submitted',   name: 'Submitted',    color: '#9aa0a6' },
    { id: 'reviewing',   name: 'Under review', color: '#6c92d4' },
    { id: 'planned',     name: 'Planned',      color: '#c9a14a' },
    { id: 'in-progress', name: 'In progress',  color: '#a878d4' },
    { id: 'shipped',     name: 'Shipped',      color: '#3fb950' },
    { id: 'declined',    name: 'Not planned',  color: '#7d8590' },
    { id: 'duplicate',   name: 'Duplicate',    color: '#5a4a6a' },
  ];
  const catOf = (id) => FR_CATEGORIES.find(c => c.id === id) || FR_CATEGORIES[FR_CATEGORIES.length - 1];
  const statusOf = (id) => FR_STATUSES.find(s => s.id === id) || FR_STATUSES[0];

  function ago(ts) {
    const t = typeof ts === 'number' ? ts : Date.parse(ts || '');
    if (!t) return '—';
    const d = Date.now() - t;
    if (d < 60000) return 'just now';
    if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
    if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
    return Math.floor(d / 86400000) + 'd ago';
  }

  /* ── store ──────────────────────────────────────────────────────────── */
  function useFeatureRequests() {
    const [items, setItems] = useState([]);
    const [counts, setCounts] = useState({});
    const [mine, setMine] = useState(() => new Set());
    const [status, setStatus] = useState({ loading: true, saving: false, error: null });
    // latest list, readable outside a setState updater (see update below)
    const itemsRef = useRef(items);
    itemsRef.current = items;

    const uid = () => (window.CURRENT_USER && window.CURRENT_USER.id) || null;

    const load = useCallback(async (opts) => {
      const keepError = !!(opts && opts.keepError);
      if (!sb()) {
        setStatus({ loading: false, saving: false, error: 'Not connected — sign in to see feature requests.' });
        return;
      }
      try {
        const me = uid();
        const [reqs, tallies, votes] = await Promise.all([
          sb().from('feature_requests').select('*').order('created_at', { ascending: false }),
          sb().from('feature_vote_counts').select('*'),
          // staff can read every vote, so filter to our own explicitly
          me ? sb().from('feature_votes').select('request_id').eq('user_id', me)
             : Promise.resolve({ data: [], error: null }),
        ]);
        if (reqs.error) throw reqs.error;
        if (tallies.error) throw tallies.error;
        if (votes.error) throw votes.error;

        setItems((reqs.data || []).map(r => ({
          ...(r.data || {}), id: r.id, createdAt: r.created_at, _createdBy: r.created_by,
        })));
        const c = {};
        for (const t of (tallies.data || [])) c[t.request_id] = t.votes;
        setCounts(c);
        setMine(new Set((votes.data || []).map(v => v.request_id)));
        // a reconcile after a failed write must not erase the explanation
        setStatus(s => ({ loading: false, saving: false, error: keepError ? s.error : null }));
      } catch (e) {
        setStatus({ loading: false, saving: false, error: 'Could not load requests: ' + (e.message || e) });
      }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
      const onVis = () => { if (!document.hidden) load(); };
      document.addEventListener('visibilitychange', onVis);
      return () => document.removeEventListener('visibilitychange', onVis);
    }, [load]);

    const fail = async (message) => {
      await load({ keepError: true });
      setStatus(s => ({ ...s, saving: false, error: message }));
    };

    const strip = (r) => {
      const { id, createdAt, _createdBy, ...data } = r;
      return data;
    };

    const create = useCallback(async (req) => {
      setItems(list => [req, ...list]);                   // optimistic
      setStatus(s => ({ ...s, saving: true, error: null }));
      const { error } = await sb().from('feature_requests')
        .insert({ id: req.id, data: strip(req), created_by: uid() });
      if (error) return fail('Your request "' + req.title + '" was not saved: ' + error.message);
      setStatus(s => ({ ...s, saving: false }));
      return true;
    }, [load]);

    const update = useCallback(async (id, patch) => {
      // Read the record from a ref, never from inside a setState updater: React
      // 18 may defer the updater to the next render, so a value captured there
      // is still null at this point and the save silently never happens. That
      // is exactly how staff status changes failed in testing.
      const current = itemsRef.current.find(r => r.id === id);
      if (!current) return;
      const next = { ...current, ...patch, updated: Date.now() };
      setItems(list => list.map(r => (r.id === id ? next : r)));
      setStatus(s => ({ ...s, saving: true, error: null }));
      const { error } = await sb().from('feature_requests').update({ data: strip(next) }).eq('id', id);
      if (error) return fail('Change not saved: ' + error.message);
      setStatus(s => ({ ...s, saving: false }));
    }, [load]);

    const remove = useCallback(async (id) => {
      setItems(list => list.filter(r => r.id !== id));
      const { error } = await sb().from('feature_requests').delete().eq('id', id);
      if (error) return fail('Could not delete: ' + error.message);
    }, [load]);

    const toggleVote = useCallback(async (id) => {
      const me = uid();
      if (!me) { setStatus(s => ({ ...s, error: 'Sign in to vote.' })); return; }
      const had = mine.has(id);
      // optimistic, then confirm
      setMine(prev => { const n = new Set(prev); had ? n.delete(id) : n.add(id); return n; });
      setCounts(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + (had ? -1 : 1)) }));
      const res = had
        ? await sb().from('feature_votes').delete().eq('request_id', id).eq('user_id', me)
        : await sb().from('feature_votes').insert({ request_id: id, user_id: me });
      // a duplicate vote (e.g. two tabs) is already the state we wanted
      if (res.error && !/duplicate key/i.test(res.error.message || '')) {
        return fail('Your vote was not recorded: ' + res.error.message);
      }
    }, [mine, load]);

    return { items, counts, mine, status, create, update, remove, toggleVote, reload: load };
  }

  /* ── page ───────────────────────────────────────────────────────────── */
  function FeatureRequests() {
    const U = window.WorldOSUI;
    const store = useFeatureRequests();
    const { items, counts, mine, status } = store;
    const isStaff = !window.IS_VIEWER;

    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('open');
    const [catFilter, setCatFilter] = useState('all');
    const [sort, setSort] = useState('top');
    const [openId, setOpenId] = useState(null);
    const [newOpen, setNewOpen] = useState(false);

    const OPEN_STATES = ['submitted', 'reviewing', 'planned', 'in-progress'];

    const shown = useMemo(() => {
      const s = q.trim().toLowerCase();
      let list = items.filter(r => {
        if (statusFilter === 'open' && !OPEN_STATES.includes(r.status || 'submitted')) return false;
        if (statusFilter !== 'open' && statusFilter !== 'all' && (r.status || 'submitted') !== statusFilter) return false;
        if (catFilter !== 'all' && r.category !== catFilter) return false;
        if (!s) return true;
        return (r.title || '').toLowerCase().includes(s) || (r.description || '').toLowerCase().includes(s);
      });
      list = list.slice().sort((a, b) => sort === 'top'
        ? ((counts[b.id] || 0) - (counts[a.id] || 0)) || (Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
        : (Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)));
      return list;
    }, [items, counts, q, statusFilter, catFilter, sort]);

    const tally = (id) => items.filter(r => (r.status || 'submitted') === id).length;
    const open = items.find(r => r.id === openId) || null;

    return (
      <div className="page">
        {status.error && (
          <div className="bug-save-error"><b>Not saved.</b> {status.error}</div>
        )}

        <div className="page-head">
          <div>
            <h1 className="page-title">Feature Requests</h1>
            <div className="page-sub">
              {status.loading ? 'loading…' : <>
                {status.saving && <span style={{ color: 'var(--gold)' }}>saving… </span>}
                {items.length} request{items.length === 1 ? '' : 's'}
                {' · '}<span style={{ color: statusOf('planned').color }}>{tally('planned')} planned</span>
                {' · '}<span style={{ color: statusOf('in-progress').color }}>{tally('in-progress')} in progress</span>
                {' · '}<span style={{ color: statusOf('shipped').color }}>{tally('shipped')} shipped</span>
              </>}
            </div>
          </div>
          <div className="page-actions">
            <input className="field-input" placeholder="Search requests…" value={q}
              onChange={e => setQ(e.target.value)} style={{ maxWidth: 220 }}/>
            <button className="btn btn-gold" onClick={() => setNewOpen(true)}>+ Request a feature</button>
          </div>
        </div>

        <div className="fr-bar">
          <div className="chip-row">
            {[{ id: 'open', name: 'Open' }, { id: 'all', name: 'All' }].concat(FR_STATUSES).map(s => (
              <span key={s.id} className={'chip ' + (statusFilter === s.id ? 'on' : '')}
                onClick={() => setStatusFilter(s.id)}>{s.name}</span>
            ))}
          </div>
          <div className="fr-bar-right">
            <select className="field-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="all">All categories</option>
              {FR_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="fr-sort">
              <button className={'btn ' + (sort === 'top' ? 'btn-gold' : '')} onClick={() => setSort('top')}>Most wanted</button>
              <button className={'btn ' + (sort === 'new' ? 'btn-gold' : '')} onClick={() => setSort('new')}>Newest</button>
            </div>
          </div>
        </div>

        {!status.loading && items.length === 0 ? (
          <U.EmptyState
            title="No requests yet"
            body="Tell the studio what you want to see in Mythic Spellbook. Others can back your idea, and the most-wanted requests rise to the top."
            action={<button className="btn btn-gold" onClick={() => setNewOpen(true)}>Make the first request</button>}/>
        ) : (
          <div className="fr-list">
            {shown.map(r => {
              const c = catOf(r.category), st = statusOf(r.status);
              const voted = mine.has(r.id);
              return (
                <div key={r.id} className="fr-card" onClick={() => setOpenId(r.id)}>
                  <button className={'fr-vote ' + (voted ? 'on' : '')}
                    title={voted ? 'Remove your vote' : 'I want this'}
                    onClick={e => { e.stopPropagation(); store.toggleVote(r.id); }}>
                    <span className="fr-vote-arrow">▲</span>
                    <span className="fr-vote-n">{counts[r.id] || 0}</span>
                  </button>
                  <div className="fr-card-body">
                    <div className="fr-card-top">
                      <span className="fr-status" style={{ color: st.color, borderColor: st.color }}>{st.name}</span>
                      <span className="fr-cat" style={{ color: c.color }}>{c.name}</span>
                    </div>
                    <div className="fr-title">{r.title}</div>
                    {r.description && <div className="fr-desc">{r.description}</div>}
                    <div className="fr-meta">
                      <span>{r.requester || 'A player'}</span>
                      <span>{ago(r.createdAt || r.created)}</span>
                      {(r.attachments || []).length > 0 && <span>{r.attachments.length} attachment{r.attachments.length === 1 ? '' : 's'}</span>}
                      {(r.responses || []).length > 0 && <span className="fr-replied">studio replied</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {!status.loading && shown.length === 0 && (
              <div className="wos-dim" style={{ padding: 20 }}>No requests match those filters.</div>
            )}
          </div>
        )}

        <U.Modal open={newOpen} title="Request a feature" onClose={() => setNewOpen(false)} wide>
          <NewRequestForm onSubmit={async (req) => {
            const ok = await store.create(req);
            if (ok) { setNewOpen(false); setOpenId(req.id); }
          }}/>
        </U.Modal>

        <U.Modal open={!!open} title={open ? open.title : ''} onClose={() => setOpenId(null)} wide>
          {open && <RequestDetail req={open} store={store} isStaff={isStaff}
            onDeleted={() => setOpenId(null)}/>}
        </U.Modal>
      </div>
    );
  }

  function NewRequestForm({ onSubmit }) {
    const U = window.WorldOSUI;
    const profile = window.CURRENT_PROFILE || {};
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('gameplay');
    const [description, setDescription] = useState('');
    const [why, setWhy] = useState('');
    const [atts, setAtts] = useState([]);
    const [busy, setBusy] = useState(false);

    const ready = title.trim().length >= 4 && description.trim().length >= 10;

    return (
      <div className="fr-form">
        <U.Field label="What should we add?">
          <U.Text value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
            placeholder="Trade cards directly with friends"/>
        </U.Field>
        <U.Field label="Category">
          <U.Select value={category} onChange={e => setCategory(e.target.value)}
            options={FR_CATEGORIES.map(c => ({ value: c.id, label: c.name }))}/>
        </U.Field>
        <U.Field label="Describe it">
          <U.Area value={description} onChange={e => setDescription(e.target.value)}
            placeholder="How would it work? What would you do with it?" style={{ minHeight: 110 }}/>
        </U.Field>
        <U.Field label="Why would it make the game better? (optional)">
          <U.Area value={why} onChange={e => setWhy(e.target.value)}
            placeholder="What problem does it solve, or what would it let you do that you can't now?"/>
        </U.Field>
        <U.Field label={'Screenshots, mockups or video (optional)' + (atts.length ? ' · ' + atts.length + ' attached' : '')}>
          {window.BugAttachments
            ? <window.BugAttachments value={atts} onChange={setAtts}/>
            : <div className="wos-dim">Attachments unavailable.</div>}
        </U.Field>
        <div className="wos-modal-actions">
          {!ready && <span className="wos-dim" style={{ fontSize: 12, marginRight: 'auto' }}>
            Give it a title and a sentence or two of description.
          </span>}
          <button className="btn btn-gold" disabled={!ready || busy} onClick={async () => {
            setBusy(true);
            await onSubmit({
              id: 'fr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
              title: title.trim(), category, description: description.trim(), why: why.trim(),
              status: 'submitted', attachments: atts, responses: [],
              requester: profile.full_name || profile.username || (window.CURRENT_USER && window.CURRENT_USER.email || '').split('@')[0] || 'A player',
              created: Date.now(),
            });
            setBusy(false);
          }}>{busy ? 'Sending…' : 'Submit request'}</button>
        </div>
      </div>
    );
  }

  function RequestDetail({ req, store, isStaff, onDeleted }) {
    const [reply, setReply] = useState('');
    const c = catOf(req.category), st = statusOf(req.status);
    const voted = store.mine.has(req.id);

    const postReply = () => {
      const text = reply.trim();
      if (!text) return;
      const profile = window.CURRENT_PROFILE || {};
      store.update(req.id, {
        responses: (req.responses || []).concat({
          id: 'rsp-' + Date.now().toString(36),
          by: profile.full_name || 'Hidn Studios', text, at: Date.now(), staff: true,
        }),
      });
      setReply('');
    };

    return (
      <div className="fr-detail">
        <div className="fr-detail-main">
          <div className="fr-card-top" style={{ marginBottom: 10 }}>
            <span className="fr-status" style={{ color: st.color, borderColor: st.color }}>{st.name}</span>
            <span className="fr-cat" style={{ color: c.color }}>{c.name}</span>
            <span className="wos-dim" style={{ fontSize: 12 }}>by {req.requester || 'a player'} · {ago(req.createdAt || req.created)}</span>
          </div>

          <p className="fr-body">{req.description}</p>
          {req.why && <>
            <div className="field-label" style={{ marginTop: 14 }}>Why it matters</div>
            <p className="fr-body">{req.why}</p>
          </>}

          <div className="field-label" style={{ marginTop: 16 }}>
            Attachments{(req.attachments || []).length ? ' · ' + req.attachments.length : ''}
          </div>
          {window.BugAttachments
            ? <window.BugAttachments value={req.attachments || []}
                onChange={v => store.update(req.id, { attachments: v })} readOnly={!isStaff}/>
            : null}

          <div className="field-label" style={{ marginTop: 18 }}>Studio responses · {(req.responses || []).length}</div>
          {(req.responses || []).length === 0 && <div className="wos-dim" style={{ fontSize: 13 }}>No reply yet.</div>}
          {(req.responses || []).map(r => (
            <div key={r.id} className="fr-response">
              <div className="fr-response-head"><b>{r.by}</b> <span className="wos-dim">{ago(r.at)}</span></div>
              <div>{r.text}</div>
            </div>
          ))}
          {isStaff && (
            <div style={{ marginTop: 10 }}>
              <textarea className="field-area" value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Reply to the player — what happens next with this?"/>
              <button className="btn" style={{ marginTop: 6 }} onClick={postReply} disabled={!reply.trim()}>Post reply</button>
            </div>
          )}
        </div>

        <aside className="fr-detail-side">
          <button className={'fr-vote big ' + (voted ? 'on' : '')} onClick={() => store.toggleVote(req.id)}>
            <span className="fr-vote-arrow">▲</span>
            <span className="fr-vote-n">{store.counts[req.id] || 0}</span>
            <span className="fr-vote-label">{voted ? 'You want this' : 'I want this'}</span>
          </button>

          {isStaff && (
            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <div className="wos-side-head">Triage</div>
              <div className="field">
                <label className="field-label">Status</label>
                <select className="field-select" value={req.status || 'submitted'}
                  onChange={e => store.update(req.id, { status: e.target.value })}>
                  {FR_STATUSES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Category</label>
                <select className="field-select" value={req.category}
                  onChange={e => store.update(req.id, { category: e.target.value })}>
                  {FR_CATEGORIES.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
              <button className="btn btn-ghost" onClick={() => {
                if (!window.confirm('Delete this request? Its votes go with it.')) return;
                store.remove(req.id); onDeleted();
              }}>Delete request</button>
            </div></div>
          )}
        </aside>
      </div>
    );
  }

  window.FeatureRequests = FeatureRequests;

  window.registerWorldOS({
    id: 'featureRequests',
    // sits beside the Bug Tracker, which is where players already go to talk to us
    nav: { section: 'Team', item: { id: 'features', label: 'Feature Requests', icon: 'star', badge: null } },
    routes: { features: () => <FeatureRequests/> },
    collections: [],
    styles: `
      .fr-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
      .fr-bar .chip.on{border-color:var(--gold-deep);color:var(--gold-bright);background:rgba(255,171,0,.10)}
      .fr-bar-right{display:flex;gap:8px;align-items:center}
      .fr-bar-right .field-select{width:auto}
      .fr-sort{display:flex;gap:4px}
      .fr-list{display:flex;flex-direction:column;gap:10px}
      .fr-card{display:flex;gap:14px;align-items:flex-start;border:1px solid var(--rule);border-radius:var(--r-md);
        background:var(--parchment-2);padding:12px 14px;cursor:pointer;transition:border-color .15s}
      .fr-card:hover{border-color:var(--gold-deep)}
      .fr-vote{flex:none;width:56px;border:1px solid var(--rule-strong);border-radius:var(--r-sm);background:var(--parchment-3);
        color:var(--ink-dim);display:flex;flex-direction:column;align-items:center;padding:6px 0;cursor:pointer;
        transition:border-color .15s,color .15s,background .15s;font-family:var(--body)}
      .fr-vote:hover{border-color:var(--gold);color:var(--gold-bright)}
      .fr-vote.on{border-color:var(--gold);color:#17150e;background:var(--gold)}
      .fr-vote-arrow{font-size:12px;line-height:1}
      .fr-vote-n{font-family:var(--display);font-size:18px;font-weight:600;line-height:1.2}
      .fr-vote.big{width:100%;flex-direction:row;justify-content:center;gap:10px;padding:12px}
      .fr-vote-label{font-size:13px}
      .fr-card-body{flex:1;min-width:0}
      .fr-card-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .fr-status{font-size:10px;letter-spacing:.16em;text-transform:uppercase;border:1px solid;border-radius:99px;padding:1px 8px}
      .fr-cat{font-size:11px;letter-spacing:.08em}
      .fr-title{font-family:var(--display);font-size:17px;color:var(--ink);margin:5px 0 3px}
      .fr-desc{font-size:13px;color:var(--ink-dim);line-height:1.5;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .fr-meta{display:flex;gap:12px;margin-top:6px;font-size:11px;color:var(--ink-faint);flex-wrap:wrap}
      .fr-replied{color:var(--verdant)}
      .fr-detail{display:grid;grid-template-columns:1fr 260px;gap:20px;align-items:start}
      .fr-body{font-size:14px;color:var(--ink);line-height:1.65;white-space:pre-wrap;margin:0}
      .fr-response{border:1px solid var(--rule);border-left:3px solid var(--verdant);border-radius:var(--r-sm);
        padding:8px 12px;margin-top:8px;background:var(--parchment-3);font-size:13px;color:var(--ink);line-height:1.55}
      .fr-response-head{margin-bottom:3px;font-size:12px}
      .fr-form .field{margin-bottom:12px}
      @media (max-width:900px){.fr-detail{grid-template-columns:1fr}}
    `,
  });
})();
