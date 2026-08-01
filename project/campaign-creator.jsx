// Campaign Creator — the "Cinder Codex", a story/campaign authoring tool.
//
// Same pattern as MonsterManual: the campaign creator is a self-contained
// mini-app (its own CSS, JS, fonts) living under /campaign-creator/. We mount
// it via <iframe> inside an Abraxascodex page so its parchment theme doesn't
// collide with the studio's dark theme and its scripts don't double-define
// globals.
const CampaignCreator = () => {
  const iframeRef = React.useRef(null);
  const [isFull, setIsFull] = React.useState(false);

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
        src="/campaign-creator/index.html?v=2"
        title="Campaign Creator — Mythic Spellbook Stories"
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
      {/* Floating fullscreen toggle in the bottom-right (out of any top-right
          OS overlay zone), matching the Monster Manual button. */}
      <button
        onClick={toggleFullscreen}
        title={isFull ? 'Exit fullscreen (Esc)' : 'Open Campaign Creator fullscreen'}
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

window.CampaignCreator = CampaignCreator;
