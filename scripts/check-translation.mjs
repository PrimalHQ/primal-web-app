/**
 * Unit tests for the note-translation module (src/lib/translation.ts).
 *
 * Covers:
 *   - entity-protection mask/unmask round-trip (URLs, nostr refs, hashtags,
 *     @mentions, lightning invoices)
 *   - de-duplication and tolerant restore of placeholders
 *   - the translation service (URL/body construction, response parsing, errors)
 *   - the high-level translate pipeline (cache → protect → translate → restore)
 *   - bounded cache eviction
 *
 * Run with:  node scripts/check-translation.mjs
 *
 * The module under test is compiled from TypeScript in-process using the
 * project's own `typescript` devDependency, so we exercise the shipped source
 * rather than a forked copy.
 */
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const compileModule = (relPath) => {
  const source = readFileSync(new URL(relPath, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: relPath,
  });
  return outputText;
};

const dir = mkdtempSync(join(tmpdir(), 'primal-translation-test-'));
const compiled = compileModule('../src/lib/translation.ts');
const modPath = join(dir, 'translation.cjs');
writeFileSync(modPath, compiled);

const translation = require(modPath);

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];
const tests = [];

// Tests are registered here and run at the bottom so async bodies are awaited.
const test = (name, fn) => tests.push({ name, fn });

const assert = (cond, message) => {
  if (!cond) throw new Error(message || 'assertion failed');
};

const assertEqual = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`${message || 'assertEqual failed'}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
  }
};

// ---------------------------------------------------------------------------
// Entity-protection round-trip
// ---------------------------------------------------------------------------

const {
  protectEntities,
  restoreEntities,
  contentHash,
  translateText,
  translateNoteContent,
  readCache,
  writeCache,
  hasTranslatableContent,
  DEFAULT_TRANSLATE_ENDPOINT,
} = translation;

// Valid bech32 tokens (charset excludes b, i, o and 1 beyond the separator).
const NPUB = 'npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m';
const NOTE = 'note1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
const NEVENT = 'nevent1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaks';
const NADDR = 'naddr1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
const NPROFILE = 'nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaks';

// A "translator" that echoes its input unchanged — the identity case.
const identityTranslate = (q) => q;

test('mask/unmask round-trip is identity for a passthrough translator', () => {
  const sample = [
    `Check out https://primal.net/p/${NPUB} and follow @jack #nostr`,
    `nostr:${NPUB} says hi`,
    `Read nostr:${NOTE} and nostr:${NEVENT} plus ${NADDR} here https://example.com/path?a=b#frag.`,
    'Lightning invoice lnbc10n1pjxq5t5dpa2mpqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzq',
    'hello world',
    'email me at user@example.com (should not be treated as a mention)',
  ].join('\n');

  const { text, segments } = protectEntities(sample);
  const restored = restoreEntities(text, segments);
  assertEqual(restored, sample, 'round-trip must be lossless for a passthrough translator');
});

test('a bech32 reference inside a URL path round-trips intact', () => {
  const sample = `see https://primal.net/p/${NPUB} today`;
  const { text, segments } = protectEntities(sample);
  const restored = restoreEntities(identityTranslate(text), segments);
  assertEqual(restored, sample, 'npub embedded in a URL must not be corrupted');
});

