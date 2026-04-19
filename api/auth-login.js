// BLUEPRINT — Vercel ログイン (Supabase Auth)
const { setCors, CORS } = require('./_helper');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'サーバー設定エラー' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'メールアドレスとパスワードが必要です' });

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok || data.error) {
      const raw = data.error_description || data.error?.message || '';
      let msg = 'ログインに失敗しました';
      if (raw.includes('Invalid login')) msg = 'メールアドレスまたはパスワードが正しくありません';
      if (raw.includes('Email not confirmed')) msg = 'メールアドレスの確認が完了していません';
      return res.status(401).json({ error: msg });
    }
    return res.json({ token: data.access_token, refreshToken: data.refresh_token, email: data.user?.email, userId: data.user?.id });
  } catch (e) {
    return res.status(502).json({ error: 'サーバー接続エラー: ' + e.message });
  }
};
