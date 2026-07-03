import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankPosts } from '../lib/ranking.mjs';

test('rankPosts: 閲覧数の降順に並べる', () => {
  const top = rankPosts({ a: 3, b: 10, c: 5 }, 10);
  assert.deepEqual(top.map((r) => r.slug), ['b', 'c', 'a']);
});

test('rankPosts: 上位n件だけ返す', () => {
  const top = rankPosts({ a: 3, b: 10, c: 5 }, 2);
  assert.deepEqual(top.map((r) => r.slug), ['b', 'c']);
});

test('rankPosts: 閲覧数0の記事は含めない', () => {
  const top = rankPosts({ a: 0, b: 2 }, 10);
  assert.deepEqual(top, [{ slug: 'b', count: 2 }]);
});

test('rankPosts: 同数のときはslug昇順で安定する', () => {
  const top = rankPosts({ z: 5, m: 5, a: 5 }, 10);
  assert.deepEqual(top.map((r) => r.slug), ['a', 'm', 'z']);
});

test('rankPosts: countも一緒に返す', () => {
  const top = rankPosts({ a: 7 }, 5);
  assert.deepEqual(top, [{ slug: 'a', count: 7 }]);
});
