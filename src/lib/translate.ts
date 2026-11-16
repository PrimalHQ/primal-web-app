// Note translation service.
//
// Translates note content into the user's language using the keyless
// Google Translate endpoint (the same `gtx` client endpoint used by
// Google Translate itself). No API key and no backend are required.
//
// Before anything is sent to the translation service, Nostr entities
// (nostr: URIs, bech32 identifiers, URLs, hashtags, lightning invoices
// and Cashu tokens) are swapped out for placeholders and restored
// afterwards, so they are never mangled by the translation.
//
// Results are cached in-memory, keyed by a hash of the content and the
// target language, so re-rendering a note never re-fetches its
// translation.

export type NoteTranslation = {
  text: string,
  detectedLanguage: string,
  targetLanguage: string,
};

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

// The endpoint rejects overly long requests, so content is translated
// in chunks no longer than this.
const MAX_CHUNK_LENGTH = 1000;

const MAX_CACHE_ENTRIES = 200;

const REQUEST_TIMEOUT = 15_000;

const translationCache = new Map<string, NoteTranslation>();

// Entities that must survive translation verbatim. Order matters:
// longer, more specific patterns come first.
const entityRegex = new RegExp([
  'nostr:(?:npub|note|nevent|naddr|nprofile|nrelay)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+',
  'https?:\\/\\/[^\\s]+',
  '(?:npub|note|nevent|naddr|nprofile)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+',
  'ln(?:bc|tb|url)[0-9a-zA-Z]+',
  'cashu[AB][0-9a-zA-Z+/=_\\-]+',
  '#[^\\s#]+',
].join('|'), 'gi');

const placeholderFor = (index: number) => `__P${index}__`;

// Tolerates whitespace the translation service may insert into a
// placeholder while translating the surrounding text.
const placeholderRegex = /__\s*P\s*(\d+)\s*__/gi;

export const protectEntities = (content: string) => {
  const entities: string[] = [];

  const text = content.replace(entityRegex, (match) => {
    entities.push(match);
    return placeholderFor(entities.length - 1);
  });

  return { text, entities };
};

export const restoreEntities = (text: string, entities: string[]) => {
  return text.replace(placeholderRegex, (match, index) => {
    const entity = entities[parseInt(index, 10)];
    return entity === undefined ? match : entity;
  });
};

// Language codes the translation endpoint expects, keyed by the
// primary subtag used by browsers and the app's locale settings.
const languageAliases: Record<string, string> = {
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  'zh-hk': 'zh-TW',
  'nb': 'no',
  'nn': 'no',
};

export const normalizeLanguageCode = (locale: string | undefined | null): string => {
  if (!locale) return 'en';

  const cleaned = locale.trim().toLowerCase().replace(/_/g, '-');

  if (languageAliases[cleaned]) return languageAliases[cleaned];

  return cleaned.split('-')[0] || 'en';
};

export const languageName = (code: string, uiLocale?: string): string => {
  try {
    const display = new Intl.DisplayNames([uiLocale || 'en'], { type: 'language' });
    return display.of(code) || code;
  } catch (e) {
    return code;
  }
};

// FNV-1a hash, used to key the translation cache by content.
const hashContent = (content: string): string => {
  let hash = 0x811c9dc5;

  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16);
};

const cacheKey = (content: string, targetLanguage: string) =>
  `${targetLanguage}:${content.length}:${hashContent(content)}`;

export const getCachedTranslation = (content: string, targetLanguage: string) => {
  return translationCache.get(cacheKey(content, targetLanguage));
};

const cacheTranslation = (content: string, translation: NoteTranslation) => {
  const key = cacheKey(content, translation.targetLanguage);

  if (!translationCache.has(key) && translationCache.size >= MAX_CACHE_ENTRIES) {
    // Evict the oldest entry to keep the cache bounded.
    const oldest = translationCache.keys().next().value;
    if (oldest) translationCache.delete(oldest);
  }

  translationCache.set(key, translation);
};

// Split text into chunks of at most `maxLength` characters, preferring
// paragraph, then sentence, then word boundaries.
const chunkText = (text: string, maxLength: number): string[] => {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let current = '';

  const pushCurrent = (keepBreak = false) => {
    if (current.length > 0) {
      // Translated chunks are rejoined without a separator, so keep
      // the paragraph break at the end of the chunk being pushed.
      chunks.push(keepBreak && !current.endsWith('\n') ? `${current}\n` : current);
      current = '';
    }
  };

  for (const paragraph of text.split('\n')) {
    const candidate = current.length === 0 ? paragraph : `${current}\n${paragraph}`;

    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    pushCurrent(true);

    if (paragraph.length <= maxLength) {
      current = paragraph;
      continue;
    }

    // Paragraph alone is too long, split it into sentences.
    const sentences = paragraph.match(/[^.!?…]+[.!?…]*\s*/g) || [paragraph];

    for (const sentence of sentences) {
      const next = current + sentence;

      if (next.length <= maxLength) {
        current = next;
        continue;
      }

      pushCurrent();

      if (sentence.length <= maxLength) {
        current = sentence;
        continue;
      }

      // A single sentence is still too long, split it at word boundaries.
      let rest = sentence;
      while (rest.length > maxLength) {
        let cut = rest.lastIndexOf(' ', maxLength);
        if (cut <= 0) cut = maxLength;
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      current = rest;
    }
  }

  pushCurrent();

  return chunks.filter((chunk) => chunk.length > 0);
};

const translateChunkOnce = async (text: string, targetLanguage: string) => {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: targetLanguage,
    dt: 't',
    q: text,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${TRANSLATE_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Translation request failed: ${response.status}`);
      (error as { status?: number }).status = response.status;
      throw error;
    }

    const data = await response.json();

    const segments = (data?.[0] || []) as [string, string][];
    const translated = segments.map((segment) => segment[0] || '').join('');
    const detectedLanguage = normalizeLanguageCode(data?.[2] as string | undefined);

    return { translated, detectedLanguage };
  } finally {
    clearTimeout(timeout);
  }
};

const translateChunk = async (text: string, targetLanguage: string) => {
  try {
    return await translateChunkOnce(text, targetLanguage);
  } catch (e) {
    const status = (e as { status?: number }).status;

    // Retry once on transient rate limiting or server errors.
    if (status !== 429 && !(status && status >= 500)) throw e;

    await new Promise((resolve) => setTimeout(resolve, 800));
    return translateChunkOnce(text, targetLanguage);
  }
};

export const translateText = async (content: string, targetLanguage: string): Promise<NoteTranslation> => {
  const target = normalizeLanguageCode(targetLanguage);

  const cached = getCachedTranslation(content, target);
  if (cached) return cached;

  const { text, entities } = protectEntities(content);

  const chunks = chunkText(text, MAX_CHUNK_LENGTH);

  let detectedLanguage = target;
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    const { translated, detectedLanguage: detected } = await translateChunk(chunk, target);
    detectedLanguage = detected;
    translatedChunks.push(translated);
  }

  const translation: NoteTranslation = {
    text: restoreEntities(translatedChunks.join(''), entities),
    detectedLanguage,
    targetLanguage: target,
  };

  cacheTranslation(content, translation);

  return translation;
};
