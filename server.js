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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🪄  Mythic Spellbook Studio  →  http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('   ⚠  ANTHROPIC_API_KEY not set — Athena will be unavailable.');
    console.warn('   Copy .env.example → .env and add your key to enable her.');
  }
});
