// Dialogue & Story — every line a character says, organized by scene.
// Each scene is a sequence of lines, with a speaker, audience, mood, and context.
// Athena can proofread, write IN-character, or write in a NARRATIVE voice.

window.DIALOGUES = window.DIALOGUES || [];

const LINE_KINDS = [
  { id:'spoken',     name:'Spoken',      icon:'❝' },
  { id:'whisper',    name:'Whisper',     icon:'…' },
  { id:'shout',      name:'Shout',       icon:'!' },
  { id:'narration',  name:'Narration',   icon:'☞' },
  { id:'bark',       name:'Bark (in-game)', icon:'⚡' },
  { id:'choice',     name:'Player choice', icon:'◆' },
  { id:'thought',    name:'Thought',     icon:'…' },
  { id:'song',       name:'Song / chant', icon:'♪' },
];

const MOODS = ['neutral','cold','warm','amused','dry','tired','resolved','curious','quiet','angry','grieving','hopeful','sly','fearful'];

const DIALOGUE_STATUSES = ['Draft','In review','Approved','Final','Cut'];

function rtNow(ts) {
  if(!ts) return '—';
  const d = Date.now() - ts;
  if(d < 60_000) return 'just now';
  if(d < 3_600_000) return Math.floor(d/60_000) + 'm ago';
  if(d < 86_400_000) return Math.floor(d/3_600_000) + 'h ago';
  return Math.floor(d/86_400_000) + 'd ago';
}

// Athena-as-character / narrator generators
async function athenaWriteLine({ scene, prev, speaker, audience, mood, kind, mode }) {
  const heroes = window.HEROES || [];
  const speakerData = heroes.find(h => h.name === speaker);
  const audienceData = heroes.find(h => h.name === audience);

  const prevLines = (prev||[]).slice(-8).map(l => `${l.speaker} (${l.mood}, ${l.kind}): "${l.text}"`).join('\n');

  let promptCore;
  if(mode === 'in-character') {
    promptCore = `Write ONE LINE of dialogue in the voice of ${speaker}.
${speakerData ? `\nWHO THEY ARE:\nMission: ${speakerData.mission || '\u2014'}\nPersonality: ${(speakerData.personality||[]).join(', ')}\nVoice: ${speakerData.voice || '\u2014'}\nBio: ${(speakerData.bio||'').slice(0,260)}` : ''}
${audienceData ? `\nWHO THEY ARE TALKING TO:\n${audienceData.name} — ${(audienceData.personality||[]).join(', ')}\nMission: ${audienceData.mission||'\u2014'}` : audience ? `\nTalking to: ${audience}` : ''}
Mood: ${mood}. Kind of line: ${kind}.

Output ONLY the line itself. No quote marks. No stage directions unless natural to the world (Abraxas — dark fantasy, illuminated-manuscript tone, dialogue often elliptical, slightly archaic). Maximum two sentences.`;
  } else if(mode === 'narrator') {
    promptCore = `Write ONE LINE of NARRATIVE prose to insert between dialogue lines.
The narrator's tone is the world of Abraxas — dark fantasy, illuminated manuscript, dry but not arch. Past tense. Maximum two sentences.

Output ONLY the narration. No quote marks, no labels.`;
  } else {
    promptCore = `Write ONE LINE of dialogue for ${speaker || 'a character'} addressing ${audience || 'the listener'}, mood ${mood}, kind ${kind}.
Output ONLY the line. Two sentences max.`;
  }

  const fullPrompt = `${promptCore}

SCENE: ${scene}
${prevLines ? `\nPRIOR LINES IN SCENE:\n${prevLines}\n` : ''}`;

  return await window.claude.complete({ messages:[{ role:'user', content: fullPrompt }] });
}