test('entities are masked out of the protected text', () => {
  const sample = `Visit https://primal.net and mention nostr:${NPUB} #tag @alice lnbc10n1x`;
  const { text } = protectEntities(sample);

  assert(!/https:\/\/primal\.net/.test(text), 'URL must be masked');
  assert(!new RegExp(`nostr:${NPUB}`).test(text), 'nostr: reference must be masked');
  assert(!/#tag/.test(text), 'hashtag must be masked');
  assert(!/@alice/.test(text), '@mention must be masked');
  assert(!/lnbc10n1x/.test(text), 'lightning invoice must be masked');
  assert(/⟦\d+⟧/.test(text), 'placeholders must be present in protected text');
});

test('nostr bech32 references survive verbatim (all kinds)', () => {
  const refs = [NPUB, NPROFILE, NOTE, NEVENT, NADDR];

  const sample = `refs: ${refs.join(' ')}`;
  const { text, segments } = protectEntities(sample);
  const restored = restoreEntities(identityTranslate(text), segments);
  assertEqual(restored, sample, 'all bech32 reference kinds must round-trip verbatim');
});

test('de-duplication reuses placeholders for identical entities', () => {
  const sample = `nostr:${NPUB} and again nostr:${NPUB} and once more nostr:${NPUB}`;
  const { text, segments } = protectEntities(sample);

  const uniquePlaceholders = new Set(text.match(/⟦\d+⟧/g) || []);
  assertEqual(uniquePlaceholders.size, 1, 'identical entities must map to one placeholder');
  assertEqual(segments.length, 1, 'only one segment must be recorded');

  const restored = restoreEntities(identityTranslate(text), segments);
  assertEqual(restored, sample, 'de-duplicated restore must be lossless');
});

test('restore tolerates whitespace injected inside placeholders', () => {
  const sample = 'check https://example.com now';
  const { text, segments } = protectEntities(sample);
  const mangled = text.replace(/⟦(\d+)⟧/g, '⟦ $1 ⟧');
  const restored = restoreEntities(mangled, segments);
  assertEqual(restored, sample, 'mangled placeholders must still restore');
});

test('leftover placeholders are removed', () => {
  const sample = 'a #tag b';
  const { segments } = protectEntities(sample);
  const restored = restoreEntities('some text ⟦99⟧ left', segments);
  assert(!/⟦/.test(restored), 'orphan placeholders must be stripped');
});

test('hasTranslatableContent distinguishes prose from entity-only notes', () => {
  assertEqual(hasTranslatableContent('hello world'), true, 'prose must be translatable');
  assertEqual(hasTranslatableContent('https://example.com'), false, 'URL-only must not be translatable');
  assertEqual(hasTranslatableContent(`#tag @alice nostr:${NPUB}`), false, 'entity-only must not be translatable');
  assertEqual(hasTranslatableContent(''), false, 'empty must not be translatable');
});

test('contentHash is stable and distinct', () => {
  assertEqual(contentHash('hello'), contentHash('hello'), 'hash must be deterministic');
  assert(contentHash('hello') !== contentHash('world'), 'hash must differ for different input');
});

// ---------------------------------------------------------------------------
// Translation service (fetch is mocked below)
// ---------------------------------------------------------------------------

const makeFetchMock = (handler) => {
  globalThis.fetch = async (url, init) => handler(String(url), init);
};

test('translateText builds the correct request and parses LibreTranslate response', async () => {
  let captured;
  makeFetchMock(async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      status: 200,
      json: async () => ({ translatedText: 'hola mundo', detectedLanguage: { language: 'en' } }),
    };
  });

  const result = await translateText('hello world', 'es', 'https://lt.example.com', 'key123');

  assertEqual(captured.url, 'https://lt.example.com/translate', 'endpoint must append /translate');
  const body = JSON.parse(captured.init.body);
  assertEqual(body.q, 'hello world', 'q must be the source text');
  assertEqual(body.source, 'auto', 'source must be auto');
  assertEqual(body.target, 'es', 'target must be passed through');
  assertEqual(body.api_key, 'key123', 'api_key must be passed through');
  assertEqual(result.translatedText, 'hola mundo', 'translatedText must be parsed');
  assertEqual(result.detectedLanguage, 'en', 'detectedLanguage must be parsed');
});

test('translateText does not double the /translate path', async () => {
  let captured;
  makeFetchMock(async (url) => {
    captured = url;
    return { ok: true, status: 200, json: async () => ({ translatedText: 'x' }) };
  });

  await translateText('x', 'en', 'https://lt.example.com/translate', undefined);
  assertEqual(captured, 'https://lt.example.com/translate', 'must not double /translate');
});

