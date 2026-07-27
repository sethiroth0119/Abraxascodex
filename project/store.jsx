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

// Union canonical entries (by id) into a loaded list, keeping any custom
// additions. Canon acts as a floor so core elements/factions can't disappear.
function _unionById(canon, current) {
  const arr = Array.isArray(current) ? current.slice() : [];
  const have = new Set(arr.map(x => x && x.id));
  (canon || []).forEach(c => { if (c && !have.has(c.id)) arr.push(c); });
  return arr;
}

// Catalog top-up: make sure the LOCAL elements/factions include every canonical
// entry (restores a missing Fire; adds newly-shipped Werewolf/Hero) so the Card
// Forge pickers are complete on first paint, before any cloud round-trip.
(function catalogTopup() {
  try {
    [['elements', 'ELEMENTS', window.__CANON_ELEMENTS],
     ['factions', 'FACTIONS', window.__CANON_FACTIONS]].forEach(([k, wk, canon]) => {
      if (!canon) return;
      const merged = _unionById(canon, window[wk]);
      if (merged.length !== (Array.isArray(window[wk]) ? window[wk].length : 0)) {
        window[wk] = merged;
        try { localStorage.setItem(STORE_PREFIX + k, JSON.stringify(merged)); } catch(e) {}
      }
    });
  } catch(e) {}
})();

// ── Shared cloud backing ────────────────────────────────────────────────
// Every collection (heroes, lore, moves, factions, settings, …) is mirrored to
// the Supabase `studio_collections` table so all staff/admins share one studio.
// Cards are excluded — they have their own richer table (see cloud-cards.jsx).
// Degrades silently to localStorage-only if the table/Supabase isn't available.
const CLOUD_TABLE = 'studio_collections';
const COLL_WRITE_ROLES = ['staff', 'moderator', 'admin'];
const _collSaveTimers = {};
// Per-collection timestamp of the last local edit. A live edit fires a debounced
// cloud save that echoes back as a realtime change; refetching then would
// overwrite what the user is still typing. We skip realtime refetches within
// this window so typing is never clobbered.
const _lastCollWrite = {};
const _COLL_EDIT_WINDOW = 4000;

const _isCloudKey = (key) => key !== 'cards' && !!window.supabaseClient;
const _canWriteCloud = () => COLL_WRITE_ROLES.includes(window.CURRENT_ROLE);
const _isEmptyVal = (v) => v == null
  || (Array.isArray(v) ? v.length === 0
      : (typeof v === 'object' ? Object.keys(v).length === 0 : false));

async function _collLoad(key) {
  // undefined return = no cloud row exists yet (never migrated)
  const { data, error } = await window.supabaseClient
    .from(CLOUD_TABLE).select('data').eq('key', key).maybeSingle();
  if (error) throw error;
  return data ? data.data : undefined;
}
function _collSave(key, value) {
  if (!window.supabaseClient) return;
  clearTimeout(_collSaveTimers[key]);
  _collSaveTimers[key] = setTimeout(async () => {
    try {
      const uid = window.CURRENT_USER && window.CURRENT_USER.id;
      const { error } = await window.supabaseClient.from(CLOUD_TABLE)
        .upsert({ key, data: value, updated_by: uid }, { onConflict: 'key' });
      if (error) throw error;
    } catch (e) { console.warn('[store] cloud save failed for "' + key + '":', e && e.message); }
  }, 500);
}

// Hook for managing a persistent collection. windowKey kept in sync.
function useEntities(key) {
  const wk = (ENTITY_KEYS.find(([k]) => k === key) || [])[1] || key.toUpperCase();
  const [items, setItems] = React.useState(window[wk]);
  const cloudable = _isCloudKey(key);
  // JSON of the value most recently pulled FROM the cloud — so we never echo a
  // remote change straight back up, and so the initial local value doesn't
  // clobber the cloud before the first fetch resolves.
  const remoteJson = React.useRef(null);
  const ready = React.useRef(false);

  // Initial cloud load + one-time seed. If a row exists we adopt it; if not and
  // we're a writer with local data, we seed the shared pool from this browser
  // (row-exists is the guard, so deleting everything can't resurrect).
  React.useEffect(() => {
    if (!cloudable) { ready.current = true; return; }
    let cancelled = false;
    (async () => {
      try {
        const cloud = await _collLoad(key);
        if (cancelled) return;
        if (cloud !== undefined) {
          let val = cloud;
          // Keep canonical elements/factions present even in the shared pool.
          const canon = key === 'elements' ? window.__CANON_ELEMENTS
                      : key === 'factions' ? window.__CANON_FACTIONS : null;
          if (canon) {
            val = _unionById(canon, cloud);
            if (val.length !== (Array.isArray(cloud) ? cloud.length : 0) && _canWriteCloud()) _collSave(key, val);
          }
          remoteJson.current = JSON.stringify(val);
          window[wk] = val;
          setItems(val);
        } else if (_canWriteCloud() && !_isEmptyVal(window[wk])) {
          remoteJson.current = JSON.stringify(window[wk]);
          _collSave(key, window[wk]);
        }
      } catch (e) { /* offline / table missing → keep localStorage copy */ }
      finally { ready.current = true; }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist on change: localStorage always; cloud only for writers, only once
  // the initial load settled, and never for a value we just got from the cloud.
  React.useEffect(() => {
    try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(items)); } catch(e) {}
    window[wk] = items;
    if (cloudable && _canWriteCloud() && ready.current && JSON.stringify(items) !== remoteJson.current) {
      _lastCollWrite[key] = Date.now();
      _collSave(key, items);
    }
    window.dispatchEvent(new CustomEvent('studio:data-change', { detail: { key, items } }));
  }, [items, key, wk]);

  // Cross-component sync (same tab)
  React.useEffect(() => {
    const onChange = (e) => {
      if (e.detail && e.detail.key === key && e.detail.items !== items) {
        if (JSON.stringify(e.detail.items) !== JSON.stringify(items)) setItems(e.detail.items);
      }
    };
    window.addEventListener('studio:data-change', onChange);
    return () => window.removeEventListener('studio:data-change', onChange);
  }, [items, key]);

  // Live sync: another staffer changed this collection in the shared pool.
  React.useEffect(() => {
    if (!cloudable || !window.supabaseClient.channel) return;
    let ch;
    try {
      ch = window.supabaseClient
        .channel('coll-' + key + '-' + Math.random().toString(36).slice(2))
        .on('postgres_changes',
            { event: '*', schema: 'public', table: CLOUD_TABLE, filter: 'key=eq.' + key },
            async () => {
              // Don't refetch (and clobber the field) while the user is mid-edit.
              if (Date.now() - (_lastCollWrite[key] || 0) < _COLL_EDIT_WINDOW) return;
              try {
                const cloud = await _collLoad(key);
                if (cloud !== undefined) { remoteJson.current = JSON.stringify(cloud); setItems(cloud); }
              } catch (e) {}
            })
        .subscribe();
    } catch (e) {}
    return () => { try { window.supabaseClient.removeChannel(ch); } catch (e) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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
