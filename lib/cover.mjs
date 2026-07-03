// 書籍カバー画像: 記事中のAmazonリンクからASINを抽出し、表紙画像URLを組み立てる
const ASIN_RE = /amazon\.co\.jp\/(?:[^\s)"]*?\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})/i;

export function extractAsin(markdown) {
  const m = markdown.match(ASIN_RE);
  return m ? m[1] : null;
}

export function coverUrl(asin) {
  return `https://images-na.ssl-images-amazon.com/images/P/${asin}.09.LZZZZZZZ.jpg`;
}

// 表紙の決定: フロントマターの Cover: が最優先、未指定なら書籍のみ本文から自動抽出。
//   Cover: none        → 表紙なし
//   Cover: <ASIN>      → そのASINのAmazon表紙
//   Cover: <URL>       → そのURLをそのまま使用
//   Cover: <ファイル名> → 記事フォルダ内の画像 (baseUrl + ファイル名)
export function resolveCover({ cover, body, genre, baseUrl }) {
  const v = (cover || '').trim();
  if (v) {
    if (/^none$/i.test(v)) return null;
    if (/^https?:\/\//.test(v)) return v;
    if (/^[A-Z0-9]{10}$/i.test(v)) return coverUrl(v.toUpperCase());
    return baseUrl + encodeURIComponent(v);
  }
  if (genre !== '書籍') return null;
  const asin = extractAsin(body);
  return asin ? coverUrl(asin) : null;
}
