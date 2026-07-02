// posts フォルダの変更を監視して自動リビルドする。
//   node watch.mjs           … 変更検知 → 再ビルドのみ
//   node watch.mjs --deploy  … 再ビルド後、Cloudflare Pages へ自動デプロイ
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import chokidar from 'chokidar';
import { build } from './build.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(ROOT, '..', 'bashcms2_contents', 'posts');
const AUTO_DEPLOY = process.argv.includes('--deploy');

let timer = null;
let deploying = false;
let pendingDeploy = false;

function deploy() {
  if (deploying) {
    pendingDeploy = true; // デプロイ中に更新が来たら終了後にもう一度
    return;
  }
  deploying = true;
  console.log('deploy: Cloudflare Pages へデプロイ中...');
  const child = spawn('npx', ['wrangler', 'pages', 'deploy', 'public'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => {
    deploying = false;
    console.log(code === 0 ? 'deploy: 完了' : `deploy: 失敗 (exit ${code})`);
    if (pendingDeploy) {
      pendingDeploy = false;
      deploy();
    }
  });
}

function rebuild(reason) {
  console.log(`\n変更検知: ${reason}`);
  try {
    build();
    if (AUTO_DEPLOY) deploy();
  } catch (e) {
    console.error('build エラー:', e.message);
  }
}

// 初回ビルド
build();
if (AUTO_DEPLOY) deploy();

chokidar
  .watch(POSTS_DIR, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
  })
  .on('all', (event, file) => {
    clearTimeout(timer); // 連続保存をまとめる(1秒デバウンス)
    timer = setTimeout(() => rebuild(`${event} ${path.relative(POSTS_DIR, file)}`), 1000);
  });

console.log(`watch: ${POSTS_DIR} を監視中${AUTO_DEPLOY ? '(自動デプロイ有効)' : ''} — Ctrl+C で終了`);
