// Profile Settings — any signed-in user can edit their own name & password
const ROLE_COLOR = { admin:'#e6c068', moderator:'#a878d4', staff:'#4a8aa8', user:'#7a9a52' };
const ROLE_LABEL = { admin:'Admin', moderator:'Moderator', staff:'Staff', user:'Member' };
const ROLE_ICON  = { admin:'👑', moderator:'🛡', staff:'⚙️', user:'👤' };

const ProfilePage = ({ onClose }) => {
  const profile = window.CURRENT_PROFILE || {};
  const user    = window.CURRENT_USER    || {};
  const role    = window.CURRENT_ROLE    || 'user';

  const [name,    setName]    = React.useState(profile.full_name || '');
  const [pw,      setPw]      = React.useState('');
  const [pwConf,  setPwConf]  = React.useState('');
  const [saving,  setSaving]  = React.useState(false);
  const [msg,     setMsg]     = React.useState(null); // { type:'ok'|'err', text }

  const flash = (type, text) => { setMsg({type, text}); setTimeout(() => setMsg(null), 3500); };

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { error } = await window.supabaseClient
        .from('profiles')
        .update({ full_name: name.trim() })
        .eq('id', user.id);
      if (error) throw error;
      // keep local cache in sync
      if (window.CURRENT_PROFILE) window.CURRENT_PROFILE.full_name = name.trim();
      flash('ok', 'Display name updated.');
    } catch (e) {
      flash('err', e.message || 'Could not save name.');
    } finally {
      setSaving(false);
    }
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
    } catch (e) {
      flash('err', e.message || 'Could not update password.');
    } finally {
      setSaving(false);
    }
  };

  const roleColor = ROLE_COLOR[role] || '#888';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:999,
      background:'rgba(10,8,4,.7)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>

      <div className="panel" style={{
        width:480, maxWidth:'92vw', maxHeight:'90vh', overflowY:'auto',
        boxShadow:'0 24px 80px rgba(0,0,0,.8)',
      }}>
        {/* Header */}
        <div className="panel-head">
          <div className="panel-title" style={{letterSpacing:'.1em'}}>
            <span className="ornament" style={{marginRight:8}}>⚜</span>Your Profile
          </div>
          <button className="btn" onClick={onClose} style={{fontSize:16}}>✕</button>
        </div>

        <div className="panel-body" style={{display:'grid', gap:24}}>

          {/* Identity card */}
          <div style={{display:'flex', gap:16, alignItems:'center',
                       padding:'16px 20px', borderRadius:6,
                       background:'rgba(201,161,74,.06)', border:'1px solid rgba(201,161,74,.15)'}}>
            <div className="avatar" style={{
              width:56, height:56, fontSize:22, flex:'none',
              background:`linear-gradient(135deg,${roleColor}44,${roleColor}22)`,
              border:`2px solid ${roleColor}66`,
            }}>
              {(name[0] || user.email?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <div style={{fontFamily:'var(--display)', fontSize:18, color:'var(--gold-bright)', letterSpacing:'.06em'}}>
                {name || user.email || 'Unknown'}
              </div>
              <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', marginTop:2}}>
                {user.email}
              </div>
              <div style={{marginTop:6, display:'inline-flex', alignItems:'center', gap:6,
                           fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.12em',
                           padding:'3px 10px', borderRadius:20,
                           background:`${roleColor}22`, border:`1px solid ${roleColor}55`,
                           color: roleColor}}>
                {ROLE_ICON[role]} {ROLE_LABEL[role] || role}
              </div>
            </div>
          </div>

          {/* Toast message */}
          {msg && (
            <div style={{
              padding:'10px 14px', borderRadius:5, fontFamily:'var(--mono)', fontSize:12,
              background: msg.type==='ok' ? 'rgba(90,160,90,.15)' : 'rgba(196,90,47,.15)',
              border:`1px solid ${msg.type==='ok' ? 'var(--verdant)' : 'var(--ember)'}`,
              color: msg.type==='ok' ? 'var(--verdant)' : 'var(--ember)',
            }}>
              {msg.type === 'ok' ? '✓ ' : '⚠ '}{msg.text}
            </div>
          )}

          {/* Display name */}
          <div>
            <div style={{fontSize:10, letterSpacing:'.22em', textTransform:'uppercase',
                         color:'var(--ink-faint)', marginBottom:10}}>Display Name</div>
            <div style={{display:'flex', gap:8}}>
              <input className="field-input" style={{flex:1}}
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name as shown in the studio"
                onKeyDown={e => { if (e.key === 'Enter') saveName(); }}/>
              <button className="btn btn-primary" onClick={saveName} disabled={saving || !name.trim()}>
                {saving ? '…' : <><Icon name="check" size={12}/> Save</>}
              </button>
            </div>
            <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', marginTop:6}}>
              This name appears on your posts, comments, and in the sidebar.
            </div>
          </div>

          {/* Email — read-only */}
          <div>
            <div style={{fontSize:10, letterSpacing:'.22em', textTransform:'uppercase',
                         color:'var(--ink-faint)', marginBottom:10}}>Email Address</div>
            <input className="field-input" value={user.email || ''} readOnly
              style={{opacity:.55, cursor:'not-allowed', width:'100%'}}/>
            <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', marginTop:6}}>
              Email is tied to your account and cannot be changed here.
            </div>
          </div>

          {/* Change password */}
          <div>
            <div style={{fontSize:10, letterSpacing:'.22em', textTransform:'uppercase',
                         color:'var(--ink-faint)', marginBottom:10}}>Change Password</div>
            <div style={{display:'grid', gap:8}}>
              <input className="field-input" type="password"
                value={pw} onChange={e => setPw(e.target.value)}
                placeholder="New password (min 6 characters)"/>
              <input className="field-input" type="password"
                value={pwConf} onChange={e => setPwConf(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={e => { if (e.key === 'Enter') savePassword(); }}/>
              <button className="btn btn-primary" onClick={savePassword}
                      disabled={saving || !pw} style={{justifySelf:'start'}}>
                {saving ? '…' : 'Update Password'}
              </button>
            </div>
          </div>

          {/* Role — read-only info */}
          <div style={{paddingTop:16, borderTop:'1px solid var(--rule)'}}>
            <div style={{fontSize:10, letterSpacing:'.22em', textTransform:'uppercase',
                         color:'var(--ink-faint)', marginBottom:8}}>Account Role</div>
            <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-dim)', lineHeight:1.6}}>
              You are a <span style={{color:roleColor, fontStyle:'normal'}}>{ROLE_LABEL[role] || role}</span>.
              {role === 'admin' && ' You have full access to all studio tools and can manage other users.'}
              {role === 'moderator' && ' You can create and edit content across the studio.'}
              {role === 'staff' && ' You have editing access to studio content.'}
              {role === 'user' && ' You have read-only access — you can browse content, post in threads, and submit bug reports.'}
              {' '}Contact an admin to change your role.
            </div>
          </div>

          {/* Sign out */}
          <div style={{paddingTop:8, borderTop:'1px solid var(--rule)'}}>
            <button className="btn" onClick={() => window.signOut && window.signOut()}
              style={{color:'var(--ember)', borderColor:'rgba(196,90,47,.3)'}}>
              Sign Out
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

window.ProfilePage = ProfilePage;
