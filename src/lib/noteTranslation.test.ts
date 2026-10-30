// Run: npx esbuild src/lib/noteTranslation.test.ts --bundle --platform=node --outfile=/tmp/nt.test.cjs && node --test /tmp/nt.test.cjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  protectEntities, restoreEntities, hasTranslatableText, translateNote, isTranslationSupported, likelyForeign, saveRemote, normalizeUrl,
} from './noteTranslation';

const npub = 'nostr:npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m';
const note = `¡Hola ${npub}! Mira https://primal.net/e/abc?x=1 #bitcoin :zap: pay me@getalby.com lnbc10u1pjabcdef`;

test('protects and restores every nostr entity exactly', () => {
  const { text, tokens } = protectEntities(note);
  for (const t of tokens) assert.ok(!text.includes(t));
  assert.equal(tokens.length, 6);
  assert.equal(restoreEntities(text, tokens), note);
});

test('restores even when the engine adds spaces inside placeholders', () => {
  const { text, tokens } = protectEntities(note);
  assert.equal(restoreEntities(text.replace(/⟦(\d+)⟧/g, '⟦ $1 ⟧'), tokens), note);
});

test('literal text that looks like a placeholder is never confused with one', () => {
  const { text, tokens } = protectEntities('see [0] and {{1}} __P0__ #tag');
  assert.equal(restoreEntities(text, tokens), 'see [0] and {{1}} __P0__ #tag');
});

test('skips notes with no prose', () => {
  assert.equal(hasTranslatableText(`${npub} https://x.com/a #nostr`), false);
  assert.equal(hasTranslatableText('Bonjour tout le monde'), true);
});

const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) };

test('is a no-op when the browser has no on-device translator', () => {
  assert.equal(isTranslationSupported(), false);
});

test('translates line by line on device, keeps entities, caches', async () => {
  let calls = 0;
  (globalThis as any).LanguageDetector = { create: async () => ({ detect: async () => [{ detectedLanguage: 'es', confidence: 0.95 }] }) };
  (globalThis as any).Translator = { create: async () => ({ translate: async (s: string) => { calls++; return s.replace('¡Hola', 'Hello').replace('Mira', 'Look'); } }) };
  const a = await translateNote(note + '\n\nMira', 'en-US');
  assert.equal(a.source, 'es');
  assert.equal(a.text, note.replace('¡Hola', 'Hello').replace('Mira', 'Look') + '\n\nLook');
  const before = calls;
  await translateNote(note + '\n\nMira', 'en-GB');
  assert.equal(calls, before, 'second call served from cache');
});

test('protects payment strings: offers, lnurl, lightning: URIs, cashu', () => {
  const s = 'paga lno1qcp4256ypqpq86q lnurl1dp68gurn8ghj7 lightning:lnbc1xyz cashuAeyJ0b2tlbiI6W3';
  const { text, tokens } = protectEntities(s);
  assert.equal(tokens.length, 4);
  assert.ok(!/lno1|lnurl1|lightning:|cashuA/.test(text));
  assert.equal(restoreEntities(text, tokens), s);
});

test('script/common-word heuristic for browsers without a detector', () => {
  assert.equal(likelyForeign('こんにちは世界、今日はいい天気ですね', 'en'), true);
  assert.equal(likelyForeign('Привет всем, как дела сегодня', 'en'), true);
  assert.equal(likelyForeign('Hola amigos, mañana vamos al mercado temprano', 'en'), true);
  assert.equal(likelyForeign('This is just my note and you are reading it', 'en'), false);
  assert.equal(likelyForeign('Hello everyone', 'ja'), true);
});

test('normalizes service URLs', () => {
  assert.equal(normalizeUrl(' https://lt.example.com/translate/ '), 'https://lt.example.com');
});
