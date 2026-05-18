// Minimal line icons for the studio
const Icon = ({ name, size = 18 }) => {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch(name){
    case 'home':       return <svg viewBox="0 0 24 24" {...s}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>;
    case 'card':       return <svg viewBox="0 0 24 24" {...s}><rect x="6" y="3" width="12" height="18" rx="1.5"/><circle cx="12" cy="9" r="2"/><path d="M9 14h6M9 17h6"/></svg>;
    case 'hero':       return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>;
    case 'faction':    return <svg viewBox="0 0 24 24" {...s}><path d="M12 3 4 6v6c0 4.5 3.3 7.8 8 9 4.7-1.2 8-4.5 8-9V6l-8-3z"/></svg>;
    case 'tree':       return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="4" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/><path d="M12 6v3M6 14v4M18 14v4M8 12h8M12 9 6 12M12 9l6 3"/></svg>;
    case 'lore':       return <svg viewBox="0 0 24 24" {...s}><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/></svg>;
    case 'map':        return <svg viewBox="0 0 24 24" {...s}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></svg>;
    case 'relic':      return <svg viewBox="0 0 24 24" {...s}><path d="M12 3v3M9 5h6"/><path d="M7 8h10l-1 12H8z"/><circle cx="12" cy="13" r="2"/></svg>;
    case 'coin':       return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="8"/><path d="M9 9.5c.6-1 1.7-1.5 3-1.5 1.7 0 3 1 3 2.3 0 2.6-5 1.7-5 4.4 0 1.3 1.3 2.3 3 2.3 1.3 0 2.4-.5 3-1.5"/><path d="M12 7v10"/></svg>;
    case 'scroll':     return <svg viewBox="0 0 24 24" {...s}><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M6 4a2 2 0 0 0-2 2v2h2"/><path d="M9 9h7M9 13h7M9 17h4"/></svg>;
    case 'clock':      return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>;
    case 'flask':      return <svg viewBox="0 0 24 24" {...s}><path d="M9 3h6v4l4 10a3 3 0 0 1-3 4H8a3 3 0 0 1-3-4l4-10z"/><path d="M7 14h10"/></svg>;
    case 'feed':       return <svg viewBox="0 0 24 24" {...s}><circle cx="6" cy="18" r="2"/><path d="M4 4a16 16 0 0 1 16 16M4 10a10 10 0 0 1 10 10"/></svg>;
    case 'search':     return <svg viewBox="0 0 24 24" {...s}><circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/></svg>;
    case 'add':        return <svg viewBox="0 0 24 24" {...s}><path d="M12 5v14M5 12h14"/></svg>;
    case 'sliders':    return <svg viewBox="0 0 24 24" {...s}><path d="M4 8h10M18 8h2M4 16h4M12 16h8"/><circle cx="16" cy="8" r="2"/><circle cx="10" cy="16" r="2"/></svg>;
    case 'chevron':    return <svg viewBox="0 0 24 24" {...s}><path d="m9 6 6 6-6 6"/></svg>;
    case 'star':       return <svg viewBox="0 0 24 24" {...s}><path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 6.6 19.6l1.2-6L3.3 9.4l6.1-.8z"/></svg>;
    case 'pencil':     return <svg viewBox="0 0 24 24" {...s}><path d="M4 20h4l11-11-4-4L4 16z"/></svg>;
    case 'eye':        return <svg viewBox="0 0 24 24" {...s}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'comment':    return <svg viewBox="0 0 24 24" {...s}><path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z"/></svg>;
    case 'check':      return <svg viewBox="0 0 24 24" {...s}><path d="m5 12 4 4 10-10"/></svg>;
    case 'upload':     return <svg viewBox="0 0 24 24" {...s}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>;
    default:           return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="2"/></svg>;
  }
};

window.Icon = Icon;
