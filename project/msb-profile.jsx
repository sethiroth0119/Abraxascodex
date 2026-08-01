// msb-profile.jsx — "Gaming Profiles"
// Connect a Mythic Spellbook (game) account to the Codex and show the player's
// balances (Cinder / Aza / Mythic Token), top deck, strongest unit + its kills,
// and win record. Also browse other players' public profiles.
//
// The game lives in a DIFFERENT Supabase project than the Codex, so this uses a
// SECOND client (distinct storageKey so the two sessions don't collide). All
// player data hangs off the `user_profiles` row (gems=Cinder, sovereigns=Aza,
// forge.userDecks=decks, units={id:{level,kills,wins}}, records={wins,...}) plus
// `mythic_balances.mt`. Browsing others needs public-read policies on the game
// DB (see supabase-msb-public-profiles.sql).

const MSB_URL  = 'https://ktsiasyjusesawtrwrjc.supabase.co';
const MSB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0c2lhc3lqdXNlc2F3dHJ3cmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDU5MjgsImV4cCI6MjA5NDIyMTkyOH0.fYpQFCs03ZE5AIv88S_GStqp7g71sTQe9yUxmXgyKQo';

function msbClient() {
  if (window.__msbClient) return window.__msbClient;
  const sb = window.supabase;
  if (!sb || !sb.createClient) return null;
  window.__msbClient = sb.createClient(MSB_URL, MSB_ANON, {
    auth: { storageKey: 'msb-game-auth', persistSession: true, autoRefreshToken: true },
  });
  return window.__msbClient;
}

const _num = (v) => (typeof v === 'number' && isFinite(v)) ? v : 0;
const _fmt = (n) => _num(n).toLocaleString();

// Pull the pieces we care about out of a (possibly messy) user_profiles row.
function parseProfile(row, mt) {
  const forge   = (row && typeof row.forge === 'object' && row.forge) || {};
  const records = (row && row.records) || forge.records || {};
  const units   = (row && row.units)   || forge.units   || {};
  const decks   = (forge.userDecks || row.decks || row.userDecks || []).filter(Boolean);

  // Normalise the units map → array with a name-resolvable id.
  const unitList = Object.keys(units || {}).map(id => {
    const u = units[id] || {};
    return { id, level: _num(u.level) || 1, xp: _num(u.xp), kills: _num(u.kills), wins: _num(u.wins) };
  });
  // Strongest = highest level, tie-broken by kills.
  const strongest = unitList.slice().sort((a, b) =>
    (b.level - a.level) || (b.kills - a.kills))[0] || null;
  const topByKills = unitList.slice().sort((a, b) => b.kills - a.kills).slice(0, 6);

  // Top deck = the first / active deck; each deck holds card keys in .cards or .list.
  const normDeck = (d) => ({
    name: (d && (d.name || d.title)) || 'Untitled Deck',
    cards: (d && (d.cards || d.list || d.cardKeys)) || [],
  });
  const deckList = decks.map(normDeck);
  const topDeck = deckList[0] || null;

  return {
    displayName: (row && row.display_name) || 'Unknown Keeper',
    userId: row && row.user_id,
    cinder: _num(row && row.gems),
    aza:    _num(row && row.sovereigns),
    mt:     _num(mt),
    wins:    _num(records.wins),
    losses:  _num(records.losses),
    battles: _num(records.battles),
    strongest, topByKills, deckList, topDeck,
    unitCount: unitList.length,
  };
}

async function fetchProfileByUserId(client, userId) {
  const [{ data: up, error: e1 }, mbRes] = await Promise.all([
    client.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    client.from('mythic_balances').select('mt').eq('user_id', userId).maybeSingle(),
  ]);
  if (e1) throw e1;
  if (!up) return null;
  return parseProfile(up, mbRes && mbRes.data && mbRes.data.mt);
}

