// BLUEPRINT — Vercel API 共通ヘルパー

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function setCors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
}

async function verifyToken(token) {
  if (!token) return null;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id || null;
  } catch { return null; }
}

module.exports = { CORS, setCors, verifyToken };
