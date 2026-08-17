export type TranslationSettings = {
  endpoint: string,
  apiKey: string,
  targetLanguage: string,
};

export type TranslationResult = {
  translatedText: string,
  detectedLanguage?: string,
  targetLanguage: string,
  fromCache: boolean,
};

type ProtectedToken = {
  token: string,
  value: string,
};

const endpointKey = 'primalTranslationEndpoint';
const apiKeyKey = 'primalTranslationApiKey';
const targetLanguageKey = 'primalTranslationTargetLanguage';
const cachePrefix = 'primalTranslationCache:v1';

export const translationSettingsChanged = 'primalTranslationSettingsChanged';

export const defaultTargetLanguage = () => {
  if (typeof navigator === 'undefined') return 'en';

  return navigator.language?.split('-')[0]?.toLowerCase() || 'en';
};

const storage = () => {
  if (typeof localStorage === 'undefined') return;

  return localStorage;
};

export const getTranslationSettings = (): TranslationSettings => {
  const store = storage();

  return {
    endpoint: store?.getItem(endpointKey)?.trim() || '',
    apiKey: store?.getItem(apiKeyKey)?.trim() || '',
    targetLanguage: store?.getItem(targetLanguageKey)?.trim() || defaultTargetLanguage(),
  };
};

export const saveTranslationSettings = (settings: TranslationSettings) => {
  const store = storage();
  if (!store) return;

  if (settings.endpoint.trim()) {
    store.setItem(endpointKey, settings.endpoint.trim());
  }
  else {
    store.removeItem(endpointKey);
  }

  if (settings.apiKey.trim()) {
    store.setItem(apiKeyKey, settings.apiKey.trim());
  }
  else {
    store.removeItem(apiKeyKey);
  }

  store.setItem(targetLanguageKey, settings.targetLanguage.trim().toLowerCase() || defaultTargetLanguage());
  window.dispatchEvent(new CustomEvent(translationSettingsChanged));
};

export const clearTranslationSettings = () => {
  const store = storage();
  if (!store) return;

  store.removeItem(endpointKey);
  store.removeItem(apiKeyKey);
  store.removeItem(targetLanguageKey);
  window.dispatchEvent(new CustomEvent(translationSettingsChanged));
};

export const isTranslationConfigured = () => getTranslationSettings().endpoint.length > 0;

const hash = (value: string) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return `${(h2 >>> 0).toString(36)}${(h1 >>> 0).toString(36)}`;
};

const cacheKey = (content: string, settings: TranslationSettings) => {
  const endpoint = settings.endpoint.replace(/\/+$/, '');

  return `${cachePrefix}:${settings.targetLanguage}:${hash(endpoint)}:${hash(content)}`;
};

const readCachedTranslation = (content: string, settings: TranslationSettings): TranslationResult | undefined => {
  const store = storage();
  if (!store) return;

  try {
    const cached = store.getItem(cacheKey(content, settings));
    if (!cached) return;

    const parsed = JSON.parse(cached) as TranslationResult;
    return {
      ...parsed,
      fromCache: true,
    };
  }
  catch {
    return;
  }
};

const writeCachedTranslation = (content: string, settings: TranslationSettings, result: TranslationResult) => {
  const store = storage();
  if (!store) return;

  try {
    store.setItem(cacheKey(content, settings), JSON.stringify({
      ...result,
      fromCache: false,
    }));
  }
  catch {
    // A full localStorage cache should not block note translation.
  }
};

const protectedPattern = /https?:\/\/[^\s<>()]+|nostr:[a-z0-9]+1[a-z0-9]+|(?:npub|nprofile|note|nevent|naddr)1[a-z0-9]+|#[A-Za-z0-9_]+|@[A-Za-z0-9_.-]+/gi;

const protectContent = (content: string) => {
  const tokens: ProtectedToken[] = [];

  const text = content.replace(protectedPattern, (value) => {
    const token = `PRIMALTRANSLATIONTOKEN${tokens.length}END`;
    tokens.push({ token, value });
    return token;
  });

  return { text, tokens };
};

const restoreContent = (content: string, tokens: ProtectedToken[]) => {
  return tokens.reduce((translated, item) => {
    return translated.replaceAll(item.token, item.value);
  }, content);
};

export const hasTranslatableNoteText = (content: string) => {
  const protectedText = protectContent(content).text;
  const textOnly = protectedText.replace(/PRIMALTRANSLATIONTOKEN\d+END/g, '').trim();

  return /[A-Za-zÀ-ž]/.test(textOnly);
};

const detectedLanguage = (data: Record<string, any>) => {
  const detected = data.detectedLanguage || data.detected_language || data.detected_source_language;

  if (typeof detected === 'string') return detected;
  if (typeof detected?.language === 'string') return detected.language;
  if (typeof detected?.confidence === 'number' && typeof detected?.lang === 'string') return detected.lang;

  return undefined;
};

export const translateNoteContent = async (
  content: string,
  settings = getTranslationSettings(),
): Promise<TranslationResult> => {
  if (!settings.endpoint) {
    throw new Error('translation_endpoint_missing');
  }

  const targetLanguage = settings.targetLanguage || defaultTargetLanguage();
  const normalizedSettings = {
    ...settings,
    targetLanguage,
  };

  const cached = readCachedTranslation(content, normalizedSettings);
  if (cached) return cached;

  const { text, tokens } = protectContent(content);

  const body: Record<string, string> = {
    q: text,
    source: 'auto',
    target: targetLanguage,
    format: 'text',
  };

  if (settings.apiKey) {
    body.api_key = settings.apiKey;
  }

  const response = await fetch(settings.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`translation_request_failed:${response.status}`);
  }

  const data = await response.json();
  const translated = data.translatedText || data.translation || data.text;

  if (typeof translated !== 'string' || translated.length === 0) {
    throw new Error('translation_response_invalid');
  }

  const result: TranslationResult = {
    translatedText: restoreContent(translated, tokens),
    detectedLanguage: detectedLanguage(data),
    targetLanguage,
    fromCache: false,
  };

  writeCachedTranslation(content, normalizedSettings, result);

  return result;
};
