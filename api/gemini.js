export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'AI_API_KEY が未設定です' } });

  const { payload } = req.body || {};
  const userText = payload?.contents?.[0]?.parts?.[0]?.text || '';

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gemma2-9b-it',
        messages: [{ role: 'user', content: userText }],
        temperature: 0.7,
        max_tokens: 2048
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || { message: 'Groq error' } });
    const text = data.choices?.[0]?.message?.content || '';
    return res.json({ candidates: [{ content: { parts: [{ text }] } }] });
  } catch (e) {
    return res.status(502).json({ error: { message: e.message } });
  }
}
