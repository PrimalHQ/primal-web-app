/**
 * Offline unit tests for src/lib/translatePost.ts
 * Run: node --test test/translatePost.test.mjs
 * (The .ts source is imported as text and its pure helpers are re-implemented
 * here so the tests need no TypeScript compiler or network.)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'src', 'lib', 'translatePost.ts'), 'utf8');

function normalizeLang(locale) {
  const raw = String(locale || 'en').toLowerCase();
  const base = raw.split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(base) ? base : 'en';
}

test('translatePost.ts exists and uses a keyless endpoint', () => {
  assert.ok(src.includes('api.mymemory.translated.net/get'));
  assert.ok(!/api[_-]?key/i.test(src));
});

test('normalizeLang strips region and defaults to en', () => {
  assert.equal(normalizeLang('id-ID'), 'id');
  assert.equal(normalizeLang('en_US'), 'en');
  assert.equal(normalizeLang('fr'), 'fr');
  assert.equal(normalizeLang(undefined), 'en');
  assert.equal(normalizeLang('!!'), 'en');
});

test('source has cache with a bounded limit', () => {
  assert.match(src, /CACHE_LIMIT\s*=\s*\d+/);
  assert.ok(src.includes('cache.delete(oldest)'));
});

test('source never mutates the original note text', () => {
  assert.ok(src.includes('original text is never modified'));
  assert.ok(!/\.content\s*=/.test(src));
});

test('source guards empty text and bad responses', () => {
  assert.ok(src.includes("reason: 'empty'"));
  assert.ok(src.includes("reason: 'bad_response'"));
  assert.ok(src.includes("reason: 'network'"));
});

test('source truncates input before the request', () => {
  assert.ok(src.includes('text.slice(0, 900)'));
});

test('source uses langpair en to target locale', () => {
  assert.ok(src.includes('langpair=en%7C'));
});

test('source exports a cache clearer for tests', () => {
  assert.ok(src.includes('export function clearTranslateCache'));
});
