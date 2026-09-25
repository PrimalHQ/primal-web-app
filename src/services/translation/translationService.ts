// Translation service for Primal Web App
// Supports MyMemory (default), LibreTranslate and DeepL.

import { accountStore } from '../../stores/accountStore';

export type TranslationProvider = 'mymemory' | 'libretranslate' | 'deepl';

export interface TranslationSettings {
  provider: TranslationProvider;
  apiKey: string;
  libreUrl?: string;
  preferredLanguage: string;
  // Source language for providers that cannot auto-detect (MyMemory rejects 'auto').
  sourceLanguage: string;
}

export class TranslationService {
  private settings: TranslationSettings;
  // Cache for translated text: key is `${noteId}:${targetLang}`
  private cache: Map<string, string>;

  constructor() {
    this.settings = {
      provider: 'mymemory',
      apiKey: '',
      libreUrl: 'https://translate.terraprint.co',
      preferredLanguage: 'en',
      sourceLanguage: 'en',
    };
    this.cache = new Map();
    this.loadSettingsFromStore();
  }

  private loadSettingsFromStore() {
    // TODO: Implement proper subscription to accountStore changes
    // For now, we'll just read the current state
    // In a real app, we would subscribe to the store
    // Access accountStore directly (SolidJS store)
    // Assuming we have added these fields to accountStore
    if (accountStore.translationProvider) {
      this.settings.provider = accountStore.translationProvider;
    }
    if (accountStore.translationApiKey) {
      this.settings.apiKey = accountStore.translationApiKey;
    }
    if (accountStore.translationLibreUrl) {
      this.settings.libreUrl = accountStore.translationLibreUrl;
    }
    if (accountStore.preferredLanguage) {
      this.settings.preferredLanguage = accountStore.preferredLanguage;
    }
  }

  // Update settings when they change in the store
  public updateSettings(newSettings: Partial<TranslationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  async translate(text: string, targetLang: string, noteId?: string): Promise<string> {
    if (!text.trim()) {
      return text;
    }

    // Create a cache key if noteId is provided
    const cacheKey = noteId ? `${noteId}:${targetLang}` : undefined;
    if (cacheKey && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // MyMemory rejects queries over 500 bytes; translate in chunks and join.
    if (this.settings.provider === 'mymemory' && text.length > 450) {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += 400) {
        chunks.push(await this.translateMyMemory(text.slice(i, i + 400), targetLang));
      }
      const joined = chunks.join(' ');
      if (noteId) {
        this.cache.set(`${noteId}:${targetLang}`, joined);
      }
      return joined;
    }

    let translated: string;
    switch (this.settings.provider) {
      case 'mymemory':
        translated = await this.translateMyMemory(text, targetLang);
        break;
      case 'libretranslate':
        translated = await this.translateLibreTranslate(text, targetLang);
        break;
      case 'deepl':
        translated = await this.translateDeepL(text, targetLang);
        break;
      default:
        throw new Error(`Unsupported translation provider: ${this.settings.provider}`);
    }

    // Cache the result if we have a noteId
    if (cacheKey) {
      this.cache.set(cacheKey, translated);
    }

    return translated;
  }

  // MyMemory: free, CORS-friendly, no API key required.
  // GET https://api.mymemory.translated.net/get?q=<text>&langpair=en|fa
  // Note: MyMemory does NOT accept 'auto' as source — an explicit source is required.
  private async translateMyMemory(text: string, targetLang: string): Promise<string> {
    const source = this.settings.sourceLanguage || 'en';
    if (source === targetLang) {
      return text;
    }

    const url =
      `https://api.mymemory.translated.net/get` +
      `?q=${encodeURIComponent(text)}` +
      `&langpair=${encodeURIComponent(source)}|${encodeURIComponent(targetLang)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`);
    }

    const data = await response.json();

    // MyMemory returns HTTP 200 even for embedded errors (e.g. quota exhausted)
    if (String(data.responseStatus) !== '200') {
      throw new Error(`MyMemory API error: ${data.responseDetails || data.responseStatus}`);
    }

    const translated = data?.responseData?.translatedText;
    if (!translated) {
      throw new Error('MyMemory API returned no translated text');
    }

    return translated;
  }

  private async translateLibreTranslate(text: string, targetLang: string): Promise<string> {
    const base = this.settings.libreUrl || 'https://libretranslate.de';
    const url = `${base.replace(/\/+$/, '')}/translate`;

    const body: Record<string, unknown> = {
      q: text,
      source: 'auto',
      target: targetLang,
      format: 'text',
    };
    if (this.settings.apiKey) {
      body.api_key = this.settings.apiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate API error: ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText || text;
  }

  private async translateDeepL(text: string, targetLang: string): Promise<string> {
    const url = 'https://api-free.deepl.com/v2/translate';
    const params = new URLSearchParams({
      text: text,
      target_lang: targetLang.toUpperCase(), // DeepL requires target_lang
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.settings.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data = await response.json();
    return data.translations[0]?.text || text;
  }
}

// Export a singleton instance
export const translationService = new TranslationService();