import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, addHeadingIds, tocFromHeadings } from '../lib/toc.mjs';

test('slugify: 空白をハイフンに置換する', () => {
  assert.equal(slugify('hello world'), 'hello-world');
});

test('slugify: 英字を小文字化する', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('slugify: 日本語はそのまま残す', () => {
  assert.equal(slugify('読もうと思ったきっかけ'), '読もうと思ったきっかけ');
});

test('slugify: HTMLに危険な記号を除去する', () => {
  assert.equal(slugify(`a<b>"c"&d'e`), 'abcde');
});

test('slugify: 前後の空白を除去する', () => {
  assert.equal(slugify('  目次  '), '目次');
});

test('addHeadingIds: h2〜h4にidを付与する', () => {
  const { html } = addHeadingIds('<h2>はじめに</h2><h3>Setup</h3><h4>詳細</h4>');
  assert.equal(html, '<h2 id="はじめに">はじめに</h2><h3 id="setup">Setup</h3><h4 id="詳細">詳細</h4>');
});

test('addHeadingIds: 見出し一覧(level, text, id)を返す', () => {
  const { headings } = addHeadingIds('<h2>はじめに</h2><h3>Setup</h3>');
  assert.deepEqual(headings, [
    { level: 2, text: 'はじめに', id: 'はじめに' },
    { level: 3, text: 'Setup', id: 'setup' },
  ]);
});

test('addHeadingIds: インラインタグを除いたテキストを使う', () => {
  const { headings } = addHeadingIds('<h3><strong>重要</strong>な話</h3>');
  assert.deepEqual(headings, [{ level: 3, text: '重要な話', id: '重要な話' }]);
});

test('addHeadingIds: 同名見出しのidは連番で重複回避する', () => {
  const { html, headings } = addHeadingIds('<h3>まとめ</h3><h3>まとめ</h3>');
  assert.equal(headings[0].id, 'まとめ');
  assert.equal(headings[1].id, 'まとめ-2');
  assert.match(html, /<h3 id="まとめ-2">/);
});

test('addHeadingIds: h5以深と本文は変更しない', () => {
  const src = '<h5>細目</h5><p>本文の h2 という文字列</p>';
  const { html, headings } = addHeadingIds(src);
  assert.equal(html, src);
  assert.equal(headings.length, 0);
});

test('tocFromHeadings: 「目次」という見出し自体は目次に載せない', () => {
  const toc = tocFromHeadings([
    { level: 3, text: '目次', id: '目次' },
    { level: 3, text: '1. できること', id: '1.-できること' },
  ]);
  assert.deepEqual(toc, [{ level: 3, text: '1. できること', id: '1.-できること' }]);
});

test('tocFromHeadings: h4以深は目次に載せない', () => {
  const toc = tocFromHeadings([
    { level: 2, text: '章', id: '章' },
    { level: 3, text: '節', id: '節' },
    { level: 4, text: '項', id: '項' },
  ]);
  assert.deepEqual(toc.map((h) => h.text), ['章', '節']);
});
