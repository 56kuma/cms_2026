// 静的サイトジェネレータ
// ../bashcms2_contents/posts/*/main.md を読み込み、public/ に HTML を生成する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(ROOT, '..', 'bashcms2_contents', 'posts');
const TOP_PAGE = path.resolve(ROOT, '..', 'bashcms2_contents', 'pages', 'top', 'main.md');
const ASSETS_DIR = path.join(ROOT, 'assets');
const OUT_DIR = path.join(ROOT, 'public');

const SITE = {
  title: '本と技術の覚書',
  author: 'T.Masuda',
  description: '読んだ本の記録と、プログラミングの覚書。',
};

marked.setOptions({ gfm: true });

// ---------------------------------------------------------------- utilities

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim();
  }
  return { meta, body: raw.slice(m[0].length) };
}

function detectGenre(keywords) {
  if (keywords.some((k) => /^books?$/i.test(k))) return '書籍';
  return '技術';
}

// 本文markdownから最初の # 見出しをタイトルとして抜き出す
function extractTitle(body, fallback) {
  const m = body.match(/^#\s+(.+)$/m);
  if (!m) return { title: fallback, body };
  return { title: m[1].trim(), body: body.replace(m[0], '').trimStart() };
}

// カード用の抜粋: markdown記法を落として先頭のテキストを返す
function makeExcerpt(body, len = 90) {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/^\s*(目次|■?\d+\..*)$/gm, ' ')
    .replace(/[>*_`|#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > len ? text.slice(0, len) + '…' : text;
}

function fmtDate(yyyymmdd) {
  const y = yyyymmdd.slice(0, 4), m = yyyymmdd.slice(4, 6), d = yyyymmdd.slice(6, 8);
  return { iso: `${y}-${m}-${d}`, disp: `${y}.${m}.${d}` };
}

// ------------------------------------------------------------------- loader

function loadPosts() {
  const posts = [];
  for (const dir of fs.readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const mdPath = path.join(POSTS_DIR, dir.name, 'main.md');
    if (!fs.existsSync(mdPath)) continue;

    const raw = fs.readFileSync(mdPath, 'utf8');
    const { meta, body: bodyWithTitle } = parseFrontmatter(raw);
    const keywords = (meta.keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
    const dateMatch = dir.name.match(/^(\d{8})_?(.*)$/);
    const date = fmtDate(dateMatch ? dateMatch[1] : '19700101');
    const { title, body } = extractTitle(bodyWithTitle, dir.name);

    posts.push({
      slug: dir.name,
      srcDir: path.join(POSTS_DIR, dir.name),
      title,
      date,
      keywords,
      genre: detectGenre(keywords),
      copyright: meta.copyright || '',
      excerpt: makeExcerpt(body),
      html: marked.parse(body),
    });
  }
  posts.sort((a, b) => b.date.iso.localeCompare(a.date.iso));
  return posts;
}

function loadIntro() {
  try {
    const raw = fs.readFileSync(TOP_PAGE, 'utf8');
    const { body } = parseFrontmatter(raw);
    const { body: withoutTitle } = extractTitle(body, '');
    return marked.parse(withoutTitle);
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------- templates

function layout({ title, description, bodyClass, content, depth = 0 }) {
  const p = '../'.repeat(depth);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${p}style.css">
</head>
<body class="${bodyClass}">
${content}
<footer class="site-footer">
  <p class="footer-mark">終</p>
  <p>&copy; ${new Date().getFullYear()} ${esc(SITE.author)}</p>
</footer>
</body>
</html>`;
}

function renderIndex(posts, introHtml) {
  const genres = [...new Set(posts.map((p) => p.genre))];
  const cards = posts
    .map(
      (p) => `
  <li class="card" data-genre="${esc(p.genre)}">
    <a class="card-link" href="posts/${encodeURIComponent(p.slug)}/">
      <div class="card-head">
        <time datetime="${p.date.iso}">${p.date.disp}</time>
        <span class="genre-chip">${esc(p.genre)}</span>
      </div>
      <h2 class="card-title">${esc(p.title)}</h2>
      <p class="card-excerpt">${esc(p.excerpt)}</p>
      <div class="card-foot">
        <span class="card-keywords">${p.keywords.slice(0, 4).map((k) => `<span class="tag">${esc(k)}</span>`).join('')}</span>
        <span class="views" data-views="${esc(p.slug)}" hidden><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M8 3C4.5 3 1.7 5.4.5 8c1.2 2.6 4 5 7.5 5s6.3-2.4 7.5-5C14.3 5.4 11.5 3 8 3zm0 8.3A3.3 3.3 0 1 1 8 4.7a3.3 3.3 0 0 1 0 6.6zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg><span class="views-num"></span></span>
      </div>
    </a>
  </li>`
    )
    .join('\n');

  const filterButtons = ['すべて', ...genres]
    .map((g, i) => `<button class="filter-btn${i === 0 ? ' is-active' : ''}" data-filter="${esc(g === 'すべて' ? '*' : g)}">${esc(g)}</button>`)
    .join('\n    ');

  const content = `
<header class="site-header">
  <div class="header-inner">
    <p class="site-crest" aria-hidden="true">読</p>
    <h1 class="site-title">${esc(SITE.title)}</h1>
    <div class="site-intro">${introHtml}</div>
  </div>
</header>

<main class="container">
  <nav class="filter" aria-label="ジャンル絞り込み">
    ${filterButtons}
  </nav>

  <ul class="card-list" id="cardList">
${cards}
  </ul>
  <p class="no-match" id="noMatch" hidden>該当する記事がありません。</p>
</main>

<script>
(function () {
  // ジャンル絞り込み
  var buttons = document.querySelectorAll('.filter-btn');
  var cards = document.querySelectorAll('.card');
  var noMatch = document.getElementById('noMatch');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var f = btn.dataset.filter;
      var shown = 0;
      cards.forEach(function (c) {
        var show = f === '*' || c.dataset.genre === f;
        c.hidden = !show;
        if (show) shown++;
      });
      noMatch.hidden = shown > 0;
    });
  });

  // 閲覧数(一括取得)。API未設定・ローカル閲覧時は非表示のまま。
  fetch('/api/views').then(function (r) {
    if (!r.ok) throw new Error();
    return r.json();
  }).then(function (counts) {
    document.querySelectorAll('[data-views]').forEach(function (el) {
      var n = counts[el.dataset.views];
      if (typeof n === 'number') {
        el.querySelector('.views-num').textContent = n.toLocaleString();
        el.hidden = false;
      }
    });
  }).catch(function () {});
})();
</script>`;

  return layout({ title: SITE.title, description: SITE.description, bodyClass: 'page-index', content });
}

function renderPost(post) {
  const content = `
<header class="post-header">
  <div class="header-inner">
    <nav class="breadcrumb"><a href="../../">&#8592; 記事一覧へ戻る</a></nav>
    <div class="post-meta">
      <time datetime="${post.date.iso}">${post.date.disp}</time>
      <span class="genre-chip">${esc(post.genre)}</span>
      <span class="views" id="postViews" hidden><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M8 3C4.5 3 1.7 5.4.5 8c1.2 2.6 4 5 7.5 5s6.3-2.4 7.5-5C14.3 5.4 11.5 3 8 3zm0 8.3A3.3 3.3 0 1 1 8 4.7a3.3 3.3 0 0 1 0 6.6zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg><span class="views-num"></span></span>
    </div>
    <h1 class="post-title">${esc(post.title)}</h1>
    ${post.keywords.length ? `<p class="post-keywords">${post.keywords.map((k) => `<span class="tag">${esc(k)}</span>`).join('')}</p>` : ''}
  </div>
</header>

<main class="container">
  <article class="post-body">
${post.html}
  </article>
  <nav class="post-nav"><a href="../../">&#8592; 記事一覧へ戻る</a></nav>
</main>

<script>
(function () {
  // 閲覧数: 同一セッション中の再読み込みでは加算しない
  var slug = ${JSON.stringify(post.slug)};
  var key = 'viewed_' + slug;
  var counted = false;
  try { counted = !!sessionStorage.getItem(key); } catch (e) {}
  fetch('/api/views/' + encodeURIComponent(slug), { method: counted ? 'GET' : 'POST' })
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (d) {
      try { sessionStorage.setItem(key, '1'); } catch (e) {}
      var el = document.getElementById('postViews');
      el.querySelector('.views-num').textContent = Number(d.count).toLocaleString();
      el.hidden = false;
    }).catch(function () {});
})();
</script>`;

  return layout({
    title: `${post.title} | ${SITE.title}`,
    description: post.excerpt,
    bodyClass: 'page-post',
    content,
    depth: 2,
  });
}

// -------------------------------------------------------------------- build

export function build() {
  const started = Date.now();
  const posts = loadPosts();
  const introHtml = loadIntro();

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 静的アセット
  for (const f of fs.readdirSync(ASSETS_DIR)) {
    fs.copyFileSync(path.join(ASSETS_DIR, f), path.join(OUT_DIR, f));
  }

  // トップページ
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex(posts, introHtml));

  // 各記事ページ(+ 画像などの添付ファイルをコピー)
  for (const post of posts) {
    const dir = path.join(OUT_DIR, 'posts', post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPost(post));
    for (const f of fs.readdirSync(post.srcDir)) {
      if (f.toLowerCase().endsWith('.md')) continue;
      const src = path.join(post.srcDir, f);
      if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(dir, f));
    }
  }

  console.log(`build: ${posts.length} posts -> ${OUT_DIR} (${Date.now() - started}ms)`);
  return posts.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  build();
}
