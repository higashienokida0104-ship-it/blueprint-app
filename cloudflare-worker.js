/**
 * BLUEPRINT — Gemini API Proxy Worker
 * =====================================
 * Cloudflare Workers にデプロイして使います。
 *
 * 【デプロイ手順】
 * 1. https://dash.cloudflare.com にアクセス（無料アカウントでOK）
 * 2. 左メニュー「Workers & Pages」→「Create」→「Create Worker」
 * 3. このファイルの内容を貼り付けて「Deploy」
 * 4. 「Settings」→「Variables」→「Add variable」で以下を追加:
 *      変数名: GEMINI_API_KEY
 *      値:     AIzaSy... （Google AI Studio のAPIキー）
 *      ※ 必ず「Encrypt」にチェック！
 * 5. デプロイされた URL（例: https://blueprint-proxy.YOUR-NAME.workers.dev）を
 *    BLUEPRINT アプリの SETTINGS → 「管理者プロキシURL」に貼り付ける
 *
 * 【無料枠】
 * Cloudflare Workers 無料プラン: 1日 100,000 リクエストまで
 * Gemini API 無料枠: 1日 1,500 リクエストまで（実質こちらが上限）
 */

export default {
  async fetch(request, env) {

    // ── CORS プリフライト ──────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // ── POST のみ受け付け ──────────────────────────
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // ── APIキー確認 ────────────────────────────────
    if (!env.GEMINI_API_KEY) {
      return jsonResponse({
        error: { message: 'GEMINI_API_KEY が Worker の環境変数に設定されていません。Cloudflare ダッシュボードで設定してください。' }
      }, 500);
    }

    // ── リクエスト解析 ─────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: { message: '不正なリクエスト形式です' } }, 400);
    }

    const model   = body.model   || 'gemini-1.5-flash';
    const payload = body.payload || body; // payload ラップがない場合も対応

    // ── Gemini API 呼び出し ────────────────────────
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    let geminiRes;
    try {
      geminiRes = await fetch(geminiUrl, {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify(payload)
      });
    } catch (e) {
      return jsonResponse({ error: { message: 'Gemini API への接続に失敗しました: ' + e.message } }, 502);
    }

    const data = await geminiRes.json();

    // Gemini のエラーをそのまま返す（ステータスコード含む）
    return new Response(JSON.stringify(data), {
      status:  geminiRes.status,
      headers: { 'content-type': 'application/json', ...corsHeaders() }
    });
  }
};

// ── ヘルパー ─────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400'
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders() }
  });
}
