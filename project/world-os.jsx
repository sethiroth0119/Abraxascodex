/* ============================================================================
   WORLD OS — core
   ----------------------------------------------------------------------------
   A registration layer so world-building pages can be added without editing
   app.jsx, sidebar.jsx or styles.css by hand. A page ends with:

     window.registerWorldOS({
       id:         'atlas',
       nav:        { section:'World OS', item:{ id:'atlas', label:'Atlas', icon:'map' } },
       routes:     { atlas: () => <AtlasPage/> },
       collections:[ ['maps','WORLD_MAPS'], ['mapPins','WORLD_MAP_PINS'] ],
       styles:     '.atlas{...}',
     });

   app.jsx consults window.WorldOS.routes for any route it does not know, and
   sidebar.jsx renders window.NAV, which this file appends to.

   Also provides the shared services those pages need — chiefly the image
   pipeline, since the studio had no way to take an uploaded picture before.
   ========================================================================== */

(function () {
  'use strict';

  const WorldOS = window.WorldOS || (window.WorldOS = {
    routes: {},        // routeId -> () => ReactElement
    pages: {},         // pageId  -> registration record
    collections: [],   // [storageKey, windowKey] pairs contributed by pages
  });

  /* ── style injection ────────────────────────────────────────────────── */
  function injectStyles(id, css) {
    if (!css) return;
    const tagId = 'world-os-style-' + id;
    if (document.getElementById(tagId)) return;
    const el = document.createElement('style');
    el.id = tagId;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ── nav merge ──────────────────────────────────────────────────────── */
  function mergeNav(entry) {
    if (!entry || !window.NAV) return;
    const { section, item } = entry;
    if (!section || !item) return;
    let group = window.NAV.find(g => g.section === section);
    if (!group) { group = { section, items: [] }; window.NAV.push(group); }
    if (!group.items.some(i => i.id === item.id)) group.items.push(item);
  }

  /* ── registration ───────────────────────────────────────────────────── */
  window.registerWorldOS = function registerWorldOS(spec) {
    if (!spec || !spec.id) return;
    if (WorldOS.pages[spec.id]) return;          // idempotent across re-evals
    WorldOS.pages[spec.id] = spec;

    Object.assign(WorldOS.routes, spec.routes || {});
    (Array.isArray(spec.nav) ? spec.nav : [spec.nav]).forEach(mergeNav);
    (spec.collections || []).forEach(c => {
      if (!WorldOS.collections.some(x => x[0] === c[0])) WorldOS.collections.push(c);
      if (window.registerEntityKey) window.registerEntityKey(c[0], c[1]);
    });
    injectStyles(spec.id, spec.styles);

    // If the shell has already mounted, tell it to pick up the new page.
    window.dispatchEvent(new CustomEvent('worldos:registered', { detail: spec.id }));
  };

  /* ==========================================================================
     IMAGE PIPELINE
     The studio previously had no upload path of any kind. Images are taken
     from a File, downscaled on a canvas and stored as a data URL on the
     record itself, so everything keeps working with the existing
     localStorage + cloud sync without needing a storage bucket.

     Downscaling is not cosmetic: a 12MP phone photo is ~8MB of base64, which
     would blow the storage quota in a couple of uploads.
     ====================================================================== */

  const IMAGE_PRESETS = {
    thumb:   { max: 400,  quality: 0.80 },
    art:     { max: 1600, quality: 0.82 },   // portraits, article headers
    map:     { max: 3000, quality: 0.86 },   // maps need detail when zoomed
  };

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('Could not read ' + file.name));
      fr.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Not a readable image'));
      img.src = src;
    });
  }

  // Prefer WebP — roughly 30% smaller than JPEG at the same quality — but fall
  // back where the browser will not encode it.
  function encode(canvas, quality) {
    const webp = canvas.toDataURL('image/webp', quality);
    if (webp && webp.indexOf('data:image/webp') === 0) return webp;
    return canvas.toDataURL('image/jpeg', quality);
  }

  async function processImage(file, presetName) {
    const preset = IMAGE_PRESETS[presetName] || IMAGE_PRESETS.art;
    if (!file || !/^image\//.test(file.type)) throw new Error('That file is not an image');

    const raw = await readFileAsDataURL(file);
    const img = await loadImage(raw);

    const scale = Math.min(1, preset.max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = encode(canvas, preset.quality);
    return {
      dataUrl,
      width: w,
      height: h,
      naturalWidth: img.width,
      naturalHeight: img.height,
      bytes: Math.round(dataUrl.length * 0.75),   // base64 -> approx bytes
      type: dataUrl.slice(5, dataUrl.indexOf(';')),
      name: file.name,
    };
  }

  function prettyBytes(n) {
    if (!n && n !== 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function nameFromUrl(url) {
    try {
      const p = new URL(url, location.href).pathname.split('/').pop() || 'image';
      return decodeURIComponent(p).replace(/\.[^.]+$/, '') || 'image';
    } catch (e) { return 'image'; }
  }

  // Load a URL just to confirm it is an image and learn its dimensions. This
  // works even when the host forbids cross-origin *reads*, because <img> is
  // allowed to display what canvas is not allowed to inspect.
  function probeImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('That URL did not load as an image'));
      img.src = url;
    });
  }

  /* Take an image by URL.
     Preferred path: fetch it, downscale it and store it like an upload, so the
     world keeps working if the original host disappears.
     Fallback: many hosts refuse cross-origin reads, which taints the canvas and
     makes toDataURL throw. Rather than fail, keep it as a live link — that
     costs no storage at all, but it does depend on the host staying up. */
  async function processUrl(rawUrl, presetName) {
    const url = String(rawUrl || '').trim();
    if (!url) throw new Error('Enter an image URL');
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
      throw new Error('URL must start with http:// or https://');
    }
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      if (!/^image\//.test(blob.type)) throw new Error('Not an image');
      const out = await processImage(new File([blob], nameFromUrl(url), { type: blob.type }), presetName);
      return { ...out, sourceUrl: url };
    } catch (e) {
      const dim = await probeImage(url);          // throws if it is not an image at all
      return {
        url, remote: true, name: nameFromUrl(url),
        width: dim.width, height: dim.height,
        naturalWidth: dim.width, naturalHeight: dim.height,
        bytes: 0,
      };
    }
  }

  // Every consumer should read an image through this — a record is either an
  // uploaded data URL or a linked remote URL.
  const imageSrc = (img) => (img && (img.dataUrl || img.url)) || '';

  // Open a file picker and return processed images.
  function pickImages({ preset = 'art', multiple = false } = {}) {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = !!multiple;
      input.onchange = async () => {
        const files = Array.from(input.files || []);
        const out = [];
        for (const f of files) {
          try { out.push(await processImage(f, preset)); }
          catch (e) { console.warn('[world-os] skipped', f.name, e.message); }
        }
        resolve(out);
      };
      input.click();
    });
  }

  Object.assign(WorldOS, {
    processImage, processUrl, probeImage, imageSrc, pickImages, prettyBytes, IMAGE_PRESETS,

    /* ── cross-entity linking ──────────────────────────────────────────
       World Anvil's real power is that everything references everything.
       This builds a flat index across every collection the studio holds so
       an article, pin or quest can point at any of them. */
    index() {
      const sources = [
        ['hero',    'HEROES',       'Heroes & NPCs'],
        ['faction', 'FACTIONS',     'Factions'],
        ['element', 'ELEMENTS',     'Elements'],
        ['card',    'CARDS',        'Cards'],
        ['item',    'ITEMS',        'Items & Relics'],
        ['lore',    'LORE_ENTRIES', 'Lore Codex'],
        ['event',   'WORLD_EVENTS', 'World Events'],
        ['article', 'WORLD_ARTICLES', 'World Bible'],
        ['map',     'WORLD_MAPS',   'Atlas'],
      ];
      const out = [];
      for (const [kind, wk, label] of sources) {
        const list = window[wk];
        if (!Array.isArray(list)) continue;
        for (const r of list) {
          if (!r || !r.id || r._deleted) continue;
          out.push({
            kind, group: label, id: r.id,
            name: r.name || r.title || r.label || String(r.id),
          });
        }
      }
      return out;
    },

    resolve(ref) {
      if (!ref) return null;
      return WorldOS.index().find(e => e.kind === ref.kind && e.id === ref.id) || null;
    },

    /* ── backlinks ─────────────────────────────────────────────────────
       The forward direction (an article naming a hero) is stored on the
       article. This walks every World OS collection to answer the reverse
       question — "what refers to THIS?" — which is what makes an existing
       Heroes or Factions page suddenly know about its own world.           */
    backlinks(ref) {
      const out = { articles: [], relationships: [], pins: [], quests: [], events: [], assets: [] };
      if (!ref || !ref.kind || !ref.id) return out;
      const hits = (l) => Array.isArray(l) && l.some(x => x && x.kind === ref.kind && x.id === ref.id);
      const live = (wk) => (Array.isArray(window[wk]) ? window[wk] : []).filter(r => r && !r._deleted);

      for (const a of live('WORLD_ARTICLES')) {
        if (hits(a.links)) out.articles.push({ id: a.id, name: a.title, meta: a.template, route: 'worldBible' });
      }
      for (const r of live('WORLD_RELATIONSHIPS')) {
        const isFrom = r.from && r.from.kind === ref.kind && r.from.id === ref.id;
        const isTo   = r.to   && r.to.kind   === ref.kind && r.to.id   === ref.id;
        if (!isFrom && !isTo) continue;
        const other = isFrom ? r.to : r.from;
        const hit = WorldOS.resolve(other);
        out.relationships.push({
          id: r.id, type: r.type, direction: isFrom ? 'out' : 'in',
          otherName: hit ? hit.name : (other && other.id), note: r.note, route: 'relationships',
        });
      }
      const mapName = (id) => {
        const m = live('WORLD_MAPS').find(x => x.id === id);
        return m ? m.name : 'a map';
      };
      for (const p of live('WORLD_MAP_PINS')) {
        if (hits(p.links)) out.pins.push({ id: p.id, name: p.name, meta: mapName(p.mapId), route: 'atlas' });
      }
      for (const q of live('WORLD_QUESTS')) {
        const inObjectives = (q.objectives || []).some(o => hits(o.links));
        if (hits(q.links) || inObjectives) {
          out.quests.push({ id: q.id, name: q.title, meta: q.status, route: 'quests' });
        }
      }
      for (const e of live('WORLD_CHRON_EVENTS')) {
        if (hits(e.links)) out.events.push({ id: e.id, name: e.title, meta: String(e.year ?? ''), route: 'chronicle' });
      }
      for (const a of live('WORLD_ASSETS')) {
        if (hits(a.links)) out.assets.push({ id: a.id, name: a.name, image: a.image, route: 'assets' });
      }
      return out;
    },

    backlinkCount(ref) {
      const b = WorldOS.backlinks(ref);
      return b.articles.length + b.relationships.length + b.pins.length
           + b.quests.length + b.events.length + b.assets.length;
    },
  });

  /* ── route lookup used by app.jsx ───────────────────────────────────── */
  window.renderWorldOSRoute = function (route) {
    const fn = WorldOS.routes[route];
    return fn ? fn() : null;
  };
})();
