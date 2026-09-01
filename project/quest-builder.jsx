/* ============================================================================
   QUEST BUILDER — hooks, objectives and outcomes
   A quest is the thing that turns a world into play: a hook, a chain of
   objectives, and outcomes that differ depending on what the party actually
   did. Every step can point at the people, places and things already in the
   studio, so a quest reads as part of the world rather than a note beside it.
   ========================================================================== */

(function () {
  'use strict';
  const { useState, useMemo } = React;
  const UI = () => window.WorldOSUI;

  const STATUS = [
    { value: 'idea',    label: 'Idea' },
    { value: 'draft',   label: 'Draft' },
    { value: 'ready',   label: 'Ready to run' },
    { value: 'active',  label: 'In play' },
    { value: 'done',    label: 'Completed' },
  ];
  const STATUS_COLOR = { idea: '#8a8a8a', draft: '#9dbfcf', ready: '#ffab00', active: '#138c64', done: '#ab763e' };

  const OBJECTIVE_KINDS = [
    { value: 'goto',    label: 'Travel to' },
    { value: 'talk',    label: 'Speak with' },
    { value: 'obtain',  label: 'Obtain' },
    { value: 'defeat',  label: 'Defeat' },
    { value: 'protect', label: 'Protect' },
    { value: 'solve',   label: 'Solve' },
    { value: 'choose',  label: 'Make a choice' },
  ];

  function QuestBuilder() {
    const [quests, setQuests] = window.useEntities('quests');
    const [openId, setOpenId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [newOpen, setNewOpen] = useState(false);
    const U = UI();

    const live = useMemo(() => (quests || []).filter(q => q && !q._deleted), [quests]);
    const shown = statusFilter === 'All' ? live : live.filter(q => q.status === statusFilter);
    const update = (id, patch) => setQuests((quests || []).map(q => q.id === id ? { ...q, ...patch } : q));
    const open = live.find(q => q.id === openId) || null;

    if (open) return <QuestEditor quest={open} update={update} onBack={() => setOpenId(null)}
      onDelete={() => { update(open.id, { _deleted: true }); setOpenId(null); }}/>;

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Quest Builder</h1>
            <div className="page-sub">{live.length} quest{live.length === 1 ? '' : 's'}</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-gold" onClick={() => setNewOpen(true)}>+ New quest</button>
          </div>
        </div>

        <div className="asset-bar">
          <div className="chip-row">
            <span className={`chip ${statusFilter === 'All' ? 'on' : ''}`} onClick={() => setStatusFilter('All')}>All</span>
            {STATUS.map(s => (
              <span key={s.value} className={`chip ${statusFilter === s.value ? 'on' : ''}`}
                onClick={() => setStatusFilter(s.value)}>{s.label}</span>
            ))}
          </div>
        </div>

        {live.length === 0 ? (
          <U.EmptyState
            title="No quests yet"
            body="Start with a hook — the reason anyone cares — then chain objectives onto it. Each step can point at the heroes, factions, maps and items you have already built."
            action={<button className="btn btn-gold" onClick={() => setNewOpen(true)}>Write the first quest</button>}/>
        ) : (
          <div className="wb-grid">
            {shown.map(q => (
              <div key={q.id} className="quest-card" onClick={() => setOpenId(q.id)}>
                <div className="quest-status" style={{ color: STATUS_COLOR[q.status] || '#8a8a8a' }}>
                  {(STATUS.find(s => s.value === q.status) || {}).label || q.status}
                </div>
                <div className="quest-title">{q.title}</div>
                {q.hook && <div className="quest-hook">{q.hook}</div>}
                <div className="quest-meta">
                  <span>{(q.objectives || []).length} objective{(q.objectives || []).length === 1 ? '' : 's'}</span>
                  {(q.outcomes || []).length > 0 && <span>{q.outcomes.length} outcome{q.outcomes.length === 1 ? '' : 's'}</span>}
                  {q.level && <span className="wos-dim">{q.level}</span>}
                </div>
              </div>
            ))}
            {shown.length === 0 && <div className="wos-dim" style={{ padding: 20 }}>No quests with that status.</div>}
          </div>
        )}

        <U.Modal open={newOpen} title="New quest" onClose={() => setNewOpen(false)}>
          <NewQuestForm onCreate={(q) => {
            setQuests((quests || []).concat(q)); setNewOpen(false); setOpenId(q.id);
          }}/>
        </U.Modal>
      </div>
    );
  }

  function NewQuestForm({ onCreate }) {
    const [title, setTitle] = useState('');
    const [hook, setHook] = useState('');
    const U = UI();
    return (
      <>
        <U.Field label="Title">
          <U.Text value={title} onChange={e => setTitle(e.target.value)} placeholder="The Warden's Last Oath"/>
        </U.Field>
        <U.Field label="Hook — why would anyone take this on?">
          <U.Area value={hook} onChange={e => setHook(e.target.value)}
            placeholder="A gate that has not opened in four hundred years is glowing again…"/>
        </U.Field>
        <div className="wos-modal-actions">
          <button className="btn btn-gold" disabled={!title.trim()} onClick={() => onCreate({
            id: window.makeId ? window.makeId() : 'q_' + Date.now(),
            title: title.trim(), hook, status: 'idea', level: '', summary: '',
            objectives: [], outcomes: [], rewards: '', links: [],
            createdAt: new Date().toISOString(),
          })}>Create quest</button>
        </div>
      </>
    );
  }

  function QuestEditor({ quest, update, onBack, onDelete }) {
    const U = UI();
    const objectives = quest.objectives || [];
    const outcomes = quest.outcomes || [];

    const setObj = (id, patch) =>
      update(quest.id, { objectives: objectives.map(o => o.id === id ? { ...o, ...patch } : o) });
    const addObj = () => update(quest.id, {
      objectives: objectives.concat({
        id: window.makeId ? window.makeId() : 'o_' + Date.now(),
        kind: 'goto', text: '', optional: false, links: [],
      }),
    });
    const dropObj = (id) => update(quest.id, { objectives: objectives.filter(o => o.id !== id) });
    const moveObj = (i, d) => {
      const next = objectives.slice();
      const j = i + d;
      if (j < 0 || j >= next.length) return;
      [next[i], next[j]] = [next[j], next[i]];
      update(quest.id, { objectives: next });
    };

    const addOutcome = () => update(quest.id, {
      outcomes: outcomes.concat({
        id: window.makeId ? window.makeId() : 'oc_' + Date.now(),
        condition: '', result: '', changesWorld: false,
      }),
    });
    const setOutcome = (id, patch) =>
      update(quest.id, { outcomes: outcomes.map(o => o.id === id ? { ...o, ...patch } : o) });
    const dropOutcome = (id) => update(quest.id, { outcomes: outcomes.filter(o => o.id !== id) });

    return (
      <div className="page">
        <div className="page-head">
          <div>
            <button className="btn btn-ghost" onClick={onBack}>← Quests</button>
            <h1 className="page-title" style={{ marginTop: 8 }}>{quest.title}</h1>
            <div className="page-sub">{objectives.length} objective{objectives.length === 1 ? '' : 's'} · {outcomes.length} outcome{outcomes.length === 1 ? '' : 's'}</div>
          </div>
          <div className="page-actions">
            <select className="field-select" style={{ width: 180 }} value={quest.status}
              onChange={e => update(quest.id, { status: e.target.value })}>
              {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="wb-editor">
          <div className="wb-main">
            <div className="panel"><div className="panel-body">
              <U.Field label="Title">
                <U.Text value={quest.title} onChange={e => update(quest.id, { title: e.target.value })}/>
              </U.Field>
              <U.Field label="Hook">
                <U.Area value={quest.hook || ''} onChange={e => update(quest.id, { hook: e.target.value })}/>
              </U.Field>
              <U.Field label="Summary — what actually happens">
                <U.Area value={quest.summary || ''} onChange={e => update(quest.id, { summary: e.target.value })}/>
              </U.Field>
            </div></div>

            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <div className="wos-side-head">Objectives</div>
              {objectives.length === 0 && (
                <div className="wos-dim" style={{ fontSize: 13, marginBottom: 10 }}>
                  No steps yet. Objectives run in order; mark any of them optional.
                </div>
              )}
              {objectives.map((o, i) => (
                <div key={o.id} className="quest-obj">
                  <div className="quest-obj-num">{i + 1}</div>
                  <div className="quest-obj-main">
                    <div className="quest-obj-row">
                      <select className="field-select" style={{ maxWidth: 150 }} value={o.kind}
                        onChange={e => setObj(o.id, { kind: e.target.value })}>
                        {OBJECTIVE_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                      </select>
                      <input className="field-input" value={o.text} placeholder="…the Ninth Gate"
                        onChange={e => setObj(o.id, { text: e.target.value })}/>
                    </div>
                    <U.EntityLink value={o.links || []} onChange={v => setObj(o.id, { links: v })}/>
                    <label className="quest-opt">
                      <input type="checkbox" checked={!!o.optional}
                        onChange={e => setObj(o.id, { optional: e.target.checked })}/>
                      <span>Optional</span>
                    </label>
                  </div>
                  <div className="quest-obj-tools">
                    <button className="btn btn-ghost wos-mini" onClick={() => moveObj(i, -1)}>↑</button>
                    <button className="btn btn-ghost wos-mini" onClick={() => moveObj(i, 1)}>↓</button>
                    <button className="btn btn-ghost wos-mini" onClick={() => dropObj(o.id)}>×</button>
                  </div>
                </div>
              ))}
              <button className="btn" onClick={addObj}>+ Add objective</button>
            </div></div>

            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <div className="wos-side-head">Outcomes</div>
              <div className="wos-dim" style={{ fontSize: 13, marginBottom: 10 }}>
                What changes depending on how it ends. Mark the ones that alter the world so
                they are easy to find when the campaign moves on.
              </div>
              {outcomes.map(o => (
                <div key={o.id} className="quest-outcome">
                  <input className="field-input" value={o.condition} placeholder="If the party frees the warden…"
                    onChange={e => setOutcome(o.id, { condition: e.target.value })}/>
                  <textarea className="field-area" value={o.result} placeholder="…then the gate stays open and the Ashborn march."
                    onChange={e => setOutcome(o.id, { result: e.target.value })}/>
                  <div className="quest-outcome-foot">
                    <label className="quest-opt">
                      <input type="checkbox" checked={!!o.changesWorld}
                        onChange={e => setOutcome(o.id, { changesWorld: e.target.checked })}/>
                      <span>Changes the world</span>
                    </label>
                    <button className="btn btn-ghost wos-mini" onClick={() => dropOutcome(o.id)}>Remove</button>
                  </div>
                </div>
              ))}
              <button className="btn" onClick={addOutcome}>+ Add outcome</button>
            </div></div>
          </div>

          <aside className="wb-side">
            <div className="panel"><div className="panel-body">
              <div className="wos-side-head">Details</div>
              <U.Field label="Suggested level or difficulty">
                <U.Text value={quest.level || ''} onChange={e => update(quest.id, { level: e.target.value })}
                  placeholder="Tier 2 · 3–5 players"/>
              </U.Field>
              <U.Field label="Rewards">
                <U.Area value={quest.rewards || ''} onChange={e => update(quest.id, { rewards: e.target.value })}
                  placeholder="Coin, favour, an item, a secret…"/>
              </U.Field>
              <U.Field label="Involves">
                <U.EntityLink value={quest.links || []} onChange={v => update(quest.id, { links: v })}/>
              </U.Field>
            </div></div>
            <div className="panel" style={{ marginTop: 12 }}><div className="panel-body">
              <button className="btn btn-ghost" onClick={onDelete}>Delete quest</button>
            </div></div>
          </aside>
        </div>
      </div>
    );
  }

  window.QuestBuilder = QuestBuilder;

  window.registerWorldOS({
    id: 'questBuilder',
    nav: { section: 'World OS', item: { id: 'quests', label: 'Quest Builder', icon: 'check', badge: null } },
    routes: { quests: () => <QuestBuilder/> },
    collections: [['quests', 'WORLD_QUESTS']],
    styles: `
      .quest-card{border:1px solid var(--rule);border-radius:var(--r-md);background:var(--parchment-2);
        padding:14px 16px;cursor:pointer;transition:border-color .15s,transform .15s}
      .quest-card:hover{border-color:var(--gold-deep);transform:translateY(-2px)}
      .quest-status{font-size:10px;letter-spacing:.22em;text-transform:uppercase}
      .quest-title{font-family:var(--display);font-size:18px;color:var(--ink);margin:4px 0 6px}
      .quest-hook{font-size:13px;color:var(--ink-dim);line-height:1.55;
        display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      .quest-meta{display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--ink-faint);
        letter-spacing:.1em;text-transform:uppercase;flex-wrap:wrap}
      .quest-obj{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--rule);
        border-radius:var(--r-sm);padding:10px;margin-bottom:8px;background:var(--parchment-3)}
      .quest-obj-num{width:24px;height:24px;border-radius:50%;flex:none;display:grid;place-items:center;
        background:rgba(255,171,0,.14);color:var(--gold);font-size:12px;font-family:var(--mono)}
      .quest-obj-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
      .quest-obj-row{display:flex;gap:8px}
      .quest-obj-row .field-input{flex:1}
      .quest-obj-tools{display:flex;flex-direction:column;gap:2px}
      .quest-opt{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-dim);cursor:pointer}
      .quest-outcome{border:1px solid var(--rule);border-left:3px solid var(--verdant);
        border-radius:var(--r-sm);padding:10px;margin-bottom:8px;background:var(--parchment-3);
        display:flex;flex-direction:column;gap:8px}
      .quest-outcome-foot{display:flex;align-items:center;gap:12px}
      .quest-outcome-foot .wos-mini{margin-left:auto}
    `,
  });
})();
