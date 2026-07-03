// 書籍カバー画像: 記事中のAmazonリンクからASINを抽出し、表紙画像URLを組み立てる
const ASIN_RE = /amazon\.co\.jp\/(?:[^\s)"]*?\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})/i;

export function extractAsin(markdown) {
  const m = markdown.match(ASIN_RE);
  return m ? m[1] : null;
}

export function coverUrl(asin) {
  return `https://images-na.ssl-images-amazon.com/images/P/${asin}.09.LZZZZZZZ.jpg`;
}
