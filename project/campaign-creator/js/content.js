// Mythic Spellbook Stories — page faces (string OR function returning HTML).
// Dynamic faces read window.CODEX (defined in submit.js, loaded before book.js).
// Spread pairing: L(i)=FACES[2i], R(i)=FACES[2i+1].

const EMBLEM = `<span class="emblem" aria-hidden="true"><span class="e-ring"></span><span class="e-diamond"></span><span class="e-core"></span></span>`;
const SIG = '\u2726'; // ✦ cinder sigil

function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function roman(n){ return ['I','II','III','IV','V','VI','VII','VIII','IX','X'][n-1] || ('№'+n); }
function fmtDate(ts){ try{ return new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric'}); }catch(e){ return ''; } }
function fmtSize(b){ if(!b) return ''; return b < 1048576 ? Math.max(1,Math.round(b/1024))+' KB' : (b/1048576).toFixed(1)+' MB'; }
const REALMS = ['The Emberwastes','The Frostmere Reach','The Sunken Keep','The Hollow Vault','The Verdant Sprawl','The Ashen Spire'];
const NODE_TIERS = ['Starter Node License','Outpost Operator','Foundation Contributor','Dominion Founder','Titan Node Founder','Eternal Founder'];

const MIC_SVG  = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><line x1="12" y1="17.5" x2="12" y2="21"/><line x1="8.5" y1="21" x2="15.5" y2="21"/></svg>`;
const PLAY_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>`;

// voice upload / chip markup (reads CODEX.draft)
function voiceMarkup(){
  const d = CODEX.draft;
  if(d.audioName){
    return `<div class="voice-chip">
      <button type="button" class="voice-play" data-action="voice-play" aria-label="Play voice">${PLAY_SVG}</button>
      <div class="voice-info"><b>${esc(d.audioName)}</b><span>${fmtSize(d.audioSize)} &middot; voice attached</span></div>
      <button type="button" class="voice-remove" data-action="voice-remove" aria-label="Remove voice">&times;</button>
    </div>`;
  }
  return `<label class="voice-drop">
    <input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/wave,.mp3,.wav" data-file="audio" hidden>
    <span class="vd-ic" aria-hidden="true">${MIC_SVG}</span>
    <span class="vd-t"><b>Lend your Voice</b><i>Attach an MP3 or WAV recording &middot; optional</i></span>
  </label>`;
}

window.FACES = [

// ── F0 · Frontispiece ───────────────────────────────────────────────────
`<div class="pg pg-frontis">
  <div class="frontis-inner">
    <p class="eyebrow">Volume the First &middot; of the Ember</p>
    ${EMBLEM}
    <h1 class="foil display">CAMPAIGN</h1>
    <span class="rule-orn"><i></i><b>${SIG}</b><i></i></span>
    <p class="frontis-sub">Mythic Spellbook Stories</p>
    <p class="frontis-note">Kept by the Keepers of the Ember,<br>for the nodes that hold the fire.</p>
  </div>
</div>`,

// ── F1 · Hero / Welcome (landing) ───────────────────────────────────────
`<div class="pg pg-hero">
  <div class="seal" aria-hidden="true"><span class="seal-in"><b>First</b><b>Telling</b><b>Free</b></span></div>
  <p class="eyebrow">Welcome, Keeper of the Flame</p>
  <h2 class="page-title">Cast your tale<br>into the embers.</h2>
  <p class="lede"><span class="dropcap">N</span>ode owners and kindred of the realm &mdash; the stories you tell here are gathered by our scribes and woven, by hand, into the living game. Your words become its world.</p>
  <p class="body">Your first telling is given freely. Each tale thereafter is kindled with <em>Cinder</em>, the ember-coin that powers the nodes.</p>
  <div class="btn-row">
    <button class="btn btn-gold" data-go="4">Begin a Campaign</button>
    <button class="btn btn-ghost" data-go="2">Learn the Rite</button>
  </div>
</div>`,

// ── F2 · How it works ───────────────────────────────────────────────────
`<div class="pg">
  <p class="eyebrow">How it works</p>
  <h2 class="page-title">The Rite<br>of Telling</h2>
  <ol class="rite">
    <li><span class="num">I</span><div class="rite-t"><h3>Pen your campaign</h3><p>Set down the tale you wish to see take root within the realm.</p></div></li>
    <li><span class="num">II</span><div class="rite-t"><h3>Cast it to the embers</h3><p>Submit your telling to the Keepers, and await the reading.</p></div></li>
    <li><span class="num">III</span><div class="rite-t"><h3>It becomes lore</h3><p>Chosen tales are woven by our scribes into the game itself.</p></div></li>
  </ol>
</div>`,

// ── F3 · The Cinder token (dynamic: balance + acquire) ──────────────────
() => `<div class="pg pg-cinder">
  <p class="eyebrow">The Ember-Coin</p>
  <h2 class="page-title">Cinder</h2>
  <div class="coin" aria-hidden="true"><span>C</span></div>
  <p class="body">Cinder keeps the fire. It powers the nodes that hold the realm aloft, and kindles every tale told beyond the first.</p>
  <ul class="ledger">
    <li><span class="k">First telling</span><span class="dots"></span><span class="v">Free</span></li>
    <li><span class="k">Each tale after</span><span class="dots"></span><span class="v">${CODEX.cost} ${SIG}</span></li>
    <li><span class="k">Kept by</span><span class="dots"></span><span class="v">Node &amp; Keeper</span></li>
  </ul>
  <p class="purse-line">In thy purse &mdash; <b>${CODEX.balance} ${SIG} Cinder</b></p>
  <button class="btn btn-gold" data-action="acquire">Acquire Cinder</button>
</div>`,

// ── F4 · The Teller (identity, voice, node-holder) ──────────────────────
() => `<div class="pg pg-teller">
  <p class="eyebrow">The Teller</p>
  <h2 class="page-title pt-tight">Who casts<br>this tale?</h2>
  <div class="form-real">
    <label class="rf"><span>Full Name</span>
      <input type="text" data-field="fullname" maxlength="80" value="${esc(CODEX.draft.fullname)}" placeholder="Thy true name&hellip;"></label>
    <div class="rf-row">
      <label class="rf"><span>Spellbook Username</span>
        <input type="text" data-field="username" maxlength="40" value="${esc(CODEX.draft.username)}" placeholder="@name"></label>
      <label class="rf"><span>Email</span>
        <input type="email" data-field="email" maxlength="120" value="${esc(CODEX.draft.email)}" placeholder="you@realm.com"></label>
    </div>
    <label class="rf"><span>Social Media</span>
      <input type="text" data-field="social" maxlength="120" value="${esc(CODEX.draft.social)}" placeholder="@handle or link"></label>
    <div class="voice-field">${voiceMarkup()}</div>
    <div class="node-holder">
      <label class="checkbox-row">
        <input type="checkbox" data-field="nodeHolder" ${CODEX.draft.nodeHolder?'checked':''} hidden>
        <span class="cb-box" aria-hidden="true"></span>
        <span class="cb-label">I hold a Node of the realm</span>
      </label>
      ${CODEX.draft.nodeHolder ? `<label class="rf node-tier"><span>Thy Node Tier</span>
        <span class="rf-select"><select data-field="nodeTier">
          <option value="" ${!CODEX.draft.nodeTier?'selected':''}>Choose thy tier&hellip;</option>
          ${NODE_TIERS.map(t=>`<option ${CODEX.draft.nodeTier===t?'selected':''}>${t}</option>`).join('')}
        </select></span></label>` : ''}
    </div>
  </div>
</div>`,

// ── F5 · The Telling (tale + cast) ──────────────────────────────────────
() => {
  const free = CODEX.submissions.length === 0;
  const cost = free ? 0 : CODEX.cost;
  return `<div class="pg pg-form pg-telling">
  <p class="eyebrow">The Telling</p>
  <h2 class="page-title pt-tight">Inscribe<br>thy Campaign</h2>
  <div class="form-real">
    <label class="rf"><span>Title of the Tale</span>
      <input type="text" data-field="title" maxlength="80" value="${esc(CODEX.draft.title)}" placeholder="Name thy tale&hellip;"></label>
    <div class="rf-row">
      <label class="rf"><span>The Node it Serves</span>
        <input type="text" data-field="node" maxlength="60" value="${esc(CODEX.draft.node)}" placeholder="e.g. Node 07"></label>
      <label class="rf"><span>The Realm it Touches</span>
        <span class="rf-select"><select data-field="realm">
          <option value="" ${!CODEX.draft.realm?'selected':''}>Choose a realm&hellip;</option>
          ${REALMS.map(rm=>`<option ${CODEX.draft.realm===rm?'selected':''}>${rm}</option>`).join('')}
        </select></span></label>
    </div>
    <label class="rf"><span>Your Telling</span>
      <textarea data-field="tale" rows="4" placeholder="Once, in the long dark between blocks&hellip;">${esc(CODEX.draft.tale)}</textarea></label>
    <div class="meter" id="taleMeter"><span class="meter-bar"><i></i></span><span class="meter-txt"></span></div>
  </div>
  <div class="cast-foot">
    <p class="cast-cost">This telling &mdash; <b class="${free?'free':''}">${free ? 'Free' : cost + ' ' + SIG + ' Cinder'}</b><span class="cc-purse">purse ${CODEX.balance} ${SIG}</span></p>
    <div class="cast-msg" id="castMsg" role="status"></div>
    <button class="btn btn-gold wax cast-btn" data-action="cast">Cast into the Embers</button>
  </div>
</div>`;
},

// ── F6 · My Tellings (dynamic record) ───────────────────────────────────
() => {
  const subs = CODEX.submissions;
  const list = subs.length
    ? subs.slice().reverse().map((s) => `<li class="telling">
        <div class="t-seal" aria-hidden="true">${SIG}</div>
        <div class="t-body">
          <h3>${esc(s.title)}</h3>
          <p class="t-meta">${esc(s.username||s.fullname||'A teller')}${s.nodeTier?' &middot; <span class="tier-badge">'+esc(s.nodeTier)+'</span>':''}</p>
          <p class="t-meta">${esc(s.node)}${s.realm?' &middot; '+esc(s.realm):''} &middot; ${s.cost ? s.cost + ' ' + SIG : 'Free'} &middot; ${fmtDate(s.ts)}</p>
          <p class="t-status"><i></i>Awaiting the reading${s.audioName ? '<button type="button" class="t-voice" data-action="play-telling" data-id="'+s.id+'">'+PLAY_SVG+' Voice</button>' : ''}</p>
        </div></li>`).join('')
    : `<li class="telling empty">No tales yet cast into the embers.<br><button class="btn btn-ghost" data-go="4">Inscribe your first</button></li>`;
  return `<div class="pg pg-tellings">
  <p class="eyebrow">The Record</p>
  <h2 class="page-title">My Tellings</h2>
  <ul class="tellings">${list}</ul>
</div>`;
},

// ── F7 · Closing / Keepers ──────────────────────────────────────────────
`<div class="pg pg-close">
  ${EMBLEM}
  <p class="invocation">In the long dark between blocks, the nodes keep the fire. Feed them your tales, and they shall become the world.</p>
  <span class="rule-orn"><i></i><b>${SIG}</b><i></i></span>
  <p class="eyebrow">The Keepers of the Ember</p>
  <nav class="foot-links"><a href="#" data-go="4">Inscribe</a><a href="#" data-go="6">My Tellings</a><a href="#" data-action="acquire">Acquire Cinder</a></nav>
  <p class="colophon">$CINDER&ensp;&middot;&ensp;0x0000&hellip;EmBeR&ensp;&middot;&ensp;&copy; MMXXVI&nbsp;&nbsp;Mythic&nbsp;Spellbook&nbsp;Stories</p>
</div>`,

];
