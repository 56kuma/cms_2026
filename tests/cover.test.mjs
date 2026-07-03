import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAsin, coverUrl, resolveCover } from '../lib/cover.mjs';

test('extractAsin: /dp/ リンクからASINを取り出す', () => {
  const md = '[本](https://www.amazon.co.jp/グーグルのすごい採用/dp/4492261257)';
  assert.equal(extractAsin(md), '4492261257');
});

test('extractAsin: クエリ文字列が付いていても取り出せる', () => {
  const md = 'https://www.amazon.co.jp/x/dp/B096TH798S/ref=sr_1_1?__mk_ja_JP=カタカナ&qid=167';
  assert.equal(extractAsin(md), 'B096TH798S');
});

test('extractAsin: 末尾がXのISBN-10形式も取り出せる', () => {
  const md = 'https://www.amazon.co.jp/本-新書/dp/456985849X';
  assert.equal(extractAsin(md), '456985849X');
});

test('extractAsin: /gp/product/ 形式も取り出せる', () => {
  const md = 'https://www.amazon.co.jp/gp/product/4120058018';
  assert.equal(extractAsin(md), '4120058018');
});

test('extractAsin: 複数あれば最初の1件を返す', () => {
  const md = 'https://www.amazon.co.jp/a/dp/1111111111 と https://www.amazon.co.jp/b/dp/2222222222';
  assert.equal(extractAsin(md), '1111111111');
});

test('extractAsin: Amazonリンクがなければnull', () => {
  assert.equal(extractAsin('リンクなしの本文 https://example.com/dp/notamazon12'), null);
});

test('coverUrl: ASINから表紙画像URLを組み立てる', () => {
  assert.equal(
    coverUrl('4492261257'),
    'https://images-na.ssl-images-amazon.com/images/P/4492261257.09.LZZZZZZZ.jpg'
  );
});

// resolveCover: フロントマターの Cover: による手動上書き
const BASE = { body: 'https://www.amazon.co.jp/x/dp/1111111111', genre: '書籍', baseUrl: 'posts/slug/' };

test('resolveCover: Cover: none で表紙を出さない(自動抽出より優先)', () => {
  assert.equal(resolveCover({ ...BASE, cover: 'none' }), null);
});

test('resolveCover: Cover: <ASIN> でそのASINの表紙を使う', () => {
  assert.equal(resolveCover({ ...BASE, cover: '4569858490' }), coverUrl('4569858490'));
});

test('resolveCover: 小文字のASINも大文字に正規化する', () => {
  assert.equal(resolveCover({ ...BASE, cover: 'b096th798s' }), coverUrl('B096TH798S'));
});

test('resolveCover: Cover: <URL> はそのまま使う', () => {
  const url = 'https://example.com/my-cover.jpg';
  assert.equal(resolveCover({ ...BASE, cover: url }), url);
});

test('resolveCover: Cover: <ファイル名> は記事フォルダ内の画像を指す', () => {
  assert.equal(resolveCover({ ...BASE, cover: 'cover.jpg' }), 'posts/slug/cover.jpg');
});

test('resolveCover: 未指定の書籍は本文から自動抽出する', () => {
  assert.equal(resolveCover({ ...BASE, cover: '' }), coverUrl('1111111111'));
});

test('resolveCover: 未指定の技術記事は表紙なし', () => {
  assert.equal(resolveCover({ ...BASE, cover: '', genre: '技術' }), null);
});

test('resolveCover: 手動指定があれば技術記事でも表紙を出す', () => {
  assert.equal(resolveCover({ ...BASE, cover: '4492261257', genre: '技術' }), coverUrl('4492261257'));
});
