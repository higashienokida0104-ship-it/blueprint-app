// BLUEPRINT — Vercel Cloud DB Save (JWT認証付き)
const { setCors, verifyToken } = require('./_helper');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'DB未設定' });

  const { token, data } = req.body || {};
  if (!token) return res.status(400).json({ error: '認証トークンが必要です' });
  if (!data)  return res.status(400).json({ error: 'dataが必要です' });

  const userId = await verifyToken(token);
  if (!userId) return res.status(401).json({ error: 'ログインが必要です。再ログインしてください。' });

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/blueprint_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ user_id: userId, data, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) return res.status(500).json({ error: 'DB保存エラー: ' + await r.text() });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'サーバー接続エラー: ' + e.message });
  }
};
