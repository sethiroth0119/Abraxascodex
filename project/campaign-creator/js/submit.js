/* ====================================================================
   Mythic Spellbook Stories — Cinder economy, submission, voice, receipt
   ==================================================================== */
(function(){
  const SIG = '\u2726';
  const COST_PER   = 50;
  const ACQUIRE    = 100;
  const MIN_TALE   = 40;
  const MAX_AUDIO  = 15 * 1024 * 1024;   // 15 MB
  const LS_KEY     = 'mythicSpellbook.v1';

  const PLAY_SVG  = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>`;
  const PAUSE_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>`;

  const EMPTY_DRAFT = {
    fullname:'', username:'', email:'', social:'',
    audioName:'', audioSize:0, audioData:'',
    nodeHolder:false, nodeTier:'',
    title:'', node:'', realm:'', tale:''
  };
  // fields carried over to the next telling (identity persists)
  const IDENTITY = ['fullname','username','email','social','nodeHolder','nodeTier'];

  // ── state --------------------------------------------------------------
  function load(){
    try{
      const raw = JSON.parse(localStorage.getItem(LS_KEY));
      if(raw && typeof raw === 'object'){
        return {
          balance: +raw.balance || 0,
          submissions: Array.isArray(raw.submissions) ? raw.submissions : [],
          draft: Object.assign({}, EMPTY_DRAFT, raw.draft||{}),
          cost: COST_PER
        };
      }
    }catch(e){}
    return { balance:0, submissions:[], draft:Object.assign({},EMPTY_DRAFT), cost:COST_PER };
  }
  const CODEX = window.CODEX = load();
  CODEX.cost = COST_PER;

  // serialize with or without heavy audio bytes
  function serialize(withAudio){
    const d = Object.assign({}, CODEX.draft);
    if(!withAudio) d.audioData = '';
    const subs = CODEX.submissions.map(s => withAudio ? s : Object.assign({}, s, {audioData:''}));
    return { balance:CODEX.balance, submissions:subs, draft:d };
  }
  function save(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify(serialize(true)));
    }catch(e){
      // quota — drop audio bytes but keep names/sizes
      try{ localStorage.setItem(LS_KEY, JSON.stringify(serialize(false))); }catch(e2){}
    }
  }

  // ── purse HUD ----------------------------------------------------------
  function updatePurse(pulse){
    const amt = document.getElementById('purseAmt');
    if(amt) amt.textContent = CODEX.balance;
    if(pulse){
      const purse = document.getElementById('purse');
      if(purse){ purse.classList.remove('pulse'); void purse.offsetWidth; purse.classList.add('pulse'); }
    }
  }

  // ── toast --------------------------------------------------------------
  let toastT;
  function toast(msg){
    const t = document.getElementById('toast');
    if(!t) return;
    t.innerHTML = msg;
    t.hidden = false;
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=> t.hidden=true, 320); }, 2600);
  }

  // ── field binding (delegated) -----------------------------------------
  const book = document.getElementById('book');

  function setField(f){
    const k = f.dataset.field;
    CODEX.draft[k] = (f.type === 'checkbox') ? f.checked : f.value;
    save();
    if(k === 'tale') updateMeter();
    clearErr();
  }
  function clearErr(){
    const msg = document.getElementById('castMsg');
    if(msg && msg.classList.contains('err')){ msg.textContent=''; msg.classList.remove('err'); }
  }

  book.addEventListener('input', e=>{
    const f = e.target.closest('[data-field]');
    if(f) setField(f);
  });
  book.addEventListener('change', e=>{
    const file = e.target.closest('[data-file="audio"]');
    if(file){ handleAudio(file); return; }
    const f = e.target.closest('[data-field]');
    if(!f) return;
    setField(f);
    if(f.dataset.field === 'nodeHolder' && window.refreshBook) window.refreshBook(); // reveal/hide tier
  });

  // ── voice upload -------------------------------------------------------
  function handleAudio(input){
    const file = input.files && input.files[0];
    if(!file) return;
    const okType = /audio\/(mpeg|wav|x-wav|wave)/i.test(file.type) || /\.(mp3|wav)$/i.test(file.name);
    if(!okType){ toast('The voice must be an MP3 or WAV.'); input.value=''; return; }
    if(file.size > MAX_AUDIO){ toast('That recording is too large (max 15 MB).'); input.value=''; return; }
    const reader = new FileReader();
    reader.onload = ()=>{
      CODEX.draft.audioName = file.name;
      CODEX.draft.audioSize = file.size;
      CODEX.draft.audioData = reader.result;     // data URL — plays directly
      save();
      if(window.refreshBook) window.refreshBook();
      toast('Voice attached to thy telling.');
    };
    reader.onerror = ()=> toast('That recording could not be read.');
    reader.readAsDataURL(file);
  }
  function removeVoice(){
    CODEX.draft.audioName=''; CODEX.draft.audioSize=0; CODEX.draft.audioData='';
    stopAudio();
    save();
    if(window.refreshBook) window.refreshBook();
  }

  // ── audio playback -----------------------------------------------------
  let curAudio=null, curBtn=null;
  function setPlayIcon(btn, playing){
    if(!btn) return;
    const label = btn.classList.contains('t-voice') ? ' Voice' : '';
    btn.innerHTML = (playing ? PAUSE_SVG : PLAY_SVG) + label;
    btn.classList.toggle('playing', playing);
  }
  function stopAudio(){
    if(curAudio){ curAudio.pause(); }
    if(curBtn){ setPlayIcon(curBtn, false); }
    curAudio = null; curBtn = null;
  }
  function toggleAudio(src, btn){
    if(!src){ toast('That voice is no longer kept — re-attach to hear it.'); return; }
    if(curAudio && curBtn===btn && !curAudio.paused){ stopAudio(); return; }
    stopAudio();
    curAudio = new Audio(src); curBtn = btn;
    setPlayIcon(btn, true);
    curAudio.play().catch(()=>{ setPlayIcon(btn,false); toast('The voice could not be played here.'); });
    curAudio.onended = ()=> setPlayIcon(btn, false);
  }

  // ── tale-length meter --------------------------------------------------
  function updateMeter(){
    const m = document.getElementById('taleMeter');
    if(!m) return;
    const n = (CODEX.draft.tale||'').trim().length;
    const pct = Math.max(n?6:0, Math.min(100, n/MIN_TALE*100));
    m.querySelector('i').style.width = pct + '%';
    const txt = m.querySelector('.meter-txt');
    if(n === 0)            txt.textContent = 'Begin thy telling\u2026';
    else if(n < MIN_TALE)  txt.textContent = n + ' / ' + MIN_TALE + ' \u2014 a few more words';
    else                   txt.textContent = n + ' characters \u2014 the embers are ready';
    m.classList.toggle('ready', n >= MIN_TALE);
  }
  window.afterRender = function(){ updateMeter(); };

  // ── actions ------------------------------------------------------------
  document.addEventListener('click', e=>{
    const el = e.target.closest('[data-action]');
    if(!el) return;
    e.preventDefault(); e.stopPropagation();
    const a = el.dataset.action;
    if(a==='acquire')               acquire();
    else if(a==='cast')             cast();
    else if(a==='voice-play')       toggleAudio(CODEX.draft.audioData, el);
    else if(a==='voice-remove')     removeVoice();
    else if(a==='play-telling'){ const s = CODEX.submissions.find(x=>x.id===el.dataset.id); toggleAudio(s&&s.audioData, el); }
    else if(a==='inscribe-another') closeReceipt(false);
    else if(a==='view-tellings')    closeReceipt(true);
  });

  function acquire(){
    CODEX.balance += ACQUIRE;
    save(); updatePurse(true);
    if(window.refreshBook) window.refreshBook();
    toast(`${ACQUIRE} ${SIG} Cinder kindled to thy purse.`);
  }

  // ── cast a telling -----------------------------------------------------
  function castError(text, face){
    const msg = document.getElementById('castMsg');
    if(msg && (face===undefined || face===5)){
      msg.textContent = text; msg.classList.add('err');
    } else {
      toast(text);
      if(face!==undefined && window.goToFace) window.goToFace(face);
    }
    const btn = document.querySelector('.cast-btn');
    if(btn){ btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); }
  }

  function cast(){
    const d = CODEX.draft;
    const v = k => (d[k]||'').trim();
    const fullname=v('fullname'), username=v('username'), email=v('email'), social=v('social');
    const title=v('title'), node=v('node'), realm=v('realm'), tale=v('tale');

    // identity (page 4)
    if(!fullname) return castError('Thy full name is needed, that the scribes may know thee.', 4);
    if(!username) return castError('Thy Spellbook username is needed.', 4);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return castError('A valid email is needed for the reading.', 4);
    if(!social)   return castError('Name thy social, that thy tale be credited.', 4);
    if(d.nodeHolder && !v('nodeTier')) return castError('Choose thy Node tier, Node-holder.', 4);

    // the telling (page 5)
    if(!title)  return castError('Thy tale wants a title.');
    if(!node)   return castError('Name the node thy tale shall serve.');
    if(!realm)  return castError('Choose the realm thy tale shall touch.');
    if(tale.length < MIN_TALE) return castError(`The telling is too brief \u2014 at least ${MIN_TALE} characters (${tale.length} so far).`);

    const free = CODEX.submissions.length === 0;
    const cost = free ? 0 : COST_PER;
    if(!free && CODEX.balance < cost){
      return castError(`This telling asks ${cost} ${SIG} Cinder, yet thy purse holds ${CODEX.balance}. Acquire more.`);
    }

    const entry = {
      id: 'C-' + Date.now().toString(36).toUpperCase(),
      fullname, username, email, social,
      audioName:d.audioName, audioSize:d.audioSize, audioData:d.audioData,
      nodeHolder:!!d.nodeHolder, nodeTier:d.nodeHolder?v('nodeTier'):'',
      title, node, realm, tale, cost, ts: Date.now()
    };
    CODEX.submissions.push(entry);
    CODEX.balance -= cost;

    // keep identity, clear the tale-specific fields
    const next = Object.assign({}, EMPTY_DRAFT);
    IDENTITY.forEach(k => next[k] = d[k]);
    CODEX.draft = next;

    stopAudio();
    save(); updatePurse(true);
    showReceipt(entry);
  }

  // ── receipt overlay ----------------------------------------------------
  function showReceipt(entry){
    const veil = document.getElementById('receiptVeil');
    document.getElementById('rTitle').textContent = '\u201C' + entry.title + '\u201D';
    document.getElementById('rId').textContent = entry.id;
    let rows =
      `<div class="r-row"><span>Teller</span><b>${escapeHTML(entry.username || entry.fullname)}</b></div>
       <div class="r-row"><span>Node &middot; Realm</span><b>${escapeHTML(entry.node)} &middot; ${escapeHTML(entry.realm)}</b></div>`;
    if(entry.nodeTier) rows += `<div class="r-row"><span>Node Tier</span><b>${escapeHTML(entry.nodeTier)}</b></div>`;
    if(entry.audioName) rows += `<div class="r-row"><span>Voice</span><b class="r-voice"><button type="button" class="t-voice" data-action="play-telling" data-id="${entry.id}">${PLAY_SVG} Voice</button></b></div>`;
    rows += `<div class="r-row"><span>Kindled</span><b>${entry.cost ? entry.cost + ' ' + SIG + ' Cinder' : 'Free'}</b></div>
       <div class="r-row"><span>Purse remaining</span><b>${CODEX.balance} ${SIG} Cinder</b></div>`;
    document.getElementById('rRows').innerHTML = rows;
    veil.hidden = false;
    void veil.offsetWidth;
    veil.classList.add('show');
  }
  function closeReceipt(toTellings){
    const veil = document.getElementById('receiptVeil');
    stopAudio();
    veil.classList.remove('show');
    setTimeout(()=> veil.hidden = true, 280);
    if(toTellings){
      if(window.goToFace) window.goToFace(6);
    } else {
      if(window.refreshBook) window.refreshBook();
      if(window.goToFace) window.goToFace(4);   // back to the start of the form
      toast('Thy tale rests in the embers. Inscribe another.');
    }
  }

  function escapeHTML(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // ── init ---------------------------------------------------------------
  updatePurse(false);
  window.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ const v=document.getElementById('receiptVeil'); if(v && !v.hidden) closeReceipt(false); }
  });
})();
