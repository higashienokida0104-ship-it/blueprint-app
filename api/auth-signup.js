// BLUEPRINT — Vercel ユーザー登録 (Supabase Auth)
const { setCors } = require('./_helper');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'サーバー設定エラー' });

  const { email, password } = req.body || {};
  if (!email || !password)            return res.status(400).json({ error: 'メールアドレスとパスワードが必要です' });
  if (password.length < 8)            return res.status(400).json({ error: 'パスワードは8文字以上にしてください' });
  if (!/\S+@\S+\.\S+/.test(email))   return res.status(400).json({ error: 'メールアドレスの形式が正しくありません' });

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok || data.error) return res.status(400).json({ error: data.error?.message || '登録に失敗しました' });
    if (!data.access_token)  return res.json({ requireEmailConfirm: true, email });
    return res.json({ token: data.access_token, refreshToken: data.refresh_token, email: data.user?.email, userId: data.user?.id });
  } catch (e) {
    return res.status(502).json({ error: 'サーバー接続エラー: ' + e.message });
  }
};
