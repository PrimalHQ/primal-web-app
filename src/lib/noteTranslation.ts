// Inline note translation (issue #133).
//
// Privacy first: the default engine is the browser's built-in, on-device
// Translator / LanguageDetector APIs, so note text never leaves the device
// and no API key or Primal backend is required. Browsers without those APIs
// (Safari on Mac/iPhone/iPad, Firefox) fall back to an optional,
// LibreTranslate-compatible service the reader configures in
// Settings > Translation. With neither available the control is hidden.

const PROTECTED = [
  /nostr:[a-z0-9]+1[02-9ac-hj-np-z]+/gi, // nostr: references (npub, nevent, naddr, ...)
  /\b(?:npub|nprofile|note|nevent|naddr)1[02-9ac-hj-np-z]{20,}/gi,
  /\blightning:[^\s]+/gi,                  // lightning: URIs
  /\b(?:lnbc|lntb|lno1|lni1|lnurl1)[0-9a-z]+/gi, // invoices, offers, lnurls
  /\bcashu[A-Za-z0-9_-]{8,}/g,              // ecash tokens
  /\bbc1[02-9ac-hj-np-z]{20,}/gi,          // bitcoin addresses
  /https?:\/\/[^\s]+/gi,                   // links and media
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,             // nip-05 / lightning addresses
  /(?:^|(?<=\s))#[^\s#]+/g,                // hashtags
  /:[a-z0-9_+-]+:/gi,                      // custom emoji shortcodes
];

// Placeholders use characters that translators leave alone and that cannot
// appear in a normal note, so restoring them is a single, unambiguous pass.
const OPEN = '\u27E6';
const CLOSE = '\u27E7';
const placeholderRegex = new RegExp(`${OPEN}\\s*(\\d+)\\s*${CLOSE}`, 'g');

export type ProtectedText = { text: string, tokens: string[] };

export const protectEntities = (content: string): ProtectedText => {
  const tokens: string[] = [];
  let text = content;
  for (const re of PROTECTED) {
    text = text.replace(re, (match) => {
      if (match.includes(OPEN) || match.includes(CLOSE)) return match;
      tokens.push(match);
      return `${OPEN}${tokens.length - 1}${CLOSE}`;
    });
  }
  return { text, tokens };
};

export const restoreEntities = (translated: string, tokens: string[]): string =>
  translated.replace(placeholderRegex, (match, i) => tokens[Number(i)] ?? match);

// True when there is real prose to translate (not just links/mentions/emoji).
export const hasTranslatableText = (content: string) =>
  /\p{L}{2,}/u.test(protectEntities(content).text.replace(placeholderRegex, ''));

export const baseLanguage = (tag: string | undefined) =>
  (tag || 'en').toLowerCase().split(/[-_]/)[0];

// ---- Bounded in-memory cache, keyed on target language + content ----

const MAX_CACHE = 300;
const cache = new Map<string, NoteTranslation>();

export type NoteTranslation = { text: string, source: string, target: string, engine?: 'device' | 'remote' };

export const cacheKey = (content: string, target: string) => `${target}\u0000${content}`;

export const cacheGet = (key: string) => {
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); }
  return hit;
};

export const cachePut = (key: string, value: NoteTranslation) => {
  cache.set(key, value);
  while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string);
};

// ---- Engines ----

const g = globalThis as any;

/** Chrome/Edge 138+ built-in on-device translation. */
export const hasOnDevice = () =>
  typeof g.Translator?.create === 'function' && typeof g.LanguageDetector?.create === 'function';

export type RemoteSettings = { url: string, apiKey: string };
const SETTINGS_KEY = 'primalNoteTranslation';

export const normalizeUrl = (url: string) =>
  url.trim().replace(/\/+$/, '').replace(/\/translate$/, '');

export const loadRemote = (): RemoteSettings => {
  try {
    const raw = JSON.parse(g.localStorage?.getItem(SETTINGS_KEY) || '{}');
    return { url: normalizeUrl(raw.url || ''), apiKey: raw.apiKey || '' };
  } catch { return { url: '', apiKey: '' }; }
};

export const saveRemote = (settings: RemoteSettings) =>
  g.localStorage?.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, url: normalizeUrl(settings.url) }));

export const hasRemote = () => /^https:\/\//i.test(loadRemote().url);

export const isTranslationSupported = () => hasOnDevice() || hasRemote();

let detectorPromise: Promise<any> | undefined;
const detector = () => (detectorPromise ||= g.LanguageDetector.create());
const translators = new Map<string, Promise<any>>();

/**
 * Detects the note language; returns undefined when unsure or when only the
 * remote engine is available (it detects as part of translating).
 */
export const detectLanguage = async (content: string): Promise<string | undefined> => {
  if (!hasOnDevice()) return undefined;
  const prose = protectEntities(content).text.replace(placeholderRegex, ' ');
  const [best] = await (await detector()).detect(prose);
  if (!best || best.detectedLanguage === 'und' || best.confidence < 0.6) return undefined;
  return baseLanguage(best.detectedLanguage);
};

/**
 * Cheap, device-independent guess used to decide whether to offer Translate
 * when no on-device detector exists: true when the note's prose is mostly in
 * a script the reader's language does not use (e.g. Japanese for an English
 * reader), or when the reader's language is non-Latin and the note is Latin.
 */
