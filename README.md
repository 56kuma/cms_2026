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
