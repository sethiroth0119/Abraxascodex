// Monster Manual — the Bestiary of Abraxas.
//
// The Bestiary is a self-contained mini-app living under /bestiary/ with its
// own React/Babel/data/CSS (a parchment-grimoire theme). We mount it via an
// <iframe> inside an Abraxascodex page to avoid CSS-variable collisions and
// dual-React concerns while preserving every feature (drag-reorder, inline
// editing via contenteditable, localStorage persistence).
const MonsterManual = () => {
  // Fill the entire .content area (which is position:relative + flex:1) with
  // a perfectly-fitting iframe — no .page padding, no vh math, no overflow.
  return (
    <div style={{position:'absolute', inset:0}}>
      <iframe
        src="/bestiary/Bestiary.html"
        title="Monster Manual — Bestiary of Abraxas"
        loading="eager"
        style={{
          display:'block',
          width:'100%',
          height:'100%',
          border:'none',
          background:'#0d0805',
        }}
      />
    </div>
  );
};

window.MonsterManual = MonsterManual;
