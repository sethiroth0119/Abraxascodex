// Main app
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "cozy",
  "accent": "#c9a14a",
  "sidebar": "expanded",
  "frame": "gilded"
}/*EDITMODE-END*/;

const ACCENTS = [
  '#c9a14a', // gold
  '#a48ad2', // aether
  '#7a9a52', // verdant
  '#c45a2f', // ember
  '#4a8aa8', // tide
];

const App = () => {
  const [route, setRoute] = React.useState('dashboard');
  const [showProfile, setShowProfile] = React.useState(false);
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [settings] = window.useEntities ? window.useEntities('settings') : [(window.SETTINGS||{})];
  const [savedFlash, setSavedFlash] = React.useState(false);

  // Flash "Saved" indicator whenever any persistent collection changes
  React.useEffect(() => {
    let t;
    const onChange = () => { setSavedFlash(true); clearTimeout(t); t = setTimeout(()=>setSavedFlash(false), 1500); };
    window.addEventListener('studio:data-change', onChange);
    return () => { window.removeEventListener('studio:data-change', onChange); clearTimeout(t); };
  }, []);

  // Live page title
  React.useEffect(() => {
    document.title = `${settings.studioName || 'Codex Abraxas'} · ${settings.worldName || 'Hidn Studios'}`;
  }, [settings.studioName, settings.worldName]);

  React.useEffect(() => {
    document.body.dataset.theme = t.theme;
    document.body.dataset.density = t.density;
    document.body.dataset.sidebar = t.sidebar;
    document.body.dataset.frame = t.frame;
    document.documentElement.style.setProperty('--gold', t.accent);
    // derive bright/deep from accent
    document.documentElement.style.setProperty('--gold-bright', lighten(t.accent, 15));
    document.documentElement.style.setProperty('--gold-deep',   darken(t.accent, 25));
  }, [t.theme, t.density, t.sidebar, t.accent, t.frame]);

  // Open profile overlay when sidebar footer is clicked
  React.useEffect(() => {
    if (route === 'profile') { setShowProfile(true); setRoute('dashboard'); }
  }, [route]);

  const page = (() => {
    switch(route){
      case 'dashboard': return <Dashboard setRoute={setRoute}/>;
      case 'systems':   return <SystemsPage/>;
      case 'elements':  return <ElementsPage/>;
      case 'cards':     return <CardForge/>;
      case 'moves':     return <MovesPage/>;
      case 'passives':  return <PassivesPage/>;
      case 'statuses':  return <StatusesPage/>;
      case 'natures':   return <NaturesPage/>;
      case 'heroes':    return <HeroesPage/>;
      case 'factions':  return <FactionsPage/>;
      case 'lineage':   return <LineagePage/>;
      case 'lore':      return <LorePage/>;
      case 'economy':   return <EconomyPage/>;
      case 'timeline':  return <TimelinePage/>;
      case 'campaigns': return <CampaignsPage/>;
      case 'relics':    return <RelicsPage/>;
      case 'playtest':  return <PlaytestPage/>;
      case 'activity':  return <ActivityPage/>;
      case 'settings':  return <SettingsPage/>;
      case 'threads':   return <ThreadsPage/>;
      case 'tasks':     return <TasksPage/>;
      case 'concepts':  return <ConceptsPage/>;
      case 'dialogue':  return <DialoguePage/>;
      case 'bugs':      return <BugsPage/>;
      case 'ideas':     return <IdeasPage/>;
      case 'resources': return <ResourcesPage/>;
      case 'worldEvents': return <WorldEventsPage/>;
      case 'sprites':   return <SpriteForge/>;
      case 'users':     return <UsersAdminPage/>;
      case 'profile':   return null; // handled as overlay
      default: return <Dashboard setRoute={setRoute}/>;;
    }
  })();

  // crumb
  const navItem = window.NAV.flatMap(g=>g.items).find(i=>i.id===route) || {label:'Forge Hall'};

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute}/>
      <div className="main">
        <div className="topbar">
          <button className="btn btn-ghost"
            onClick={()=>setTweak('sidebar', t.sidebar==='expanded'?'collapsed':'expanded')}>
            <Icon name="chevron" size={14}/>
          </button>
          <div className="crumbs">
            <span className="root">{(window.SETTINGS||{}).worldName || 'Hidn Studios'}</span>
            <span className="sep">/</span>
            <span className="leaf">{navItem.label}</span>
          </div>
          <div className="search">
            <Icon name="search" size={14}/>
            <input placeholder="Search the codex..."/>
            <span className="kbd">⌘K</span>
          </div>
          <button className="btn" onClick={()=>window.exportStudio && window.exportStudio()} title="Export all studio data"><Icon name="upload" size={14}/></button>
          {settings.discordUrl && (
            <a href={settings.discordUrl} target="_blank" rel="noopener noreferrer"
               className="btn discord-btn" title={`Open ${settings.discordServer || 'Discord'} in a new tab`}
               style={{display:'inline-flex',alignItems:'center',gap:6,textDecoration:'none'}}>
              <span style={{fontSize:14}}>💬</span>
              <span style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.14em',textTransform:'uppercase'}}>
                {settings.discordServer || 'Discord'}
              </span>
            </a>
          )}
          <div className={`save-indicator ${savedFlash?'flash':''}`} title="All changes auto-save to your browser.">
            <span className="save-dot"/> {savedFlash ? 'Saving…' : 'Saved'}
          </div>
          <button className="btn" title="Comments"><Icon name="comment" size={14}/></button>
          <div className="avatar" title="Your profile" onClick={() => setShowProfile(true)}
               style={{width:32,height:32,fontSize:14,background:'linear-gradient(135deg,#5a4a2a,#2a1f0a)',cursor:'pointer'}}>
            {((window.CURRENT_PROFILE?.full_name || window.CURRENT_USER?.email) || 'U')[0].toUpperCase()}
          </div>
          <button className="btn btn-ghost" title="Sign out" onClick={() => window.signOut && window.signOut()}
                  style={{fontSize:12,letterSpacing:'.08em',opacity:.7}}>
            Sign out
          </button>
        </div>
        <div className="viewer-banner">
          👁 You are in <strong style={{marginLeft:4,marginRight:4}}>read-only</strong> mode — browse the world, report bugs, and join threads.
        </div>
        <div className="content grain">{page}</div>
      </div>

      {showProfile && <ProfilePage onClose={() => setShowProfile(false)}/>}

      <InviteModal/>

      <Athena/>

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Atmosphere">
          <window.TweakRadio label="Theme" value={t.theme} onChange={v=>setTweak('theme', v)}
            options={[{value:'dark',label:'Candlelit'},{value:'light',label:'Vellum'}]}/>
          <window.TweakRadio label="Density" value={t.density} onChange={v=>setTweak('density', v)}
            options={[{value:'compact',label:'Compact'},{value:'cozy',label:'Cozy'},{value:'spacious',label:'Open'}]}/>
          <window.TweakRadio label="Sidebar" value={t.sidebar} onChange={v=>setTweak('sidebar', v)}
            options={[{value:'expanded',label:'Wide'},{value:'collapsed',label:'Icons'}]}/>
        </window.TweakSection>
        <window.TweakSection title="Gilt">
          <window.TweakColor label="Accent" value={t.accent} onChange={v=>setTweak('accent', v)} options={ACCENTS}/>
        </window.TweakSection>
        <window.TweakSection title="Card frame">
          <window.TweakSelect label="Style" value={t.frame} onChange={v=>setTweak('frame', v)}
            options={[
              {value:'gilded',  label:'Gilded (default)'},
              {value:'inked',   label:'Inked & spare'},
              {value:'ornate',  label:'Ornate baroque'},
              {value:'arcane',  label:'Arcane glow'},
            ]}/>
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
};

// tiny hex helpers
function hexToRgb(h){ h=h.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function rgbToHex(r,g,b){ return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join(''); }
function lighten(h,p){ const [r,g,b]=hexToRgb(h); return rgbToHex(r+(255-r)*p/100, g+(255-g)*p/100, b+(255-b)*p/100); }
function darken(h,p){ const [r,g,b]=hexToRgb(h); return rgbToHex(r*(1-p/100), g*(1-p/100), b*(1-p/100)); }

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
