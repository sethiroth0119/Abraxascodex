// Invite Modal — shown when a signed-in user arrives with a pending invite code

const INVITE_ROLE_COLOR = { admin:'#e6c068', moderator:'#a878d4', staff:'#4a8aa8', user:'#7a9a52' };
const INVITE_ROLE_ICON  = { admin:'👑', moderator:'🛡', staff:'⚙️', user:'👤' };
const INVITE_ROLE_DESC  = {
  admin:     'Full access to all studio tools, settings, and user management.',
  moderator: 'Create and edit content, manage threads, and access all studio pages.',
  staff:     'Edit and contribute to studio content and the Sprite Forge.',
  user:      'Browse content, join threads, and submit bug reports.',
};

const InviteModal = () => {
  const [phase,  setPhase]  = React.useState('boot'); // boot|idle|ready|claiming|claimed|error
  const [invite, setInvite] = React.useState(null);
  const [errMsg, setErrMsg] = React.useState('');

  React.useEffect(() => {
    const code = sessionStorage.getItem('pendingInvite');
    if (!code) { setPhase('idle'); return; }

    window.supabaseClient
      .from('invite_codes')
      .select('code, role, label, use_count, max_uses, expires_at')
      .eq('code', code)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { sessionStorage.removeItem('pendingInvite'); setPhase('idle'); return; }
        // Validate client-side before showing
        if (data.use_count >= data.max_uses) { sessionStorage.removeItem('pendingInvite'); setPhase('idle'); return; }
        if (data.expires_at && new Date(data.expires_at) < new Date()) { sessionStorage.removeItem('pendingInvite'); setPhase('idle'); return; }
        setInvite(data);
        setPhase('ready');
      })
      .catch(() => { sessionStorage.removeItem('pendingInvite'); setPhase('idle'); });
  }, []);

  const claim = async () => {
    setPhase('claiming');
    try {
      const { data, error } = await window.supabaseClient.rpc('claim_invite', { p_code: invite.code });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Invite could not be applied.');
      sessionStorage.removeItem('pendingInvite');
      setPhase('claimed');
      setTimeout(() => window.location.reload(), 1800);
    } catch(e) {
      setErrMsg(e.message);
      setPhase('error');
    }
  };

  const dismiss = () => { sessionStorage.removeItem('pendingInvite'); setPhase('idle'); };

  if (phase === 'boot' || phase === 'idle') return null;

  const role  = invite?.role;
  const color = INVITE_ROLE_COLOR[role] || '#888';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:2000,
      background:'rgba(8,6,3,.75)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
    }}>
      <div style={{
        width:420, maxWidth:'94vw',
        background:'var(--parchment-2)',
        border:`1px solid ${color}44`,
        borderRadius:12,
        boxShadow:`0 0 80px ${color}18, 0 32px 80px rgba(0,0,0,.85)`,
        padding:32,
      }}>

        {/* ── Claimed ── */}
        {phase === 'claimed' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:52, marginBottom:16}}>🎉</div>
            <div style={{fontFamily:'var(--display)', fontSize:22, color, letterSpacing:'.1em', marginBottom:8}}>
              Welcome to the team!
            </div>
            <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--ink-faint)', letterSpacing:'.1em'}}>
              Applying your new role…
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {phase === 'error' && (
          <div>
            <div style={{fontFamily:'var(--display)', fontSize:18, color:'var(--ember)', marginBottom:10}}>
              ⚠ Could not apply invite
            </div>
            <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--ink-dim)', lineHeight:1.6, marginBottom:20}}>
              {errMsg}
            </div>
            <button className="btn" onClick={dismiss} style={{width:'100%', justifyContent:'center'}}>Dismiss</button>
          </div>
        )}

        {/* ── Ready / Claiming ── */}
        {(phase === 'ready' || phase === 'claiming') && (
          <>
            {/* Role badge */}
            <div style={{textAlign:'center', marginBottom:24}}>
              <div style={{
                width:76, height:76, borderRadius:'50%',
                background:`radial-gradient(circle at 35% 35%, ${color}44, ${color}0d)`,
                border:`2px solid ${color}66`,
                boxShadow:`0 0 36px ${color}33`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:34, margin:'0 auto 14px',
              }}>
                {INVITE_ROLE_ICON[role]}
              </div>
              <div style={{fontFamily:'var(--display)', fontSize:24, color, letterSpacing:'.12em', marginBottom:4}}>
                You're Invited
              </div>
              <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-faint)', letterSpacing:'.16em'}}>
                ABRAXAS CODEX · HIDN STUDIOS
              </div>
            </div>

            {/* Role card */}
            <div style={{
              padding:16, borderRadius:8, marginBottom:20,
              background:`${color}0d`, border:`1px solid ${color}33`,
            }}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:6,
                fontFamily:'var(--mono)', fontSize:11, letterSpacing:'.14em',
                color, padding:'3px 10px', borderRadius:20,
                background:`${color}22`, border:`1px solid ${color}44`,
                marginBottom:10,
              }}>
                {INVITE_ROLE_ICON[role]} {role?.toUpperCase()}
              </div>
              {invite?.label && (
                <div style={{fontFamily:'var(--serif)', fontStyle:'italic', color:'var(--ink-dim)', fontSize:14, marginBottom:8}}>
                  "{invite.label}"
                </div>
              )}
              <div style={{fontFamily:'var(--serif)', fontSize:14, color:'var(--ink-dim)', lineHeight:1.65}}>
                {INVITE_ROLE_DESC[role]}
              </div>
            </div>

            <button className="btn btn-primary" onClick={claim} disabled={phase==='claiming'}
              style={{width:'100%', padding:14, fontSize:14, letterSpacing:'.1em',
                      justifyContent:'center', marginBottom:10}}>
              {phase === 'claiming' ? 'Applying…' : `Accept — Become ${role === 'admin' ? 'an' : 'a'} ${role}`}
            </button>
            <button className="btn" onClick={dismiss}
              style={{width:'100%', justifyContent:'center', fontSize:12, opacity:.7}}>
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
};

window.InviteModal = InviteModal;
