// Inline note translation (issue #133).
//
// Privacy first: the default engine is the browser's built-in, on-device
// Translator / LanguageDetector APIs, so note text never leaves the device
// and no API key or Primal backend is required. When the browser does not
// provide them, the Translate control is simply not shown.

const PROTECTED = [
  /nostr:[a-z0-9]+1[02-9ac-hj-np-z]+/gi, // nostr: references (npub, nevent, naddr, ...)
  /\b(?:npub|nprofile|note|nevent|naddr)1[02-9ac-hj-np-z]{20,}/gi,
  /\blnbc[0-9a-z]+/gi,                     // lightning invoices
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

export type NoteTranslation = { text: string, source: string, target: string };

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

// ---- On-device engine (Chrome 138+ built-in AI APIs) ----

const g = globalThis as any;

export const isTranslationSupported = () =>
  typeof g.Translator?.create === 'function' && typeof g.LanguageDetector?.create === 'function';

let detectorPromise: Promise<any> | undefined;
const detector = () => (detectorPromise ||= g.LanguageDetector.create());
const translators = new Map<string, Promise<any>>();

/** Detects the note language; returns undefined when unsure. Runs on device. */
export const detectLanguage = async (content: string): Promise<string | undefined> => {
  if (!isTranslationSupported()) return undefined;
  const prose = protectEntities(content).text.replace(placeholderRegex, ' ');
  const [best] = await (await detector()).detect(prose);
  if (!best || best.detectedLanguage === 'und' || best.confidence < 0.6) return undefined;
  return baseLanguage(best.detectedLanguage);
};

export const translateNote = async (content: string, targetTag: string): Promise<NoteTranslation> => {
  const target = baseLanguage(targetTag);
  const key = cacheKey(content, target);
  const hit = cacheGet(key);
  if (hit) return hit;

  const source = await detectLanguage(content);
  if (!source) throw new Error('language-unknown');
  if (source === target) return { text: content, source, target };

  const pair = `${source}>${target}`;
  if (!translators.has(pair)) {
    const t = g.Translator.create({ sourceLanguage: source, targetLanguage: target });
    t.catch(() => translators.delete(pair));
    translators.set(pair, t);
  }
  const translator = await translators.get(pair);

  const { text, tokens } = protectEntities(content);
  // Translate line by line so paragraph breaks survive unchanged.
  const lines = await Promise.all(
    text.split('\n').map(line => line.trim() ? translator.translate(line) : line),
  );
  const result = { text: restoreEntities(lines.join('\n'), tokens), source, target };
  cachePut(key, result);
  return result;
};
