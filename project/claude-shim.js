/**
 * Polyfills window.claude.complete for local/production deployment.
 * All nine modules that call window.claude.complete() will automatically
 * use this without any code changes.
 *
 * Calls POST /api/claude on the Express server, which proxies to the
 * Anthropic API. If the server is unavailable, resolves with a friendly
 * error message so Athena fails gracefully inside the UI rather than
 * throwing an uncaught error.
 */
window.claude = {
  async complete({ messages, max_tokens }) {
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, max_tokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.content;
    } catch (err) {
      // Surface the error inside the UI (Athena already catches and shows it)
      throw new Error(err.message || 'Could not reach the Athena API. Is the server running?');
    }
  },
};
