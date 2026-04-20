// BLUEPRINT — Vercel ユーザー登録 (Supabase Auth)
const { setCors } = require('./_helper');

/** Supabase 各バージョンのエラーレスポンスを統一して文字列化 */
function parseSupabaseError(data, fallback) {
  // GoTrue v2 (新形式): { code, error_code, msg }
  if (data.msg)               return _friendlyMsg(data.msg, data.error_code);
  // GoTrue v1 (旧形式): { error, error_description }
  if (data.error_description) return _friendlyMsg(data.error_description);
  if (typeof data.error === 'string') return _friendlyMsg(data.error);
  if (data.error?.message)    return _friendlyMsg(data.error.message);
  if (data.message)           return _friendlyMsg(data.message);
  return fallback;
}

function _friendlyMsg(raw, code) {
  const s = (raw || '').toLowerCase();
  if (code === 'user_already_exists' || s.includes('already registered') || s.includes('already exists'))
    return 'このメールアドレスはすでに登録されています。ログインタブからサインインしてください。';
  if (s.includes('invalid email') || s.includes('email address'))
    return 'メールアドレスの形式が正しくありません';
  if (s.includes('password') && (s.includes('short') || s.includes('weak') || s.includes('least')))
    return 'パスワードは8文字以上にしてください';
  if (s.includes('signup') && s.includes('disabled'))
    return '現在、新規登録は無効になっています';
  if (s.includes('rate limit') || s.includes('too many'))
    return '短時間に多くのリクエストがありました。しばらく待ってから再試行してください';
  return raw || '登録に失敗しました';
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
  if (!email || !password)           return res.status(400).json({ error: 'メールアドレスとパスワードが必要です' });
  if (password.length < 8)           return res.status(400).json({ error: 'パスワードは8文字以上にしてください' });
  if (!/\S+@\S+\.\S+/.test(email))  return res.status(400).json({ error: 'メールアドレスの形式が正しくありません' });

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
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

    console.log('[signup] status:', r.status, 'data keys:', Object.keys(data));

    // エラー判定（GoTrue v1 / v2 両対応）
    if (!r.ok || data.error || data.msg) {
      const errMsg = parseSupabaseError(data, '登録に失敗しました');
      return res.status(r.ok ? 400 : r.status).json({ error: errMsg });
    }

    // access_token がない = メール確認待ち
    if (!data.access_token) {
      // identities が空配列 → すでに登録済みユーザー
      if (Array.isArray(data.identities) && data.identities.length === 0) {
        return res.status(400).json({
          error: 'このメールアドレスはすでに登録されています。ログインタブからサインインしてください。'
        });
      }
      return res.json({ requireEmailConfirm: true, email });
    }

    return res.json({
      token:        data.access_token,
      refreshToken: data.refresh_token,
      email:        data.user?.email || email,
      userId:       data.user?.id,
    });

  } catch (e) {
    console.error('[signup] exception:', e.message);
    return res.status(502).json({ error: 'サーバー接続エラー: ' + e.message });
  }
};
