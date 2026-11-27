// Run via the repository's existing Vite/Solid toolchain. No test framework added.
import { render } from 'solid-js/web';
import { MemoryRouter, Route } from '@solidjs/router';
import { IntlProvider } from '@cookbook/solid-intl';
import NoteTranslate, { triggerNoteTranslate } from '../../src/components/NoteTranslate/NoteTranslate';
import { emptyNoteTranslatePrefs, NOTE_TRANSLATE_STORAGE_KEY } from '../../src/lib/noteTranslateSettings';
import type { NoteTranslatePrefs } from '../../src/lib/noteTranslateSettings';

type FixtureNote = Parameters<typeof NoteTranslate>[0]['note'];
type RequestMock = (url: string, init?: RequestInit) => Response | Promise<Response>;
const output = document.querySelector<HTMLPreElement>('#results')!;
const root = document.querySelector<HTMLDivElement>('#fixture')!;
const key = NOTE_TRANSLATE_STORAGE_KEY;
const priorPrefs = localStorage.getItem(key);
const names = ['fetch', 'Translator', 'LanguageDetector', 'translation', 'ai'];
const priorGlobals = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
const setGlobal = (name: string, value: unknown) => Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
const endpoint = 'https://owned-translate.example.invalid/translate';
const prefs = (patch: Partial<NoteTranslatePrefs> = {}): NoteTranslatePrefs => ({ ...emptyNoteTranslatePrefs(), targetLanguage: 'en', ...patch });
const owned = (patch: Partial<NoteTranslatePrefs> = {}) => prefs({ provider: 'libretranslate', libreTranslateUrl: 'https://owned-translate.example.invalid', ...patch });
const entity = 'https://example.invalid/NTX001';
const assert: (ok: unknown, message: string) => asserts ok = (ok, message) => { if (!ok) throw new Error(message); };
const equal = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
};
const waitFor = async (predicate: () => boolean, message: string) => {
  const deadline = performance.now() + 3000;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error(message);
    await new Promise<void>(resolve => setTimeout(resolve, 15));
  }
};
const findButton = (label: string) => Array.from(root.querySelectorAll('button')).find(b => b.textContent?.trim() === label);
const click = (label: string) => {
  const button = findButton(label);
  if (!button) throw new Error(`Missing button: ${label}`);
  button.click();
};
const visible = () => root.querySelector('[data-testid="note-content"]')?.textContent;
const text = () => root.textContent || '';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const translatedResponse: RequestMock = (url, init) => {
  equal(url, endpoint, 'explicit endpoint only');
  equal(init?.method, 'POST', 'request method');
  const body = JSON.parse(String(init?.body));
  assert(!body.q.includes(entity), 'URL reached provider unshielded');
  assert(!body.q.includes('#nostr'), 'hashtag reached provider unshielded');
  assert(!body.q.includes('@alice'), 'mention reached provider unshielded');
  equal(body.target, 'en', 'target language');
  return json({ translatedText: body.q.replace('Hola mundo', 'Hello world'), detectedLanguage: 'es' });
};
let requests: string[] = [];
let navClicks = 0;
let dispose: (() => void) | undefined;
let source = '';
let note: FixtureNote;
const mockFetch = (responder: RequestMock) => setGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input);
  requests.push(url);
  // No fallback to the original fetch, even if an assertion fails.
  equal(url, endpoint, 'unexpected outbound request');
  return responder(url, init);
});
const mount = (id: string, p: NoteTranslatePrefs, responder: RequestMock = translatedResponse) => {
  requests = []; navClicks = 0;
  for (const name of names.slice(1)) setGlobal(name, undefined);
  mockFetch(responder);
  localStorage.setItem(key, JSON.stringify(p));
  source = `Hola mundo ${id} ${entity} #nostr @alice`;
  note = { id, content: source, post: { id, content: source }, msg: { content: source } } as unknown as FixtureNote;
  const View = () => (
    <div onClick={() => navClicks++}>
      <NoteTranslate note={note} render={n => (
        <div data-testid="note-content" data-post={n.post.content} data-msg={n.msg.content}>{n.content}</div>
      )} />
    </div>
  );
  dispose = render(() => (
    <IntlProvider locale="en" messages={{}}>
      <MemoryRouter><Route path="/" component={View} /></MemoryRouter>
    </IntlProvider>
  ), root);
};
const checkDisplayed = (value: string) => {
  equal(visible(), value, 'displayed note content');
  const node = root.querySelector('[data-testid="note-content"]');
  equal(node?.getAttribute('data-post'), value, 'displayed post content');
  equal(node?.getAttribute('data-msg'), value, 'displayed message content');
  equal(note.content, source, 'source note not mutated');
  equal(note.post.content, source, 'source post not mutated');
  equal(note.msg.content, source, 'source msg not mutated');
};
const settingsLink = () => root.querySelector('a[href="/settings/translation"]');
let passed = 0, failed = 0;
const runCase = async (label: string, fn: () => Promise<void>) => {
  try {
    await fn();
    output.textContent += `PASS ${label}\n`;
    passed++;
  } catch (error) {
    output.textContent += `FAIL ${label}: ${String(error)}\n`;
    failed++;
  } finally {
    dispose?.(); dispose = undefined;
    root.replaceChildren();
  }
};