// Another player's PUBLIC profile — via a SECURITY DEFINER RPC that returns only
// the safe fields (not the whole user_profiles row). Needs the game-DB SQL.
async function fetchPublicProfile(client, userId) {
  const { data, error } = await client.rpc('msb_public_profile', { p_user_id: userId });
  if (error) throw error;
  if (!data) return null;
  const row = typeof data === 'string' ? JSON.parse(data) : data;
  return parseProfile(row, row.mt);
}

// Resolve card ids → display names from card_catalog (best-effort; falls back to id).
async function fetchCardNames(client, ids) {
  const uniq = [...new Set(ids.filter(Boolean))].slice(0, 200);
  if (!uniq.length) return {};
  try {
    const { data } = await client.from('card_catalog').select('id, name').in('id', uniq);
    const map = {};
    (data || []).forEach(c => { map[c.id] = c.name; });
    return map;
  } catch (e) { return {}; }
}

// ── UI ────────────────────────────────────────────────────────────────────
const MSB_ACCENT = 'var(--gold-bright)';

const StatTile = ({ label, value, glyph, color }) => (
  <div className="tile" style={{ textAlign: 'center' }}>
    <div className="tile-label">{label}</div>
    <div className="tile-num" style={{ color: color || 'var(--ink)' }}>{value}</div>
    {glyph && <div className="glyph">{glyph}</div>}
  </div>
);

