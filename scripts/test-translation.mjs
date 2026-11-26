import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workDir = mkdtempSync(join(tmpdir(), 'primal-translation-test-'));

await build({
  entryPoints: {
    sanitizer: join(root, 'src/lib/translationSanitizer.ts'),
    translation: join(root, 'src/lib/translation.ts'),
  },
  outdir: workDir,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outExtension: { '.js': '.mjs' },
});

const sanitizer = await import(pathToFileURL(join(workDir, 'sanitizer.mjs')).href);
const translation = await import(pathToFileURL(join(workDir, 'translation.mjs')).href);

test.after(() => {
  rmSync(workDir, { recursive: true, force: true });
});

const createMemoryStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
};

test('shields and restores all Nostr, Bitcoin, web, and code entities verbatim', () => {
  const npub = 'nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
  const nevent = 'nevent1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
  const nrelay = 'nrelay1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
  const invoice = 'lnbc10u1p3q2w3e4r5t6y7u8a9s0d2f3g4h5j6k7l8z9x0c2v3n4m5p6';
  const amountlessInvoice = 'lnbc1p3q2w3e4r5t6y7u8a9s0d2f3g4h5j6k7l8z9x0c2v3n4m5p6';
  const offer = 'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrcgq';
  const cashu = 'cashuAeyJ0b2tlbiI6W3sibWludCI6Imh0dHBzOi8vODMzMy5zcGFjZSJ9XX0=';
  const btcAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
  const wikiUrl = 'https://en.wikipedia.org/wiki/Bitcoin_(disambiguation)';

  const source = [
    `Hola mundo (${wikiUrl}).`,
    `Mira ${npub} y ${nevent} en ${nrelay}`,
    `Paga ${invoice} o ${amountlessInvoice} o ${offer} o lightning:lnbc1qqqqqqqqqqqqqqqqqqqqqqqq`,
    `Cashu ${cashu} y ${btcAddr}`,
    `Contacto alice@primal.net @alice #[0] :nostrich: #bitcoin #日本語`,
    'Codigo `const x = 1;` y ```ts\nconst y = 2;\n``` fin.',
  ].join('\n');

  const shielded = sanitizer.shieldNoteContent(source);

  for (const sensitive of [
    wikiUrl,
    npub,
    nevent,
    nrelay,
    invoice,
    amountlessInvoice,
    offer,
    cashu,
    btcAddr,
    'alice@primal.net',
    '@alice',
    '#[0]',
    ':nostrich:',
    '#bitcoin',
    '#日本語',
    'const x = 1;',
    'const y = 2;',
  ]) {
    assert.equal(
      shielded.shieldedText.includes(sensitive),
      false,
      `Expected entity to be shielded: ${sensitive}`,
    );
  }

  // Trailing punctuation around balanced-paren URL remains outside the placeholder
  assert.ok(shielded.shieldedText.includes(`([[${shielded.prefix}_0]]).`));

  const translatedMock = shielded.shieldedText
    .replace('Hola mundo', 'Hello world')
    .replace('Mira', 'Check')
    .replace('Paga', 'Pay')
    .replace('Contacto', 'Contact')
    .replace('Codigo', 'Code')
    .replace('fin.', 'end.');

  const restored = sanitizer.restoreNoteContent(translatedMock, shielded);
  assert.ok(restored.startsWith(`Hello world (${wikiUrl}).`));
  assert.ok(restored.includes(npub));
  assert.ok(restored.includes(nevent));
  assert.ok(restored.includes(nrelay));
  assert.ok(restored.includes(invoice));
  assert.ok(restored.includes(offer));
  assert.ok(restored.includes(cashu));
  assert.ok(restored.includes(btcAddr));
  assert.ok(restored.includes('alice@primal.net'));
  assert.ok(restored.includes('@alice'));
  assert.ok(restored.includes('#[0]'));
  assert.ok(restored.includes(':nostrich:'));
  assert.ok(restored.includes('#bitcoin'));
  assert.ok(restored.includes('#日本語'));
  assert.ok(restored.includes('`const x = 1;`'));
  assert.ok(restored.includes('```ts\nconst y = 2;\n```'));
});

