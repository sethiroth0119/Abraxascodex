/* ============================================================================
   BUG REPORT STORE
   Reports used to ride in studio_collections under the key 'bugs' — one row
   holding the whole array. store.jsx only writes a collection when the role is
   staff/moderator/admin, so a member's report never left their browser, and
   the next load replaced it with the cloud copy. It was lost, silently, every
   time.

   Each report is now its own row in public.bug_reports. This hook keeps the
   [items, setItems] shape the page already used, and turns a whole-array
   assignment into per-row inserts, updates and deletes underneath.

   The other half of the old bug was silence: nothing ever told anyone a save
   had failed. This surfaces status, so a failure is visible rather than
   discovered weeks later.
   ========================================================================== */

(function () {
  'use strict';

  const TABLE = 'bug_reports';
  const sb = () => window.supabaseClient;

  function rowToBug(r) {
    // the record lives in data; id/created_at on the row are authoritative
    const d = (r && r.data) || {};
    return { ...d, id: r.id, _createdBy: r.created_by || null };
  }

  function bugToData(b) {
    // never store our own bookkeeping fields inside data
    const { _createdBy, ...rest } = b || {};
    return rest;
  }

  window.useBugReports = function useBugReports() {
    const [items, setItems] = React.useState([]);
    const [status, setStatus] = React.useState({ loading: true, error: null, saving: false, fallback: false });
    const known = React.useRef(new Map());   // id -> JSON of the record as last synced

    const remember = (list) => {
      const m = new Map();
      for (const b of list) m.set(b.id, JSON.stringify(bugToData(b)));
      known.current = m;
    };

    // keepError: a reconcile after a failed save must not wipe the message
    // explaining why it failed — that is how the original bug stayed invisible.
    const load = React.useCallback(async (opts) => {
      const keepError = !!(opts && opts.keepError);
      if (!sb()) {
        // no backend at all — fall back to whatever the old collection left in
        // localStorage so the page still shows something
        const local = (() => {
          try { return JSON.parse(localStorage.getItem('mss_bugs') || '[]'); } catch (e) { return []; }
        })();
        setItems(local); remember(local);
        setStatus(s => ({ loading: false, saving: false, fallback: true,
          error: keepError ? s.error : null }));
        return;
      }
      try {
        const { data, error } = await sb().from(TABLE).select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const list = (data || []).map(rowToBug);
        setItems(list); remember(list);
        setStatus(s => ({ loading: false, saving: false, fallback: false,
          error: keepError ? s.error : null }));
      } catch (e) {
        setStatus({ loading: false, saving: false, fallback: true,
          error: 'Could not load reports: ' + (e.message || e) });
      }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    // Someone else's report should appear without a reload.
    React.useEffect(() => {
      const onFocus = () => { if (!document.hidden) load(); };
      document.addEventListener('visibilitychange', onFocus);
      return () => document.removeEventListener('visibilitychange', onFocus);
    }, [load]);

    /* Accepts the whole array, like useEntities did, and works out what
       actually changed. Optimistic locally, then reconciled from the server. */
    const commit = React.useCallback(async (next) => {
      const list = typeof next === 'function' ? next(items) : next;
      setItems(list);                                    // optimistic

      if (!sb()) {
        try { localStorage.setItem('mss_bugs', JSON.stringify(list)); } catch (e) {}
        return;
      }

      const uid = (window.CURRENT_USER && window.CURRENT_USER.id) || null;
      const prev = known.current;
      const nextIds = new Set(list.map(b => b.id));
      const inserts = [], updates = [], deletes = [];

      for (const b of list) {
        const json = JSON.stringify(bugToData(b));
        if (!prev.has(b.id)) inserts.push(b);
        else if (prev.get(b.id) !== json) updates.push(b);
      }
      for (const id of prev.keys()) if (!nextIds.has(id)) deletes.push(id);

      if (!inserts.length && !updates.length && !deletes.length) return;

      setStatus(s => ({ ...s, saving: true, error: null }));
      const failures = [];
      try {
        for (const b of inserts) {
          const { error } = await sb().from(TABLE)
            .insert({ id: b.id, data: bugToData(b), created_by: uid });
          if (error) failures.push('save "' + (b.title || b.id) + '": ' + error.message);
        }
        for (const b of updates) {
          const { error } = await sb().from(TABLE)
            .update({ data: bugToData(b) }).eq('id', b.id);
          if (error) failures.push('update "' + (b.title || b.id) + '": ' + error.message);
        }
        for (const id of deletes) {
          const { error } = await sb().from(TABLE).delete().eq('id', id);
          if (error) failures.push('delete: ' + error.message);
        }
      } catch (e) {
        failures.push(e.message || String(e));
      }

      if (failures.length) {
        const message = failures.join(' · ');
        await load({ keepError: true }); // reconcile, but keep the explanation
        setStatus(s => ({ ...s, saving: false, error: message }));
      } else {
        remember(list);
        setStatus(s => ({ ...s, saving: false, error: null }));
      }
      window.dispatchEvent(new CustomEvent('studio:data-change', { detail: { key: 'bugs' } }));
    }, [items, load]);

    return [items, commit, status];
  };
})();
