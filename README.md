# cms_2026 — 和テイスト静的ブログ

`../bashcms2_contents/posts` のマークダウンを元に静的HTMLを生成し、
Cloudflare Pages で公開するブログサイト。

- **公開URL**: https://cms-2026.pages.dev
- **記事リポジトリ**: https://github.com/56kuma/bashcms2_contents (master)
- **本リポジトリ**: https://github.com/56kuma/cms_2026 (main)

> 2026-07-03 構築完了。記事push→自動公開までの全経路を動作確認済み。

## 運用方法(2026-07-03 時点)

| やりたいこと | 操作 |
|---|---|
| 記事を公開・更新する | `bashcms2_contents` で記事を書いて `git push` するだけ。約1分後に自動で本番反映 |
| 書きながらローカルで確認 | ここで `npm run preview` (http://localhost:8788)。`npm run watch` 併用で保存のたび再ビルド |
| デザインやジェネレータを変更した時 | 本リポジトリをpush後、`gh workflow run "Deploy blog" --repo 56kuma/bashcms2_contents` で手動デプロイ(またはローカルで `npm run deploy`) |
| デプロイ状況を見る | https://github.com/56kuma/bashcms2_contents/actions |

注意: workflowは**記事リポジトリへのpush**でしか起動しない。
デザイン変更だけの時は上記の手動実行が必要(記事の運用では意識不要)。

## 自動デプロイのしくみ

検知するのはPCでもこのリポジトリでもなく **GitHub**。

```
git push (記事repo) → GitHubがpushを検知 → Actionsが両repoをcheckout
  → node build.mjs → wrangler pages deploy → Cloudflare Pages 更新
```

- workflow本体: 記事リポジトリの `.github/workflows/deploy.yml`
- 必要なSecrets(記事リポジトリに設定済み):
  - `CLOUDFLARE_API_TOKEN` — Cloudflare Pages 編集権限のみのカスタムトークン
  - `CLOUDFLARE_ACCOUNT_ID`

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

## コマンド一覧

```powershell
npm install          # 初回のみ
npm run build        # 一回だけビルド
npm run watch        # posts の変更を検知して自動リビルド
npm run watch:deploy # 自動リビルド + Cloudflare へ自動デプロイ
npm run preview      # ローカル確認 (http://localhost:8788, 閲覧数APIも動く)
npm run deploy       # ビルドして Cloudflare Pages へ公開
```

## 記事の書き方(従来どおり)

- `bashcms2_contents/posts/YYYYMMDD_タイトル/main.md` を作る
- フロントマターの `Keywords:` に `Books` を含めるとジャンル「書籍」、
  それ以外は「技術」になる(判定は `build.mjs` の `detectGenre`)
- 最初の `# 見出し` が記事タイトル、フォルダ名の日付が公開日になる
- 画像は同じフォルダに置き、相対パスで参照(そのままコピーされる)

## 表紙画像のしくみと手動設定(2026-07-03 追加)

書籍記事のトップページカードには、**本文中の最初の Amazon リンク**
(`…/dp/<ASIN>` または `…/gp/product/<ASIN>`)から自動で表紙画像を表示する。
本文の先頭側に別の本へのリンクがあると**違う表紙**が出ることがある。

その場合は記事のフロントマターに `Cover:` を1行足して手動で上書きする
(手動指定は常に自動抽出より優先される):

```yaml
---
Keywords: Books
Copyright: (C) 2026 T.Masuda
Cover: 4569858490
---
```

`Cover:` に書ける値は4種類:

| 書き方 | 動作 |
|---|---|
| `Cover: 4569858490` | そのASINのAmazon表紙を使う(ASINは10桁英数字。Amazonの商品URLの `/dp/` の直後にある) |
| `Cover: https://…/xxx.jpg` | 任意の画像URLをそのまま使う |
| `Cover: cover.jpg` | 記事フォルダに置いた画像ファイルを使う(main.mdと同じフォルダに保存しておく) |
| `Cover: none` | この記事には表紙を表示しない |

正しいASINの調べ方: Amazonでその本のページを開き、URLの `/dp/` の直後の
10文字をコピーする(例: `amazon.co.jp/xxx/dp/4569858490/…` → `4569858490`)。

修正したら記事リポジトリを push するだけで反映される(通常の記事更新と同じ)。
判定ロジックは `lib/cover.mjs` の `resolveCover`(テスト: `tests/cover.test.mjs`)。

## 閲覧数のしくみ

- 記事ページを開くと `/api/views/<slug>` に POST され KV(namespace: VIEWS)上で +1
- 同一ブラウザセッション中の再読み込みでは加算しない(sessionStorage)
- トップページは `/api/views` で全件を一括取得して表示
- ローカルの `npm run preview` ではローカル疑似KVでカウントされる(本番とは別)

## デザインメモ

- 白銀比(1:√2): 余白は 8→11→16→23→32→45→64→91px の等比、
  文字サイズは ×1.189(√2の平方根)の等比、ヘッダー幅=本文幅×1.414
- 伝統色: 生成り(背景)/墨(本文)/朱(アクセント)/藍(リンク)/鈍色(補助)
- フォント: 見出し=しっぽり明朝、本文=Zen角ゴシックNew(可読性優先)