test('collision-proof single-pass restoration handles adversarial placeholder prose & URLs', () => {
  const cases = [
    'Please compare https://example.com/NTX001 with https://example.com/NTX002',
    'Literal NTX000 and ⟦NTX000⟧ next to https://example.com/a',
    'Literal [[PRIMALTOK0X_0]] alongside https://example.com/PRIMALTOK0X_1',
    'Spaced literal P R I M A L T O K 0 X _ 0 next to https://example.com/test',
    'Check https://example.com/foo 2026 release notes',
  ];

  for (const input of cases) {
    const shielded = sanitizer.shieldNoteContent(input);
    const roundTripped = sanitizer.restoreNoteContent(shielded.shieldedText, shielded);
    assert.equal(roundTripped, input, `Failed round-trip for: ${input}`);
  }

  // Tolerates MT mangling (lowercase, bracket drop, spaces) without touching out-of-bounds indices
  const shielded = sanitizer.shieldNoteContent('Hola https://example.com en 2026');
  const mangled = `Hello [ ${shielded.prefix.toLowerCase()} _ 0 ] in 2026 and ${shielded.prefix}_99`;
  const restored = sanitizer.restoreNoteContent(mangled, shielded);
  assert.equal(restored, `Hello https://example.com in 2026 and ${shielded.prefix}_99`);
});

test('shouldOfferTranslation skips empty, media-only, or token-only notes and accepts prose', () => {
  assert.equal(sanitizer.shouldOfferTranslation(''), false);
  assert.equal(sanitizer.shouldOfferTranslation('ok'), false);
  assert.equal(sanitizer.shouldOfferTranslation('https://primal.net/image.jpg'), false);
  assert.equal(
    sanitizer.shouldOfferTranslation(
      'nostr:nevent1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq #bitcoin',
    ),
    false,
  );
  assert.equal(sanitizer.shouldOfferTranslation('21000000 🤙🔥 #nostr'), false);
  assert.equal(sanitizer.shouldOfferTranslation('¡Buenos días Nostr! https://primal.net'), true);
  assert.equal(sanitizer.shouldOfferTranslation('こんにちは世界'), true);
});

test('language normalization and comparison handle BCP-47 and Chinese scripts', () => {
  assert.equal(sanitizer.toLibreTranslateLanguage('en-US'), 'en');
  assert.equal(sanitizer.toLibreTranslateLanguage('zh-CN'), 'zh-Hans');
  assert.equal(sanitizer.toLibreTranslateLanguage('zh-TW'), 'zh-Hant');
  assert.equal(sanitizer.toGoogleTranslateLanguage('zh-Hans'), 'zh-CN');
  assert.equal(sanitizer.toGoogleTranslateLanguage('zh-Hant'), 'zh-TW');
  assert.equal(sanitizer.isSameLanguage('en', 'en-US'), true);
  assert.equal(sanitizer.isSameLanguage('zh-CN', 'zh-Hans'), true);
  assert.equal(sanitizer.isSameLanguage('zh-CN', 'zh-TW'), false);
  assert.equal(sanitizer.isSameLanguage('es', 'en'), false);
});

test('normalizeLibreTranslateBaseUrl enforces HTTPS except loopback and strips trailing /translate', () => {
  assert.equal(
    translation.normalizeLibreTranslateBaseUrl('https://lt.example.com/translate/'),
    'https://lt.example.com',
  );
  assert.equal(
    translation.normalizeLibreTranslateBaseUrl('https://lt.example.com/api/translate'),
    'https://lt.example.com/api',
  );
  assert.equal(
    translation.normalizeLibreTranslateBaseUrl('http://localhost:5000/'),
    'http://localhost:5000',
  );
  assert.equal(
    translation.normalizeLibreTranslateBaseUrl('http://127.0.0.1:5000/translate'),
    'http://127.0.0.1:5000',
  );

  assert.throws(
    () => translation.normalizeLibreTranslateBaseUrl('http://remote.example.com'),
    (err) => err.code === 'INVALID_ENDPOINT',
  );
  assert.throws(
    () => translation.normalizeLibreTranslateBaseUrl('https://user:pass@lt.example.com'),
    (err) => err.code === 'INVALID_ENDPOINT',
  );
  assert.throws(
    () => translation.normalizeLibreTranslateBaseUrl('https://lt.example.com?foo=bar'),
    (err) => err.code === 'INVALID_ENDPOINT',
  );
  assert.throws(
    () => translation.normalizeLibreTranslateBaseUrl('javascript:alert(1)'),
    (err) => err.code === 'INVALID_ENDPOINT',
  );
});

