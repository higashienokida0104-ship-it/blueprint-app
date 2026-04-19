// BLUEPRINT — Vercel Cloud DB Load (JWT認証付き)
const { setCors, verifyToken } = require('./_helper');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.json({ data: null });

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: '認証トークンが必要です' });

  const userId = await verifyToken(token);
  if (!userId) return res.status(401).json({ error: 'ログインが必要です' });

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/blueprint_data?user_id=eq.${encodeURIComponent(userId)}&select=data,updated_at`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!r.ok) return res.json({ data: null });
    const rows = await r.json();
    if (!rows?.length) return res.json({ data: null });
    return res.json({ data: rows[0].data, updatedAt: rows[0].updated_at });
  } catch {
    return res.json({ data: null });
  }
};
