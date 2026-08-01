// Global voice instruction applied to every Athena call (all features proxy here).
const ATHENA_VOICE = `You are Athena, speaking directly to a person in a small chat window. Reply the way a thoughtful colleague talks out loud — plain, natural sentences in short paragraphs. Do not use markdown or any formatting symbols: no "#" or "##" headings, no "**" or "*" around words, no backticks, no bullet points or leading dashes, and no bold section labels like "Concrete next step:". If you have several points, weave them into flowing prose. Be warm, direct, and human.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/claude' && request.method === 'POST') return handleClaude(request, env);
    if (url.pathname === '/api/sprite' && request.method === 'POST') return handleSprite(request, env);
    if (url.pathname === '/api/msb-profile' && request.method === 'POST') return handleMsbProfile(request, env);

    if (url.pathname === '/' || url.pathname === '') {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleClaude(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON body' }, 400); }

  const { messages, max_tokens = 2048 } = body;
  if (!messages || !Array.isArray(messages)) {
    return json({ error: 'messages array required' }, 400);
  }

  if (!env.ANTHROPIC_API_KEY) {
    return json({
      error: 'ANTHROPIC_API_KEY not set — add it in Workers & Pages → your project → Settings → Variables.',
    }, 503);
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens, system: ATHENA_VOICE, messages }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return json({ error: data.error?.message || `Anthropic error ${resp.status}` }, resp.status);
    }

    const block = data.content && data.content.find(b => b.type === 'text');
    return json({ content: block ? block.text : '' });
  } catch (err) {
    return json({ error: err.message || 'Unknown error' }, 500);
  }
}

const AS_BASE = 'https://www.autosprite.io/api/mcp';
const SPRITE_TOOLS = {
  account:    'get_account',
  create:     'create_character',
  upload:     'upload_character',
  list:       'list_characters',
  get:        'get_character',
  generate:   'generate_spritesheet',
  regenerate: 'regenerate_spritesheet',
  listSheets: 'list_spritesheets',
  getSheet:   'get_spritesheet',
  listJobs:   'list_jobs',
  jobStatus:  'get_job_status',
};

async function handleSprite(request, env) {
  if (!env.AUTOSPRITE_API_KEY) {
    return json({ error: 'AUTOSPRITE_API_KEY not set in Workers environment secrets' }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { action, params = {} } = body;
  const toolName = SPRITE_TOOLS[action];
  if (!toolName) return json({ error: `Unknown action: ${action}` }, 400);

  try {
    const resp = await fetch(AS_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.AUTOSPRITE_API_KEY}`,
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: params },
      }),
    });

    const contentType = resp.headers.get('content-type') || '';
    let result = null;

    if (contentType.includes('text/event-stream')) {
      const text = await resp.text();
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.result) { result = msg.result; break; }
            if (msg.error) return json({ error: msg.error.message || 'AutoSprite error' }, 500);
          } catch {}
        }
      }
    } else {
      const data = await resp.json();
      if (data.error) return json({ error: data.error.message || 'AutoSprite error' }, 500);
      result = data.result;
    }

    const c = result?.content?.[0];
    if (!c) return json(result || {});
    if (c.type === 'text') {
      try { return json(JSON.parse(c.text)); } catch { return json({ text: c.text }); }
    }
    if (c.type === 'image') return json({ image_url: c.url, data: c.data, mimeType: c.mimeType });
    return json(result);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

// Gaming Profiles email match — LOCKED DOWN.
// The client sends the caller's Codex access token (no email). We verify it
// against the Codex Supabase to get the *real* email, then look that email up in
// the GAME database with the service key. This means email lookups can't be
// enumerated with the public key — you can only ever fetch your own profile.
const CODEX_URL  = 'https://uvfhiqwvpixfobjnyqtf.supabase.co';
const CODEX_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmhpcXd2cGl4Zm9iam55cXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTk2MzUsImV4cCI6MjA5NDY5NTYzNX0.rKWgWGuGJsaW_vn1J1_GnV0ayz91ctnEhsu57f06JtI';
const GAME_URL   = 'https://ktsiasyjusesawtrwrjc.supabase.co';

async function handleMsbProfile(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Not signed in' }, 401);

  // 1. Verify the Codex session and read the caller's real email.
  let email;
  try {
    const r = await fetch(CODEX_URL + '/auth/v1/user', {
      headers: { apikey: CODEX_ANON, Authorization: 'Bearer ' + token },
    });
    if (!r.ok) return json({ error: 'Invalid session' }, 401);
    const u = await r.json();
    email = u && u.email;
  } catch (e) { return json({ error: 'Auth check failed' }, 502); }
  if (!email) return json({ error: 'No email on session' }, 400);

  // 2. Look up that verified email in the game DB with the service key.
  if (!env.GAME_SERVICE_KEY) return json({ error: 'GAME_SERVICE_KEY not set on the worker' }, 503);
  try {
    const r = await fetch(GAME_URL + '/rest/v1/rpc/msb_profile_by_email', {
      method: 'POST',
      headers: {
        apikey: env.GAME_SERVICE_KEY,
        Authorization: 'Bearer ' + env.GAME_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_email: email }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) return json({ error: (data && data.message) || ('lookup failed ' + r.status) }, r.status);
    return json({ profile: data }); // profile json, or null if no game account
  } catch (e) { return json({ error: e.message || 'lookup error' }, 500); }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
