/**
 * Note translation — provider boundary + Nostr entity protection.
 *
 * Requirements this file exists to satisfy (from the #133 review thread):
 *  - do NOT ship translation on an undocumented Google endpoint: rely on a configured,
 *    documented provider (LibreTranslate-compatible) and make the unofficial endpoint a
 *    deliberate, opt-in fallback that is off by default;
 *  - never mangle note content: `nostr:` refs, npub/nevent/naddr, URLs, hashtags, @mentions,
 *    lightning invoices/lnurl and bitcoin/cashu tokens are masked before the provider sees
 *    the text and restored verbatim afterwards;
 *  - never transmit note text implicitly: translation only runs on an explicit user action.
 */

export type TranslationProviderId = 'libretranslate' | 'google-unofficial';

export type TranslationSettings = {
  provider: TranslationProviderId;
  /** LibreTranslate-compatible base URL, e.g. https://libretranslate.example (no trailing /) */
  endpoint: string;
  apiKey: string;
  /** Empty string = follow the viewer's UI locale */
  targetLanguage: string;
  /** Opt-in only. Off by default: the public Google endpoint is undocumented. */
  allowUnofficialEndpoint: boolean;
};

const SETTINGS_KEY = 'primal_translation_settings';

export const defaultTranslationSettings = (): TranslationSettings => ({
  provider: 'libretranslate',
  endpoint: '',
  apiKey: '',
  targetLanguage: '',
  allowUnofficialEndpoint: false,
});

export const loadTranslationSettings = (): TranslationSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultTranslationSettings();
    const parsed = JSON.parse(raw) as Partial<TranslationSettings>;
    return { ...defaultTranslationSettings(), ...parsed };
  } catch {
    return defaultTranslationSettings();
  }
};

export const saveTranslationSettings = (settings: TranslationSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable (private mode) — translation settings simply stay session-local
  }
};

/* ------------------------------------------------------------------ entity protection */

type EntityKind = 'nostr' | 'nip19' | 'url' | 'invoice' | 'cashu' | 'btcAddress' | 'hashtag' | 'mention';

const ENTITY_PATTERNS: Array<[EntityKind, RegExp]> = [
  ['nostr', /nostr:(?:npub|nprofile|note|nevent|naddr|nrelay)1[023456789acdefghjklmnpqrstuvwxyz]+/gi],
  ['nip19', /\b(?:npub|nprofile|note|nevent|naddr|nsec|nrelay)1[023456789acdefghjklmnpqrstuvwxyz]{4,}\b/g],
  ['url', /\b(?:https?:\/\/|www\.)[^\s<>()[\]{}"']+/gi],
  ['invoice', /\b(?:lnbc|lntb|lnbcrt|lnurl|lightning:)[0-9a-z]{6,}\b/gi],
  ['cashu', /\bcashu[0-9A-Za-z_-]{10,}\b/g],
  ['btcAddress', /\b(?:bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g],
  ['hashtag', /(^|\s)(#[A-Za-z0-9_]{1,64})/g],
  ['mention', /(^|\s)(@[A-Za-z0-9_.-]{2,64})/g],
];

export type ProtectionResult = { masked: string; entities: Record<string, string> };

/**
 * Replace every translatable-hostile entity with an ASCII placeholder. Placeholders are
 * deliberately bracket-like so MT engines keep them intact, and are indexed so even a provider
 * that reorders whitespace still gives us a deterministic mapping to restore from.
 */
export const protectEntities = (text: string): ProtectionResult => {
  const entities: Record<string, string> = {};
  let masked = text;
  let index = 0;

  for (const [, pattern] of ENTITY_PATTERNS) {
    masked = masked.replace(pattern, (match, prefix) => {
      const token = `[[${index}]]`;
      const value = typeof prefix === 'string' && prefix.trim() === '' ? match.slice(prefix.length) : match;
      entities[token] = value;
      index += 1;
      // keep a leading space when the pattern captured one, so words don't fuse
      return typeof prefix === 'string' && prefix.length > 0 ? `${prefix}${token}` : token;
    });
  }

  return { masked, entities };
};

export const restoreEntities = (text: string, entities: Record<string, string>): string =>
  text.replace(/\[\[(\d+)\]\]/g, (whole, id: string) => entities[`[[${id}]]`] ?? whole);

/* ------------------------------------------------------------------ providers */

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const translateWithLibreTranslate = async (
  text: string, target: string, settings: TranslationSettings,
): Promise<{ text: string; detected?: string }> => {
  if (!settings.endpoint) {
    throw new Error('translation-not-configured');
  }
  const body: Record<string, string> = { q: text, source: 'auto', target, format: 'text' };
  if (settings.apiKey) body.api_key = settings.apiKey;

  const res = await fetch(`${stripTrailingSlash(settings.endpoint)}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`translation-provider-error-${res.status}`);

  const data = await res.json() as { translatedText?: string; detectedLanguage?: { language?: string } };
  if (!data.translatedText) throw new Error('translation-empty-response');
  return { text: data.translatedText, detected: data.detectedLanguage?.language };
};

const translateWithUnofficialGoogle = async (text: string, target: string): Promise<{ text: string; detected?: string }> => {
  const url = 'https://translate.googleapis.com/translate_a/single'
    + `?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translation-provider-error-${res.status}`);
  const data = (await res.json()) as unknown[];
  const segments = Array.isArray(data?.[0]) ? (data[0] as string[][]) : [];
  const text2 = segments.map((part) => part?.[0] ?? '').join('');
  if (!text2) throw new Error('translation-empty-response');
  return { text: text2, detected: typeof data?.[2] === 'string' ? (data[2] as string) : undefined };
};

export type TranslationOutcome = {
  translated: string;
  detected?: string;
  provider: TranslationProviderId;
  entityCount: number;
};

/**
 * Translate one note body for display. Explicit user action only — nothing here runs on render.
 * Target language comes from settings, else the viewer's UI locale (our locale codes are already
 * BCP-47-ish, which both providers accept).
 */
export const translateNote = async (
  rawText: string,
  uiLocale: string,
  settings: TranslationSettings,
): Promise<TranslationOutcome> => {
  const target = (settings.targetLanguage || uiLocale || 'en').split('-')[0];
  const { masked, entities } = protectEntities(rawText);

  let result: { text: string; detected?: string };
  if (settings.provider === 'google-unofficial') {
    if (!settings.allowUnofficialEndpoint) throw new Error('translation-unofficial-disabled');
    result = await translateWithUnofficialGoogle(masked, target);
  } else {
    result = await translateWithLibreTranslate(masked, target, settings);
  }

  return {
    translated: restoreEntities(result.text, entities),
    detected: result.detected,
    provider: settings.provider,
    entityCount: Object.keys(entities).length,
  };
};

export const translationErrorMessage = (error: unknown): string => {
  const code = error instanceof Error ? error.message : 'translation-failed';
  if (code === 'translation-not-configured') return 'translation-error-not-configured';
  if (code === 'translation-unofficial-disabled') return 'translation-error-unofficial-disabled';
  if (code.startsWith('translation-provider-error')) return 'translation-error-provider';
  return 'translation-error-generic';
};
