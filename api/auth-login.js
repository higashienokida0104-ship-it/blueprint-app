// BLUEPRINT — Vercel ログイン (Supabase Auth)
const { setCors } = require('./_helper');

/** Supabase 各バージョンのエラーレスポンスを統一して文字列化 */
function parseLoginError(data) {
  const raw = data.error_description || data.msg || data.error?.message
           || (typeof data.error === 'string' ? data.error : '') || data.message || '';
  const s = raw.toLowerCase();
  if (s.includes('invalid login') || s.includes('invalid credentials') || s.includes('invalid email or password'))
    return 'メールアドレスまたはパスワードが正しくありません';
  if (s.includes('email not confirmed') || s.includes('email_not_confirmed'))
    return 'メールアドレスの確認が完了していません。確認メールのリンクをクリックしてください';
  if (s.includes('rate limit') || s.includes('too many'))
    return '短時間に多くのログイン試行がありました。しばらく待ってから再試行してください';
  if (s.includes('user not found') || s.includes('no user'))
    return 'このメールアドレスは登録されていません。新規登録タブからアカウントを作成してください';
  return raw || 'ログインに失敗しました';
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY)
    return res.status(500).json({ error: 'サーバー設定エラー（環境変数未設定）' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'メールアドレスとパスワードが必要です' });

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    let data;
    try { data = await r.json(); }
    catch { return res.status(502).json({ error: 'Supabaseからの応答を解析できませんでした' }); }

    console.log('[login] status:', r.status, 'has_token:', !!data.access_token);

    if (!r.ok || data.error || data.msg) {
      return res.status(r.ok ? 401 : r.status).json({ error: parseLoginError(data) });
    }

    if (!data.access_token) {
      return res.status(401).json({ error: 'ログインに失敗しました（トークンが取得できませんでした）' });
    }

    return res.json({
      token:        data.access_token,
      refreshToken: data.refresh_token,
      email:        data.user?.email || email,
      userId:       data.user?.id,
    });

  } catch (e) {
    console.error('[login] exception:', e.message);
    return res.status(502).json({ error: 'サーバー接続エラー: ' + e.message });
  }
};
