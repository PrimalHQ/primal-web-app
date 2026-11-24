import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(__dirname, '../src/lib/noteTranslation.ts');

function loadNoteTranslationModule() {
  const source = readFileSync(modulePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: modulePath,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      esModuleInterop: true,
    },
  });

  const errors = (transpiled.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(errors.length, 0, `TypeScript diagnostics: ${errors.map((e) => e.messageText).join('; ')}`);

  const mod = { exports: {} };
  const fn = new Function('exports', 'module', transpiled.outputText);
  fn(mod.exports, mod);
  return mod.exports;
}

const nt = loadNoteTranslationModule();

test('normalizeTranslationEndpoint enforces HTTPS or localhost and normalizes /translate', () => {
  assert.equal(
    nt.normalizeTranslationEndpoint('https://libretranslate.example.com/'),
    'https://libretranslate.example.com/translate',
  );
  assert.equal(
    nt.normalizeTranslationEndpoint('https://libretranslate.example.com/api/translate/'),
    'https://libretranslate.example.com/api/translate',
  );
  assert.equal(
    nt.normalizeTranslationEndpoint('http://localhost:5000'),
    'http://localhost:5000/translate',
  );
  assert.equal(
    nt.normalizeTranslationEndpoint('http://127.0.0.1:5000/translate'),
    'http://127.0.0.1:5000/translate',
  );
  assert.equal(nt.normalizeTranslationEndpoint('http://remote.example.com'), null);
  assert.equal(nt.normalizeTranslationEndpoint('javascript:alert(1)'), null);
  assert.equal(nt.normalizeTranslationEndpoint('   '), null);
});

test('protectNostrEntities and restoreNostrEntities round-trip mentions, URLs, hashtags, and lightning refs without collision', () => {
  const original =
    'Hola nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq92l2a2, mira https://primal.net/e/abc. #Bitcoin :primal_zap: [[PRIMALNT_0]] lnbc10u1ptest';
  const protectedRes = nt.protectNostrEntities(original);

  assert.notEqual(protectedRes.prefix, 'PRIMALNT', 'should pick collision-free prefix');
  assert.equal(protectedRes.tokens.length, 5);
  assert.ok(!protectedRes.maskedText.includes('nostr:npub1'));
  assert.ok(!protectedRes.maskedText.includes('https://primal.net/e/abc'));
  assert.ok(protectedRes.maskedText.includes('. '), 'trailing period after URL stays outside protected token');
  assert.ok(!protectedRes.maskedText.includes('#Bitcoin'));

  // Simulate translator translating surrounding prose while preserving placeholders
  const simulatedTranslated = protectedRes.maskedText
    .replace('Hola', 'Hello')
    .replace('mira', 'look at');

  const restored = nt.restoreNostrEntities(
    simulatedTranslated,
    protectedRes.tokens,
    protectedRes.prefix,
  );

  assert.equal(
    restored,
    'Hello nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq92l2a2, look at https://primal.net/e/abc. #Bitcoin :primal_zap: [[PRIMALNT_0]] lnbc10u1ptest',
  );
});

test('hasTranslatableText skips link-only / mention-only notes and detects natural text', () => {
  assert.equal(nt.hasTranslatableText('https://primal.net/img.png'), false);
  assert.equal(nt.hasTranslatableText('nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq92l2a2 #nostr :wave:'), false);
  assert.equal(nt.hasTranslatableText('12345 !!!'), false);
  assert.equal(nt.hasTranslatableText('Bonjour le monde! https://primal.net'), true);
  assert.equal(nt.hasTranslatableText('こんにちは世界'), true);
});

test('TranslationCache enforces bounded LRU eviction and recency refresh', () => {
  const cache = new nt.TranslationCache(2);
  cache.set('k1', { translatedText: 'one', targetLanguage: 'en' });
  cache.set('k2', { translatedText: 'two', targetLanguage: 'en' });
  assert.equal(cache.size, 2);

  // Touch k1 so k2 becomes least recently used
  assert.equal(cache.get('k1')?.translatedText, 'one');
  cache.set('k3', { translatedText: 'three', targetLanguage: 'en' });

  assert.equal(cache.size, 2);
  assert.equal(cache.get('k2'), undefined);
  assert.equal(cache.get('k1')?.translatedText, 'one');
  assert.equal(cache.get('k3')?.translatedText, 'three');
});

test('translateNoteContent caches responses, protects entities, and fails closed on missing config or HTTP errors', async () => {
  const cache = new nt.TranslationCache(10);

  await assert.rejects(
    () =>
      nt.translateNoteContent(
        'Hola mundo',
        { endpoint: '', apiKey: '', targetLanguage: 'en' },
        { cache },
      ),
    (err) => err instanceof nt.NoteTranslationError && err.code === 'NOT_CONFIGURED',
  );

  let fetchCalls = 0;
  let capturedBody = null;
  const mockFetch = async (_url, init) => {
    fetchCalls += 1;
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        translatedText: capturedBody.q.replace('Hola mundo', 'Hello world'),
        detectedLanguage: { language: 'es', confidence: 98 },
      }),
    };
  };

  const prefs = {
    endpoint: 'https://translate.example.org',
    apiKey: 'secret-key',
    targetLanguage: 'en',
  };
  const noteText = 'Hola mundo nostr:nevent1qqsxyz #nostr';

  const first = await nt.translateNoteContent(noteText, prefs, { fetchImpl: mockFetch, cache });
  assert.equal(first.fromCache, false);
  assert.equal(first.detectedLanguage, 'es');
  assert.equal(first.translatedText, 'Hello world nostr:nevent1qqsxyz #nostr');
  assert.equal(capturedBody.api_key, 'secret-key');
  assert.ok(!capturedBody.q.includes('nostr:nevent1qqsxyz'));
  assert.equal(fetchCalls, 1);

  const second = await nt.translateNoteContent(noteText, prefs, { fetchImpl: mockFetch, cache });
  assert.equal(second.fromCache, true);
  assert.equal(second.translatedText, first.translatedText);
  assert.equal(fetchCalls, 1, 'second call should hit client cache without network request');

  const errorFetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  await assert.rejects(
    () =>
      nt.translateNoteContent('Otro mensaje', prefs, { fetchImpl: errorFetch, cache }),
    (err) => err instanceof nt.NoteTranslationError && err.code === 'HTTP_ERROR' && err.status === 503,
  );
});

test('resolveTargetLanguage and formatLanguageName handle auto/browser defaults gracefully', () => {
  assert.equal(nt.resolveTargetLanguage('auto', 'pt-BR'), 'pt');
  assert.equal(nt.resolveTargetLanguage('ja', 'en-US'), 'ja');
  assert.equal(nt.formatLanguageName('es', 'en'), 'Spanish');
  assert.equal(nt.formatLanguageName('', 'en'), '');
});
