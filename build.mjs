// 静的サイトジェネレータ
// ../bashcms2_contents/posts/*/main.md を読み込み、public/ に HTML を生成する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { addHeadingIds, tocFromHeadings } from './lib/toc.mjs';
import { rankPosts } from './lib/ranking.mjs';
import { resolveCover } from './lib/cover.mjs';

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
  raw = raw.replace(/^\uFEFF/, ''); // BOM付きUTF-8でもフロントマターを認識できるように
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
    const { html, headings } = addHeadingIds(marked.parse(body));
    const genre = detectGenre(keywords);
    const cover = resolveCover({
      cover: meta.cover,
      body,
      genre,
      baseUrl: `posts/${encodeURIComponent(dir.name)}/`,
    });

    posts.push({
      slug: dir.name,
      srcDir: path.join(POSTS_DIR, dir.name),
      title,
      date,
      keywords,
      genre,
      copyright: meta.copyright || '',
      excerpt: makeExcerpt(body),
      cover,
      html,
      toc: tocFromHeadings(headings),
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
//
// 誌面は白銀比 1:√2 の軸で組む。各セクションは「脇(side)」と「本筋(main)」を
// 1 : √2 (= 41.4% : 58.6%) に分けた .axis グリッドに載せ、見出しと本文は軸から始める。

const FONTS = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@600&family=Zen+Kaku+Gothic+New:wght@400;700&display=swap';

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
<link href="${FONTS}" rel="stylesheet">
<link rel="stylesheet" href="${p}style.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">本文へ移動</a>
${content}
<footer class="site-footer">
  <p class="footer-name" aria-hidden="true">${esc(SITE.title)}</p>
  <div class="footer-row">
    <ul class="footer-places">
      <li><a href="${p}#articles">記事の一覧</a></li>
      <li><a href="${p}#about">この覚書について</a></li>
      <li><a href="#top">ページの先頭へ</a></li>
    </ul>
    <p class="footer-note">書籍の表紙画像は Amazon.co.jp の商品画像を表示しています。</p>
  </div>
  <p class="footer-legal">&copy; ${new Date().getFullYear()} ${esc(SITE.author)}</p>
</footer>
<script>
// 入場: 各セクションの見出し→本文→図版の順に、一度だけ浮かび上がる
(function () {
  var items = document.querySelectorAll('[data-rise]');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();
</script>
</body>
</html>`;
}

function topBar(p, latest) {
  return `<header class="bar" id="top">
  <a class="wordmark" href="${p || './'}">${esc(SITE.title)}</a>
  <nav class="bar-links" aria-label="サイト内">
    <a href="${p}#articles">記事</a>
    <a href="${p}#count">書いた数</a>
    <a href="${p}#about">この覚書について</a>
  </nav>
  ${latest ? `<a class="btn" href="${p}posts/${encodeURIComponent(latest.slug)}/">最新の記事を読む</a>` : ''}
</header>`;
}

// A判の紙を半分に折り続けた図: 長辺を二等分すると、どの半分も 1:√2 のまま残る
function foldSvg(decorative = false) {
  const shades = ['#b32f22', '#bf4236', '#ca574b', '#d46c61', '#dd8279', '#e59990', '#ecb0a9', '#f2c8c3', '#f7dfdc'];
  let x = 0, y = 0, w = 1000, h = 1414;
  const rects = [`<rect width="1000" height="1414" fill="${shades[0]}"/>`];
  for (let i = 1; i < shades.length; i++) {
    if (h > w) { h /= 2; y += h; } else { w /= 2; x += w; }
    rects.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${shades[i]}"/>`);
  }
  const a11y = decorative ? 'aria-hidden="true"' : 'role="img" aria-label="A判の紙を半分に折り続けた図。どこまで折っても縦横比は1対√2"';
  return `<svg class="fold" viewBox="0 0 1000 1414" preserveAspectRatio="xMidYMid slice" ${a11y}>${rects.join('')}</svg>`;
}

function band(p, prefix) {
  return `<li class="band" data-genre="${esc(p.genre)}" data-search="${esc([p.title, p.keywords.join(' '), p.excerpt].join(' ').toLowerCase())}">
        <a class="band-link" href="${prefix}posts/${encodeURIComponent(p.slug)}/">
          <time datetime="${p.date.iso}">${p.date.disp}</time>
          <span class="band-text">
            <span class="band-title">${esc(p.title)}</span>
            <span class="band-excerpt">${esc(p.excerpt)}</span>
          </span>
          <span class="band-meta"><span class="band-genre">${esc(p.genre)}</span><span class="views" data-views="${esc(p.slug)}" hidden>閲覧 <span class="views-num"></span></span></span>
          ${p.cover
            ? `<img class="band-cover" src="${p.cover}" alt="" width="64" height="91" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'band-cover is-empty'}))">`
            : '<span class="band-cover is-empty"></span>'}
        </a>
      </li>`;
}

function renderIndex(posts, introHtml) {
  const total = posts.length;
  const byGenre = {};
  for (const p of posts) byGenre[p.genre] = (byGenre[p.genre] || 0) + 1;
  const first = posts[posts.length - 1];
  const latest = posts[0];
  const withCover = posts.filter((p) => p.cover);

  // 年ごとに帯をまとめる
  const years = [];
  for (const p of posts) {
    const y = p.date.iso.slice(0, 4);
    if (!years.length || years[years.length - 1].year !== y) years.push({ year: y, posts: [] });
    years[years.length - 1].posts.push(p);
  }
  const yearBlocks = years
    .map((y) => `<div class="year" data-year="${y.year}">
      <h3 class="year-title">${y.year}年</h3>
      <ol class="bands">
      ${y.posts.map((p) => band(p, '')).join('\n      ')}
      </ol>
    </div>`)
    .join('\n    ');

  // よく出てくるキーワード(上位8件)
  const kwCount = new Map();
  for (const p of posts) for (const k of p.keywords) kwCount.set(k, (kwCount.get(k) || 0) + 1);
  const topKeywords = [...kwCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);

  // 看板: 表紙モザイク(1枚目は折りの図、残りは最近の本)
  const tiles = withCover.slice(0, 6)
    .map((p) => `<a class="tile" href="posts/${encodeURIComponent(p.slug)}/" aria-label="${esc(p.title)}"><img src="${p.cover}" alt="" width="290" height="410"></a>`)
    .join('\n    ');

  const tabs = [['*', 'すべて', total], ...Object.entries(byGenre).map(([g, n]) => [g, g, n])]
    .map(([f, label, n], i) => `<button type="button" class="tab" data-filter="${esc(f)}" aria-pressed="${i === 0}"><span>${esc(label)}</span><span class="tab-num">${n}</span></button>`)
    .join('\n          ');

  const content = `