const ProfileView = ({ data, cardNames }) => {
  if (!data) return (
    <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
      No Mythic Spellbook profile found for this account yet.
    </div>
  );
  const nm = (id) => (cardNames && cardNames[id]) || id;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="panel-head" style={{ border: 'none', paddingLeft: 0 }}>
        <div className="panel-title" style={{ fontSize: 22 }}>
          <span style={{ marginRight: 8 }}>🎴</span>{data.displayName}
        </div>
        <span className="wiki-meta">{data.unitCount} units trained</span>
      </div>

      {/* Balances */}
      <div className="dash-grid">
        <StatTile label="Cinder" value={_fmt(data.cinder)} glyph="🔥" color="var(--ember)" />
        <StatTile label="Aza Coin" value={_fmt(data.aza)} glyph="🪙" color="var(--gold-bright)" />
        <StatTile label="Mythic Token" value={_fmt(data.mt)} glyph="💠" color="var(--tide)" />
        <StatTile label="Wins" value={_fmt(data.wins)} glyph="🏆" color="var(--verdant)" />
        <StatTile label="Losses" value={_fmt(data.losses)} glyph="✖" />
        <StatTile label="Battles" value={_fmt(data.battles)} glyph="⚔" />
      </div>

      <div className="section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Strongest unit */}
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Strongest Unit</div></div>
          <div className="panel-body">
            {data.strongest ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 20, color: MSB_ACCENT }}>{nm(data.strongest.id)}</div>
                <div style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
                  Level <b style={{ color: 'var(--ink)' }}>{data.strongest.level}</b>
                  {' · '}<b style={{ color: 'var(--ink)' }}>{data.strongest.kills}</b> kills
                  {data.strongest.wins ? <>{' · '}<b style={{ color: 'var(--ink)' }}>{data.strongest.wins}</b> wins</> : null}
                </div>
              </div>
            ) : <div style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>No units trained yet.</div>}
            {data.topByKills.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div className="field-label" style={{ marginBottom: 8 }}>Most Kills</div>
                {data.topByKills.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed var(--rule)', fontSize: 13 }}>
                    <span style={{ color: 'var(--ink)' }}>{nm(u.id)} <span style={{ color: 'var(--ink-faint)' }}>· Lv {u.level}</span></span>
                    <span style={{ color: 'var(--ink-dim)' }}>⚔ {u.kills}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top deck */}
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Top Deck</div></div>
          <div className="panel-body">
            {data.topDeck ? (
              <>
                <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: MSB_ACCENT, marginBottom: 8 }}>{data.topDeck.name}</div>
                <div style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 10 }}>{data.topDeck.cards.length} cards</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {data.topDeck.cards.slice(0, 30).map((c, i) => (
                    <span key={i} className="chip" style={{ fontSize: 12 }}>{nm(c)}</span>
                  ))}
                </div>
                {data.deckList.length > 1 && (
                  <div style={{ marginTop: 14, color: 'var(--ink-faint)', fontSize: 12 }}>
                    +{data.deckList.length - 1} other deck{data.deckList.length - 1 === 1 ? '' : 's'}
                  </div>
                )}
              </>
            ) : <div style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>No decks built yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const MSBProfilePage = () => {
  const client = msbClient();
  const [session, setSession] = React.useState(null);
  const [checking, setChecking] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [authErr, setAuthErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const [tab, setTab] = React.useState('me');       // 'me' | 'browse'
  const [me, setMe] = React.useState(null);
  const [meNames, setMeNames] = React.useState({});
  const [loadErr, setLoadErr] = React.useState('');

  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [viewing, setViewing] = React.useState(null); // {data, names}

  // Restore an existing MSB session on mount.
  React.useEffect(() => {
    if (!client) { setChecking(false); return; }
    let alive = true;
    client.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session || null);
      setChecking(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { alive = false; sub && sub.subscription && sub.subscription.unsubscribe(); };
  }, []);

  // Load MY profile once signed in.
  React.useEffect(() => {
    if (!session || !client) return;
    let alive = true;
    (async () => {
      try {
        const data = await fetchProfileByUserId(client, session.user.id);
        if (!alive) return;
        setMe(data);
        if (data) {
          const ids = [...(data.topDeck ? data.topDeck.cards : []), ...data.topByKills.map(u => u.id), data.strongest && data.strongest.id];
          setMeNames(await fetchCardNames(client, ids));
        }
      } catch (e) { if (alive) setLoadErr(String(e.message || e)); }
    })();
    return () => { alive = false; };
  }, [session]);

  const signIn = async () => {
    if (!client) { setAuthErr('Sign-in unavailable (Supabase not loaded).'); return; }
    setBusy(true); setAuthErr('');
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) setAuthErr(error.message);
    } catch (e) { setAuthErr(String(e.message || e)); }
    finally { setBusy(false); }
  };
  const signOut = async () => { if (client) await client.auth.signOut(); setMe(null); setViewing(null); };

  const runSearch = async () => {
    if (!client || !query.trim()) return;
    try {
      const { data } = await client.from('user_profiles')
        .select('user_id, display_name').ilike('display_name', '%' + query.trim() + '%').limit(20);
      setResults(data || []);
    } catch (e) { setResults([]); }
  };
  const [viewErr, setViewErr] = React.useState('');
  const openPlayer = async (userId) => {
    setViewErr('');
    try {
      const data = await fetchPublicProfile(client, userId);
      const ids = data ? [...(data.topDeck ? data.topDeck.cards : []), ...data.topByKills.map(u => u.id), data.strongest && data.strongest.id] : [];
      const names = await fetchCardNames(client, ids);
      setViewing({ data, names });
    } catch (e) {
      // Most likely the public-profile function hasn't been created yet.
      setViewErr(/function|does not exist|schema cache/i.test(String(e.message || e))
        ? 'Public profiles aren’t enabled yet — run supabase-msb-public-profiles.sql in the game database.'
        : String(e.message || e));
      setViewing(null);
    }
  };

  // ── render ────────────────────────────────────────────────────────────
  if (checking) return <div className="page"><div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-faint)' }}>Checking Mythic Spellbook session…</div></div>;

  if (!session) {
    return (
      <div className="page" style={{ maxWidth: 520 }}>
        <div className="page-head"><div><h1 className="page-title"><span className="ornament">🎴</span>Gaming Profiles</h1>
          <div className="page-sub">Connect your Mythic Spellbook account</div></div></div>
        <div className="panel"><div className="panel-body" style={{ display: 'grid', gap: 12 }}>
          <p className="section-body" style={{ marginBottom: 6 }}>
            Sign in with your <b>Mythic Spellbook</b> game account to see your Cinder, Aza Coin, and Mythic Token, your top deck, your strongest unit, and your win record — and to browse other players.
          </p>
          <div className="field"><label className="field-label">Email</label>
            <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div className="field"><label className="field-label">Password</label>
            <input className="field-input" type="password" value={pass} onChange={e => setPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') signIn(); }} placeholder="••••••••" /></div>
          {authErr && <div style={{ color: 'var(--ember)', fontSize: 13 }}>{authErr}</div>}
          <button className="btn btn-primary" disabled={busy} onClick={signIn}>{busy ? 'Connecting…' : 'Connect Mythic Spellbook'}</button>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Your game login is stored only in this browser and is separate from your Codex login.</div>
        </div></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title"><span className="ornament">🎴</span>Gaming Profiles</h1>
          <div className="page-sub">Signed in as {session.user.email}</div></div>
        <div className="page-actions">
          <button className={`btn ${tab === 'me' ? 'btn-primary' : ''}`} onClick={() => setTab('me')}>My Profile</button>
          <button className={`btn ${tab === 'browse' ? 'btn-primary' : ''}`} onClick={() => setTab('browse')}>Browse Players</button>
          <button className="btn btn-ghost" onClick={signOut}>Disconnect</button>
        </div>
      </div>

      {tab === 'me' && (loadErr
        ? <div className="panel" style={{ padding: 24, color: 'var(--ember)' }}>Could not load profile: {loadErr}</div>
        : <ProfileView data={me} cardNames={meNames} />)}

      {tab === 'browse' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="panel"><div className="panel-body" style={{ display: 'flex', gap: 8 }}>
            <input className="field-input" style={{ flex: 1 }} value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch(); }} placeholder="Search players by name…" />
            <button className="btn btn-primary" onClick={runSearch}>Search</button>
          </div></div>
          {results.length > 0 && (
            <div className="panel"><div className="panel-body" style={{ display: 'grid', gap: 4 }}>
              {results.map(r => (
                <div key={r.user_id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => openPlayer(r.user_id)}>
                  <div style={{ flex: 1 }}>{r.display_name || '(unnamed)'}</div>
                  <span className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: 12 }}>View</span>
                </div>
              ))}
            </div></div>
          )}
          {viewErr && <div className="panel" style={{ padding: 20, color: 'var(--ember)', fontSize: 13 }}>{viewErr}</div>}
          {viewing && <ProfileView data={viewing.data} cardNames={viewing.names} />}
        </div>
      )}
    </div>
  );
};

window.MSBProfilePage = MSBProfilePage;

// ── Shared helpers so other Codex features (Bug Tracker bounties) can use the
//    connected Mythic Spellbook session without re-implementing it. ──────────
window.msbGetClient = msbClient;
(function _mirrorSession() {
  const c = msbClient(); if (!c) return;
  c.auth.getSession().then(({ data }) => { window.__msbSession = data.session || null; });
  try { c.auth.onAuthStateChange((_e, s) => { window.__msbSession = s || null; }); } catch (e) {}
})();
window.msbIdentity = () => {
  const s = window.__msbSession;
  return s ? { userId: s.user.id, email: s.user.email } : null;
};
// Credit a player's in-game Cinder (gems). Admin-gated server-side by the RPC.
window.msbAwardCinder = async (userId, amount, reason) => {
  const c = msbClient(); if (!c) throw new Error('Mythic Spellbook not connected');
  const { data, error } = await c.rpc('msb_award_cinder',
    { p_user_id: userId, p_amount: amount, p_reason: reason || 'Bug bounty' });
  if (error) throw error;
  return data;
};
