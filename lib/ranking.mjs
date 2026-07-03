// アクセスランキング: 閲覧数マップから上位n件を返す。
// この関数はビルド時に toString() でトップページの <script> にも埋め込まれるため、
// import や外部変数に依存しない自己完結な実装にしておくこと。
export function rankPosts(counts, limit) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([slug, count]) => ({ slug, count }));
}
