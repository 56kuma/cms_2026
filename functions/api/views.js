// GET /api/views — 全記事の閲覧数を一括で返す(トップページ用)
export async function onRequestGet({ env }) {
  const out = {};
  let cursor;
  do {
    const page = await env.VIEWS.list({ cursor });
    await Promise.all(
      page.keys.map(async (k) => {
        out[k.name] = Number(await env.VIEWS.get(k.name)) || 0;
      })
    );
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return new Response(JSON.stringify(out), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}
