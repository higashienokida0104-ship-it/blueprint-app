/**
 * BLUEPRINT — AI Proxy (Groq / Gemini 両対応)
 *
 * 環境変数:
 *   AI_API_KEY  … Groq の APIキー（gsk_...）または Gemini APIキー（AIzaSy...）
 *   AI_PROVIDER … "groq"（デフォルト）または "gemini"
 */

// ── モデル設定 ─────────────────────────────────────────
const GROQ_MODELS = {
  'gemma2-9b-it':         'gemma2-9b-it',          // Google製・日本語対応◎
  'llama-3.1-8b-instant': 'llama-3.1-8b-instant',  // 高速・軽量
  'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile', // 高精度
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const apiKey   = process.env.AI_API_KEY;
  const provider = process.env.AI_PROVIDER || 'groq';

  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'AI_API_KEY が Vercel の環境変数に設定されていません。\nVercel ダッシュボード → Settings → Environment Variables で設定してください。' }
    });
  }

  const { model, payload } = req.body || {};

  // ────────────────────────────────────────────────────
  // Groq API（gsk_ キー）
  // ────────────────────────────────────────────────────
  if (provider === 'groq' || apiKey.startsWith('gsk_')) {
    const groqModel = GROQ_MODELS[model] || 'gemma2-9b-it';

    // Gemini形式のペイロードをOpenAI形式に変換
    const userText = payload?.contents?.[0]?.parts?.[0]?.text || '';
    const groqBody = {
      model: groqModel,
      messages: [{ role: 'user', content: userText }],
      temperature: payload?.generationConfig?.temperature || 0.7,
      max_tokens:  payload?.generationConfig?.maxOutputTokens || 2048,
    };

    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:  'POST',
        headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body:    JSON.stringify(groqBody)
      });
      const data = await groqRes.json();
      if (!groqRes.ok) return res.status(groqRes.status).json({ error: data.error || { message: 'Groq API error' } });

      // Gemini形式に変換して返す（アプリ側の変更不要）
      const text = data.choices?.[0]?.message?.content || '';
      return res.json({ candidates: [{ content: { parts: [{ text }] } }] });

    } catch (e) {
      return res.status(502).json({ error: { message: 'Groq API への接続失敗: ' + e.message } });
    }
  }

  // ────────────────────────────────────────────────────
  // Gemini API（AIzaSy キー）
  // ────────────────────────────────────────────────────
  const geminiModel = model || 'gemini-1.5-flash';
  const geminiUrl   = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(geminiUrl, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const data = await geminiRes.json();
    return res.status(geminiRes.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: { message: 'Gemini API への接続失敗: ' + e.message } });
  }
}
