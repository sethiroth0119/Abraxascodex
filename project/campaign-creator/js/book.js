/* ====================================================================
   Mythic Spellbook Stories — flip engine, scaling, responsive
   ==================================================================== */
(function(){
  const FACES = window.FACES;
  const NFACE = FACES.length;            // 8
  const MAXS  = Math.floor((NFACE-1)/2); // last spread index (3)

  const SIZES = {
    spread:{ pageW:486, pageH:686 },
    single:{ pageW:476, pageH:706 }
  };

  let mode = 'spread';
  let s = 0;            // spread index
  let p = 0;            // face index (single mode)
  let animating = false;
  const FLIP_MS = 1150;

  // ── DOM ----------------------------------------------------------------
  const bookScale = document.getElementById('bookScale');
  const book = document.getElementById('book');
  const spread = document.getElementById('spread');
  const leftPage = document.getElementById('leftPage');
  const rightPage = document.getElementById('rightPage');
  const navPrev = document.getElementById('navPrev');
  const navNext = document.getElementById('navNext');
  const ribbon = document.getElementById('ribbon');

  const Lidx = i => 2*i;
  const Ridx = i => 2*i+1;
  const faceHTML = i => { const f = FACES[i]; return (typeof f === 'function') ? f() : (f || ''); };

  function fill(el, i){
    el.innerHTML = faceHTML(i);
    if(window.afterRender) window.afterRender(el, i);
  }

  // ── embers -------------------------------------------------------------
  (function embers(){
    const wrap = document.getElementById('embers');
    for(let i=0;i<16;i++){
      const e = document.createElement('span');
      e.className='ember';
      const size = 2 + Math.random()*4;
      e.style.left = (Math.random()*100)+'%';
      e.style.width = e.style.height = size+'px';
      e.style.setProperty('--drift', (Math.random()*120-60)+'px');
      e.style.animationDuration = (8 + Math.random()*9)+'s';
      e.style.animationDelay = (-Math.random()*14)+'s';
      wrap.appendChild(e);
    }
  })();

  // ── ribbon dots --------------------------------------------------------
  for(let i=0;i<=MAXS;i++){
    const d = document.createElement('i');
    d.title = 'Page '+(i+1);
    d.addEventListener('click', ()=> goToSpread(i));
    ribbon.appendChild(d);
  }

  // ── render static view -------------------------------------------------
  function render(){
    if(mode==='spread'){
      fill(leftPage,  Lidx(s));
      fill(rightPage, Ridx(s));
    } else {
      fill(rightPage, p);
      leftPage.innerHTML = '';
    }
    updateChrome();
  }
  window.refreshBook = render;
  window.currentFaces = () => mode==='spread' ? [Lidx(s),Ridx(s)] : [p];

  function updateChrome(){
    const atStart = mode==='spread' ? s<=0   : p<=0;
    const atEnd   = mode==='spread' ? s>=MAXS : p>=NFACE-1;
    navPrev.toggleAttribute('disabled', atStart);
    navNext.toggleAttribute('disabled', atEnd);
    const active = mode==='spread' ? s : Math.floor(p/2);
    [...ribbon.children].forEach((d,i)=> d.classList.toggle('on', i===active));

    let peel = rightPage.querySelector('.peel');
    if(!peel){
      peel = document.createElement('div'); peel.className='peel';
      peel.addEventListener('click', e=>{ e.stopPropagation(); next(); });
    }
    if(!atEnd) rightPage.appendChild(peel);
    else if(peel.parentNode) peel.remove();
  }

  // ── turning leaf -------------------------------------------------------
  const shade = ()=> '<div class="leaf-curl"></div><div class="leaf-sheen"></div>';
  function makeLeaf(dir, frontHTML, backHTML){
    const leaf = document.createElement('div');
    leaf.className = 'leaf ' + (dir>0?'fwd':'bwd');
    const rot = document.createElement('div'); rot.className = 'leaf-rot';
    const f = document.createElement('div'); f.className='leaf-face front'; f.innerHTML = frontHTML + shade();
    const b = document.createElement('div'); b.className='leaf-face back';  b.innerHTML = backHTML  + shade();
    rot.appendChild(f); rot.appendChild(b);
    leaf.appendChild(rot);
    return leaf;
  }
  function makeShadow(dir){
    const sh = document.createElement('div');
    sh.className = 'turn-shadow ' + (dir>0?'fwd':'bwd');
    return sh;
  }

  function turnSpread(dir){
    return new Promise(resolve=>{
      const ns = s + dir;
      if(dir>0) fill(rightPage, Ridx(ns)); else fill(leftPage, Lidx(ns));

      const frontHTML = dir>0 ? faceHTML(Ridx(s))  : faceHTML(Lidx(s));
      const backHTML  = dir>0 ? faceHTML(Lidx(ns)) : faceHTML(Ridx(ns));
      const leaf = makeLeaf(dir, frontHTML, backHTML);
      const shadow = makeShadow(dir);
      spread.appendChild(shadow); spread.appendChild(leaf);

      void leaf.offsetWidth;
      requestAnimationFrame(()=>{ leaf.classList.add('go'); shadow.classList.add('go'); });

      let done=false;
      const finish = ()=>{
        if(done) return; done=true;
        if(dir>0) fill(leftPage, Lidx(ns)); else fill(rightPage, Ridx(ns));
        leaf.remove(); shadow.remove(); s = ns; resolve();
      };
      leaf.querySelector('.leaf-rot').addEventListener('transitionend', e=>{ if(e.propertyName==='transform') finish(); });
      setTimeout(finish, FLIP_MS + 160);
    });
  }

  function turnSingle(dir){
    return new Promise(resolve=>{
      const np = p + dir;
      fill(rightPage, np);
      const leaf = makeLeaf(dir, faceHTML(p), faceHTML(np));
      const shadow = makeShadow(dir);
      spread.appendChild(shadow); spread.appendChild(leaf);
      void leaf.offsetWidth;
      requestAnimationFrame(()=>{ leaf.classList.add('go'); shadow.classList.add('go'); });
      let done=false;
      const finish = ()=>{ if(done) return; done=true; leaf.remove(); shadow.remove(); p = np; resolve(); };
      leaf.querySelector('.leaf-rot').addEventListener('transitionend', e=>{ if(e.propertyName==='transform') finish(); });
      setTimeout(finish, FLIP_MS + 160);
    });
  }

  // ── navigation ---------------------------------------------------------
  async function step(dir){
    if(animating) return;
    if(mode==='spread'){
      if(dir>0 && s>=MAXS) return;
      if(dir<0 && s<=0) return;
      animating=true; book.classList.add('animating');
      await turnSpread(dir);
    } else {
      if(dir>0 && p>=NFACE-1) return;
      if(dir<0 && p<=0) return;
      animating=true; book.classList.add('animating');
      await turnSingle(dir);
    }
    animating=false; book.classList.remove('animating');
    updateChrome();
  }
  const next = ()=> step(1);
  const prev = ()=> step(-1);

  async function goToSpread(target){
    target = Math.max(0, Math.min(MAXS, target));
    if(mode==='single') return goToFace(target*2);
    while(s!==target && !animating){ await step(s<target?1:-1); }
  }
  async function goToFace(idx){
    idx = Math.max(0, Math.min(NFACE-1, idx));
    if(mode==='spread') return goToSpread(Math.floor(idx/2));
    while(p!==idx && !animating){ await step(p<idx?1:-1); }
  }
  window.goToFace = goToFace;
  window.goToSpread = goToSpread;

  // ── layout / scale -----------------------------------------------------
  function layout(){
    const vw = window.innerWidth, vh = window.innerHeight;
    const newMode = vw < 820 ? 'single' : 'spread';
    if(newMode!==mode){
      if(newMode==='single') p = 2*s; else s = Math.floor(p/2);
      mode = newMode;
      book.classList.toggle('single', mode==='single');
      render();
    }
    const cfg = SIZES[mode];
    const totalW = (mode==='single'? cfg.pageW : cfg.pageW*2);
    spread.style.setProperty('--pageW', cfg.pageW+'px');
    spread.style.setProperty('--pageH', cfg.pageH+'px');
    spread.style.width = totalW+'px';

    const boxW = totalW + 44 + 18;
    const boxH = cfg.pageH + 44;
    const marginX = mode==='single' ? 28 : 86;
    const marginY = mode==='single' ? 64 : 96;
    const scale = Math.min((vw - marginX*2)/boxW, (vh - marginY*2)/boxH, 1.12);
    book.style.transform = `scale(${scale})`;
    bookScale.style.width  = (boxW*scale)+'px';
    bookScale.style.height = (boxH*scale)+'px';
  }

  // ── wiring -------------------------------------------------------------
  navNext.addEventListener('click', next);
  navPrev.addEventListener('click', prev);
  document.getElementById('hotNext').addEventListener('click', next);
  document.getElementById('hotPrev').addEventListener('click', prev);

  book.addEventListener('click', e=>{
    const go = e.target.closest('[data-go]');
    if(go){ e.preventDefault(); e.stopPropagation(); goToFace(parseInt(go.dataset.go,10)); }
  });

  window.addEventListener('keydown', e=>{
    const tag = (e.target.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea') return;       // don't steal typing
    if(e.key==='ArrowRight'){ e.preventDefault(); next(); }
    else if(e.key==='ArrowLeft'){ e.preventDefault(); prev(); }
  });

  let rt;
  window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(layout, 120); });

  render();
  layout();
})();