test('fail-closed default provider makes zero network calls', async () => {
  let fetchCalled = false;
  await assert.rejects(
    () =>
      translation.translateNoteContent(
        'Hola mundo desde Nostr',
        translation.DEFAULT_TRANSLATION_SETTINGS,
        {
          fetchImpl: async () => {
            fetchCalled = true;
            throw new Error('fetch should not be called');
          },
          cache: new translation.TranslationCache({ storage: null }),
        },
      ),
    (err) => err.code === 'NOT_CONFIGURED',
  );
  assert.equal(fetchCalled, false);
});

test('LibreTranslate provider shields entities, caches results, and handles same-language detection', async () => {
  const storage = createMemoryStorage();
  const cache = new translation.TranslationCache({ storage });
  const calls = [];

  const mockFetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const q = JSON.parse(init.body).q;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        translatedText: q.replace('Hola mundo', 'Hello world'),
        detectedLanguage: { language: 'es', confidence: 98 },
      }),
    };
  };

  const settings = {
    provider: 'libretranslate',
    targetLanguage: 'en-US',
    libreTranslateUrl: 'https://lt.example.com/translate',
    libreTranslateApiKey: 'secret-key-not-in-cache',
    googleApiKey: '',
  };

  const note = 'Hola mundo https://primal.net #nostr';
  const first = await translation.translateNoteContent(note, settings, {
    fetchImpl: mockFetch,
    cache,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://lt.example.com/translate');
  assert.equal(calls[0].body.target, 'en');
  assert.equal(calls[0].body.api_key, 'secret-key-not-in-cache');
  assert.equal(calls[0].body.q.includes('https://primal.net'), false);
  assert.equal(first.translatedText, 'Hello world https://primal.net #nostr');
  assert.equal(first.detectedSourceLanguage, 'es');
  assert.equal(first.alreadyInTargetLanguage, false);
  assert.equal(first.cached, false);

  // Cache key must never contain API key
  const persisted = storage.getItem(translation.TRANSLATION_CACHE_STORAGE_KEY);
  assert.ok(persisted && !persisted.includes('secret-key-not-in-cache'));

  // Second call hits cache with zero extra network calls
  const second = await translation.translateNoteContent(note, settings, {
    fetchImpl: mockFetch,
    cache,
  });
  assert.equal(calls.length, 1);
  assert.equal(second.cached, true);
  assert.equal(second.translatedText, first.translatedText);

  // Same-language detection sets alreadyInTargetLanguage = true
  const sameLang = await translation.translateNoteContent(
    'Already English text here',
    settings,
    {
      cache,
      fetchImpl: async (_url, init) => ({
        ok: true,
        status: 200,
        json: async () => ({
          translatedText: JSON.parse(init.body).q,
          detectedLanguage: { language: 'en' },
        }),
      }),
    },
  );
  assert.equal(sameLang.alreadyInTargetLanguage, true);
});

test('Google Cloud Translation provider sends key in header and uses text format', async () => {
  const cache = new translation.TranslationCache({ storage: null });
  let capturedUrl = '';
  let capturedHeaders = {};
  let capturedBody = {};

  const res = await translation.translateNoteContent(
    'Bonjour le monde #bitcoin',
    {
      provider: 'google',
      targetLanguage: 'en',
      libreTranslateUrl: '',
      libreTranslateApiKey: '',
      googleApiKey: 'test-google-key',
    },
    {
      cache,
      fetchImpl: async (url, init) => {
        capturedUrl = String(url);
        capturedHeaders = init.headers;
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              translations: [
                {
                  translatedText: capturedBody.q.replace('Bonjour le monde', 'Hello world'),
                  detectedSourceLanguage: 'fr',
                },
              ],
            },
          }),
        };
      },
    },
  );

  assert.equal(capturedUrl, 'https://translation.googleapis.com/language/translate/v2');
  assert.equal(capturedUrl.includes('test-google-key'), false);
  assert.equal(capturedHeaders['X-goog-api-key'], 'test-google-key');
  assert.equal(capturedBody.format, 'text');
  assert.equal(res.translatedText, 'Hello world #bitcoin');
  assert.equal(res.detectedSourceLanguage, 'fr');
});

