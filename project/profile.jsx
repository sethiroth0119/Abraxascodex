// Profile — social-media-style card. Any signed-in user can edit their own
// name & password; shows their linked Mythic Spellbook game stats up top.
const ROLE_COLOR = { admin:'#e6c068', moderator:'#a878d4', staff:'#4a8aa8', user:'#7a9a52' };
const ROLE_LABEL = { admin:'Admin', moderator:'Moderator', staff:'Staff', user:'Member' };
const ROLE_ICON  = { admin:'👑', moderator:'🛡', staff:'⚙️', user:'👤' };
const ROLE_BIO = {
  admin:'Full access to every studio tool, and can manage other members.',
  moderator:'Creates and curates content across the studio.',
  staff:'Designs and edits the world of Abraxas.',
  user:'Browsing the codex, voting on cards, and reporting bugs.',
};

const _pfmt = (n) => (Number(n) || 0).toLocaleString();

const ProfilePage = ({ onClose }) => {
  const profile = window.CURRENT_PROFILE || {};
  const user    = window.CURRENT_USER    || {};
  const role    = window.CURRENT_ROLE    || 'user';

  const [name,    setName]    = React.useState(profile.full_name || '');
  const [pw,      setPw]      = React.useState('');
  const [pwConf,  setPwConf]  = React.useState('');
  const [saving,  setSaving]  = React.useState(false);
  const [msg,     setMsg]     = React.useState(null); // { type:'ok'|'err', text }
  const [editing, setEditing] = React.useState(false);
  const [game,    setGame]    = React.useState(undefined); // undefined=loading, null=none, obj=stats

  const flash = (type, text) => { setMsg({type, text}); setTimeout(() => setMsg(null), 3500); };

  // Pull the linked game profile (matched by email through the server proxy).
  React.useEffect(() => {
    let alive = true;
    if (window.msbMyGameProfile) window.msbMyGameProfile().then(g => { if (alive) setGame(g); });
    else setGame(null);
    return () => { alive = false; };
  }, []);

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { error } = await window.supabaseClient.from('profiles')
        .update({ full_name: name.trim() }).eq('id', user.id);
      if (error) throw error;
      if (window.CURRENT_PROFILE) window.CURRENT_PROFILE.full_name = name.trim();
      flash('ok', 'Display name updated.');
    } catch (e) { flash('err', e.message || 'Could not save name.'); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!pw) return;
    if (pw !== pwConf) { flash('err', 'Passwords do not match.'); return; }
    if (pw.length < 6)  { flash('err', 'Password must be at least 6 characters.'); return; }
    setSaving(true);
    try {
      const { error } = await window.supabaseClient.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw(''); setPwConf('');
      flash('ok', 'Password changed successfully.');
    } catch (e) { flash('err', e.message || 'Could not update password.'); }
    finally { setSaving(false); }
  };

  const roleColor = ROLE_COLOR[role] || '#888';
  const display   = name || (user.email || 'Unknown Keeper');
  const handle    = (user.email || '').split('@')[0] || 'keeper';
  const initial   = (name[0] || user.email?.[0] || 'U').toUpperCase();

  const RoleBadge = () => (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5,
      fontSize:11, fontWeight:600, letterSpacing:'.08em',
      padding:'3px 10px', borderRadius:20, verticalAlign:'middle',
      background:`${roleColor}22`, border:`1px solid ${roleColor}66`, color:roleColor }}>
      {ROLE_ICON[role]} {ROLE_LABEL[role] || role}
    </span>
  );

  const StatCell = ({ label, value, glyph, color }) => (
    <div style={{ flex:1, textAlign:'center', padding:'10px 6px', minWidth:0 }}>
      <div style={{ fontFamily:'var(--display)', fontSize:20, color: color || 'var(--ink)', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:9.5, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--ink-faint)', marginTop:5 }}>{glyph} {label}</div>
    </div>
  );

  const label = (t) => (
    <div style={{ fontSize:10, letterSpacing:'.22em', textTransform:'uppercase', color:'var(--ink-faint)', marginBottom:10 }}>{t}</div>
  );

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:999,
      background:'rgba(4,7,12,.72)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>

      <div className="panel" style={{
        width:540, maxWidth:'94vw', maxHeight:'92vh', overflowY:'auto',
        padding:0, borderRadius:14, position:'relative',
        boxShadow:'0 30px 90px rgba(0,0,0,.85)',
      }}>
        {/* Cover banner */}
        <div className="grain" style={{
          height:132, position:'relative',
          background:`
            radial-gradient(120% 140% at 15% 0%, rgba(99,184,255,.55), transparent 55%),
            radial-gradient(120% 160% at 100% 20%, rgba(34,211,238,.4), transparent 60%),
            linear-gradient(120deg, var(--gold-deep), var(--gold) 55%, #17384f)`,
          borderRadius:'14px 14px 0 0',
        }}>
          <button onClick={onClose} title="Close" style={{
            position:'absolute', top:12, right:12, width:32, height:32, borderRadius:8,
            border:'1px solid rgba(255,255,255,.25)', background:'rgba(0,0,0,.35)',
            color:'#fff', cursor:'pointer', fontSize:15, lineHeight:1, backdropFilter:'blur(4px)' }}>✕</button>
        </div>

        {/* Identity */}
        <div style={{ padding:'0 24px 22px' }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:-46 }}>
            <div style={{
              width:92, height:92, borderRadius:'50%', flex:'none',
              display:'grid', placeItems:'center',
              fontFamily:'var(--display)', fontSize:38, color:'#fff',
              background:`linear-gradient(135deg, ${roleColor}, ${roleColor}88)`,
              border:'4px solid var(--parchment-2)',
              boxShadow:`0 0 0 2px ${roleColor}55, 0 8px 24px rgba(0,0,0,.5)` }}>
              {initial}
            </div>
            {!editing && (
              <button className="btn" onClick={() => setEditing(true)} style={{ marginBottom:6 }}>
                <Icon name="pencil" size={12}/> Edit profile
              </button>
            )}
          </div>

          <div style={{ marginTop:12 }}>
            <div style={{ fontFamily:'var(--display)', fontSize:24, letterSpacing:'.02em', color:'var(--ink)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              {display} <RoleBadge/>
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--gold-bright)', marginTop:3 }}>@{handle}</div>
            <div style={{ fontFamily:'var(--serif)', fontStyle:'italic', fontSize:14, color:'var(--ink-dim)', marginTop:8, lineHeight:1.55 }}>
              {ROLE_BIO[role] || ''}
            </div>
          </div>

          {/* Game stats strip */}
          {game === undefined && (
            <div style={{ marginTop:18, padding:'14px', textAlign:'center', color:'var(--ink-faint)', fontSize:12,
              border:'1px solid var(--rule)', borderRadius:10 }}>Loading your game stats…</div>
          )}
          {game && (
            <div style={{ marginTop:18, border:'1px solid var(--rule)', borderRadius:10, overflow:'hidden',
              background:'linear-gradient(180deg, rgba(47,155,255,.06), transparent)' }}>
              <div style={{ display:'flex', divide:'x', borderBottom:'1px solid var(--rule)' }}>
                <StatCell label="Cinder"  value={_pfmt(game.cinder)} glyph="🔥" color="var(--ember)"/>
                <StatCell label="Aza"     value={_pfmt(game.aza)}    glyph="🪙" color="var(--gold-bright)"/>
                <StatCell label="Mythic"  value={_pfmt(game.mt)}     glyph="💠" color="var(--tide)"/>
                <StatCell label="Wins"    value={_pfmt(game.wins)}   glyph="🏆" color="var(--verdant)"/>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px', fontSize:12.5 }}>
                <span style={{ color:'var(--ink-dim)' }}>
                  {game.strongest
                    ? <>Strongest: <b style={{ color:'var(--ink)' }}>{game.strongest.id}</b> <span style={{ color:'var(--ink-faint)' }}>· Lv {game.strongest.level} · {game.strongest.kills} kills</span></>
                    : <span style={{ color:'var(--ink-faint)' }}>No units trained yet</span>}
                </span>
                <span style={{ color:'var(--ink-faint)' }}>{game.battles} battles</span>
              </div>
            </div>
          )}
          {game === null && (
            <div style={{ marginTop:18, padding:'12px 14px', border:'1px dashed var(--rule)', borderRadius:10,
              fontSize:12, color:'var(--ink-faint)', fontStyle:'italic' }}>
              No Mythic Spellbook account matched to this email yet — connect it in <b style={{ color:'var(--ink-dim)' }}>Gaming Profiles</b> to show your Cinder, wins, and top unit here.
            </div>
          )}

          {/* Toast */}
          {msg && (
            <div style={{ marginTop:16, padding:'10px 14px', borderRadius:8, fontSize:13,
              background: msg.type==='ok' ? 'rgba(63,185,80,.14)' : 'rgba(224,120,31,.14)',
              border:`1px solid ${msg.type==='ok' ? 'var(--verdant)' : 'var(--ember)'}`,
              color: msg.type==='ok' ? 'var(--verdant)' : 'var(--ember)' }}>
              {msg.type === 'ok' ? '✓ ' : '⚠ '}{msg.text}
            </div>
          )}

          {/* Settings (collapsed until "Edit profile") */}
          {editing && (
            <div style={{ marginTop:22, paddingTop:20, borderTop:'1px solid var(--rule)', display:'grid', gap:22 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontFamily:'var(--display)', fontSize:15, letterSpacing:'.06em', color:'var(--ink)' }}>Account settings</div>
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => setEditing(false)}>Done</button>
              </div>

              <div>
                {label('Display name')}
                <div style={{ display:'flex', gap:8 }}>
                  <input className="field-input" style={{ flex:1 }} value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name as shown in the studio" onKeyDown={e => { if (e.key === 'Enter') saveName(); }}/>
                  <button className="btn btn-primary" onClick={saveName} disabled={saving || !name.trim()}>
                    {saving ? '…' : <><Icon name="check" size={12}/> Save</>}
                  </button>
                </div>
                <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:6 }}>Shown on your posts, comments, and in the sidebar.</div>
              </div>

              <div>
                {label('Email address')}
                <input className="field-input" value={user.email || ''} readOnly style={{ opacity:.55, cursor:'not-allowed', width:'100%' }}/>
                <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:6 }}>Tied to your account — can't be changed here.</div>
              </div>

              <div>
                {label('Change password')}
                <div style={{ display:'grid', gap:8 }}>
                  <input className="field-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password (min 6 characters)"/>
                  <input className="field-input" type="password" value={pwConf} onChange={e => setPwConf(e.target.value)} placeholder="Confirm new password" onKeyDown={e => { if (e.key === 'Enter') savePassword(); }}/>
                  <button className="btn btn-primary" onClick={savePassword} disabled={saving || !pw} style={{ justifySelf:'start' }}>
                    {saving ? '…' : 'Update password'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer: sign out */}
          <div style={{ marginTop:22, paddingTop:16, borderTop:'1px solid var(--rule)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--ink-faint)' }}>Signed in as {user.email}</span>
            <button className="btn" onClick={() => window.signOut && window.signOut()}
              style={{ color:'var(--ember)', borderColor:'rgba(224,120,31,.35)' }}>Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ProfilePage = ProfilePage;
