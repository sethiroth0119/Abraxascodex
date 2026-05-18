// Mythic Spellbook Studio — central persistent store
// Each collection persists to localStorage and stays in sync on window.X for cross-page reads (Athena).
// Load AFTER data.jsx + game-mechanics.jsx so defaults are in place first.

const STORE_PREFIX = 'mss:';
const SCHEMA_VERSION = '2-live';

// One-time clear: if a previous build seeded mock data, wipe it once.
(function migrate(){
  try {
    const stored = localStorage.getItem(STORE_PREFIX + '_schema');
    if (stored !== SCHEMA_VERSION) {
      const prefix = STORE_PREFIX;
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(STORE_PREFIX + '_schema', SCHEMA_VERSION);
    }
  } catch(e) {}
})();
const ENTITY_KEYS = [
  // [storageKey, windowKey]
  ['elements',  'ELEMENTS'],
  ['factions',  'FACTIONS'],
  ['cards',     'CARDS'],
  ['heroes',    'HEROES'],
  ['moves',     'MOVES'],
  ['passives',  'PASSIVES'],
  ['statuses',  'STATUSES'],
  ['natures',   'NATURES'],
  ['traits',    'TRAITS'],
  ['lineage',   'LINEAGE'],
  ['timeline',  'TIMELINE'],
  ['lore',      'LORE_ENTRIES'],
  ['campaigns', 'CAMPAIGNS'],
  ['items',     'ITEMS'],
  ['settings',  'SETTINGS'],
  ['threads',   'THREADS'],
  ['tasks',     'TASKS'],
  ['concepts',  'CONCEPTS'],
  ['systems',   'SYSTEMS'],
  ['dialogues', 'DIALOGUES'],
  ['bugs',      'BUGS'],
  ['ideas',     'IDEAS'],
  ['resources', 'RESOURCES'],
  ['worldEvents','WORLD_EVENTS'],
];

// Hydrate window from localStorage BEFORE React renders, so default data is overlaid.
(function hydrate() {
  for (const [k, wk] of ENTITY_KEYS) {
    try {
      const raw = localStorage.getItem(STORE_PREFIX + k);
      if (raw) {
        const data = JSON.parse(raw);
        // soft validation — fall back to defaults if shape is wrong
        if (data != null) window[wk] = data;
      }
    } catch(e) {}
  }
})();

// Hook for managing a persistent collection. windowKey kept in sync.
function useEntities(key) {
  const wk = (ENTITY_KEYS.find(([k]) => k === key) || [])[1] || key.toUpperCase();
  const initial = window[wk];
  const [items, setItems] = React.useState(initial);

  // Persist on change + sync to window + broadcast
  React.useEffect(() => {
    try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(items)); } catch(e) {}
    window[wk] = items;
    window.dispatchEvent(new CustomEvent('studio:data-change', { detail: { key, items } }));
  }, [items, key, wk]);

  // Cross-tab + cross-component sync — listen for changes by OTHER components/tabs
  React.useEffect(() => {
    const onChange = (e) => {
      if (e.detail && e.detail.key === key && e.detail.items !== items) {
        // only update if external source changed it
        if (JSON.stringify(e.detail.items) !== JSON.stringify(items)) setItems(e.detail.items);
      }
    };
    window.addEventListener('studio:data-change', onChange);
    return () => window.removeEventListener('studio:data-change', onChange);
  }, [items, key]);

  return [items, setItems];
}

// Convenience helpers
function makeId(prefix) {
  return prefix + '-' + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4);
}

// Reset everything to defaults (called via tweaks panel later if needed)
function resetStudio() {
  if(!confirm('Reset all data to defaults? This cannot be undone.')) return;
  for (const [k] of ENTITY_KEYS) {
    localStorage.removeItem(STORE_PREFIX + k);
  }
  location.reload();
}

// Export a snapshot of all data as JSON
function exportStudio() {
  const snap = {};
  for (const [k, wk] of ENTITY_KEYS) snap[k] = window[wk];
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mythic-spellbook-studio-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

window.useEntities = useEntities;
window.makeId = makeId;
window.resetStudio = resetStudio;
window.exportStudio = exportStudio;