test('On-device browser Translator API supports detection, translation, and same-language short-circuit', async () => {
  const cache = new translation.TranslationCache({ storage: null });
  let translatorCreated = 0;

  const mockDetector = {
    availability: async () => 'available',
    create: async () => ({
      detect: async (text) => [
        { detectedLanguage: text.includes('Hola') ? 'es' : 'en', confidence: 0.99 },
      ],
      destroy: () => {},
    }),
  };

  const mockTranslator = {
    availability: async () => 'available',
    create: async () => {
      translatorCreated += 1;
      return {
        translate: async (text) => text.replace('Hola amigos', 'Hello friends'),
        destroy: () => {},
      };
    },
  };

  const settings = {
    provider: 'browser',
    targetLanguage: 'en',
    libreTranslateUrl: '',
    libreTranslateApiKey: '',
    googleApiKey: '',
  };

  const translated = await translation.translateNoteContent(
    'Hola amigos https://primal.net',
    settings,
    {
      cache,
      browserTranslator: mockTranslator,
      browserLanguageDetector: mockDetector,
    },
  );

  assert.equal(translatorCreated, 1);
  assert.equal(translated.translatedText, 'Hello friends https://primal.net');
  assert.equal(translated.detectedSourceLanguage, 'es');
  assert.equal(translated.alreadyInTargetLanguage, false);

  // Same-language note short-circuits without instantiating Translator
  const same = await translation.translateNoteContent(
    'Hello friends already in English',
    settings,
    {
      cache,
      browserTranslator: mockTranslator,
      browserLanguageDetector: mockDetector,
    },
  );
  assert.equal(translatorCreated, 1);
  assert.equal(same.alreadyInTargetLanguage, true);
});

test('LRU cache enforces maxEntries and maxBytes bounds and recovers from corrupt storage', () => {
  const storage = createMemoryStorage();
  storage.setItem('bad-key', '{not valid json');

  const corruptCache = new translation.TranslationCache({
    storage,
    storageKey: 'bad-key',
  });
  assert.equal(corruptCache.size(), 0);

  const bounded = new translation.TranslationCache({
    storage,
    storageKey: 'bounded-key',
    maxEntries: 2,
    maxBytes: 4096,
  });

  bounded.set('k1', {
    translatedText: 'one',
    targetLanguage: 'en',
    provider: 'libretranslate',
    alreadyInTargetLanguage: false,
    cachedAt: 1,
  });
  bounded.set('k2', {
    translatedText: 'two',
    targetLanguage: 'en',
    provider: 'libretranslate',
    alreadyInTargetLanguage: false,
    cachedAt: 2,
  });
  // Touch k1 so k2 becomes least-recently-used
  assert.equal(bounded.get('k1')?.translatedText, 'one');
  bounded.set('k3', {
    translatedText: 'three',
    targetLanguage: 'en',
    provider: 'libretranslate',
    alreadyInTargetLanguage: false,
    cachedAt: 3,
  });

  assert.equal(bounded.size(), 2);
  assert.equal(bounded.get('k2'), undefined);
  assert.equal(bounded.get('k1')?.translatedText, 'one');
  assert.equal(bounded.get('k3')?.translatedText, 'three');
});

test('request cancellation and timeout produce typed TranslationError codes', async () => {
  const cache = new translation.TranslationCache({ storage: null });
  const settings = {
    provider: 'libretranslate',
    targetLanguage: 'en',
    libreTranslateUrl: 'https://lt.example.com',
    libreTranslateApiKey: '',
    googleApiKey: '',
  };

  const abortableFetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });

  // External abort
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 15);
  await assert.rejects(
    () =>
      translation.translateNoteContent('Hola mundo abortado', settings, {
        cache,
        signal: controller.signal,
        fetchImpl: abortableFetch,
      }),
    (err) => err.code === 'ABORTED',
  );

  // Timeout
  await assert.rejects(
    () =>
      translation.translateNoteContent('Hola mundo lento', settings, {
        cache,
        timeoutMs: 25,
        fetchImpl: abortableFetch,
      }),
    (err) => err.code === 'TIMEOUT',
  );
});
