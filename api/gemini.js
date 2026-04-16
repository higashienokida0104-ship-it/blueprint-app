/**
 * BLUEPRINT — Vercel Serverless Function
 * /api/gemini
 *
 * Gemini API へのリクエストをサーバーサイドで中継します。
 * APIキーは Vercel の環境変数に保存されるため、
 * ユーザー側でのAPIキー設定が一切不要になります。
 *
 * 【環境変数の設定方法】
 * Vercel ダッシュボード → プロジェクト → Settings → Environment Variables
 *   キー名: GEMINI_API_KEY
 *   値:     AIzaSy... （Google AI Studio のAPIキー）
 */

export default async function handler(req, res) {
  // ── CORS ヘッダー（全オリジン許可）────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // プリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  // ── APIキー確認 ───────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: {
        message: 'GEMINI_API_KEY が Vercel の環境変数に設定されていません。\n' +
                 'Vercel ダッシュボード → Settings → Environment Variables で設定してください。'
      }
    });
  }

  // ── リクエスト解析 ────────────────────────────────────
  const { model = 'gemini-1.5-flash', payload } = req.body || {};

  if (!payload) {
    return res.status(400).json({ error: { message: '不正なリクエスト: payload が必要です' } });
  }

  // ── Gemini API 呼び出し ───────────────────────────────
  const geminiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(geminiUrl, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    const data = await geminiRes.json();

    // Gemini のレスポンス（エラー含む）をそのまま返す
    return res.status(geminiRes.status).json(data);

  } catch (e) {
    return res.status(502).json({
      error: { message: 'Gemini API への接続に失敗しました: ' + e.message }
    });
  }
}