${topBar('', latest)}

<main id="main">
<section class="masthead" aria-labelledby="site-title">
  <div class="mosaic">
    <div class="tile tile-fold">${foldSvg()}</div>
    ${tiles}
  </div>
  <div class="axis masthead-text">
    <div class="side">
      <h2 class="side-title" data-rise>新しい覚書</h2>
      <ul class="fresh" data-rise style="--i:1">
        ${posts.slice(0, 2).map((p) => `<li><a href="posts/${encodeURIComponent(p.slug)}/"><time datetime="${p.date.iso}">${p.date.disp}</time><span>${esc(p.title)}</span></a></li>`).join('\n        ')}
      </ul>
    </div>
    <div class="main">
      <h1 class="display" id="site-title" data-rise>${esc(SITE.title)}</h1>
      <p class="standfirst" data-rise style="--i:1">読んだ本の記録と、プログラミングの覚書。${first.date.iso.slice(0, 4)}年から書きためた${total}本を、読みやすさだけを考えて並べています。</p>
    </div>
  </div>
</section>

<section class="articles axis" id="articles" aria-labelledby="articles-title">
  <div class="side">
    <div class="finder">
      <div class="tabs" role="group" aria-label="ジャンルで絞り込む">
          ${tabs}
      </div>
      <div class="search" id="search" hidden>
        <label for="q">タイトルやキーワードで探す</label>
        <input id="q" type="search" autocomplete="off" placeholder="例: Python、習慣、睡眠">
      </div>
      <p class="found" id="found" aria-live="polite">${total}本の覚書</p>
    </div>
  </div>
  <div class="main">
    <h2 class="head" id="articles-title" data-rise>すべての覚書を、新しい順に</h2>
    ${yearBlocks}
    <p class="no-match" id="noMatch" hidden>該当する記事がありません。別のことばで探してみてください。</p>
  </div>
</section>