const SCRIPTS: [RegExp, string[]][] = [
  [/\p{Script=Latin}/u, ['en','es','fr','de','pt','it','nl','pl','tr','sv','da','no','nb','fi','cs','ro','hu','id','vi','sk','sl','hr','et','lv','lt','ca','eu','gl','ga','sq','ms','tl','sw','af']],
  [/\p{Script=Cyrillic}/u, ['ru','uk','bg','sr','mk','be','kk']],
  [/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u, ['zh','ja']],
  [/\p{Script=Hangul}/u, ['ko']],
  [/\p{Script=Arabic}/u, ['ar','fa','ur']],
  [/\p{Script=Hebrew}/u, ['he']],
  [/\p{Script=Greek}/u, ['el']],
  [/\p{Script=Thai}/u, ['th']],
  [/\p{Script=Devanagari}/u, ['hi','mr','ne']],
];

export const likelyForeign = (content: string, target: string) => {
  const prose = protectEntities(content).text.replace(placeholderRegex, ' ');
  const letters = [...prose].filter(c => /\p{L}/u.test(c));
  if (letters.length < 2) return false;
  const own = SCRIPTS.filter(([, langs]) => langs.includes(baseLanguage(target))).map(([re]) => re);
  if (own.length === 0) return true;
  const inOwn = letters.filter(c => own.some(re => re.test(c))).length;
  if (inOwn / letters.length < 0.5) return true;
  // Same script: a short common-word check filters out notes already in the
  // reader's language for the most common Latin-script languages.
  const words = STOPWORDS[baseLanguage(target)];
  if (!words) return true;
  const tokens = prose.toLowerCase().split(/[^\p{L}']+/u).filter(Boolean);
  const hits = tokens.filter(w => words.has(w)).length;
  return hits < Math.max(1, Math.round(tokens.length * 0.12));
};

const STOPWORDS: Record<string, Set<string>> = Object.fromEntries(Object.entries({
  en: 'the and is are you to of in it that this for with on not be have was what just my your i we they',
  es: 'el la los las que de y en es un una por para con no lo se mi su pero muy',
  fr: 'le la les des que et est un une pour pas dans je vous il elle ce sur avec',
  de: 'der die das und ist nicht ich du ein eine zu mit auf den es sie wir',
  pt: 'o a os as que de e é um uma para não com em do da eu você',
  it: 'il la che di e è un una per non con sono ho mi gli le',
  nl: 'de het een en is van ik je niet dat op te met zijn',
}).map(([k, v]) => [k, new Set(v.split(' '))]));

const fetchWithTimeout = async (url: string, init: RequestInit, ms = 15000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await g.fetch(url, { ...init, signal: ctrl.signal }); }
  finally { clearTimeout(timer); }
};

/** LibreTranslate-compatible POST /translate with source "auto". */
const translateRemote = async (text: string, target: string) => {
  const { url, apiKey } = loadRemote();
  if (!/^https:\/\//i.test(url)) throw new Error('no-remote');
  const res = await fetchWithTimeout(`${url}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'auto', target, format: 'text', ...(apiKey ? { api_key: apiKey } : {}) }),
  });
  if (!res.ok) throw new Error(`remote-${res.status}`);
  const data = await res.json();
  if (typeof data?.translatedText !== 'string') throw new Error('remote-bad-response');
  return {
    text: data.translatedText as string,
    source: baseLanguage(data.detectedLanguage?.language || 'und'),
  };
};

const translateOnDevice = async (text: string, source: string, target: string) => {
  const pair = `${source}>${target}`;
  if (!translators.has(pair)) {
    const t = g.Translator.create({ sourceLanguage: source, targetLanguage: target });
    t.catch(() => translators.delete(pair));
    translators.set(pair, t);
  }
  const translator = await translators.get(pair);
  // Translate line by line so paragraph breaks survive unchanged.
  const lines = await Promise.all(
    text.split('\n').map(line => line.trim() ? translator.translate(line) : line),
  );
  return lines.join('\n');
};

const inflight = new Map<string, Promise<NoteTranslation>>();

export const translateNote = (content: string, targetTag: string): Promise<NoteTranslation> => {
  const target = baseLanguage(targetTag);
  const key = cacheKey(content, target);
  const hit = cacheGet(key);
  if (hit) return Promise.resolve(hit);
  // De-duplicate: the same note rendered twice (feed + thread) shares one request.
  const running = inflight.get(key);
  if (running) return running;

  const job = (async () => {
    const { text, tokens } = protectEntities(content);
    let result: NoteTranslation | undefined;

    if (hasOnDevice()) {
      try {
        const source = await detectLanguage(content);
        if (source === target) return { text: content, source, target };
        if (source) {
          result = { text: restoreEntities(await translateOnDevice(text, source, target), tokens), source, target, engine: 'device' };
        }
      } catch { /* fall through to remote, if configured */ }
    }

    if (!result) {
      if (!hasRemote()) throw new Error(hasOnDevice() ? 'language-unknown' : 'unsupported');
      const remote = await translateRemote(text, target);
      if (remote.source === target) return { text: content, source: remote.source, target };
      result = { text: restoreEntities(remote.text, tokens), source: remote.source, target, engine: 'remote' };
    }

    cachePut(key, result);
    return result;
  })();

  inflight.set(key, job);
  job.finally(() => inflight.delete(key)).catch(() => {});
  return job;
};