test('translateText omits api_key when absent', async () => {
  let captured;
  makeFetchMock(async (url, init) => {
    captured = init;
    return { ok: true, status: 200, json: async () => ({ translatedText: 'x' }) };
  });

  await translateText('x', 'en', 'https://lt.example.com', '');
  const body = JSON.parse(captured.body);
  assert(!('api_key' in body), 'api_key must be omitted when empty');
});

test('translateText supports the Lingva response shape', async () => {
  makeFetchMock(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ translation: 'traduit' }),
  }));

  const result = await translateText('x', 'fr', 'https://lt.example.com', undefined);
  assertEqual(result.translatedText, 'traduit', 'Lingva translation shape must be parsed');
});

test('translateText surfaces HTTP errors', async () => {
  makeFetchMock(async () => ({ ok: false, status: 403, text: async () => 'forbidden' }));

  let thrown = null;
  try {
    await translateText('x', 'en', 'https://lt.example.com', undefined);
  } catch (e) {
    thrown = e;
  }
  assert(thrown, 'must throw on non-ok response');
  assertEqual(thrown.status, 403, 'must surface the HTTP status');
});

// ---------------------------------------------------------------------------
// translateNoteContent pipeline + cache
// ---------------------------------------------------------------------------

const makeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() { return map.size; },
  };
};

test('translateNoteContent masks entities before translating and restores them after', async () => {
  globalThis.localStorage = makeStorage();

  const source = `La réunion est à https://example.com avec nostr:${NPUB} #plan @bob`;
  let received = '';
  makeFetchMock(async (url, init) => {
    received = JSON.parse(init.body).q;
    // The mock translator replaces all letters but leaves placeholders untouched.
    const translated = received.replace(/[a-zà-ÿ]/gi, (c) => String.fromCharCode(c.charCodeAt(0) + 1));
    return { ok: true, status: 200, json: async () => ({ translatedText: translated }) };
  });

  const result = await translateNoteContent(source, 'en', 'https://lt.example.com', undefined);

  assert(!/https:\/\/example\.com/.test(received), 'URL must not be sent to the provider');
  assert(!new RegExp(`nostr:${NPUB}`).test(received), 'nostr ref must not be sent to the provider');
  assert(result.translatedText.includes('https://example.com'), 'URL must be restored verbatim');
  assert(result.translatedText.includes(`nostr:${NPUB}`), 'nostr ref must be restored verbatim');
  assert(result.translatedText.includes('#plan'), 'hashtag must be restored verbatim');
  assert(result.translatedText.includes('@bob'), 'mention must be restored verbatim');
});

test('translateNoteContent caches results and does not re-fetch', async () => {
  globalThis.localStorage = makeStorage();

  let calls = 0;
  makeFetchMock(async () => {
    calls++;
    return { ok: true, status: 200, json: async () => ({ translatedText: 'cache me' }) };
  });

  await translateNoteContent('unique cached note', 'en', 'https://lt.example.com', undefined);
  await translateNoteContent('unique cached note', 'en', 'https://lt.example.com', undefined);

  assertEqual(calls, 1, 'second call must hit the cache');
  assert(readCache('unique cached note', 'en', 'https://lt.example.com'), 'cache must be populated');
});

test('cache evicts oldest entries beyond the bound', () => {
  globalThis.localStorage = makeStorage();

  const endpoint = 'https://lt.example.com';
  const target = 'en';

  // 205 entries > 200 bound. Timestamps increase with i, so entry 0 is oldest.
  for (let i = 0; i < 205; i++) {
    writeCache(`note ${i}`, target, endpoint, { translatedText: `t${i}`, detectedLanguage: '', ts: 1000 + i });
  }

  assert(!readCache('note 0', target, endpoint), 'oldest entry must be evicted');
  assert(readCache('note 204', target, endpoint), 'newest entry must be retained');
});

// ---------------------------------------------------------------------------
// Run registered tests (awaits async bodies), then summarize
// ---------------------------------------------------------------------------

for (const { name, fn } of tests) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err && err.message ? err.message : err}`);
  }
}

rmSync(dir, { recursive: true, force: true });

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) {
    console.error(`  - ${f.name}: ${f.err && f.err.message ? f.err.message : f.err}`);
  }
  process.exit(1);
}
