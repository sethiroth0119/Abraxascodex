/**
 * Supabase auth — shared across login.html and the main studio.
 * Loaded before any page logic. Exposes window.supabaseClient.
 *
 * SUPABASE_ANON_KEY: Settings → API → Project API keys → anon/public
 */
const SUPABASE_URL      = 'https://uvfhiqwvpixfobjnyqtf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmhpcXd2cGl4Zm9iam55cXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTk2MzUsImV4cCI6MjA5NDY5NTYzNX0.rKWgWGuGJsaW_vn1J1_GnV0ayz91ctnEhsu57f06JtI';

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
