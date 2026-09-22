import {
  languageBase,
  normalizeOwnedLibreTranslateUrl,
} from './noteTranslateProtect';

export type NoteTranslateProvider = 'on_device' | 'libretranslate' | 'deepl' | 'google';

export type NoteTranslatePrefs = {
  enabled: boolean;
  provider: NoteTranslateProvider;
  targetLanguage: string;
  libreTranslateUrl: string;
  libreTranslateKey: string;
  deeplKey: string;
  googleKey: string;
};

export const NOTE_TRANSLATE_STORAGE_KEY = 'primal.noteTranslate.v1';

export const NOTE_TRANSLATE_LANGUAGES: { code: string; label: string }[] = [
  { code: 'auto', label: 'Browser language' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'he', label: 'Hebrew' },
  { code: 'fa', label: 'Persian' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'cs', label: 'Czech' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'el', label: 'Greek' },
];

export const emptyNoteTranslatePrefs = (): NoteTranslatePrefs => ({
  enabled: true,
  provider: 'on_device',
  targetLanguage: 'auto',
  // Fail-closed: never ship a public LibreTranslate/Google host that could
  // be billed to Primal or silently exfiltrate note text.
  libreTranslateUrl: '',
  libreTranslateKey: '',
  deeplKey: '',
  googleKey: '',
});

const isProvider = (value: unknown): value is NoteTranslateProvider => (
  value === 'on_device' ||
  value === 'libretranslate' ||
  value === 'deepl' ||
  value === 'google'
);

export const browserLanguage = (): string => {
  if (typeof navigator === 'undefined') return 'en';
  return languageBase(navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || 'en') || 'en';
};

export const resolveTargetLanguage = (prefs: NoteTranslatePrefs): string => {
  if (!prefs.targetLanguage || prefs.targetLanguage === 'auto') {
    return browserLanguage();
  }
  return languageBase(prefs.targetLanguage) || browserLanguage();
};

export const parseNoteTranslatePrefs = (raw: string | null): NoteTranslatePrefs => {
  const fallback = emptyNoteTranslatePrefs();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<NoteTranslatePrefs>;
    return {
      enabled: parsed.enabled !== false,
      provider: isProvider(parsed.provider) ? parsed.provider : fallback.provider,
      targetLanguage: typeof parsed.targetLanguage === 'string' && parsed.targetLanguage
        ? parsed.targetLanguage
        : fallback.targetLanguage,
      libreTranslateUrl: typeof parsed.libreTranslateUrl === 'string' ? parsed.libreTranslateUrl : '',
      libreTranslateKey: typeof parsed.libreTranslateKey === 'string' ? parsed.libreTranslateKey : '',
      deeplKey: typeof parsed.deeplKey === 'string' ? parsed.deeplKey : '',
      googleKey: typeof parsed.googleKey === 'string' ? parsed.googleKey : '',
    };
  } catch {
    return fallback;
  }
};

export const readNoteTranslatePrefs = (): NoteTranslatePrefs => {
  try {
    if (typeof localStorage === 'undefined') return emptyNoteTranslatePrefs();
    return parseNoteTranslatePrefs(localStorage.getItem(NOTE_TRANSLATE_STORAGE_KEY));
  } catch {
    return emptyNoteTranslatePrefs();
  }
};

export const writeNoteTranslatePrefs = (patch: Partial<NoteTranslatePrefs>): NoteTranslatePrefs => {
  const next = { ...readNoteTranslatePrefs(), ...patch };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NOTE_TRANSLATE_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Private mode / quota — keep the in-memory result.
  }
  return next;
};

export type ProviderReadiness =
  | { ok: true }
  | { ok: false; reason: 'disabled' | 'missing_url' | 'invalid_url' | 'missing_key' | 'on_device_unavailable' };

export const onDeviceTranslatorAvailable = (): boolean => {
  const g = globalThis as typeof globalThis & {
    Translator?: unknown;
    LanguageDetector?: unknown;
    translation?: { createTranslator?: unknown };
    ai?: { translator?: unknown };
  };
  return Boolean(
    g.Translator ||
    g.LanguageDetector ||
    g.translation?.createTranslator ||
    g.ai?.translator,
  );
};

export const providerReadiness = (prefs: NoteTranslatePrefs): ProviderReadiness => {
  if (!prefs.enabled) return { ok: false, reason: 'disabled' };

  if (prefs.provider === 'on_device') {
    if (!onDeviceTranslatorAvailable()) {
      return { ok: false, reason: 'on_device_unavailable' };
    }
    return { ok: true };
  }

  if (prefs.provider === 'libretranslate') {
    const url = normalizeOwnedLibreTranslateUrl(prefs.libreTranslateUrl);
    if (typeof url !== 'string') return { ok: false, reason: url.error };
    return { ok: true };
  }

  if (prefs.provider === 'deepl') {
    if (!(prefs.deeplKey || '').trim()) return { ok: false, reason: 'missing_key' };
    return { ok: true };
  }

  if (!(prefs.googleKey || '').trim()) return { ok: false, reason: 'missing_key' };
  return { ok: true };
};
