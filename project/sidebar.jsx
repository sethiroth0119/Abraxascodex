// Sidebar nav
const NAV = [
  { section: 'World', items: [
    { id:'dashboard', label:'Forge Hall',      icon:'home',    badge:null },
    { id:'systems',   label:'Game Systems',    icon:'sliders', badge:null },
    { id:'elements',  label:'Elements',        icon:'flask',   badge:null },
    { id:'factions',  label:'Factions',        icon:'faction', badge:null },
    { id:'lore',      label:'Lore Codex',      icon:'lore',    badge:null },
    { id:'timeline',  label:'Timeline',        icon:'clock',   badge:null },
  ]},
  { section: 'Mythic Spellbook', items: [
    { id:'cards',     label:'Card Forge',      icon:'card',    badge:null },
    { id:'moves',     label:'Moves',           icon:'pencil',  badge:null },
    { id:'passives',  label:'Passives',        icon:'star',    badge:null },
    { id:'statuses',  label:'Status Effects',  icon:'relic',   badge:null },
    { id:'natures',   label:'Natures & Traits',icon:'flask',   badge:null },
  ]},
  { section: 'Inhabitants', items: [
    { id:'heroes',    label:'Heroes & NPCs',   icon:'hero',    badge:null },
    { id:'lineage',   label:'Lineages',        icon:'tree',    badge:null },
  ]},
  { section: 'Team', items: [
    { id:'threads',   label:'Threads',          icon:'comment', badge:null },
    { id:'tasks',     label:'Tasks & To-Do',    icon:'check',   badge:null },
    { id:'ideas',     label:'Ideas & Updates',  icon:'star',    badge:null },
    { id:'concepts',  label:'Concepts',         icon:'pencil',  badge:null },
    { id:'dialogue',  label:'Dialogue & Story', icon:'scroll',  badge:null },
    { id:'bugs',      label:'Bug Tracker',      icon:'flask',   badge:null },
  ]},
  { section: 'Game', items: [
    { id:'campaigns', label:'Campaigns / RLC', icon:'scroll',  badge:null },
    { id:'worldEvents',label:'World Events',   icon:'flask',   badge:null },
    { id:'resources', label:'Resources',       icon:'relic',   badge:null },
    { id:'economy',   label:'Economy',         icon:'coin',    badge:null },
    { id:'relics',    label:'Items & Relics',  icon:'relic',   badge:null },
    { id:'playtest',  label:'Playtest Bench',  icon:'flask',   badge:null },
    { id:'activity',  label:'Activity',        icon:'feed',    badge:null },
    { id:'settings',  label:'Studio Settings', icon:'sliders', badge:null },
  ]},
];

const Sidebar = ({ route, setRoute }) => {
  const [settings] = window.useEntities ? window.useEntities('settings') : [(window.SETTINGS||{})];
  const studio = settings.studioName || 'Codex Abraxas';
  const world  = settings.worldName  || 'Hidn Studios';
  const author = settings.designerName || 'Aurel';
  const role   = settings.designerRole || 'Lead Designer';

  return (
    <aside className="sidebar grain">
      <div className="brand">
        <div className="brand-mark" />
        <div className="brand-text">
          {studio}
          <small>studio: {world}</small>
        </div>
      </div>
      <nav className="nav">
        {NAV.map(group => (
          <div key={group.section} className="nav-section">
            <div className="nav-label">{group.section}</div>
            {group.items.map(item => (
              <div key={item.id}
                   className={`nav-item ${route === item.id ? 'active':''}`}
                   onClick={() => setRoute(item.id)}
                   title={item.label}>
                <span className="nav-icon"><Icon name={item.icon} /></span>
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot" style={{cursor:'pointer'}} onClick={()=>setRoute('settings')} title="Studio settings">
        <div className="avatar">{(author[0]||'A').toUpperCase()}</div>
        <div className="you">
          {author}
          <small>{role}</small>
        </div>
      </div>
    </aside>
  );
};

window.Sidebar = Sidebar;
window.NAV = NAV;