async function athenaProofread({ line, speaker, mood, kind, scene, context }) {
  const heroes = window.HEROES || [];
  const speakerData = heroes.find(h => h.name === speaker);

  const prompt = `You are Athena, an editor on this game's dialogue team. Proofread the following line.
- Does it sound like ${speaker}'s voice?
- Does it match the mood "${mood}" and kind "${kind}"?
- Any grammar / typo issues?
- Suggest ONE alternate phrasing.

${speakerData ? `\nCHARACTER VOICE:\n${speakerData.voice || '(no voice defined)'}\nPersonality: ${(speakerData.personality||[]).join(', ')}` : ''}

SCENE: ${scene}
CONTEXT: ${context}

THE LINE:
"${line}"

Reply concisely. 3-5 sentences. End with "Alt:" followed by your suggested rewrite on a new line.`;

  return await window.claude.complete({ messages:[{ role:'user', content: prompt }] });
}

const DialoguePage = () => {
  const [dialogues, setDialogues] = window.useEntities ? window.useEntities('dialogues') : React.useState(window.DIALOGUES);
  const [sel, setSel] = React.useState(dialogues[0]?.id);
  const [q, setQ] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [busy, setBusy] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null); // { lineId, text }
  const [draftMode, setDraftMode] = React.useState({ open:false, mode:'in-character', speaker:'', audience:'', mood:'neutral', kind:'spoken' });
  const settings = (window.SETTINGS||{});
  const me = settings.designerName || 'You';

  React.useEffect(() => { if(!dialogues.find(d=>d.id===sel) && dialogues.length) setSel(dialogues[0].id); }, [dialogues, sel]);

  // Expose to Athena's global focus
  React.useEffect(() => {
    if(sel) {
      window.STATE = window.STATE || {};
      const cur = dialogues.find(d=>d.id===sel);
      if(cur) {
        window.STATE.athenaFocus = { kind:'dialogue', data: cur };
        window.dispatchEvent(new CustomEvent('studio:focus-change'));
      }
    }
  }, [sel, dialogues]);

  const current = dialogues.find(d => d.id === sel);
  const filtered = dialogues.filter(d =>
    (filterStatus==='all' || d.status===filterStatus)
    && (!q || d.title.toLowerCase().includes(q.toLowerCase()) || (d.lines||[]).some(l => (l.text||'').toLowerCase().includes(q.toLowerCase())))
  );

  // mutators
  const updateScene = (id, patch) => setDialogues(dialogues.map(d => d.id===id ? {...d, ...patch, updated: Date.now()} : d));
  const updateLine = (sceneId, lineId, patch) => {
    const s = dialogues.find(d=>d.id===sceneId);
    updateScene(sceneId, { lines: s.lines.map(l => l.id===lineId ? {...l, ...patch} : l) });
  };
  const moveLine = (sceneId, lineId, dir) => {
    const s = dialogues.find(d=>d.id===sceneId);
    const i = s.lines.findIndex(l => l.id===lineId);
    const j = i + dir;
    if(j<0 || j>=s.lines.length) return;
    const next = [...s.lines];
    [next[i], next[j]] = [next[j], next[i]];
    updateScene(sceneId, { lines: next });
  };
  const addLine = (sceneId, afterId=null, init={}) => {
    const s = dialogues.find(d=>d.id===sceneId);
    const newLine = { id:'l'+Date.now().toString(36),
      speaker: init.speaker || (s.lines[s.lines.length-1]?.speaker || ''),
      to: init.to || (s.lines[s.lines.length-1]?.to || ''),
      mood: init.mood || 'neutral', kind: init.kind || 'spoken',
      text: init.text || '' };
    let next;
    if(afterId) {
      const i = s.lines.findIndex(l => l.id===afterId);
      next = [...s.lines.slice(0,i+1), newLine, ...s.lines.slice(i+1)];
    } else {
      next = [...s.lines, newLine];
    }
    updateScene(sceneId, { lines: next });
    return newLine.id;
  };
  const removeLine = (sceneId, lineId) => {
    if(!confirm('Remove this line?')) return;
    const s = dialogues.find(d=>d.id===sceneId);
    updateScene(sceneId, { lines: s.lines.filter(l => l.id!==lineId) });
  };
  const createScene = () => {
    const id = (window.makeId ? window.makeId('dlg') : 'dlg-'+Date.now().toString(36));
    const scene = { id, title:'New Scene', scene:'(setting)',
      context:'Describe what is happening and what just happened.',
      triggers:'',  location:'', tags:[], status:'Draft',
      author:me, created:Date.now(), updated:Date.now(),
      lines:[] };
    setDialogues([scene, ...dialogues]);
    setSel(id);
  };
  const removeScene = (id) => {
    if(!confirm(`Delete the scene "${current.title}" and all its lines?`)) return;
    setDialogues(dialogues.filter(d=>d.id!==id));
    setSel(dialogues[0]?.id);
  };

  // Athena: write a new line via the modal
  const generateLine = async () => {
    setBusy(true);
    try {
      const text = await athenaWriteLine({
        scene: `${current.title} — ${current.scene}. ${current.context}`,
        prev: current.lines,
        speaker: draftMode.speaker,
        audience: draftMode.audience,
        mood: draftMode.mood,
        kind: draftMode.kind,
        mode: draftMode.mode,
      });
      const isNarration = draftMode.mode === 'narrator';
      addLine(current.id, null, {
        speaker: isNarration ? 'Narrator' : draftMode.speaker,
        to: isNarration ? '(player)' : draftMode.audience,
        mood: draftMode.mood,
        kind: isNarration ? 'narration' : draftMode.kind,
        text: text.trim().replace(/^["“]|["”]$/g,''),
      });
      setDraftMode({...draftMode, open:false});
    } catch(err) {
      alert('Athena stumbled: ' + (err.message||err));
    } finally { setBusy(false); }
  };

  // Athena: proofread one line
  const proofreadLine = async (lineId) => {
    const line = current.lines.find(l => l.id === lineId);
    if(!line) return;
    setFeedback({ lineId, text: 'thinking…', busy:true });
    try {
      const reply = await athenaProofread({
        line: line.text, speaker: line.speaker, mood: line.mood, kind: line.kind,
        scene: `${current.title} — ${current.scene}`, context: current.context,
      });
      setFeedback({ lineId, text: reply, busy:false });
    } catch(err) {
      setFeedback({ lineId, text: 'Athena stumbled: ' + (err.message||err), busy:false });
    }
  };

  // Quick name dropdown source — heroes + a few standard speakers
  const speakerOptions = [
    ...(window.HEROES||[]).map(h => h.name),
    'Narrator','(player)','(unknown)',
  ];

  if(!current) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title"><span className="ornament">❝</span>Dialogue &amp; Story</h1>
            <div className="page-sub">No scenes yet — create your first one to begin.</div>
          </div>
          <div className="page-actions"><button className="btn btn-primary" onClick={createScene}><Icon name="add" size={14}/> New scene</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ornament">❝</span>Dialogue &amp; Story</h1>
          <div className="page-sub">{dialogues.length} scene{dialogues.length!==1?'s':''} · {dialogues.reduce((s,d)=>s+(d.lines||[]).length,0)} lines · Athena can proofread &amp; write in-character</div>
        </div>
        <div className="page-actions">
          <div className="search" style={{width:220}}>
            <Icon name="search" size={14}/>
            <input placeholder="Search scenes &amp; lines..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={createScene}><Icon name="add" size={14}/> New scene</button>
        </div>
      </div>

      <div className="chip-row" style={{marginBottom:16}}>
        <div className={`chip ${filterStatus==='all'?'active':''}`} onClick={()=>setFilterStatus('all')}>All ({dialogues.length})</div>
        {DIALOGUE_STATUSES.map(s => {
          const n = dialogues.filter(d=>d.status===s).length;
          if(!n) return null;
          return <div key={s} className={`chip ${filterStatus===s?'active':''}`} onClick={()=>setFilterStatus(filterStatus===s?'all':s)}>{s} ({n})</div>;
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:24,alignItems:'start'}}>
        {/* Scene list */}
        <aside className="wiki-toc">
          <div className="toc-h">Scenes</div>
          {filtered.map(d => (
            <div key={d.id} className={`toc-item ${sel===d.id?'active':''}`} onClick={()=>setSel(d.id)}>
              <div style={{fontFamily:'var(--display)',letterSpacing:'.04em'}}>{d.title}</div>
              <div style={{fontSize:10,color:'var(--ink-faint)',marginTop:2,fontFamily:'var(--mono)',display:'flex',justifyContent:'space-between'}}>
                <span>{d.status}</span>
                <span>{(d.lines||[]).length} 💬</span>
              </div>
            </div>
          ))}
          {filtered.length===0 && <div style={{padding:'10px',color:'var(--ink-faint)',fontStyle:'italic',fontSize:12}}>No scenes match.</div>}
        </aside>

        {/* Scene detail */}
        <main style={{minWidth:0}}>
          {/* Header */}
          <div className="panel" style={{marginBottom:18}}>
            <div className="panel-body">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)',marginBottom:4}}>
                    Scene · by {current.author} · last edit {rtNow(current.updated)}
                  </div>
                  <input value={current.title} onChange={e=>updateScene(current.id,{title:e.target.value})}
                    style={{width:'100%',background:'transparent',border:'none',outline:'none',
                      fontFamily:'var(--display)',fontSize:32,letterSpacing:'.04em',color:'var(--gold-bright)',padding:0,fontWeight:500}}/>
                  <input value={current.scene||''} onChange={e=>updateScene(current.id,{scene:e.target.value})}
                    placeholder="Where / when"
                    style={{width:'100%',background:'transparent',border:'none',outline:'none',
                      fontFamily:'var(--serif)',fontStyle:'italic',fontSize:16,color:'var(--ink-dim)',padding:0,marginTop:4}}/>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                  <select className="field-select" value={current.status} onChange={e=>updateScene(current.id,{status:e.target.value})} style={{width:140,padding:'4px 8px',fontSize:11}}>
                    {DIALOGUE_STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                  <button className="btn" onClick={()=>removeScene(current.id)} style={{color:'var(--ember)'}}>✕</button>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Trigger / where it plays</label>
                  <input className="field-input" value={current.triggers||''} onChange={e=>updateScene(current.id,{triggers:e.target.value})}
                         placeholder="e.g. After completing X · campaign-only · cannot replay"/>
                </div>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Location</label>
                  <input className="field-input" value={current.location||''} onChange={e=>updateScene(current.id,{location:e.target.value})}/>
                </div>
              </div>

              <div className="field" style={{margin:0,marginTop:10}}>
                <label className="field-label">Context (what just happened, why this scene matters)</label>
                <textarea className="field-area" rows="3" value={current.context||''} onChange={e=>updateScene(current.id,{context:e.target.value})}/>
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="section-head" style={{marginBottom:12}}>
            <div className="section-title">Lines <span className="ornament">·</span> {(current.lines||[]).length}</div>
            <div style={{display:'flex',gap:6}}>
              <button className="btn" onClick={()=>setDraftMode({...draftMode, open:true, mode:'in-character', speaker: speakerOptions[0]||''})} title="Athena writes a new line in-character">
                🦉 Write a line
              </button>
              <button className="btn" onClick={()=>setDraftMode({...draftMode, open:true, mode:'narrator', speaker:'Narrator'})} title="Athena writes narration">
                🦉 Narrate
              </button>
              <button className="btn btn-primary" onClick={()=>addLine(current.id)}><Icon name="add" size={12}/> Add line</button>
            </div>
          </div>

          <div className="dialogue-stack">
            {(current.lines||[]).map((line, idx) => {
              const isNarrator = line.kind === 'narration' || line.speaker === 'Narrator';
              const speakerHero = (window.HEROES||[]).find(h=>h.name===line.speaker);
              const speakerInitial = (line.speaker||'?')[0];
              const isFeedbackHere = feedback && feedback.lineId === line.id;
              return (
                <div key={line.id} className={`dlg-line ${isNarrator?'is-narration':''}`}>
                  <div className="dlg-avatar" title={line.speaker}>
                    {speakerHero?.glyph || (isNarrator ? '☞' : speakerInitial)}
                  </div>
                  <div className="dlg-body">
                    <div className="dlg-meta">
                      <select value={line.speaker} onChange={e=>updateLine(current.id, line.id, {speaker:e.target.value})} className="dlg-tiny-select">
                        <option value="">— speaker —</option>
                        {speakerOptions.map(n => <option key={n}>{n}</option>)}
                        <option value={line.speaker}>{line.speaker || ''}</option>
                      </select>
                      <span className="dlg-arrow">→</span>
                      <select value={line.to||''} onChange={e=>updateLine(current.id, line.id, {to:e.target.value})} className="dlg-tiny-select">
                        <option value="">— to —</option>
                        {speakerOptions.map(n => <option key={n}>{n}</option>)}
                        <option value={line.to}>{line.to || ''}</option>
                      </select>
                      <select value={line.kind||'spoken'} onChange={e=>updateLine(current.id, line.id, {kind:e.target.value})} className="dlg-tiny-select">
                        {LINE_KINDS.map(k=><option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
                      </select>
                      <select value={line.mood||'neutral'} onChange={e=>updateLine(current.id, line.id, {mood:e.target.value})} className="dlg-tiny-select">
                        {MOODS.map(m=><option key={m}>{m}</option>)}
                      </select>
                      <div style={{marginLeft:'auto',display:'flex',gap:4}}>
                        <button className="btn btn-ghost" style={{padding:'2px 6px',fontSize:11}} onClick={()=>moveLine(current.id, line.id, -1)} disabled={idx===0}>↑</button>
                        <button className="btn btn-ghost" style={{padding:'2px 6px',fontSize:11}} onClick={()=>moveLine(current.id, line.id, 1)} disabled={idx===current.lines.length-1}>↓</button>
                        <button className="btn btn-ghost" style={{padding:'2px 6px',fontSize:11}} onClick={()=>addLine(current.id, line.id)}><Icon name="add" size={11}/></button>
                        <button className="btn btn-ghost" style={{padding:'2px 6px',fontSize:11}} onClick={()=>proofreadLine(line.id)} title="Athena proofreads this line">🦉</button>
                        <button className="btn btn-ghost" style={{padding:'2px 6px',fontSize:11,color:'var(--ember)'}} onClick={()=>removeLine(current.id, line.id)}>✕</button>
                      </div>
                    </div>
                    <textarea className={`dlg-text ${isNarrator?'is-narration':''}`}
                      value={line.text||''}
                      onChange={e=>updateLine(current.id, line.id, {text:e.target.value})}
                      placeholder={isNarrator?'Narrative prose…':'What does ' + (line.speaker||'they') + ' say?'}
                      rows="2"/>
                    {isFeedbackHere && (
                      <div className="dlg-feedback">
                        <div className="dlg-feedback-head">
                          <span>🦉 Athena · proofread</span>
                          <button className="btn btn-ghost" style={{padding:2,fontSize:11}} onClick={()=>setFeedback(null)}>✕</button>
                        </div>
                        <div className="dlg-feedback-body">{feedback.busy ? 'consulting the codex…' : feedback.text}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(current.lines||[]).length === 0 && (
              <div style={{padding:30,color:'var(--ink-faint)',fontStyle:'italic',textAlign:'center',border:'1px dashed var(--rule)',borderRadius:6}}>
                No lines yet. Click "Add line", or have Athena write one.
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="section" style={{marginTop:20}}>
            <div className="field-label" style={{marginBottom:6}}>Tags &amp; references</div>
            <div className="chip-row">
              {(current.tags||[]).map((t,i) => (
                <span key={i} className="chip active">{t}
                  <span style={{marginLeft:6,opacity:.7,cursor:'pointer'}} onClick={()=>updateScene(current.id,{tags:current.tags.filter((_,j)=>j!==i)})}>×</span>
                </span>
              ))}
              <input
                placeholder="+ tag (card id, hero id, theme…)"
                onKeyDown={e => {
                  if(e.key==='Enter' && e.target.value.trim()){
                    updateScene(current.id,{tags:[...(current.tags||[]), e.target.value.trim()]});
                    e.target.value='';
                  }
                }}
                style={{background:'transparent',border:'1px dashed var(--rule-strong)',borderRadius:99,color:'var(--ink)',padding:'4px 10px',fontSize:11,fontFamily:'var(--body)',width:200,outline:'none'}}/>
            </div>
          </div>
        </main>
      </div>

      {/* Write-a-line modal */}
      {draftMode.open && (
        <div className="hero-overlay" onClick={()=>!busy && setDraftMode({...draftMode, open:false})}>
          <div className="hero-sheet" onClick={e=>e.stopPropagation()} style={{maxWidth:620}}>
            <button className="sheet-close" onClick={()=>!busy && setDraftMode({...draftMode, open:false})}>✕</button>
            <div style={{padding:'28px 32px'}}>
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18}}>
                <div style={{width:56,height:56,borderRadius:'50%',display:'grid',placeItems:'center',
                  background:'radial-gradient(circle at 30% 30%, #d2b8ff, #6b4ea8 60%, #1a0f2a)',
                  boxShadow:'0 0 16px rgba(164,138,210,.4)',fontSize:28,flex:'none'}}>🦉</div>
                <div>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-faint)'}}>Athena · dialogue writer</div>
                  <h2 style={{margin:'4px 0 0',fontFamily:'var(--display)',fontSize:24,letterSpacing:'.04em',color:'#d2b8ff',fontWeight:500}}>
                    {draftMode.mode==='narrator' ? 'Narrate a beat' : 'Write a line in-character'}
                  </h2>
                </div>
              </div>

              {/* mode toggle */}
              <div className="chip-row" style={{marginBottom:14}}>
                <div className={`chip ${draftMode.mode==='in-character'?'active':''}`}
                     onClick={()=>setDraftMode({...draftMode,mode:'in-character'})}>In-character</div>
                <div className={`chip ${draftMode.mode==='narrator'?'active':''}`}
                     onClick={()=>setDraftMode({...draftMode,mode:'narrator'})}>Narrator voice</div>
              </div>

              {draftMode.mode === 'in-character' && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Speaker</label>
                    <select className="field-select" value={draftMode.speaker} onChange={e=>setDraftMode({...draftMode,speaker:e.target.value})}>
                      <option value="">— pick —</option>
                      {speakerOptions.map(n=><option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Speaking to</label>
                    <select className="field-select" value={draftMode.audience} onChange={e=>setDraftMode({...draftMode,audience:e.target.value})}>
                      <option value="">— pick —</option>
                      {speakerOptions.map(n=><option key={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div className="field" style={{margin:0}}>
                  <label className="field-label">Mood</label>
                  <select className="field-select" value={draftMode.mood} onChange={e=>setDraftMode({...draftMode,mood:e.target.value})}>
                    {MOODS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                {draftMode.mode === 'in-character' && (
                  <div className="field" style={{margin:0}}>
                    <label className="field-label">Kind of line</label>
                    <select className="field-select" value={draftMode.kind} onChange={e=>setDraftMode({...draftMode,kind:e.target.value})}>
                      {LINE_KINDS.filter(k=>k.id!=='narration').map(k=><option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={{padding:12,background:'rgba(164,138,210,.05)',border:'1px solid rgba(164,138,210,.25)',borderRadius:6,
                fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-dim)',fontSize:13,lineHeight:1.5}}>
                <b style={{color:'#d2b8ff',fontStyle:'normal'}}>Athena will read:</b> the scene "{current.title}", the context, and the {(current.lines||[]).length} prior line{(current.lines||[]).length!==1?'s':''}.
                {draftMode.mode==='in-character' && draftMode.speaker && (window.HEROES||[]).find(h=>h.name===draftMode.speaker) &&
                  ` She has access to ${draftMode.speaker}'s personality, voice, and mission from the Heroes module.`}
              </div>

              <div style={{display:'flex',gap:8,marginTop:18,paddingTop:14,borderTop:'1px solid var(--rule)'}}>
                <button className="btn" onClick={()=>!busy && setDraftMode({...draftMode,open:false})} disabled={busy}>Cancel</button>
                <div style={{flex:1}}/>
                <button className="btn btn-primary" onClick={generateLine}
                  disabled={busy || (draftMode.mode==='in-character' && !draftMode.speaker)}>
                  {busy ? '🦉 consulting the codex…' : '🦉 Generate line'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.DialoguePage = DialoguePage;
