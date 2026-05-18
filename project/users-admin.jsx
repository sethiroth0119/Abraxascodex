// Users & Roles — admin-only page
// List all members, change roles, configure which pages each role can access.

const ROLES      = ['admin','moderator','staff','user'];
const ROLE_COLOR = { admin:'#e6c068', moderator:'#a878d4', staff:'#4a8aa8', user:'#7a9a52' };
const ROLE_ICON  = { admin:'👑', moderator:'🛡', staff:'⚙️', user:'👤' };

const ALL_NAV_SECTIONS = [
  { section:'World',            items:['dashboard','systems','elements','factions','lore','timeline'] },
  { section:'Mythic Spellbook', items:['cards','moves','passives','statuses','natures'] },
  { section:'Inhabitants',      items:['heroes','lineage'] },
  { section:'Team',             items:['threads','tasks','ideas','concepts','dialogue','bugs'] },
  { section:'Game',             items:['campaigns','worldEvents','resources','economy','relics','playtest','activity','settings'] },
  { section:'Admin',            items:['users'] },
];

const PAGE_LABELS = {
  dashboard:'Forge Hall', systems:'Game Systems', elements:'Elements', factions:'Factions',
  lore:'Lore Codex', timeline:'Timeline', cards:'Card Forge', moves:'Moves',
  passives:'Passives', statuses:'Status Effects', natures:'Natures & Traits',
  heroes:'Heroes & NPCs', lineage:'Lineages', threads:'Threads', tasks:'Tasks & To-Do',
  ideas:'Ideas & Updates', concepts:'Concepts', dialogue:'Dialogue & Story',
  bugs:'Bug Tracker', campaigns:'Campaigns', worldEvents:'World Events',
  resources:'Resources', economy:'Economy', relics:'Items & Relics',
  playtest:'Playtest Bench', activity:'Activity', settings:'Studio Settings',
  users:'Users & Roles',
};

const INVITE_ROLES = ['moderator','staff','user'];

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = 'ABX-';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
};

