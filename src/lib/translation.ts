import { createStore } from 'solid-js/store';
import { PrimalNote } from '../types/primal';
import { restoreTranslationContent, sanitizeForTranslation } from './translationSanitizer';

export type TranslationProvider = 'libretranslate' | 'google' | 'deepl';

export type TranslationSettings = {
  enabled: boolean,
  provider: TranslationProvider,
  apiKey: string,
  libreTranslateUrl: string,
  targetLanguage: string,
};


export type NoteTranslation = {
  status: 'idle' | 'loading' | 'translated' | 'error',
  text?: string,
  provider?: TranslationProvider,
  showOriginal?: boolean,
};

const settingsKey = 'primal.translation.settings';
const cacheKey = 'primal.translation.cache';
const cacheLimit = 100;
const cacheByteLimit = 1024 * 1024;

const defaultSettings = (): TranslationSettings => ({
  enabled: false,
  provider: 'libretranslate',
  apiKey: '',
  libreTranslateUrl: 'https://libretranslate.com',
  targetLanguage: document.documentElement.lang || navigator.language || 'en',
});

const readSettings = (): TranslationSettings => {
  try {
    return { ...defaultSettings(), ...JSON.parse(localStorage.getItem(settingsKey) || '{}') };
  } catch {
    return defaultSettings();
  }
};

export const [translationSettings, setTranslationSettings] = createStore<TranslationSettings>(readSettings());
export const [noteTranslations, setNoteTranslations] = createStore<Record<string, NoteTranslation>>({});

export const saveTranslationSettings = (settings: Partial<TranslationSettings>) => {
  setTranslationSettings(settings);
  localStorage.setItem(settingsKey, JSON.stringify(translationSettings));
};

export { restoreTranslationContent, sanitizeForTranslation, SanitizedContent } from './translationSanitizer';

type CacheEntry = { key: string, text: string, provider: TranslationProvider, savedAt: number };

const readCache = (): CacheEntry[] => {
  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    return Array.isArray(cache) ? cache : [];
  } catch {
    return [];
  }
};

const saveCache = (entry: CacheEntry) => {
  const cache = [entry, ...readCache().filter(item => item.key !== entry.key)].slice(0, cacheLimit);
  while (cache.length && new Blob([JSON.stringify(cache)]).size > cacheByteLimit) cache.pop();
  localStorage.setItem(cacheKey, JSON.stringify(cache));
};

const digest = async (content: string) => {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

const providerName = (provider: TranslationProvider) => ({
  libretranslate: 'LibreTranslate', google: 'Google Cloud Translation', deepl: 'DeepL',
}[provider]);

const translateWithProvider = async (text: string, settings: TranslationSettings) => {
  if (settings.provider === 'google') {
    if (!settings.apiKey) throw new Error('missing_key');
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(settings.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, target: settings.targetLanguage, format: 'text' }),
    });
    const data = await response.json();
    if (!response.ok || !data.data?.translations?.[0]?.translatedText) throw new Error('provider_error');
    return data.data.translations[0].translatedText as string;
  }

  if (settings.provider === 'deepl') {
    if (!settings.apiKey) throw new Error('missing_key');
    const response = await fetch('https://api.deepl.com/v2/translate', {
      method: 'POST', headers: { Authorization: `DeepL-Auth-Key ${settings.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: [text], target_lang: settings.targetLanguage.split('-')[0].toUpperCase() }),
    });
    const data = await response.json();
    if (!response.ok || !data.translations?.[0]?.text) throw new Error('provider_error');
    return data.translations[0].text as string;
  }

  if (!settings.libreTranslateUrl) throw new Error('missing_url');
  const response = await fetch(`${settings.libreTranslateUrl.replace(/\/$/, '')}/translate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'auto', target: settings.targetLanguage, format: 'text' }),
  });
  const data = await response.json();
  if (!response.ok || !data.translatedText) throw new Error('provider_error');
  return data.translatedText as string;
};

export const translateNote = async (note: PrimalNote) => {
  const settings = { ...translationSettings };
  const id = note.id;
  if (noteTranslations[id]?.status === 'loading') return;
  if (!settings.enabled) {
    setNoteTranslations(id, { status: 'error' });
    return;
  }

  setNoteTranslations(id, { status: 'loading' });
  try {
    const { content, placeholders } = sanitizeForTranslation(note.content || '');
    const key = await digest(`${note.content}\n${settings.targetLanguage}\n${settings.provider}`);
    const cached = readCache().find(item => item.key === key);
    const translated = cached?.text || await translateWithProvider(content, settings);
    if (!cached) saveCache({ key, text: translated, provider: settings.provider, savedAt: Date.now() });
    setNoteTranslations(id, { status: 'translated', text: restoreTranslationContent(translated, placeholders), provider: settings.provider });
  } catch {
    setNoteTranslations(id, { status: 'error' });
  }
};

export const toggleOriginal = (id: string) => {
  setNoteTranslations(id, 'showOriginal', original => !original);
};

export const translationProviderName = providerName;
