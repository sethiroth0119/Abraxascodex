/**
 * Supabase auth — shared across login.html and the main studio.
 * Exposes: supabaseClient, CURRENT_USER, CURRENT_ROLE,
 *          ALLOWED_PAGES (Set), ALL_ROLE_PERMISSIONS (array)
 */
const SUPABASE_URL      = 'https://uvfhiqwvpixfobjnyqtf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmhpcXd2cGl4Zm9iam55cXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTk2MzUsImV4cCI6MjA5NDY5NTYzNX0.rKWgWGuGJsaW_vn1J1_GnV0ayz91ctnEhsu57f06JtI';

const { createClient } = window.supabase;
window.supabaseClient  = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// All nav page ids — used as fallback when the DB tables aren't set up yet
const ALL_PAGES = [
  'dashboard','systems','elements','factions','lore','timeline',
  'cards','moves','passives','statuses','natures',
  'heroes','lineage',
  'threads','tasks','ideas','concepts','dialogue','bugs',
  'campaigns','worldEvents','resources','economy','relics',
  'playtest','activity','settings','users','sprites','live',
];

async function requireAuth() {
  const { data } = await window.supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = '/login.html';
    return null;
  }

  const user = data.session.user;
  window.CURRENT_USER = user;

  // Fetch profile (role) — graceful fallback if table doesn't exist yet
  let role = 'user';
  let profile = null;
  try {
    const { data: p, error } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!error && p) { profile = p; role = p.role || 'user'; }
  } catch (_) {}

  // Fetch role permissions
  let allPerms = [];
  try {
    const { data: rp } = await window.supabaseClient
      .from('role_permissions')
      .select('*');
    if (rp) allPerms = rp;
  } catch (_) {}

  window.CURRENT_PROFILE      = profile || { id: user.id, email: user.email, role };
  window.CURRENT_ROLE         = role;
  window.ALL_ROLE_PERMISSIONS = allPerms;
  window.IS_VIEWER            = (role === 'user');

  // CSS hook so styles.css viewer rules activate immediately
  document.body.dataset.viewer = window.IS_VIEWER ? 'true' : 'false';

  // Build the set of pages this role can see
  const myPerms = allPerms.find(p => p.role === role);
  // Admins always get everything; fall back to all pages if tables not ready
  window.ALLOWED_PAGES = new Set(
    role === 'admin' ? ALL_PAGES :
    myPerms          ? myPerms.allowed_pages :
                       ALL_PAGES   // graceful fallback
  );

  return data.session;
}

async function signOut() {
  await window.supabaseClient.auth.signOut();
  window.location.href = '/login.html';
}

window.requireAuth = requireAuth;
window.signOut     = signOut;