<section class="count" id="count" aria-labelledby="count-title">
  <div class="axis count-inner">
    <div class="side count-side">
      <p class="count-split" data-rise style="--i:2">${Object.entries(byGenre).map(([g, n]) => `<span>${esc(g)}<b>${n}</b></span>`).join('')}</p>
    </div>
    <div class="main">
      <h2 class="head" id="count-title" data-rise>五年で書きためた覚書</h2>
      <p class="figure" data-rise style="--i:1">${total}<span class="figure-unit">本</span></p>
      <p class="figure-caption" data-rise style="--i:2">${first.date.iso.replace(/-/g, '.')} の最初の記事から ${latest.date.iso.replace(/-/g, '.')} までに公開した記事の数。読んだ本の記録と、手を動かして確かめた技術の覚書です。</p>
    </div>
  </div>
</section>

<section class="about" id="about" aria-labelledby="about-title">
  <div class="axis">
    <dl class="side facts" data-rise>
      <div><dt>書き手</dt><dd>${esc(SITE.author)}</dd></div>
      <div><dt>書き始め</dt><dd>${first.date.iso.slice(0, 4)}年${Number(first.date.iso.slice(5, 7))}月</dd></div>
      <div><dt>題材</dt><dd>本を読むこと、プログラミング</dd></div>
    </dl>
    <div class="main">
      <h2 class="head" id="about-title" data-rise>この覚書について</h2>
      <div class="about-text" data-rise style="--i:1">${introHtml}</div>
    </div>
  </div>
  <div class="axis about-record">
    <h3 class="side side-title" data-rise>よく読まれている覚書と、<br>よく出てくることば</h3>
    <div class="main record-lists">
      <ol class="record" id="ranking" hidden data-rise></ol>
      <ul class="record" data-rise style="--i:1">
        ${topKeywords.map(([k, n]) => `<li><button type="button" class="kw" data-kw="${esc(k)}">${esc(k)}</button><span>${n}本</span></li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>
</main>

<script>
var POSTS = ${JSON.stringify(Object.fromEntries(posts.map((p) => [p.slug, esc(p.title)])))};
var COVERS = ${JSON.stringify(withCover.slice(6, 30).map((p) => ({ src: p.cover, href: `posts/${encodeURIComponent(p.slug)}/`, title: p.title })))};
var rankPosts = ${rankPosts.toString()};
(function () {
  // --- 絞り込み: ジャンルの札 + ことば検索
  var tabs = document.querySelectorAll('.tab');
  var bands = document.querySelectorAll('.band');
  var years = document.querySelectorAll('.year');
  var q = document.getElementById('q');
  var found = document.getElementById('found');
  var noMatch = document.getElementById('noMatch');
  var genre = '*';
  document.getElementById('search').hidden = false;

  function apply() {
    var words = q.value.trim().toLowerCase().split(/\\s+/).filter(Boolean);
    var shown = 0;
    bands.forEach(function (b) {
      var ok = (genre === '*' || b.dataset.genre === genre) &&
        words.every(function (w) { return b.dataset.search.indexOf(w) !== -1; });
      b.hidden = !ok;
      if (ok) b.classList.toggle('is-alt', shown++ % 2 === 1);
    });
    years.forEach(function (y) { y.hidden = !y.querySelector('.band:not([hidden])'); });
    found.textContent = shown + '本の覚書';
    noMatch.hidden = shown > 0;
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      t.setAttribute('aria-pressed', 'true');
      genre = t.dataset.filter;
      apply();
    });
  });
  q.addEventListener('input', apply);
  document.querySelectorAll('.kw').forEach(function (k) {
    k.addEventListener('click', function () {
      q.value = k.dataset.kw;
      apply();
      document.getElementById('articles').scrollIntoView({ behavior: 'smooth' });
      q.focus({ preventScroll: true });
    });
  });
  apply();

  // --- 看板の表紙: 一枚ずつ、ゆっくり差し替える
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.mosaic a.tile'));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var next = 0, turn = 0;
  function swap() {
    if (document.hidden || !COVERS.length) return;
    var visible = tiles.filter(function (t) { return t.offsetParent !== null; });
    if (!visible.length) return;
    var tile = visible[turn++ % visible.length];
    var c = COVERS[next++ % COVERS.length];
    var img = new Image();
    img.alt = '';
    img.className = 'is-next';
    img.onload = function () {
      if (img.naturalWidth < 2) return;
      tile.appendChild(img);
      requestAnimationFrame(function () { requestAnimationFrame(function () { img.classList.remove('is-next'); }); });
      setTimeout(function () {
        var old = tile.querySelector('img:not(:last-child)');
        if (old) {
          COVERS.push({ src: old.getAttribute('src'), href: tile.getAttribute('href'), title: tile.getAttribute('aria-label') });
          old.remove();
        }
        tile.href = c.href;
        tile.setAttribute('aria-label', c.title);
      }, 1700);
    };
    img.src = c.src;
  }
  if (!reduce) setInterval(swap, 2800);

  // --- 閲覧数とアクセスランキング。API がない環境では出さない
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
    var list = document.getElementById('ranking');
    rankPosts(counts, 8).forEach(function (r) {
      var title = POSTS[r.slug];
      if (!title) return; // 削除済み記事の閲覧数が残っている場合は飛ばす
      var li = document.createElement('li');
      li.innerHTML = '<a href="posts/' + encodeURIComponent(r.slug) + '/">' + title + '</a>' +
        '<span>' + r.count.toLocaleString() + '回</span>';
      list.appendChild(li);
    });
    if (list.children.length) list.hidden = false;
  }).catch(function () {});
})();
</script>`;

  return layout({ title: SITE.title, description: SITE.description, bodyClass: 'page-index', content });
}

function renderToc(toc) {
  if (!toc.length) return '';
  // 記事内の最上位レベルを基準に、それより深い見出しだけ字下げする
  const minLevel = Math.min(...toc.map((h) => h.level));
  const items = toc
    .map((h) => `<li${h.level > minLevel ? ' class="toc-sub"' : ''}><a href="#${h.id}">${esc(h.text)}</a></li>`)
    .join('\n        ');
  return `<nav class="toc" aria-labelledby="toc-title">
      <h2 class="side-title" id="toc-title">目次</h2>
      <ol class="toc-list">
        ${items}
      </ol>
    </nav>`;
}

function renderPost(post, newer, older) {
  const neighbours = [newer, older].filter(Boolean);
  const content = `
${topBar('../../', null)}

<main id="main">
<header class="axis post-head">
  <div class="side">
    <div class="post-cover" data-rise style="--i:1">
      ${post.cover ? `<img src="${post.cover}" alt="${esc(post.title)}の表紙" width="181" height="256" onerror="this.remove()" onload="if(this.naturalWidth<2)this.remove()">` : ''}
      ${foldSvg(true)}
    </div>
  </div>
  <div class="main post-head-main">
    <h1 class="post-title" data-rise>${esc(post.title)}</h1>
    <p class="post-meta" data-rise style="--i:1">
      <time datetime="${post.date.iso}">${post.date.disp}</time>
      <span>${esc(post.genre)}</span>
      <span class="views" id="postViews" hidden>閲覧 <span class="views-num"></span></span>
    </p>
    ${post.keywords.length ? `<p class="post-keywords" data-rise style="--i:1">${post.keywords.map((k) => esc(k)).join('、')}</p>` : ''}
  </div>
</header>

<div class="axis post-layout">
  <div class="side">
    ${renderToc(post.toc)}
  </div>
  <article class="main post-body">
${post.html}
  </article>
</div>

<nav class="axis post-next" aria-labelledby="next-title">
  <h2 class="side side-title" id="next-title">${neighbours.length ? '前後の覚書' : '記事の一覧'}</h2>
  <div class="main">
    ${neighbours.length ? `<ol class="bands">
      ${neighbours.map((p) => band(p, '../../')).join('\n      ')}
    </ol>` : ''}
    <p class="back"><a class="btn btn-quiet" href="../../#articles">記事の一覧へ戻る</a></p>
  </div>
</nav>
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

  // 目次: いま読んでいる見出しを示す
  var links = document.querySelectorAll('.toc-list a');
  if (!links.length || !('IntersectionObserver' in window)) return;
  var byId = {};
  links.forEach(function (a) { byId[decodeURIComponent(a.hash.slice(1))] = a; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      var a = byId[e.target.id];
      if (a) a.setAttribute('aria-current', 'location');
    });
  }, { rootMargin: '0px 0px -70% 0px' });
  Object.keys(byId).forEach(function (id) {
    var h = document.getElementById(id);
    if (h) io.observe(h);
  });
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
  // posts は新しい順なので、i-1 が一つ新しい記事、i+1 が一つ古い記事
  posts.forEach((post, i) => {
    const dir = path.join(OUT_DIR, 'posts', post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPost(post, posts[i - 1], posts[i + 1]));
    for (const f of fs.readdirSync(post.srcDir)) {
      if (f.toLowerCase().endsWith('.md')) continue;
      const src = path.join(post.srcDir, f);
      if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(dir, f));
    }
  });

  console.log(`build: ${posts.length} posts -> ${OUT_DIR} (${Date.now() - started}ms)`);
  return posts.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  build();
}
