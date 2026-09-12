/* ============================================================================
   THREAD STORE
   Discussions used to ride in studio_collections under the key 'threads' — one
   row holding every thread and every comment. Writing a collection is
   staff-only, so a member who typed a reply and pressed Post saved it to their
   own browser and nowhere else; the next load replaced it with the cloud copy
   and the reply was gone, silently. Same shape, same bug, as bug reports and
   feature requests before it.

   A thread is now a row in public.threads and a comment is a row in
   public.thread_posts. This hook keeps the [items, setItems] shape the page
   already used and turns a whole-array assignment into per-row writes
   underneath — so the page's existing post()/update()/remove() keep working,
   and a member's reply becomes one insert they are actually allowed to make.

   Failures are surfaced, never swallowed. Silence is what let the original bug
   survive for weeks.
   ========================================================================== */

(function () {
  'use strict';

  const T_THREADS = 'threads';
  const T_POSTS   = 'thread_posts';
  // STORE_PREFIX in store.jsx is 'mss:' — a colon, not an underscore. The
  // one-time rescue below reads whatever the old collection left behind, so
  // this has to be the key store.jsx actually wrote or it finds nothing and
  // the team's existing discussions look deleted.
  const LOCAL_KEY = 'mss:threads';
  const SEEDED    = 'mss:threads_seeded_to_cloud';
  const WRITE_ROLES = ['staff', 'moderator', 'admin'];

  const sb = () => window.supabaseClient;
  const canCurate = () => WRITE_ROLES.includes(window.CURRENT_ROLE);

  // The name a comment is signed with. SETTINGS.designerName is the *studio's*
  // name and is shared by every reader, so a member posting under it would sign
  // as the lead designer. Their own profile comes first.
  window.myDisplayName = function myDisplayName() {
    const p = window.CURRENT_PROFILE || {};
    const s = window.SETTINGS || {};
    if (p.full_name && String(p.full_name).trim()) return String(p.full_name).trim();
    if (canCurate() && s.designerName) return s.designerName;
    if (p.email) return String(p.email).split('@')[0];
    return 'Member';
  };

  // thread row -> the shape the page renders. posts are attached by load().
  function rowToThread(r) {
    const d = (r && r.data) || {};
    return { ...d, id: r.id, _createdBy: r.created_by || null, posts: [] };
  }

  // Only the discussion's own fields belong in threads.data — comments live in
  // their own table, and _createdBy is our bookkeeping.
  function threadToData(t) {
    const { posts, _createdBy, id, ...rest } = t || {};
    return rest;
  }

  function postToData(p) {
    const { id, _createdBy, ...rest } = p || {};
    return rest;
  }

  window.useThreads = function useThreads() {
    const [items, setItems] = React.useState([]);
    const [status, setStatus] = React.useState({ loading: true, error: null, saving: false, fallback: false });

    const known      = React.useRef(new Map());  // threadId -> JSON of thread data
    const knownPosts = React.useRef(new Map());  // postId   -> threadId

    const remember = (list) => {
      const t = new Map(), p = new Map();
      for (const th of list) {
        t.set(th.id, JSON.stringify(threadToData(th)));
        for (const po of (th.posts || [])) p.set(po.id, th.id);
      }
      known.current = t; knownPosts.current = p;
    };

    const readLocal = () => {
      try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (e) { return []; }
    };

    // Push a browser-only backlog into the shared tables, threads then posts.
    const seed = async (local) => {
      const uid = (window.CURRENT_USER && window.CURRENT_USER.id) || null;
      for (const t of local) {
        const { error } = await sb().from(T_THREADS)
          .insert({ id: t.id, data: threadToData(t), created_by: uid });
        if (error) continue;                    // skip that thread, keep the rest
        for (const p of (t.posts || [])) {
          if (!p || !p.id) continue;
          await sb().from(T_POSTS)
            .insert({ id: p.id, thread_id: t.id, data: postToData(p), created_by: uid });
        }
      }
    };

    // keepError: a reconcile after a failed save must not wipe the message
    // explaining why it failed.
    const load = React.useCallback(async (opts) => {
      const keepError = !!(opts && opts.keepError);
      if (!sb()) {
        const local = readLocal();
        setItems(local); remember(local);
        setStatus(s => ({ loading: false, saving: false, fallback: true, error: keepError ? s.error : null }));
        return;
      }
      try {
        const [tr, pr] = await Promise.all([
          sb().from(T_THREADS).select('*').order('created_at', { ascending: false }),
          sb().from(T_POSTS).select('*').order('created_at', { ascending: true }),
        ]);
        if (tr.error) throw tr.error;
        if (pr.error) throw pr.error;

        const list = (tr.data || []).map(rowToThread);
        const byId = new Map(list.map(t => [t.id, t]));
        for (const row of (pr.data || [])) {
          const t = byId.get(row.thread_id);
          if (!t) continue;
          const d = row.data || {};
          t.posts.push({ ...d, id: row.id, _createdBy: row.created_by || null });
        }
        // A comment's own timestamp is what the page shows, so order by it.
        for (const t of list) t.posts.sort((a, b) => (a.when || 0) - (b.when || 0));

        // One-time rescue: discussions that only ever existed in a curator's
        // browser. Guarded on the cloud being empty, so deleting every
        // discussion can never resurrect them from a stale local copy.
        if (!list.length && canCurate() && !localStorage.getItem(SEEDED)) {
          const local = readLocal().filter(t => t && t.id);
          if (local.length) {
            try { localStorage.setItem(SEEDED, '1'); } catch (e) {}
            await seed(local);
            return load({ keepError });
          }
        }

        setItems(list); remember(list);
        setStatus(s => ({ loading: false, saving: false, fallback: false, error: keepError ? s.error : null }));
      } catch (e) {
        const local = readLocal();
        setItems(local); remember(local);
        setStatus({ loading: false, saving: false, fallback: true,
          error: 'Could not load discussions: ' + (e.message || e) });
      }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    React.useEffect(() => {
      const onVis = () => { if (!document.hidden) load(); };
      document.addEventListener('visibilitychange', onVis);
      return () => document.removeEventListener('visibilitychange', onVis);
    }, [load]);

    /* Accepts the whole array, like useEntities did, and works out what
       actually changed — thread fields in one table, comments in the other. */
    const commit = React.useCallback(async (next) => {
      const list = typeof next === 'function' ? next(items) : next;
      setItems(list);                                   // optimistic

      if (!sb()) {
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch (e) {}
        return;
      }

      const uid = (window.CURRENT_USER && window.CURRENT_USER.id) || null;
      const prevT = known.current, prevP = knownPosts.current;

      const tIns = [], tUpd = [], tDel = [];
      const pIns = [], pDel = [];
      const nextTIds = new Set(list.map(t => t.id));
      const nextPIds = new Set();

      for (const t of list) {
        const json = JSON.stringify(threadToData(t));
        if (!prevT.has(t.id)) tIns.push(t);
        else if (prevT.get(t.id) !== json) tUpd.push(t);
        for (const p of (t.posts || [])) {
          if (!p || !p.id) continue;
          nextPIds.add(p.id);
          if (!prevP.has(p.id)) pIns.push({ post: p, threadId: t.id });
        }
      }
      for (const id of prevT.keys()) if (!nextTIds.has(id)) tDel.push(id);
      // A comment on a deleted thread goes with it (on delete cascade), so only
      // chase comments whose thread is still here.
      for (const [pid, tid] of prevP.entries()) {
        if (!nextPIds.has(pid) && nextTIds.has(tid)) pDel.push(pid);
      }

      if (!tIns.length && !tUpd.length && !tDel.length && !pIns.length && !pDel.length) return;

      setStatus(s => ({ ...s, saving: true, error: null }));
      const failures = [];
      try {
        for (const t of tIns) {
          const { error } = await sb().from(T_THREADS)
            .insert({ id: t.id, data: threadToData(t), created_by: uid });
          if (error) failures.push('start "' + (t.title || t.id) + '": ' + error.message);
        }
        for (const t of tUpd) {
          const { error } = await sb().from(T_THREADS)
            .update({ data: threadToData(t) }).eq('id', t.id);
          if (error) failures.push('update "' + (t.title || t.id) + '": ' + error.message);
        }
        // Comments before thread deletes, so a reply is never orphaned.
        for (const entry of pIns) {
          const { error } = await sb().from(T_POSTS).insert({
            id: entry.post.id, thread_id: entry.threadId,
            data: postToData(entry.post), created_by: uid });
          if (error) failures.push('post comment: ' + error.message);
        }
        for (const pid of pDel) {
          const { error } = await sb().from(T_POSTS).delete().eq('id', pid);
          if (error) failures.push('remove comment: ' + error.message);
        }
        for (const id of tDel) {
          const { error } = await sb().from(T_THREADS).delete().eq('id', id);
          if (error) failures.push('delete discussion: ' + error.message);
        }
      } catch (e) {
        failures.push(e.message || String(e));
      }

      if (failures.length) {
        const message = failures.join(' · ');
        await load({ keepError: true });     // reconcile, but keep the reason
        setStatus(s => ({ ...s, saving: false, error: message }));
      } else {
        remember(list);
        setStatus(s => ({ ...s, saving: false, error: null }));
      }
      window.dispatchEvent(new CustomEvent('studio:data-change', { detail: { key: 'threads' } }));
    }, [items, load]);

    return [items, commit, status, load];
  };
})();
