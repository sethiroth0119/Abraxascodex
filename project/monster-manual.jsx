// Monster Manual — the Bestiary of Abraxas.
//
// The Bestiary is a self-contained mini-app living under /bestiary/ with its
// own React/Babel/data/CSS (a parchment-grimoire theme). We mount it via an
// <iframe> inside an Abraxascodex page to avoid CSS-variable collisions and
// dual-React concerns while preserving every feature (drag-reorder, inline
// editing via contenteditable, localStorage persistence).
const MonsterManual = () => {
  return (
    <div className="page" style={{maxWidth:'none', padding:0, margin:0}}>
      <iframe
        src="/bestiary/Bestiary.html"
        title="Monster Manual — Bestiary of Abraxas"
        loading="eager"
        style={{
          display:'block',
          width:'100%',
          // .content fills the area below the topbar; subtract a bit so the
          // iframe never produces an outer scrollbar.
          height:'calc(100vh - 70px)',
          border:'none',
          background:'#0d0805',
        }}
      />
    </div>
  );
};

window.MonsterManual = MonsterManual;
