// Cloudflare Pages Function: /go/<plan>
// Squareのサブスク用決済リンクは1回の購入で使い切りになるため、
// アクセスのたびに新しい決済リンクを作って転送する。
// 必要な環境変数: SQUARE_ACCESS_TOKEN（Cloudflare Pages の設定 > 環境変数 に登録）

const PLANS = {
  start: { id: 'HPI77KFNPOIUWUVCEEXDC55W', name: 'CoconeRu. Pass｜Start Pass（2か月で3回 ¥14,800）', amount: 14800,
    desc: '2か月ごとに¥14,800。施術60分＋休息20分を3回（1回はMoveのパーソナルピラティス60分・姿勢分析付に置換可、最初の2期まで）。' },
  pass2: { id: 'AHZSN5DJK6DTEQ456GHM6CC6', name: 'CoconeRu. Pass｜Pass 2（毎月2回 ¥9,800）', amount: 9800,
    desc: '毎月¥9,800。施術60分＋休息20分を月2回。2027年1月1日以降の新規は¥11,000、それまでのご入会は据え置き。' },
  pass3: { id: '5SC7NCN2JNPYNAETEPCSWTG6', name: 'CoconeRu. Pass｜Pass 3（毎月3回 ¥14,400）', amount: 14400,
    desc: '毎月¥14,400。施術60分＋休息20分を月3回。2027年1月1日以降の新規は¥16,200、それまでのご入会は据え置き。' },
  pass4: { id: 'RXLLFPJANP7XVQ3TTYUX3RC7', name: 'CoconeRu. Pass｜Pass 4（毎月4回 ¥18,800）', amount: 18800,
    desc: '毎月¥18,800。施術60分＋休息20分を月4回。2027年1月1日以降の新規は¥21,200、それまでのご入会は据え置き。' },
};
const TERMS = '更新の停止は次回更新日の前日まで（次の期から停止）。ご登録後の当期分のキャンセル・返金はできません。未消化分は次の期に1回まで繰越。プラン変更は次の更新から。会員制（ビジター利用可）。運営：株式会社キャリエ・レゾ／CoconeRu. 横須賀中央本店。';
const LOCATION_ID = 'LAXRQHJ5W5YFX';
const FALLBACK = 'https://coconeru.com/pass/#join';

export async function onRequestGet({ params, env, request }) {
  const plan = PLANS[String(params.plan || '').toLowerCase()];
  if (!plan) return Response.redirect(FALLBACK, 302);
  if (!env.SQUARE_ACCESS_TOKEN) return Response.redirect(FALLBACK + '?err=config', 302);

  const body = {
    idempotency_key: crypto.randomUUID(),
    description: plan.desc + ' ' + TERMS,
    quick_pay: { name: plan.name, price_money: { amount: plan.amount, currency: 'JPY' }, location_id: LOCATION_ID },
    checkout_options: {
      subscription_plan_id: plan.id,
      redirect_url: 'https://coconeru.com/pass/thanks/',
      ask_for_shipping_address: false,
    },
  };
  try {
    const res = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Square-Version': '2025-06-18',
        'Authorization': 'Bearer ' + env.SQUARE_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return Response.redirect(FALLBACK + '?err=square', 302);
    const data = await res.json();
    const url = data && data.payment_link && (data.payment_link.long_url || data.payment_link.url);
    if (!url) return Response.redirect(FALLBACK + '?err=nolink', 302);
    return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.redirect(FALLBACK + '?err=exception', 302);
  }
}
