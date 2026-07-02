// GET  /api/views/:slug — 閲覧数を返す
// POST /api/views/:slug — 閲覧数を +1 して返す
function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

export async function onRequestGet({ params, env }) {
  const count = Number(await env.VIEWS.get(params.slug)) || 0;
  return json({ count });
}

export async function onRequestPost({ params, env }) {
  const count = (Number(await env.VIEWS.get(params.slug)) || 0) + 1;
  await env.VIEWS.put(params.slug, String(count));
  return json({ count });
}
