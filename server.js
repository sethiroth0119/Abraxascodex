require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Serve the project directory as static files
const PROJECT = path.join(__dirname, 'project');
app.use(express.static(PROJECT));

// Root → main HTML file
app.get('/', (_req, res) => {
  res.sendFile(path.join(PROJECT, 'Mythic Spellbook Studio.html'));
});

// Claude API proxy — used by Athena and other AI helpers throughout the studio
app.post('/api/claude', async (req, res) => {
  const { messages, max_tokens = 2048 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY not set — add it to .env to enable Athena.',
    });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens,
      messages,
    });
    const text = response.content.find(b => b.type === 'text');
    res.json({ content: text ? text.text : '' });
  } catch (err) {
    console.error('[/api/claude]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// AutoSprite sprite generation proxy
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

async function callAutoSprite(toolName, args, apiKey) {
  const resp = await fetch(AS_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });

  const contentType = resp.headers.get('content-type') || '';

  // SSE stream — scan for the result message
  if (contentType.includes('text/event-stream')) {
    const text = await resp.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const msg = JSON.parse(line.slice(6));
          if (msg.result) return msg.result;
          if (msg.error) throw new Error(msg.error.message || 'AutoSprite error');
        } catch(e) { if (e.message !== 'Unexpected token') throw e; }
      }
    }
    return null;
  }

  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || 'AutoSprite error');
  return data.result;
}

function parseAsResult(result) {
  const c = result?.content?.[0];
  if (!c) return result || {};
  if (c.type === 'text') {
    try { return JSON.parse(c.text); } catch { return { text: c.text }; }
  }
  if (c.type === 'image') return { image_url: c.url, data: c.data, mimeType: c.mimeType };
  return result;
}

app.post('/api/sprite', async (req, res) => {
  const apiKey = process.env.AUTOSPRITE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AUTOSPRITE_API_KEY not set in .env' });

  const { action, params = {} } = req.body;
  const toolName = SPRITE_TOOLS[action];
  if (!toolName) return res.status(400).json({ error: `Unknown action: ${action}` });

  try {
    const result = await callAutoSprite(toolName, params, apiKey);
    res.json(parseAsResult(result));
  } catch (err) {
    console.error('[/api/sprite]', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🪄  Mythic Spellbook Studio  →  http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('   ⚠  ANTHROPIC_API_KEY not set — Athena will be unavailable.');
    console.warn('   Copy .env.example → .env and add your key to enable her.');
  }
});
