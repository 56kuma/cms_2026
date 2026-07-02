# cms_2026 — 和テイスト静的ブログ

`../bashcms2_contents/posts` のマークダウンを元に静的HTMLを生成し、
Cloudflare Pages で公開するブログサイト。

## 構成

```
cms_2026/
├── build.mjs        # 静的サイトジェネレータ(md → HTML)
├── watch.mjs        # posts フォルダ監視 → 自動リビルド(--deploy で自動公開)
├── assets/          # style.css などの静的アセット(編集はこちら)
├── functions/       # Cloudflare Pages Functions(閲覧数API, KV使用)
├── public/          # 生成物(git管理外・編集しない)
└── wrangler.toml    # Cloudflare 設定
```

## 使い方

```powershell
npm install          # 初回のみ
npm run build        # 一回だけビルド
npm run watch        # posts の変更を検知して自動リビルド
npm run watch:deploy # 自動リビルド + Cloudflare へ自動デプロイ
npm run preview      # ローカル確認 (http://localhost:8788, 閲覧数APIも動く)
npm run deploy       # ビルドして Cloudflare Pages へ公開
```

## 初回デプロイ手順

1. Cloudflare にログイン: `npx wrangler login`
2. 閲覧数用の KV namespace を作成:
   ```powershell
   npx wrangler kv namespace create VIEWS
   ```
3. 出力された `id` を `wrangler.toml` の
   `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` に貼り付け
4. `npm run deploy`

初回デプロイ時にプロジェクト名(cms-2026)の作成を聞かれるので Enter で進める。
公開URL: `https://cms-2026.pages.dev`

## 記事の書き方(従来どおり)

- `bashcms2_contents/posts/YYYYMMDD_タイトル/main.md` を作る
- フロントマターの `Keywords:` に `Books` を含めるとジャンル「書籍」、
  それ以外は「技術」になる(判定は `build.mjs` の `detectGenre`)
- 最初の `# 見出し` が記事タイトル、フォルダ名の日付が公開日になる
- 画像は同じフォルダに置き、相対パスで参照(そのままコピーされる)

## 閲覧数のしくみ

- 記事ページを開くと `/api/views/<slug>` に POST され KV 上で +1
- 同一ブラウザセッション中の再読み込みでは加算しない(sessionStorage)
- トップページは `/api/views` で全件を一括取得して表示
- ローカルの `npm run preview` ではローカル疑似KVでカウントされる(本番とは別)

## デザインメモ

- 白銀比(1:√2): 余白は 8→11→16→23→32→45→64→91px の等比、
  文字サイズは ×1.189(√2の平方根)の等比、ヘッダー幅=本文幅×1.414
- 伝統色: 生成り(背景)/墨(本文)/朱(アクセント)/藍(リンク)/鈍色(補助)
- フォント: 見出し=しっぽり明朝、本文=Zen角ゴシックNew(可読性優先)
