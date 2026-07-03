import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAsin, coverUrl } from '../lib/cover.mjs';

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
