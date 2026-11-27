// Offline runtime regression checks for the production translation modules.
// Run: node --test scripts/check-note-translate-provider.cjs
const assert = require('node:assert/strict');
const { beforeEach, afterEach, after, test } = require('node:test');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const ts = require('typescript'); // existing repository devDependency

// Transpile only the four leaf modules, without rewriting repository files.
// Unlike native type stripping this handles the existing extensionless/type imports.
const out = mkdtempSync(join(tmpdir(), 'primal-translate-'));
after(() => rmSync(out, { recursive: true, force: true }));
for (const name of ['noteTranslateProtect', 'noteTranslateSlots', 'noteTranslateSettings', 'noteTranslate']) {
  const fileName = resolve(__dirname, '../src/lib', `${name}.ts`);
  const { outputText, diagnostics } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
    fileName,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  // TS 5.2 preserves the explicit .ts import in noteTranslateSlots.
  writeFileSync(join(out, `${name}.js`), outputText.replace(/require\((['"])(\.\/[^'"]+)\.ts\1\)/g, 'require($1$2.js$1)'));
}

const settings = require(join(out, 'noteTranslateSettings.js'));
const { emptyNoteTranslatePrefs, parseNoteTranslatePrefs } = settings;
const prefs = (patch = {}) => ({ ...emptyNoteTranslatePrefs(), targetLanguage: 'en', ...patch });
const owned = (patch = {}) => prefs({ provider: 'libretranslate', libreTranslateUrl: 'https://translate.example.invalid', ...patch });
const entities = [
  'https://example.invalid/NTX001',
  'nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhsdf6d',
  '#nostr', '@alice', 'lightning:lnbc1example', 'cashuAeyJ0b2tlbiI6ImFiYyJ9',
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', '`inline code`', 'alice@example.invalid',
];
const source = `Hola mundo ${entities.join(' ')} y más texto.`;
const expected = `Hello world ${entities.join(' ')} and more text.`;
const globals = ['fetch', 'Translator', 'LanguageDetector', 'translation', 'ai'];
let saved, api, calls, respond;

beforeEach(() => {
  saved = new Map(globals.map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const k of globals) Object.defineProperty(globalThis, k, { configurable: true, writable: true, value: undefined });
  calls = [];
  respond = () => { throw new Error('Unexpected outbound request'); };
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return respond(String(url), init);
  };
  // New cache/detector instance per case; no false passes from earlier hits.
  const path = join(out, 'noteTranslate.js');
  delete require.cache[require.resolve(path)];
  api = require(path);
});
afterEach(() => {
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const errorReason = reason => error => error instanceof api.NoteTranslateError && error.failure.reason === reason;
const checkNoNetwork = async (p, reason, text = source) => {
  await assert.rejects(api.translateNoteText(text, { prefs: p }), errorReason(reason));
  assert.equal(calls.length, 0);
};
const transform = payload => {
  for (const entity of entities) assert.ok(!payload.includes(entity), `Unshielded entity: ${entity}`);
  return payload.replace('Hola mundo', 'Hello world').replace('y más texto.', 'and more text.')
    .replaceAll('⟦', '[ ').replaceAll('⟧', ' ]').replace(/PRIMALNTX/g, 'primalntx');
};
const assertTranslation = (result, provider) => {
  assert.deepEqual(result, { text: expected, sourceLanguage: 'es', targetLanguage: 'en', provider });
};

// The existing pure-helper checks remain untouched.
test('default/unknown persisted provider never silently selects a remote provider', async () => {
  const fallback = emptyNoteTranslatePrefs();
  assert.equal(fallback.provider, 'on_device');
  assert.equal(fallback.libreTranslateUrl, '');
  for (const raw of [null, '{broken', '{"provider":"unexpected","googleKey":"unused-fake"}']) {
    const p = parseNoteTranslatePrefs(raw);
    assert.equal(p.provider, 'on_device');
    await checkNoNetwork(p, 'on_device_unavailable');
  }
});
test('disabled translation never calls the configured provider', async () => {
  await checkNoNetwork(owned({ enabled: false }), 'disabled');
});
test('missing, malformed and non-HTTP LibreTranslate URLs fail closed', async () => {
  for (const [url, reason] of [['  ', 'missing_url'], ['not a url', 'invalid_url'], ['javascript:alert(1)', 'invalid_url']]) {
    await checkNoNetwork(owned({ libreTranslateUrl: url }), reason);
  }
});
test('missing DeepL and Google keys fail closed even with another provider configured', async () => {
  await checkNoNetwork(owned({ provider: 'deepl', deeplKey: ' ', googleKey: 'unused-fake' }), 'missing_key');
  await checkNoNetwork(owned({ provider: 'google', googleKey: '', deeplKey: 'unused-fake' }), 'missing_key');
});
test('token-only and short content never reaches remote provider', async () => {
  await checkNoNetwork(owned(), 'empty', entities.join(' '));
  await checkNoNetwork(owned(), 'empty', 'ok');
});
test('on-device uses detector/translator, not fetch; protects entities', async () => {
  const phases = [];
  globalThis.LanguageDetector = { create: async () => ({ detect: async payload => {
    for (const entity of entities) assert.ok(!payload.includes(entity));
    return [{ detectedLanguage: 'es', confidence: 0.99 }];
  } }) };
  globalThis.Translator = { create: async opts => {
    assert.equal(opts.sourceLanguage, 'es'); assert.equal(opts.targetLanguage, 'en');
    return { translate: async payload => transform(payload) };
  } };
  assertTranslation(await api.translateNoteText(source, { prefs: prefs(), onProgress: p => phases.push(p.phase) }), 'on_device');
  assert.deepEqual(phases, ['detect', 'translate']);
  assert.equal(calls.length, 0);
});
test('on-device detection of same target language does not translate or fall back', async () => {
  let creates = 0;
  globalThis.LanguageDetector = { create: async () => ({ detect: async () => [{ detectedLanguage: 'en', confidence: 1 }] }) };
  globalThis.Translator = { create: async () => { creates++; throw new Error('Unexpected translator'); } };
  await checkNoNetwork(prefs({ googleKey: 'unused-fake' }), 'same_language');
  assert.equal(creates, 0);
});
test('on-device translator rejection never falls back to configured remote services', async () => {
  globalThis.Translator = { create: async () => { throw new Error('mock unavailable'); } };
  await assert.rejects(api.translateNoteText(source, { prefs: owned({ provider: 'on_device', googleKey: 'unused-fake' }) }), /mock unavailable/);
  assert.equal(calls.length, 0);
});
test('owned LibreTranslate posts only shielded text and restores entities', async () => {
  const signal = new AbortController().signal;
  respond = (url, init) => {
    assert.equal(url, 'https://translate.example.invalid/translate');
    assert.equal(init.method, 'POST'); assert.equal(init.signal, signal);
    assert.equal(init.headers['Content-Type'], 'application/json');
    const body = JSON.parse(init.body);
    assert.deepEqual({ ...body, q: '<shielded>' }, { q: '<shielded>', source: 'auto', target: 'en', format: 'text', api_key: 'fake-lt' });
    return json({ translatedText: transform(body.q), detectedLanguage: 'es' });
  };
  assertTranslation(await api.translateNoteText(source, { prefs: owned({ libreTranslateKey: 'fake-lt' }), signal }), 'libretranslate');
  assert.equal(calls.length, 1);
});
for (const [label, key, host] of [['free', 'fake:fx', 'api-free.deepl.com'], ['paid', 'fake-paid', 'api.deepl.com']]) {
  test(`DeepL ${label} route is explicit and shielded (mock only)`, async () => {
    respond = (url, init) => {
      assert.equal(url, `https://${host}/v2/translate`);
      assert.equal(init.method, 'POST');
      assert.equal(init.headers.Authorization, `DeepL-Auth-Key ${key}`);
      const body = JSON.parse(init.body);
      assert.equal(body.target_lang, 'EN'); assert.equal(body.text.length, 1);
      return json({ translations: [{ text: transform(body.text[0]), detected_source_language: 'ES' }] });
    };
    assertTranslation(await api.translateNoteText(source, { prefs: prefs({ provider: 'deepl', deeplKey: key }) }), 'deepl');
    assert.equal(calls.length, 1);
  });
}
test('Google uses the official Cloud v2 route and shielded request (mock only)', async () => {
  respond = (url, init) => {
    assert.equal(url, 'https://translation.googleapis.com/language/translate/v2?key=fake%2Bkey');
    assert.equal(init.method, 'POST');
    const body = JSON.parse(init.body); assert.equal(body.target, 'en'); assert.equal(body.format, 'text');
    return json({ data: { translations: [{ translatedText: transform(body.q), detectedSourceLanguage: 'es' }] } });
  };
  assertTranslation(await api.translateNoteText(source, { prefs: prefs({ provider: 'google', googleKey: 'fake+key' }) }), 'google');
  assert.equal(calls.length, 1);
});
for (const [label, response] of [
  ['HTTP error', () => json({ error: 'mock failure' }, 503)],
  ['invalid JSON', () => new Response('not json')],
  ['empty translation', () => json({ translatedText: '  ' })],
  ['transport rejection', () => { throw new Error('mock network failure'); }],
]) {
  test(`${label}: no fallback and no cached failure`, async () => {
    const p = owned({ googleKey: 'unused-fake', deeplKey: 'unused-fake' });
    respond = response;
    const match = label === 'transport rejection' ? /mock network failure/ : errorReason('provider');
    await assert.rejects(api.translateNoteText(source, { prefs: p }), match);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://translate.example.invalid/translate');
    assert.equal(api.peekNoteTranslation(source, p), undefined);
    respond = (_url, init) => json({ translatedText: transform(JSON.parse(init.body).q), detectedLanguage: 'es' });
    assertTranslation(await api.translateNoteText(source, { prefs: p }), 'libretranslate');
    assert.equal(calls.length, 2);
  });
}
test('abort before request and during mocked response never caches incomplete data', async () => {
  const p = owned();
  const pre = new AbortController(); pre.abort();
  await assert.rejects(api.translateNoteText(source, { prefs: p, signal: pre.signal }), errorReason('aborted'));
  assert.equal(calls.length, 0);
  const pending = new AbortController();
  respond = (_url, init) => { pending.abort(); return json({ translatedText: transform(JSON.parse(init.body).q) }); };
  await assert.rejects(api.translateNoteText(source, { prefs: p, signal: pending.signal }), errorReason('aborted'));
  assert.equal(calls.length, 1); assert.equal(api.peekNoteTranslation(source, p), undefined);
});
test('cache reuses identical requests but separates content, target and endpoint', async () => {
  respond = (_url, init) => json({ translatedText: JSON.parse(init.body).q });
  const p = owned();
  const first = await api.translateNoteText(source, { prefs: p });
  assert.equal(await api.translateNoteText(source, { prefs: p }), first);
  assert.equal(api.peekNoteTranslation(source, p), first);
  assert.equal(calls.length, 1);
  await api.translateNoteText(`${source} extra`, { prefs: p });
  await api.translateNoteText(source, { prefs: owned({ targetLanguage: 'fr' }) });
  await api.translateNoteText(source, { prefs: owned({ libreTranslateUrl: 'https://other.example.invalid' }) });
  assert.equal(calls.length, 4);
});
test('cache is bounded to 64 entries', async () => {
  respond = (_url, init) => json({ translatedText: JSON.parse(init.body).q });
  const p = owned();
  for (let i = 0; i < 65; i++) await api.translateNoteText(`Spanish prose fixture number ${i}.`, { prefs: p });
  assert.equal(calls.length, 65);
  assert.equal(api.peekNoteTranslation('Spanish prose fixture number 0.', p), undefined);
  assert.ok(api.peekNoteTranslation('Spanish prose fixture number 64.', p));
});

// Explicit hardening checks: do not skip or silently weaken these assertions.
// They may fail at the reviewed head; fix production behavior only after approval.
test('hardening: invalid direct provider value must not select Google', async () => {
  const p = prefs({ provider: 'unexpected', googleKey: 'unused-fake' });
  respond = () => json({ data: { translations: [{ translatedText: 'Unexpected outbound translation' }] } });
  await assert.rejects(api.translateNoteText(source, { prefs: p }));
  assert.equal(calls.length, 0);
});
test('hardening: dropped protected placeholder must reject, not cache damaged text', async () => {
  const p = owned();
  respond = (_url, init) => json({ translatedText: JSON.parse(init.body).q.replace(/⟦[^⟧]+⟧/, '') });
  await assert.rejects(api.translateNoteText(source, { prefs: p }), errorReason('provider'));
  assert.equal(api.peekNoteTranslation(source, p), undefined);
});
test('hardening: empty on-device translation must reject, not cache empty text', async () => {
  globalThis.Translator = { create: async () => ({ translate: async () => '' }) };
  const p = prefs();
  await assert.rejects(api.translateNoteText(source, { prefs: p }), errorReason('provider'));
  assert.equal(api.peekNoteTranslation(source, p), undefined);
});
// Official LibreTranslate auto-detection response, not the compatible string variant.
// https://docs.libretranslate.com/guides/api_usage/#auto-detection-of-source-language
test('LibreTranslate documented auto-detection object must produce a source language', async () => {
  respond = (_url, init) => json({
    translatedText: transform(JSON.parse(init.body).q),
    detectedLanguage: { confidence: 99, language: 'es' },
  });
  assertTranslation(await api.translateNoteText(source, { prefs: owned() }), 'libretranslate');
  assert.equal(calls.length, 1);
});

// Additional integrity coverage for the proposed correction, not prior reviewer evidence.
for (const [label, corrupt] of [
  ['duplicated slot', payload => payload.replace(/⟦[^⟧]+⟧/, marker => `${marker} ${marker}`)],
  ['unknown slot', payload => payload.replace(/⟦([^:]+):\d+⟧/, '⟦$1:999⟧')],
  ['unrecognized extra marker', payload => payload + ' ⟦PRIMALNTX0:bad⟧'],
]) {
  test(`integrity: ${label} rejects before cache and allows a valid retry`, async () => {
    const p = owned();
    respond = (_url, init) => json({ translatedText: corrupt(JSON.parse(init.body).q) });
    await assert.rejects(api.translateNoteText(source, { prefs: p }), errorReason('provider'));
    assert.equal(api.peekNoteTranslation(source, p), undefined);
    respond = (_url, init) => json({ translatedText: transform(JSON.parse(init.body).q), detectedLanguage: 'es' });
    assertTranslation(await api.translateNoteText(source, { prefs: p }), 'libretranslate');
    assert.equal(calls.length, 2);
  });
}
test('integrity: reordered placeholders remain valid and repeated source entities remain distinct slots', async () => {
  const p = owned();
  const a = 'https://example.invalid/a'; const b = 'https://example.invalid/b';
  const original = `Hola mundo ${a} ${b} ${a}`;
  respond = (_url, init) => {
    const q = JSON.parse(init.body).q;
    const slots = q.match(/⟦[^⟧]+⟧/g);
    assert.equal(slots.length, 3);
    return json({ translatedText: `Hello world ${slots[1]} ${slots[2]} ${slots[0]}` });
  };
  const result = await api.translateNoteText(original, { prefs: p });
  assert.equal(result.text, `Hello world ${b} ${a} ${a}`);
});
for (const [label, value] of [['whitespace', '   '], ['non-string', null]]) {
  test(`on-device: ${label} response rejects before caching`, async () => {
    globalThis.Translator = { create: async () => ({ translate: async () => value }) };
    const p = prefs();
    await assert.rejects(api.translateNoteText(source, { prefs: p }), errorReason('provider'));
    assert.equal(api.peekNoteTranslation(source, p), undefined);
    assert.equal(calls.length, 0);
  });
}
test('unknown direct provider rejects with explicit reason even without Google credentials', async () => {
  await checkNoNetwork(prefs({ provider: 'unexpected' }), 'invalid_provider');
  await checkNoNetwork(prefs({ provider: 'unexpected', googleKey: 'unused-fake' }), 'invalid_provider');
});
for (const [label, metadata, expectedLanguage] of [
  ['snake-case object', { detected_language: { language: 'ES-MX', confidence: 99 } }, 'es'],
  ['absent', {}, undefined],
  ['malformed', { detectedLanguage: { language: 42 } }, undefined],
]) {
  test(`LibreTranslate: ${label} detection metadata does not break translated text`, async () => {
    respond = (_url, init) => json({ translatedText: transform(JSON.parse(init.body).q), ...metadata });
    const result = await api.translateNoteText(source, { prefs: owned() });
    assert.deepEqual(result, { text: expected, sourceLanguage: expectedLanguage, targetLanguage: 'en', provider: 'libretranslate' });
    assert.equal(calls.length, 1);
  });
}
