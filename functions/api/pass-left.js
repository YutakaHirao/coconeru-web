// Cloudflare Pages Function: /api/pass-left
// Squareの有効サブスク（CoconeRu. Pass の4バリエーション）を数え、先着30名の残り枠を返す。
// 必要な環境変数: SQUARE_ACCESS_TOKEN
const VARIATIONS = ['HPI77KFNPOIUWUVCEEXDC55W', 'AHZSN5DJK6DTEQ456GHM6CC6', '5SC7NCN2JNPYNAETEPCSWTG6', 'RXLLFPJANP7XVQ3TTYUX3RC7'];
const LOCATION_ID = 'LAXRQHJ5W5YFX';
const CAP = 30;

export async function onRequestGet({ env }) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' };
  if (!env.SQUARE_ACCESS_TOKEN) return new Response(JSON.stringify({ cap: CAP, members: null, left: null, error: 'config' }), { status: 200, headers });
  try {
    let cursor = null, members = 0;
    do {
      const body = { query: { filter: { location_ids: [LOCATION_ID] } } };
      if (cursor) body.cursor = cursor;
      const res = await fetch('https://connect.squareup.com/v2/subscriptions/search', {
        method: 'POST',
        headers: { 'Square-Version': '2025-06-18', 'Authorization': 'Bearer ' + env.SQUARE_ACCESS_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('square ' + res.status);
      const data = await res.json();
      for (const s of data.subscriptions || []) {
        if (VARIATIONS.includes(s.plan_variation_id) && (s.status === 'ACTIVE' || s.status === 'PENDING')) members += 1;
      }
      cursor = data.cursor || null;
    } while (cursor);
    return new Response(JSON.stringify({ cap: CAP, members, left: Math.max(0, CAP - members), at: new Date().toISOString() }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ cap: CAP, members: null, left: null, error: 'fetch' }), { status: 200, headers });
  }
}
