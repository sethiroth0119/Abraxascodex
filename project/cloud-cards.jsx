// cloud-cards.jsx
// Shared card catalog backed by the Supabase `cards` table (see
// supabase-cards.sql). ALL staff/admins read & write ONE pool, so they edit
// each other's work; the community reads the same pool to browse + vote.
//
// Degrades gracefully: if the table doesn't exist yet, Supabase is offline, or
// the user isn't authed, it transparently falls back to the old per-browser
// localStorage store ('mss:cards') so the Forge keeps working. Once the SQL is
// run and the app is deployed, cards go cloud with no further changes.
//
// Load AFTER store.jsx (needs React + window.CARDS seed) and BEFORE app.jsx.

const CARD_LS_KEY = 'mss:cards';
const WRITE_ROLES = ['staff', 'moderator', 'admin'];

const _lsRead = () => { try { const r = localStorage.getItem(CARD_LS_KEY); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; } catch { return []; } };
const _lsWrite = (list) => { try { localStorage.setItem(CARD_LS_KEY, JSON.stringify(list || [])); } catch {} };

// A DB row → the flat card object the UI expects (id lives on the object).
const _rowToCard = (row) => ({ ...(row.data || {}), id: row.id, _updatedAt: row.updated_at, _updatedBy: row.updated_by });

async function _fetchAll() {
  const sb = window.supabaseClient;
  if (!sb) throw new Error('no supabase client');
  const { data, error } = await sb.from('cards').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(_rowToCard);
}

// Debounced upserts keyed by card id — inspector edits fire per keystroke, so
// we update the UI immediately but only hit the network once things settle.
const _upsertTimers = {};

async function _upsertNow(card, { isNew } = {}) {
  const sb = window.supabaseClient;
  if (!sb) { _lsWrite(window.CARDS || []); return; }
  const uid = window.CURRENT_USER && window.CURRENT_USER.id;
  const row = { id: card.id, data: card, updated_by: uid };
  if (isNew) row.created_by = uid;
  try {
    const { error } = await sb.from('cards').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  } catch (e) {
    // cloud write failed (table missing / RLS / offline) — keep a local copy
    _lsWrite(window.CARDS || []);
    console.warn('[cloud-cards] upsert fell back to local:', e && e.message);
  }
}

// Public hook. Returns [cards, api].
//   api.save(card)   — create or update a card (staff/admin only)
//   api.remove(id)   — delete a card (staff/admin only)
//   api.reload()     — re-pull the shared pool
//   api.source       — 'cloud' | 'local' | 'loading'
//   api.canWrite     — role gate for editing
function useCloudCards() {
  const [cards, setCards] = React.useState(() => (Array.isArray(window.CARDS) ? window.CARDS : []));
  const [source, setSource] = React.useState('loading');
  const canWrite = WRITE_ROLES.includes(window.CURRENT_ROLE);

  const apply = React.useCallback((list) => {
    const arr = Array.isArray(list) ? list : [];
    setCards(arr);
    window.CARDS = arr;
    window.dispatchEvent(new CustomEvent('studio:data-change', { detail: { key: 'cards', items: arr } }));
  }, []);

  const reload = React.useCallback(async () => {
    try {
      const list = await _fetchAll();
      apply(list);
      setSource('cloud');
    } catch (e) {
      apply(_lsRead());
      setSource('local');
      console.warn('[cloud-cards] loading local fallback:', e && e.message);
    }
  }, [apply]);

  React.useEffect(() => { reload(); }, [reload]);

  // Live collaboration: refetch when anyone changes the shared table.
  React.useEffect(() => {
    const sb = window.supabaseClient;
    if (!sb || !sb.channel) return;
    let ch;
    try {
      ch = sb.channel('cards-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, () => reload())
        .subscribe();
    } catch (e) {}
    return () => { try { sb.removeChannel(ch); } catch (e) {} };
  }, [reload]);

  const save = React.useCallback((card) => {
    if (!card || !card.id) return;
    let wasNew = false;
    setCards(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const i = arr.findIndex(c => c.id === card.id);
      wasNew = i < 0;
      const next = wasNew ? [card, ...arr] : arr.map(c => (c.id === card.id ? card : c));
      window.CARDS = next;
      return next;
    });
    window.dispatchEvent(new CustomEvent('studio:data-change', { detail: { key: 'cards', items: window.CARDS } }));
    clearTimeout(_upsertTimers[card.id]);
    _upsertTimers[card.id] = setTimeout(() => _upsertNow(card, { isNew: wasNew }), 450);
  }, []);

  const remove = React.useCallback(async (id) => {
    if (!id) return;
    setCards(prev => {
      const next = (Array.isArray(prev) ? prev : []).filter(c => c.id !== id);
      window.CARDS = next;
      return next;
    });
    window.dispatchEvent(new CustomEvent('studio:data-change', { detail: { key: 'cards', items: window.CARDS } }));
    clearTimeout(_upsertTimers[id]);
    const sb = window.supabaseClient;
    if (!sb) { _lsWrite(window.CARDS || []); return; }
    try {
      const { error } = await sb.from('cards').delete().eq('id', id);
      if (error) throw error;
    } catch (e) { _lsWrite(window.CARDS || []); console.warn('[cloud-cards] delete fell back to local:', e && e.message); }
  }, []);

  return [cards, { save, remove, reload, source, canWrite }];
}

window.useCloudCards = useCloudCards;
