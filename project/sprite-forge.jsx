// Sprite Forge — AI sprite generation powered by AutoSprite + Athena lore context

const ANIM_TYPES = [
  { id:'idle',    label:'Idle',       icon:'◎' },
  { id:'walk',    label:'Walk',       icon:'⟶' },
  { id:'run',     label:'Run',        icon:'⟹' },
  { id:'attack',  label:'Attack',     icon:'⚔' },
  { id:'jump',    label:'Jump',       icon:'↑' },
  { id:'cast',    label:'Cast Spell', icon:'✨' },
  { id:'hurt',    label:'Hit/Hurt',   icon:'💢' },
  { id:'die',     label:'Death',      icon:'✝' },
];

const ART_STYLES = [
  { id:'pixel_art',     label:'Pixel Art',  icon:'⬛', hasSizes:true  },
  { id:'anime',         label:'Anime',       icon:'◇',  hasSizes:false },
  { id:'chibi',         label:'Chibi',       icon:'◉',  hasSizes:false },
  { id:'fantasy',       label:'Fantasy',     icon:'✦',  hasSizes:false },
  { id:'cartoon',       label:'Cartoon',     icon:'○',  hasSizes:false },
];

const SIZES = [16, 32, 64];

const SpriteForge = () => {
  const heroes = ((window.STATE && window.STATE.heroes) || window.HEROES || []);
  const [heroId,    setHeroId]    = React.useState('');
  const [desc,      setDesc]      = React.useState('');
  const [style,     setStyle]     = React.useState('pixel_art');
  const [size,      setSize]      = React.useState(32);
  const [anims,     setAnims]     = React.useState(['idle', 'walk']);
  const [phase,     setPhase]     = React.useState('idle'); // idle | generating | done | error
  const [statusMsg, setStatusMsg] = React.useState('');
  const [result,    setResult]    = React.useState(null);  // { charId, sheets:[{anim, url}] }
  const [gallery,   setGallery]   = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('mss:sprite-gallery') || '[]'); } catch { return []; }
  });
  const [credits,   setCredits]   = React.useState(null);
  const [athBusy,   setAthBusy]   = React.useState(false);
  const [tab,       setTab]       = React.useState('build'); // build | gallery

  // Fetch credits on mount
  React.useEffect(() => {
    callSprite('account', {})
      .then(r => { if (r.credits !== undefined) setCredits(r.credits); })
      .catch(() => {});
  }, []);

  const callSprite = async (action, params) => {
    const resp = await fetch('/api/sprite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  const toggleAnim = id =>
    setAnims(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const buildWithAthena = async () => {
    const hero = heroes.find(h => h.id === heroId);
    const base = hero
      ? `Character: ${hero.name} (${hero.kind}, ${hero.element} element, ${hero.faction} faction). Bio: ${hero.bio || '—'}. Personality: ${(hero.personality || []).join(', ')}.`
      : desc;
    if (!base.trim()) return;

    setAthBusy(true);
    try {
      const reply = await window.claude.complete({
        messages: [{
          role: 'user',
          content: `Write a concise sprite description for a game character in 2 sentences. Focus ONLY on visuals: body shape, outfit, colors, weapon or staff if any, distinctive markings. Style: ${style}. Character context:\n${base}\nOutput the description only, no labels.`,
        }],
      });
      setDesc(reply.trim());
    } catch { /* silent */ }
    finally { setAthBusy(false); }
  };

  const generate = async () => {
    if (!desc.trim() || anims.length === 0) return;
    setPhase('generating');
    setResult(null);

    try {
      // 1 — Create character
      setStatusMsg('Creating character on AutoSprite…');
      const char = await callSprite('create', {
        description: desc,
        style,
        ...(style === 'pixel_art' ? { size } : {}),
      });

      const charId = char.id || char.character_id;
      if (!charId) throw new Error('AutoSprite did not return a character ID');

      const sheets = [];

      // 2 — Generate each animation
      for (let i = 0; i < anims.length; i++) {
        const anim = anims[i];
        setStatusMsg(`Generating "${anim}" (${i + 1}/${anims.length})…`);

        let job;
        try {
          job = await callSprite('generate', {
            character_id: charId,
            animation_type: anim,
            ...(style === 'pixel_art' ? { size } : {}),
          });
        } catch {
          // some versions: spritesheet already on character object
          job = null;
        }

        const jobId = job && (job.job_id || job.id);

        if (jobId) {
          // Poll up to 90s (30 × 3s)
          let done = false;
          for (let poll = 0; poll < 30 && !done; poll++) {
            await new Promise(r => setTimeout(r, 3000));
            setStatusMsg(`Waiting for "${anim}"… ${(poll + 1) * 3}s`);
            try {
              const st = await callSprite('jobStatus', { job_id: jobId });
              if (st.status === 'completed' || st.status === 'ready' || st.download_url) {
                sheets.push({ anim, url: st.download_url || st.url || st.spritesheet_url });
                done = true;
              } else if (st.status === 'failed') {
                throw new Error(`${anim} failed`);
              }
            } catch(e) { if (e.message.includes('failed')) throw e; }
          }
          if (!done) throw new Error(`Timed out waiting for ${anim}`);
        } else {
          // Job returned URL immediately
          const url = job && (job.download_url || job.url || job.spritesheet_url);
          if (url) sheets.push({ anim, url });
        }
      }

      // 3 — Also try fetching char's auto-generated sheets
      if (sheets.length === 0) {
        setStatusMsg('Fetching generated spritesheets…');
        try {
          const list = await callSprite('listSheets', { character_id: charId });
          const items = list.spritesheets || list.items || [];
          for (const s of items) {
            sheets.push({ anim: s.animation_type || s.type || 'sprite', url: s.download_url || s.url });
          }
        } catch {}
      }

      if (sheets.length === 0) throw new Error('No spritesheets were generated — check your AutoSprite credits.');

      const entry = { id: charId, desc, style, size, anims, sheets, created: Date.now() };
      setResult(entry);
      const next = [entry, ...gallery.slice(0, 19)];
      setGallery(next);
      localStorage.setItem('mss:sprite-gallery', JSON.stringify(next));
      setPhase('done');
    } catch(e) {
      setStatusMsg(e.message);
      setPhase('error');
    }
  };

  const selectedStyleDef = ART_STYLES.find(s => s.id === style);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">⚡</span>Sprite Forge</h1>
          <div className="page-sub">
            AI sprite sheet generation for Abraxas characters
            {credits !== null && <span style={{marginLeft:16,color:'var(--gold)',fontFamily:'var(--mono)',fontSize:11}}>◈ {credits} credits</span>}
          </div>
        </div>
        <div className="page-actions">
          <div className={`chip ${tab==='build'?'active':''}`} onClick={()=>setTab('build')}>Build</div>
          <div className={`chip ${tab==='gallery'?'active':''}`} onClick={()=>setTab('gallery')}>Gallery ({gallery.length})</div>
        </div>
      </div>

      {tab === 'gallery' ? (
        <GalleryTab gallery={gallery} setGallery={setGallery} />
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'380px 1fr', gap:24, alignItems:'start'}}>

          {/* ── LEFT: Setup panel ─────────────────────────── */}
          <div style={{display:'grid', gap:16}}>

            {/* Hero picker */}
            <div className="panel">
              <div className="panel-head"><div className="panel-title">Character</div></div>
              <div className="panel-body" style={{display:'grid', gap:12}}>
                <div>
                  <label className="field-label">Pick from studio (optional)</label>
                  <select className="field-select" value={heroId} onChange={e => {
                    setHeroId(e.target.value);
                    const h = heroes.find(x => x.id === e.target.value);
                    if (h) setDesc(`${h.name} — ${h.kind}, ${h.element} element, ${h.faction} faction. ${h.bio || ''}`);
                  }}>
                    <option value="">— custom description —</option>
                    {heroes.map(h => <option key={h.id} value={h.id}>{h.name} ({h.kind})</option>)}
                  </select>
                </div>

                <div>
                  <label className="field-label">Visual description</label>
                  <textarea className="field-area" rows={5} value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="Describe the character's appearance — body type, outfit, colors, weapon, distinctive markings…"/>
                </div>

                <button className="btn" onClick={buildWithAthena} disabled={athBusy || (!heroId && !desc.trim())}
                  style={{display:'flex', alignItems:'center', gap:8}}>
                  {athBusy ? '🦉 Thinking…' : <><span>🦉</span> Build prompt from lore</>}
                </button>
              </div>
            </div>

            {/* Style */}
            <div className="panel">
              <div className="panel-head"><div className="panel-title">Art Style</div></div>
              <div className="panel-body">
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12}}>
                  {ART_STYLES.map(s => (
                    <div key={s.id} onClick={() => setStyle(s.id)}
                      style={{padding:'10px 12px', borderRadius:6, cursor:'pointer', border:`1px solid ${style===s.id?'var(--gold-bright)':'var(--rule)'}`,
                              background: style===s.id ? 'rgba(201,161,74,.08)' : 'transparent',
                              display:'flex', alignItems:'center', gap:8}}>
                      <span style={{fontSize:16}}>{s.icon}</span>
                      <span style={{fontFamily:'var(--mono)', fontSize:11}}>{s.label}</span>
                      {style===s.id && <span style={{marginLeft:'auto', color:'var(--gold-bright)', fontSize:10}}>✓</span>}
                    </div>
                  ))}
                </div>

                {selectedStyleDef?.hasSizes && (
                  <div>
                    <label className="field-label">Sprite size</label>
                    <div style={{display:'flex', gap:8}}>
                      {SIZES.map(s => (
                        <button key={s} className={`btn ${size===s?'btn-primary':''}`} onClick={() => setSize(s)}
                          style={{flex:1, fontFamily:'var(--mono)', fontSize:12}}>
                          {s}px
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Animations */}
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Animations</div>
                <span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)'}}>{anims.length} selected</span>
              </div>
              <div className="panel-body">
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
                  {ANIM_TYPES.map(a => {
                    const on = anims.includes(a.id);
                    return (
                      <div key={a.id} onClick={() => toggleAnim(a.id)}
                        style={{padding:'8px 12px', borderRadius:6, cursor:'pointer', userSelect:'none',
                                border:`1px solid ${on?'var(--gold-bright)':'var(--rule)'}`,
                                background: on ? 'rgba(201,161,74,.08)' : 'transparent',
                                display:'flex', alignItems:'center', gap:8}}>
                        <span style={{fontSize:14}}>{a.icon}</span>
                        <span style={{fontFamily:'var(--mono)', fontSize:11, color: on ? 'var(--gold-bright)' : 'var(--ink-dim)'}}>{a.label}</span>
                        {on && <span style={{marginLeft:'auto', color:'var(--gold-bright)', fontSize:10}}>✓</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{marginTop:10, fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)'}}>
                  Each animation uses 1 credit. {anims.length} selected = {anims.length} credits.
                </div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={generate}
              disabled={phase==='generating' || !desc.trim() || anims.length===0}
              style={{padding:'14px', fontSize:14, letterSpacing:'.1em', justifyContent:'center'}}>
              {phase === 'generating'
                ? <><span style={{marginRight:8}}>⏳</span>{statusMsg}</>
                : <><span style={{marginRight:8}}>⚡</span>Generate Sprites</>}
            </button>
          </div>

          {/* ── RIGHT: Result panel ──────────────────────── */}
          <div>
            {phase === 'idle' && (
              <div className="panel" style={{padding:48, textAlign:'center'}}>
                <div style={{fontSize:48, marginBottom:16}}>⚡</div>
                <div style={{fontFamily:'var(--display)', fontSize:18, color:'var(--gold-bright)', letterSpacing:'.1em', marginBottom:8}}>
                  Sprite Forge
                </div>
                <div style={{fontFamily:'var(--serif)', fontStyle:'italic', color:'var(--ink-faint)', fontSize:14, lineHeight:1.7, maxWidth:340, margin:'0 auto'}}>
                  Describe your character, pick a style and animations, then hit Generate. Athena can auto-write the prompt from any hero's lore.
                </div>
              </div>
            )}

            {phase === 'generating' && (
              <div className="panel" style={{padding:48, textAlign:'center'}}>
                <div style={{fontSize:36, marginBottom:16, animation:'spin 2s linear infinite', display:'inline-block'}}>⚡</div>
                <div style={{fontFamily:'var(--display)', fontSize:16, color:'var(--gold-bright)', letterSpacing:'.08em', marginBottom:8}}>Forging…</div>
                <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--ink-faint)'}}>{statusMsg}</div>
                <div style={{marginTop:24, display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap'}}>
                  {anims.map(a => {
                    const def = ANIM_TYPES.find(x => x.id === a);
                    return <span key={a} className="pill" style={{fontFamily:'var(--mono)', fontSize:10}}>{def?.icon} {a}</span>;
                  })}
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div className="panel" style={{padding:32}}>
                <div style={{color:'var(--ember)', fontFamily:'var(--display)', fontSize:16, marginBottom:8}}>⚠ Generation failed</div>
                <div style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--ink-dim)', marginBottom:16}}>{statusMsg}</div>
                <button className="btn" onClick={() => setPhase('idle')}>← Try Again</button>
              </div>
            )}

            {phase === 'done' && result && (
              <SpriteResult result={result} onReset={() => { setPhase('idle'); setResult(null); }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sprite Result ──────────────────────────────────────────────────────────

const SpriteResult = ({ result, onReset }) => {
  const [sel, setSel] = React.useState(result.sheets[0]?.anim);
  const sheet = result.sheets.find(s => s.anim === sel);

  const download = (url, name) => {
    const a = document.createElement('a');
    a.href = url; a.download = name; a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div style={{display:'grid', gap:16}}>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title" style={{color:'var(--verdant)'}}>✓ Sprites generated</div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn" onClick={onReset}><Icon name="add" size={12}/> New</button>
          </div>
        </div>
        <div className="panel-body">

          {/* Animation tabs */}
          <div className="chip-row" style={{marginBottom:16}}>
            {result.sheets.map(s => {
              const def = ANIM_TYPES.find(x => x.id === s.anim);
              return (
                <div key={s.anim} className={`chip ${sel===s.anim?'active':''}`} onClick={() => setSel(s.anim)}>
                  {def?.icon} {s.anim}
                </div>
              );
            })}
          </div>

          {/* Spritesheet preview */}
          {sheet && (
            <div style={{marginBottom:16}}>
              <div style={{
                background:'repeating-conic-gradient(#1a1408 0% 25%, #2a2010 0% 50%) 0 0 / 16px 16px',
                borderRadius:6, padding:16, border:'1px solid var(--rule)',
                display:'flex', alignItems:'center', justifyContent:'center', minHeight:160,
              }}>
                <img src={sheet.url} alt={sheet.anim}
                  style={{maxWidth:'100%', maxHeight:280, imageRendering: result.style==='pixel_art' ? 'pixelated' : 'auto'}}
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                />
                <div style={{display:'none', color:'var(--ink-faint)', fontFamily:'var(--mono)', fontSize:11}}>
                  Preview unavailable — use download link
                </div>
              </div>
              <div style={{display:'flex', gap:8, marginTop:10}}>
                <button className="btn btn-primary" onClick={() => download(sheet.url, `${result.id}-${sheet.anim}.png`)}>
                  ↓ Download {sheet.anim}.png
                </button>
                <a href={sheet.url} target="_blank" rel="noopener noreferrer" className="btn">Open ↗</a>
              </div>
            </div>
          )}

          {/* Metadata */}
          <dl className="kv" style={{marginTop:8}}>
            <dt>Character</dt><dd style={{fontFamily:'var(--mono)', fontSize:11}}>{result.id}</dd>
            <dt>Style</dt><dd>{result.style}{result.style==='pixel_art' ? ` · ${result.size}px` : ''}</dd>
            <dt>Sheets</dt><dd>{result.sheets.length} animations</dd>
          </dl>

          {/* Download all */}
          {result.sheets.length > 1 && (
            <div style={{marginTop:14, paddingTop:14, borderTop:'1px solid var(--rule)'}}>
              <div className="field-label" style={{marginBottom:8}}>All animations</div>
              {result.sheets.map(s => (
                <div key={s.anim} style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                  <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-dim)', width:70}}>{s.anim}</span>
                  <button className="btn" style={{flex:1, fontSize:11}} onClick={() => download(s.url, `${result.id}-${s.anim}.png`)}>
                    ↓ {s.anim}.png
                  </button>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="btn" style={{fontSize:11}}>↗</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Gallery Tab ──────────────────────────────────────────────────────────

const GalleryTab = ({ gallery, setGallery }) => {
  const [sel, setSel] = React.useState(null);
  const entry = sel !== null ? gallery[sel] : null;

  const removeEntry = idx => {
    const next = gallery.filter((_, i) => i !== idx);
    setGallery(next);
    localStorage.setItem('mss:sprite-gallery', JSON.stringify(next));
    if (sel === idx) setSel(null);
  };

  if (gallery.length === 0) {
    return (
      <div className="panel" style={{padding:48, textAlign:'center'}}>
        <div style={{fontSize:32, marginBottom:12}}>🖼</div>
        <div style={{fontFamily:'var(--serif)', fontStyle:'italic', color:'var(--ink-faint)'}}>
          No sprites generated yet. Build something in the Forge.
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'grid', gridTemplateColumns: entry ? '1fr 420px' : '1fr', gap:24, alignItems:'start'}}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12}}>
        {gallery.map((g, i) => (
          <div key={g.id + i} className="panel" onClick={() => setSel(i)}
            style={{cursor:'pointer', border: sel===i ? '1px solid var(--gold-bright)' : undefined}}>
            <div style={{
              background:'repeating-conic-gradient(#1a1408 0% 25%, #2a2010 0% 50%) 0 0 / 12px 12px',
              height:100, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'6px 6px 0 0',
            }}>
              {g.sheets[0]?.url
                ? <img src={g.sheets[0].url} style={{maxHeight:90, maxWidth:'100%', imageRendering: g.style==='pixel_art'?'pixelated':'auto'}}/>
                : <span style={{fontSize:32}}>⚡</span>}
            </div>
            <div style={{padding:'8px 10px'}}>
              <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--gold-bright)', marginBottom:2}}>
                {g.style} {g.style==='pixel_art' ? `· ${g.size}px` : ''}
              </div>
              <div style={{fontFamily:'var(--serif)', fontSize:12, color:'var(--ink-dim)', lineHeight:1.3,
                           overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{g.desc}</div>
              <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-faint)', marginTop:4}}>
                {g.sheets.length} sheets · {new Date(g.created).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {entry && (
        <div className="panel" style={{position:'sticky', top:0}}>
          <div className="panel-head">
            <div className="panel-title">Sheets</div>
            <button className="btn" onClick={() => removeEntry(sel)} style={{color:'var(--ember)'}}>✕ Remove</button>
          </div>
          <div className="panel-body">
            {entry.sheets.map(s => (
              <div key={s.anim} style={{marginBottom:14}}>
                <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--gold-bright)', marginBottom:6, letterSpacing:'.14em', textTransform:'uppercase'}}>{s.anim}</div>
                <img src={s.url} alt={s.anim}
                  style={{width:'100%', imageRendering: entry.style==='pixel_art'?'pixelated':'auto',
                          background:'repeating-conic-gradient(#1a1408 0% 25%, #2a2010 0% 50%) 0 0 / 12px 12px',
                          borderRadius:4}}/>
                <a href={s.url} download={`${entry.id}-${s.anim}.png`} target="_blank" rel="noopener noreferrer"
                  className="btn" style={{marginTop:6, display:'block', textAlign:'center', textDecoration:'none', fontSize:12}}>
                  ↓ Download {s.anim}.png
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

window.SpriteForge = SpriteForge;
