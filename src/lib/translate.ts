import { getLang } from '../utils';

export type TranslateResult = {
  translatedText: string;
  detectedSourceLanguage?: string;
  provider: 'google-gtx' | 'mymemory';
};

const GOOGLE_ENDPOINT = 'https://clients5.google.com/translate_a/t';
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';

/** Max chars per Google GET request to stay under typical URL length limits. */
const CHUNK_SIZE = 4500;

/**
 * Resolve the language to translate posts into.
 * Prefer Settings.locale when present, otherwise browser locale via getLang().
 */
export const resolveTargetLanguage = (settingsLocale?: string): string => {
  const raw = (settingsLocale && settingsLocale.trim()) || getLang() || 'en';
  return normalizeLangCode(raw);
};

export const normalizeLangCode = (locale: string): string => {
  const primary = locale.trim().toLowerCase().replace('_', '-').split('-')[0];
  // Google / MyMemory expect ISO 639-1 (zh-CN special-cased below)
  if (locale.toLowerCase().startsWith('zh-tw') || locale.toLowerCase().startsWith('zh-hk')) {
    return 'zh-TW';
  }
  if (primary === 'zh') {
    return 'zh-CN';
  }
  return primary || 'en';
};

const parseGoogleResponse = (data: unknown): { text: string; source?: string } => {
  // Typical: [["Ciao","en"]] or [["part1","en"],["part2","en"]] for some clients
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Unexpected translation response');
  }

  const first = data[0];

  if (typeof first === 'string') {
    return { text: data.map(String).join(''), source: undefined };
  }

  if (Array.isArray(first)) {
    // [["translated","src"]]
    if (typeof first[0] === 'string') {
      const chunks = data as Array<[string, string?]>;
      const text = chunks.map((c) => (Array.isArray(c) ? c[0] : '')).join('');
      const source = typeof first[1] === 'string' ? first[1] : undefined;
      return { text, source };
    }
  }

  throw new Error('Unexpected translation response shape');
};

const translateChunkGoogle = async (
  text: string,
  targetLang: string,
): Promise<{ text: string; source?: string }> => {
  const url = new URL(GOOGLE_ENDPOINT);
  url.searchParams.set('client', 'dict-chrome-ex');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', targetLang);
  url.searchParams.set('q', text);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google translate HTTP ${res.status}`);
  }

  const data = await res.json();
  return parseGoogleResponse(data);
};

const translateMyMemory = async (
  text: string,
  targetLang: string,
): Promise<TranslateResult> => {
  // Free tier: keep under ~500 chars per request
  const piece = text.slice(0, 500);
  const url = new URL(MYMEMORY_ENDPOINT);
  url.searchParams.set('q', piece);
  url.searchParams.set('langpair', `autodetect|${targetLang}`);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`MyMemory HTTP ${res.status}`);
  }

  const data = await res.json();
  const translated = data?.responseData?.translatedText as string | undefined;
  const status = Number(data?.responseStatus);

  if (!translated || status === 429 || /MYMEMORY WARNING/i.test(translated)) {
    throw new Error(translated || 'MyMemory quota exceeded');
  }

  return {
    translatedText: translated,
    detectedSourceLanguage: data?.responseData?.detectedLanguage,
    provider: 'mymemory',
  };
};

const chunkText = (text: string, size: number): string[] => {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= size) {
      chunks.push(remaining);
      break;
    }
    // Prefer splitting on whitespace near the limit
    let cut = remaining.lastIndexOf(' ', size);
    if (cut < size * 0.5) cut = size;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  return chunks;
};

/**
 * Translate plain text to the target language.
 * Primary: unofficial Google Translate endpoint used by Chrome (no API key).
 * Fallback: MyMemory free public API (rate-limited, shorter texts).
 *
 * Note: unofficial Google endpoints can break without notice; production apps
 * should eventually use an official API with a server-side key.
 */
export const translateText = async (
  text: string,
  targetLang: string,
): Promise<TranslateResult> => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Nothing to translate');
  }

  const target = normalizeLangCode(targetLang);

  try {
    const chunks = chunkText(trimmed, CHUNK_SIZE);
    const parts: string[] = [];
    let source: string | undefined;

    for (const chunk of chunks) {
      const result = await translateChunkGoogle(chunk, target);
      parts.push(result.text);
      if (!source && result.source) source = result.source;
    }

    return {
      translatedText: parts.join(' '),
      detectedSourceLanguage: source,
      provider: 'google-gtx',
    };
  } catch (primaryError) {
    try {
      return await translateMyMemory(trimmed, target);
    } catch (fallbackError) {
      const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`Translation failed (${primaryMsg}; fallback: ${fallbackMsg})`);
    }
  }
};

/** Human-readable language name when available; otherwise the code. */
export const languageDisplayName = (code: string, locale = 'en'): string => {
  try {
    // Intl.DisplayNames is widely supported in modern browsers
    // @ts-ignore - typings vary by TS lib target
    const dn = new Intl.DisplayNames([locale], { type: 'language' });
    return dn.of(normalizeLangCode(code)) || code;
  } catch {
    return code;
  }
};