async function run() {
  try {
    await runCase('explicit Translate, busy state, source label, Show original, cached re-show', async () => {
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      mount('success', owned(), async (url, init) => { await gate; return translatedResponse(url, init); });
      await waitFor(() => Boolean(findButton('Translate to English')), 'Translate control absent');
      checkDisplayed(source); equal(requests.length, 0, 'no provider request on mount');
      click('Translate to English');
      await waitFor(() => requests.length === 1 && text().includes('Translating'), 'missing busy state/request');
      checkDisplayed(source);
      release();
      await waitFor(() => Boolean(findButton('Show original')), 'translation never displayed');
      const translated = source.replace('Hola mundo', 'Hello world');
      checkDisplayed(translated);
      assert(text().includes('Translated from'), 'source language label absent');
      click('Show original'); checkDisplayed(source);
      click('Translate to English'); checkDisplayed(translated);
      equal(requests.length, 1, 'toggle must reuse cached translation');
      equal(navClicks, 0, 'translation controls must not navigate parent note');
    });
    await runCase('provider failure leaves original and enables retry without fallback', async () => {
      let fail = true;
      mount('failure', owned({ googleKey: 'unused-fake', deeplKey: 'unused-fake' }), (url, init) => {
        if (fail) return json({ error: 'mock outage' }, 503);
        return translatedResponse(url, init);
      });
      await waitFor(() => Boolean(findButton('Translate to English')), 'Translate control absent');
      click('Translate to English');
      await waitFor(() => text().includes('Translation failed.'), 'provider failure not shown');
      checkDisplayed(source); assert(settingsLink(), 'settings link absent');
      equal(requests.length, 1, 'failure must not call fallback');
      fail = false; click('Translate to English');
      await waitFor(() => Boolean(findButton('Show original')), 'retry did not succeed');
      checkDisplayed(source.replace('Hola mundo', 'Hello world'));
      equal(requests.length, 2, 'exactly one retry');
    });
    for (const [id, p, message] of [
      ['missing-url', owned({ libreTranslateUrl: '' }), 'Add your LibreTranslate URL'],
      ['bad-url', owned({ libreTranslateUrl: 'javascript:alert(1)' }), 'not a valid http(s) address'],
      ['missing-deepl', prefs({ provider: 'deepl' }), 'needs your own API key'],
      ['missing-google', prefs({ provider: 'google' }), 'needs your own API key'],
      ['no-device', prefs(), 'On-device translation is not available'],
    ] as const) {
      await runCase(`${id}: no network; configuration error and original remain`, async () => {
        mount(id, p);
        await waitFor(() => Boolean(findButton('Translate to English')), 'Translate control absent');
        click('Translate to English');
        await waitFor(() => text().includes(message), 'configuration error not displayed');
        checkDisplayed(source); assert(settingsLink(), 'settings link absent');
        equal(requests.length, 0, 'must fail closed without network');
      });
    }
    await runCase('context-menu bus toggles the same inline note without repeat requests', async () => {
      mount('menu', owned());
      await waitFor(() => Boolean(findButton('Translate to English')), 'Translate control absent');
      triggerNoteTranslate('menu');
      await waitFor(() => Boolean(findButton('Show original')), 'bus did not start translation');
      checkDisplayed(source.replace('Hola mundo', 'Hello world'));
      triggerNoteTranslate('menu'); checkDisplayed(source);
      triggerNoteTranslate('menu'); checkDisplayed(source.replace('Hola mundo', 'Hello world'));
      equal(requests.length, 1, 'bus toggle must reuse translation');
    });
    await runCase('disabled feature does not render Translate or send text', async () => {
      mount('disabled', owned({ enabled: false }));
      await waitFor(() => visible() === source, 'original note not rendered');
      checkDisplayed(source); assert(!findButton('Translate to English'), 'disabled control still visible');
      equal(requests.length, 0, 'disabled feature made provider request');
    });
    // Contract-specific case: real LibreTranslate uses a language-detection object.
    await runCase('documented LibreTranslate auto-detection object renders successful translation', async () => {
      mount('documented-response', owned(), async (url, init) => {
        const body = await (await translatedResponse(url, init)).json();
        return json({ ...body, detectedLanguage: { language: 'es', confidence: 99 } });
      });
      await waitFor(() => Boolean(findButton('Translate to English')), 'Translate control absent');
      click('Translate to English');
      await waitFor(() => Boolean(findButton('Show original')) || text().includes('Translation failed.'), 'response did not settle');
      checkDisplayed(source.replace('Hola mundo', 'Hello world'));
      assert(Boolean(findButton('Show original')), 'success toggle absent');
    });
  } finally {
    dispose?.();
    if (priorPrefs === null) localStorage.removeItem(key); else localStorage.setItem(key, priorPrefs);
    for (const [name, descriptor] of priorGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    output.textContent += `\n${passed} passed; ${failed} failed\n`;
    output.dataset.status = failed ? 'fail' : 'pass';
    document.title = `Note translation: ${failed ? 'FAIL' : 'PASS'}`;
  }
}
void run().catch(error => {
  output.textContent += `HARNESS ERROR: ${String(error)}\n`;
  output.dataset.status = 'fail';
  document.title = 'Note translation: FAIL';
});
