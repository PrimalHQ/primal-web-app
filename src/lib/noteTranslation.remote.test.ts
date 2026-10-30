// Run with the same esbuild + node --test command as noteTranslation.test.ts.
// Simulates Safari/Firefox: no on-device APIs, a configured LibreTranslate-compatible service.
import test from 'node:test';
import assert from 'node:assert/strict';
import { translateNote, isTranslationSupported, saveRemote, hasOnDevice } from './noteTranslation';

const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) };

test('remote fallback: entities never sent, restored, deduped, cached', async () => {
  assert.equal(hasOnDevice(), false);
  assert.equal(isTranslationSupported(), false);
  saveRemote({ url: 'https://lt.example.com/translate', apiKey: 'k' });
  assert.equal(isTranslationSupported(), true);

  const bodies: any[] = [];
  (globalThis as any).fetch = async (url: string, init: any) => {
    assert.equal(url, 'https://lt.example.com/translate');
    const body = JSON.parse(init.body);
    bodies.push(body);
    await new Promise(r => setTimeout(r, 5));
    return { ok: true, json: async () => ({ translatedText: body.q.replace('Hola', 'Hello'), detectedLanguage: { language: 'es', confidence: 90 } }) };
  };
  const note = 'Hola nostr:npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m lnbc10u1pjabc';
  const [a, b] = await Promise.all([translateNote(note, 'en-US'), translateNote(note, 'en')]);
  assert.equal(bodies.length, 1, 'concurrent requests deduplicated');
  assert.equal(bodies[0].source, 'auto');
  assert.equal(bodies[0].api_key, 'k');
  assert.ok(!bodies[0].q.includes('npub1') && !bodies[0].q.includes('lnbc'));
  assert.equal(a.text, note.replace('Hola', 'Hello'));
  assert.equal(a.source, 'es');
  assert.equal(a.engine, 'remote');
  assert.deepEqual(a, b);
  await translateNote(note, 'en');
  assert.equal(bodies.length, 1, 'cached');
});

test('remote reports same language: original kept', async () => {
  (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({ translatedText: 'x', detectedLanguage: { language: 'en' } }) });
  const r = await translateNote('Plain English words here', 'en');
  assert.equal(r.text, 'Plain English words here');
  assert.equal(r.source, 'en');
});

test('remote failure surfaces an error (graceful UI)', async () => {
  (globalThis as any).fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(translateNote('Bonjour tout le monde', 'en'), /remote-503/);
});

test('rejects non-https services', async () => {
  saveRemote({ url: 'http://insecure.example.com', apiKey: '' });
  assert.equal(isTranslationSupported(), false);
});
