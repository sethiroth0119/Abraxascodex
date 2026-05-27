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
  const iframeRef = React.useRef(null);
  const [isFull, setIsFull] = React.useState(false);

  // Track real fullscreen state so the button label stays in sync if the user
  // hits Esc or the system exits fullscreen on its own.
  React.useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen && document.exitFullscreen();
    } else {
      const el = iframeRef.current;
      if (el && el.requestFullscreen) el.requestFullscreen();
    }
  };

  return (
    <div style={{position:'absolute', inset:0}}>
      <iframe
        ref={iframeRef}
        src="/bestiary/Bestiary.html"
        title="Monster Manual — Bestiary of Abraxas"
        loading="eager"
        allow="fullscreen"
        style={{
          display:'block',
          width:'100%',
          height:'100%',
          border:'none',
          background:'#0d0805',
        }}
      />
      {/* Floating fullscreen toggle — bottom-right of the iframe so it never
          clashes with the bestiary's toolbar OR the OS GPU/perf overlays that
          typically render in the top-right corner. */}
      <button
        onClick={toggleFullscreen}
        title={isFull ? 'Exit fullscreen (Esc)' : 'Open the Monster Manual fullscreen'}
        style={{
          position:'absolute', bottom:16, right:16, zIndex:10,
          background:'rgba(20,16,10,0.92)', color:'#f1dca8',
          border:'1px solid #9a7a2a', borderRadius:2,
          font:"600 12px 'IM Fell English SC', 'Cinzel', serif",
          letterSpacing:'.18em', textTransform:'uppercase',
          padding:'8px 14px', cursor:'pointer',
          boxShadow:'0 4px 12px rgba(0,0,0,0.5)',
        }}>
        {isFull ? '↙ Exit Fullscreen' : '⛶ Fullscreen'}
      </button>
    </div>
  );
};

window.MonsterManual = MonsterManual;