const UsersAdminPage = () => {
  const [tab, setTab]         = React.useState('users');
  const [users, setUsers]     = React.useState([]);
  const [perms, setPerms]     = React.useState([]);
  const [invites, setInvites] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving]   = React.useState(false);
  const [toast, setToast]     = React.useState(null);

  const showToast = (msg, type='ok') => {
    setToast({msg,type}); setTimeout(()=>setToast(null), 2500);
  };

  // Load users + permissions
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const sb = window.supabaseClient;

      const { data: u } = await sb.from('profiles').select('*').order('created_at');
      if (u) setUsers(u);

      const { data: p } = await sb.from('role_permissions').select('*');
      if (p) {
        const map = Object.fromEntries(p.map(r => [r.role, r.allowed_pages || []]));
        setPerms(ROLES.map(r => ({ role: r, allowed_pages: map[r] || [] })));
      } else {
        setPerms(ROLES.map(r => ({ role: r, allowed_pages: (window.ALL_ROLE_PERMISSIONS.find(x=>x.role===r)||{}).allowed_pages||[] })));
      }

      const { data: inv } = await sb.from('invite_codes').select('*').order('created_at', { ascending: false });
      if (inv) setInvites(inv);

      setLoading(false);
    })();
  }, []);

  // Change a user's role
  const changeRole = async (userId, newRole) => {
    const sb = window.supabaseClient;
    const { error } = await sb.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) return showToast('Error: ' + error.message, 'err');
    setUsers(users.map(u => u.id === userId ? {...u, role: newRole} : u));
    showToast('Role updated');
  };

  // Toggle a page for a role in the permissions matrix
  const togglePerm = (role, page) => {
    setPerms(perms.map(p => {
      if (p.role !== role) return p;
      const has = p.allowed_pages.includes(page);
      return { ...p, allowed_pages: has ? p.allowed_pages.filter(x=>x!==page) : [...p.allowed_pages, page] };
    }));
  };

  // Toggle entire section for a role
  const toggleSection = (role, sectionItems) => {
    setPerms(perms.map(p => {
      if (p.role !== role) return p;
      const allOn = sectionItems.every(i => p.allowed_pages.includes(i));
      const next = allOn
        ? p.allowed_pages.filter(x => !sectionItems.includes(x))
        : [...new Set([...p.allowed_pages, ...sectionItems])];
      return { ...p, allowed_pages: next };
    }));
  };

  // Save permissions to Supabase
  const savePerms = async () => {
    setSaving(true);
    const sb = window.supabaseClient;
    for (const p of perms) {
      await sb.from('role_permissions').upsert({ role: p.role, allowed_pages: p.allowed_pages });
    }
    // Update global cache
    window.ALL_ROLE_PERMISSIONS = perms;
    const myPerms = perms.find(p => p.role === window.CURRENT_ROLE);
    if (myPerms) window.ALLOWED_PAGES = new Set(myPerms.allowed_pages);
    setSaving(false);
    showToast('Permissions saved');
  };

  if (loading) return (
    <div className="page-body" style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <span style={{color:'var(--ink-faint)',fontFamily:'var(--mono)',fontSize:12,letterSpacing:'.1em'}}>Loading users…</span>
    </div>
  );

  const me = window.CURRENT_PROFILE;

  return (
    <div className="page-body">
      {toast && (
        <div style={{position:'fixed',bottom:24,right:24,zIndex:999,
          background: toast.type==='err' ? 'rgba(204,42,58,.9)' : 'rgba(122,154,82,.9)',
          color:'#fff',padding:'10px 18px',borderRadius:8,fontSize:13,fontFamily:'var(--mono)'}}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Users &amp; Roles</h1>
          <p style={{color:'var(--ink-faint)',fontSize:13,marginTop:4}}>
            Manage team members and control which sections each role can access.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--rule)',marginBottom:24}}>
        {[['users','👥 Members'],['invites','🔗 Invite Links'],['perms','🔒 Permissions']].map(([id,label]) => (
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:'10px 20px',background:'none',border:'none',cursor:'pointer',
              fontFamily:'var(--display)',fontSize:13,letterSpacing:'.1em',
              color: tab===id ? 'var(--gold-bright)' : 'var(--ink-faint)',
              borderBottom: tab===id ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom:-1}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── MEMBERS TAB ── */}
      {tab === 'users' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr 160px 160px',gap:'0 16px',
            padding:'8px 16px',borderBottom:'1px solid var(--rule)',
            fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.12em',color:'var(--ink-faint)',textTransform:'uppercase'}}>
            <span>Name</span><span>Email</span><span>Role</span><span>Joined</span>
          </div>

          {users.length === 0 && (
            <div style={{padding:'40px 16px',textAlign:'center',color:'var(--ink-faint)',fontSize:13}}>
              No profiles found — make sure to run supabase-setup.sql first.
            </div>
          )}

          {users.map(u => {
            const isMe = u.id === me?.id;
            return (
              <div key={u.id}
                style={{display:'grid',gridTemplateColumns:'1fr 1.5fr 160px 160px',gap:'0 16px',
                  padding:'14px 16px',borderBottom:'1px solid var(--rule)',alignItems:'center',
                  background: isMe ? 'rgba(201,161,74,.04)' : 'transparent'}}>

                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,
                    background:`linear-gradient(135deg,${ROLE_COLOR[u.role]}44,${ROLE_COLOR[u.role]}22)`,
                    border:`1px solid ${ROLE_COLOR[u.role]}66`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>
                    {(u.full_name||u.email||'?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontSize:14,color:'var(--ink)'}}>{u.full_name || '—'}</div>
                    {isMe && <div style={{fontSize:10,color:'var(--gold)',fontFamily:'var(--mono)',letterSpacing:'.1em'}}>YOU</div>}
                  </div>
                </div>

                <div style={{fontSize:13,color:'var(--ink-dim)',fontFamily:'var(--mono)'}}>{u.email}</div>

                <div>
                  {isMe && u.role === 'admin' ? (
                    <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,
                      padding:'4px 10px',borderRadius:20,
                      background:`${ROLE_COLOR[u.role]}22`,color:ROLE_COLOR[u.role],
                      border:`1px solid ${ROLE_COLOR[u.role]}55`,fontFamily:'var(--mono)'}}>
                      {ROLE_ICON[u.role]} {u.role}
                    </span>
                  ) : (
                    <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                      style={{background:'var(--parchment-3)',border:'1px solid var(--rule)',
                        borderRadius:6,padding:'5px 8px',color:ROLE_COLOR[u.role],
                        fontFamily:'var(--mono)',fontSize:12,cursor:'pointer',width:'100%'}}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_ICON[r]} {r}</option>)}
                    </select>
                  )}
                </div>

                <div style={{fontSize:12,color:'var(--ink-faint)',fontFamily:'var(--mono)'}}>
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── INVITES TAB ── */}
      {tab === 'invites' && (
        <InvitesTab
          invites={invites} setInvites={setInvites}
          meId={me?.id} showToast={showToast}
        />
      )}

      {/* ── PERMISSIONS TAB ── */}
      {tab === 'perms' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <p style={{color:'var(--ink-faint)',fontSize:13}}>
              Toggle which sections each role can see. Changes take effect on next login.
            </p>
            <button className="btn btn-primary" onClick={savePerms} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save permissions'}
            </button>
          </div>

          {/* Role legend */}
          <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
            {ROLES.map(r => (
              <span key={r} style={{display:'inline-flex',alignItems:'center',gap:6,
                padding:'5px 12px',borderRadius:20,fontSize:12,fontFamily:'var(--mono)',
                background:`${ROLE_COLOR[r]}22`,color:ROLE_COLOR[r],
                border:`1px solid ${ROLE_COLOR[r]}55`}}>
                {ROLE_ICON[r]} {r}
              </span>
            ))}
          </div>

          {/* Matrix */}
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left',padding:'8px 12px',color:'var(--ink-faint)',
                    fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.12em',
                    borderBottom:'2px solid var(--rule)',width:180}}>
                    PAGE
                  </th>
                  {ROLES.map(r => (
                    <th key={r} style={{padding:'8px 16px',textAlign:'center',
                      color:ROLE_COLOR[r],fontFamily:'var(--display)',fontSize:13,
                      letterSpacing:'.12em',borderBottom:'2px solid var(--rule)',minWidth:100}}>
                      {ROLE_ICON[r]} {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_NAV_SECTIONS.map(({ section, items }) => (
                  <React.Fragment key={section}>
                    {/* Section header row */}
                    <tr>
                      <td colSpan={5} style={{padding:'10px 12px 4px',
                        fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.18em',
                        textTransform:'uppercase',color:'var(--gold)',
                        borderTop:'1px solid var(--rule)'}}>
                        {section}
                      </td>
                    </tr>
                    {/* Section toggle row */}
                    <tr style={{background:'rgba(201,161,74,.03)'}}>
                      <td style={{padding:'6px 12px',color:'var(--ink-faint)',fontSize:11,fontStyle:'italic'}}>
                        Toggle all
                      </td>
                      {ROLES.map(r => {
                        const rp = perms.find(p=>p.role===r) || {allowed_pages:[]};
                        const allOn = items.every(i => rp.allowed_pages.includes(i));
                        return (
                          <td key={r} style={{textAlign:'center',padding:'6px'}}>
                            <button onClick={() => toggleSection(r, items)}
                              style={{background:'none',border:`1px solid ${allOn?ROLE_COLOR[r]:'var(--rule)'}`,
                                borderRadius:4,padding:'3px 10px',cursor:'pointer',
                                color: allOn ? ROLE_COLOR[r] : 'var(--ink-faint)',fontSize:11,
                                fontFamily:'var(--mono)'}}>
                              {allOn ? '✓ all' : '○ all'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                    {/* Per-page rows */}
                    {items.map(page => (
                      <tr key={page} style={{borderBottom:'1px solid rgba(58,49,32,.5)'}}>
                        <td style={{padding:'9px 12px 9px 24px',color:'var(--ink-dim)',fontSize:13}}>
                          {PAGE_LABELS[page] || page}
                        </td>
                        {ROLES.map(r => {
                          const rp = perms.find(p=>p.role===r) || {allowed_pages:[]};
                          const on = rp.allowed_pages.includes(page);
                          return (
                            <td key={r} style={{textAlign:'center',padding:'8px'}}>
                              <button onClick={() => togglePerm(r, page)}
                                title={on ? `Remove ${page} from ${r}` : `Add ${page} to ${r}`}
                                style={{width:28,height:28,borderRadius:6,cursor:'pointer',border:'none',
                                  background: on ? `${ROLE_COLOR[r]}33` : 'rgba(255,255,255,.04)',
                                  color: on ? ROLE_COLOR[r] : 'var(--rule-strong)',
                                  fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',
                                  margin:'0 auto',transition:'background .12s'}}>
                                {on ? '✓' : '○'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const InvitesTab = ({ invites, setInvites, meId, showToast }) => {
  const [newRole,    setNewRole]    = React.useState('staff');
  const [newLabel,   setNewLabel]   = React.useState('');
  const [newMaxUses, setNewMaxUses] = React.useState(1);
  const [newExpiry,  setNewExpiry]  = React.useState('');
  const [creating,   setCreating]   = React.useState(false);
  const [copied,     setCopied]     = React.useState(null);

  const origin = window.location.origin;

  const createInvite = async () => {
    setCreating(true);
    const code = genCode();
    const sb = window.supabaseClient;
    const row = {
      code,
      role: newRole,
      label: newLabel.trim() || null,
      created_by: meId,
      max_uses: newMaxUses,
      expires_at: newExpiry ? new Date(newExpiry).toISOString() : null,
    };
    const { data, error } = await sb.from('invite_codes').insert(row).select().single();
    if (error) { showToast('Error: ' + error.message, 'err'); }
    else { setInvites([data, ...invites]); setNewLabel(''); showToast('Invite created'); }
    setCreating(false);
  };

  const revokeInvite = async (id) => {
    if (!confirm('Revoke this invite? Anyone with the link will no longer be able to use it.')) return;
    const { error } = await window.supabaseClient.from('invite_codes').delete().eq('id', id);
    if (error) return showToast('Error: ' + error.message, 'err');
    setInvites(invites.filter(i => i.id !== id));
    showToast('Invite revoked');
  };

  const copyLink = (code) => {
    const link = `${origin}/login.html?invite=${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const isExpired = (inv) => inv.expires_at && new Date(inv.expires_at) < new Date();
  const isUsedUp  = (inv) => inv.use_count >= inv.max_uses;

  return (
    <div style={{display:'grid', gap:24}}>

      {/* Create new invite */}
      <div className="panel">
        <div className="panel-head"><div className="panel-title">Generate Invite Link</div></div>
        <div className="panel-body" style={{display:'grid', gap:14}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <label className="field-label">Role to grant</label>
              <select className="field-select" value={newRole} onChange={e => setNewRole(e.target.value)}>
                {INVITE_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_ICON[r]} {r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Max uses</label>
              <input className="field-input" type="number" min={1} max={100}
                value={newMaxUses} onChange={e => setNewMaxUses(Math.max(1, +e.target.value))}/>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <label className="field-label">Label (optional)</label>
              <input className="field-input" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. For the art team"/>
            </div>
            <div>
              <label className="field-label">Expires (optional)</label>
              <input className="field-input" type="date" value={newExpiry}
                onChange={e => setNewExpiry(e.target.value)}/>
            </div>
          </div>

          <button className="btn btn-primary" onClick={createInvite} disabled={creating}
            style={{justifySelf:'start', paddingLeft:20, paddingRight:20}}>
            {creating ? 'Creating…' : '🔗 Generate Invite Link'}
          </button>
        </div>
      </div>

      {/* Invite list */}
      <div>
        <div style={{fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.2em', textTransform:'uppercase',
                     color:'var(--ink-faint)', marginBottom:12}}>
          Active invites ({invites.length})
        </div>

        {invites.length === 0 && (
          <div className="panel" style={{padding:32, textAlign:'center'}}>
            <div style={{color:'var(--ink-faint)', fontFamily:'var(--serif)', fontStyle:'italic'}}>
              No invites yet. Generate one above and send the link.
            </div>
          </div>
        )}

        {invites.map(inv => {
          const expired = isExpired(inv);
          const usedUp  = isUsedUp(inv);
          const inactive = expired || usedUp;
          const color = ROLE_COLOR[inv.role] || '#888';

          return (
            <div key={inv.id} className="panel" style={{marginBottom:10, opacity: inactive ? .55 : 1}}>
              <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px 16px', flexWrap:'wrap'}}>

                {/* Role badge */}
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  padding:'4px 12px', borderRadius:20, flexShrink:0,
                  background:`${color}22`, border:`1px solid ${color}44`,
                  color, fontFamily:'var(--mono)', fontSize:11, letterSpacing:'.1em',
                }}>
                  {ROLE_ICON[inv.role]} {inv.role}
                </div>

                {/* Code */}
                <span style={{fontFamily:'var(--mono)', fontSize:13, color:'var(--gold-bright)',
                              letterSpacing:'.14em', flexShrink:0}}>
                  {inv.code}
                </span>

                {/* Label */}
                {inv.label && (
                  <span style={{fontFamily:'var(--serif)', fontStyle:'italic', color:'var(--ink-dim)', fontSize:13}}>
                    {inv.label}
                  </span>
                )}

                {/* Uses */}
                <span style={{fontFamily:'var(--mono)', fontSize:11, color: usedUp ? 'var(--ember)' : 'var(--ink-faint)'}}>
                  {inv.use_count}/{inv.max_uses} used
                </span>

                {/* Expiry */}
                {inv.expires_at && (
                  <span style={{fontFamily:'var(--mono)', fontSize:11, color: expired ? 'var(--ember)' : 'var(--ink-faint)'}}>
                    {expired ? 'expired' : 'expires'} {new Date(inv.expires_at).toLocaleDateString()}
                  </span>
                )}

                {inactive && (
                  <span className="pill" style={{borderColor:'var(--ember)', color:'var(--ember)', fontSize:10}}>
                    {expired ? 'expired' : 'used up'}
                  </span>
                )}

                {/* Actions */}
                <div style={{marginLeft:'auto', display:'flex', gap:6}}>
                  {!inactive && (
                    <button className="btn" onClick={() => copyLink(inv.code)}
                      style={{fontSize:11, color: copied===inv.code ? 'var(--verdant)' : undefined}}>
                      {copied === inv.code ? '✓ Copied' : '🔗 Copy link'}
                    </button>
                  )}
                  <button className="btn" onClick={() => revokeInvite(inv.id)}
                    style={{fontSize:11, color:'var(--ember)'}}>
                    ✕ Revoke
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

window.UsersAdminPage = UsersAdminPage;
