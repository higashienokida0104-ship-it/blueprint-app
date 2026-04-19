// BLUEPRINT — Vercel AI Proxy (legacy endpoint, kept for compatibility)
// blueprint.html は /api/ai を使用。このファイルは旧互換用。
const GROQ_MODEL = 'llama-3.1-8b-instant';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: { message: 'Method not allowed' } });

  const apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'GROQ_API_KEY が未設定です' } });

  const { prompt, payload } = req.body || {};
  const userText = prompt || payload?.contents?.[0]?.parts?.[0]?.text || '';
  if (!userText.trim()) return res.status(400).json({ error: { message: 'プロンプトが空です' } });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: userText }], temperature: 0.7, max_tokens: 2048 }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || { message: 'Groq APIエラー' } });
    const text = data.choices?.[0]?.message?.content || '';
    return res.json({ text, candidates: [{ content: { parts: [{ text }] } }] });
  } catch (e) {
    return res.status(502).json({ error: { message: 'Groq接続エラー: ' + e.message } });
  }
};
