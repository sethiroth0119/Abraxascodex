export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Claude API proxy — used by Athena and all AI helpers
    if (url.pathname === '/api/claude' && request.method === 'POST') {
      return handleClaude(request, env);
    }

    // Redirect bare root to the main HTML file
    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect(
        new URL('/Mythic%20Spellbook%20Studio.html', url.origin).href,
        302
      );
    }

    // Serve everything else from the project/ static assets
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
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens, messages }),
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
