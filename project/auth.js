/**
 * Supabase auth — shared across login.html and the main studio.
 * Loaded before any page logic. Exposes window.supabaseClient.
 *
 * SUPABASE_ANON_KEY: Settings → API → Project API keys → anon/public
 */
const SUPABASE_URL      = 'https://uvfhiqwvpixfobjnyqtf.supabase.co';
const SUPABASE_ANON_KEY = 'REPLACE_WITH_YOUR_ANON_KEY';

const { createClient } = window.supabase;
window.supabaseClient  = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Call this at the top of any protected page.
 * Redirects to /login.html if there is no active session.
 */
async function requireAuth() {
  const { data } = await window.supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = '/login.html';
  }
  return data.session;
}

async function signOut() {
  await window.supabaseClient.auth.signOut();
  window.location.href = '/login.html';
}

window.requireAuth = requireAuth;
window.signOut     = signOut;
