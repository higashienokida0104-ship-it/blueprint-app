// BLUEPRINT — Vercel Token Refresh (リフレッシュトークンで新しいアクセストークン取得)
const { setCors } = require('./_helper');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'DB未設定' });

  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshTokenが必要です' });

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(401).json({ error: 'トークン更新失敗。再ログインしてください。' });
    return res.json({
      token:        data.access_token,
      refreshToken: data.refresh_token,
    });
  } catch (e) {
    return res.status(502).json({ error: 'サーバーエラー: ' + e.message });
  }
};
