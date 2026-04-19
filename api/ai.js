// BLUEPRINT — Vercel AI Proxy (Groq)
const GROQ_MODEL = 'llama-3.1-8b-instant';
const { setCors } = require('./_helper');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: { message: 'Method not allowed' } });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'GROQ_API_KEY が未設定です' } });

  const { prompt } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: { message: 'プロンプトが空です' } });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || { message: 'Groq APIエラー' } });
    return res.json({ text: data.choices?.[0]?.message?.content || '' });
  } catch (e) {
    return res.status(502).json({ error: { message: 'サーバー接続エラー: ' + e.message } });
  }
};
