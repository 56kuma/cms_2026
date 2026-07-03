// 目次生成: 見出しへのid付与と目次エントリの抽出
export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[<>"'&]/g, '')
    .replace(/\s+/g, '-');
}

// レンダリング済みHTMLの h2〜h4 に id を付与し、見出し一覧を返す
export function addHeadingIds(html) {
  const headings = [];
  const used = new Map();
  const out = html.replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g, (_m, lv, inner) => {
    const text = inner.replace(/<[^>]*>/g, '').trim();
    const base = slugify(text) || 'section';
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    headings.push({ level: Number(lv), text, id });
    return `<h${lv} id="${id}">${inner}</h${lv}>`;
  });
  return { html: out, headings };
}

// 目次に載せる見出しだけに絞る(h2/h3のみ。「目次」見出し自体は除外)
export function tocFromHeadings(headings) {
  return headings.filter((h) => h.level <= 3 && h.text !== '目次');
}
