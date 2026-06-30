import { APP_ID } from "../App";
import {
  addrRegexG,
  hashtagRegex,
  lnRegex,
  lnUnifiedRegex,
  noteRegex,
  tagMentionRegex,
  urlRegexG,
} from "../constants";
import { sendMessage, subsTo } from "../sockets";
import {
  NoteTranslationCacheEntry,
  NoteTranslationRequestPayload,
  NoteTranslationResponse,
  NoteTranslationStoredResponse,
  NostrEventContent,
  PrimalNote,
} from "../types/primal";
import { getLang, sha256Text, uuidv4 } from "../utils";

const CACHE_STORAGE_KEY = 'note_translation_cache_v1';
const MAX_CACHE_ENTRIES = 200;
const TRANSLATION_TIMEOUT = 15_000;
const TOKEN_PREFIX = '__PRIMAL_TRANSLATION_TOKEN_';
const TOKEN_SUFFIX = '__';

type ProtectedEntity = {
  placeholder: string,
  value: string,
};

type PreparedTranslationText = {
  contentHash: string,
  text: string,
  protectedEntities: ProtectedEntity[],
  hasTranslatableText: boolean,
};

const pendingRequests: Record<string, Promise<NoteTranslationResponse>> = {};

const protectMatches = (
  text: string,
  regex: RegExp,
  entities: ProtectedEntity[],
  transform?: (match: string) => { prefix?: string, value: string },
) => {
  regex.lastIndex = 0;

  return text.replace(regex, (match: string) => {
    const entity = transform ? transform(match) : { value: match };
    const placeholder = `${TOKEN_PREFIX}${entities.length}${TOKEN_SUFFIX}`;

    entities.push({
      placeholder,
      value: entity.value,
    });

    return `${entity.prefix || ''}${placeholder}`;
  });
};

const getTextWithoutProtectedEntities = (text: string) => {
  return text
    .replace(new RegExp(`${TOKEN_PREFIX}\\d+${TOKEN_SUFFIX}`, 'g'), ' ')
    .trim();
};

const hasTranslatableText = (text: string) => /[\p{L}\p{N}]/u.test(text);

const protectNoteContent = (content: string) => {
  const protectedEntities: ProtectedEntity[] = [];
  let text = content;

  text = protectMatches(text, urlRegexG, protectedEntities);
  text = protectMatches(text, /nostr:((note|nevent|npub|nprofile|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)\b/ig, protectedEntities);
  text = protectMatches(text, noteRegex, protectedEntities);
  text = protectMatches(text, addrRegexG, protectedEntities);
  text = protectMatches(text, /((npub|nprofile)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)\b/ig, protectedEntities);
  text = protectMatches(text, new RegExp(tagMentionRegex.source, 'g'), protectedEntities);
  text = protectMatches(text, new RegExp(lnUnifiedRegex.source, 'ig'), protectedEntities);
  text = protectMatches(text, new RegExp(lnRegex.source, 'ig'), protectedEntities);
  text = protectMatches(
    text,
    new RegExp(hashtagRegex.source, 'ig'),
    protectedEntities,
    (match) => {
      const prefix = match.match(/^\s/)?.[0] || '';
      return {
        prefix,
        value: match.slice(prefix.length),
      };
    },
  );

  return {
    text,
    protectedEntities,
  };
};

export const restoreProtectedEntities = (text: string, protectedEntities: ProtectedEntity[]) => {
  return protectedEntities.reduce((translated, entity) => {
    return translated.replaceAll(entity.placeholder, entity.value);
  }, text);
};

export const prepareNoteForTranslation = async (note: PrimalNote): Promise<PreparedTranslationText> => {
  const protectedContent = protectNoteContent(note.content || '');
  const textWithoutProtectedEntities = getTextWithoutProtectedEntities(protectedContent.text);

  return {
    contentHash: await sha256Text(note.content || ''),
    text: protectedContent.text,
    protectedEntities: protectedContent.protectedEntities,
    hasTranslatableText: hasTranslatableText(textWithoutProtectedEntities),
  };
};

export const normalizeTranslationLanguage = (locale?: string) => {
  return (locale || getLang() || 'en').trim();
};

export const getTranslationCacheKey = (contentHash: string, targetLanguage: string) => {
  return `${targetLanguage.toLowerCase()}:${contentHash}`;
};

const readTranslationCache = (): Record<string, NoteTranslationCacheEntry> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeTranslationCache = (cache: Record<string, NoteTranslationCacheEntry>) => {
  const entries = Object.entries(cache)
    .sort(([, a], [, b]) => b.createdAt - a.createdAt)
    .slice(0, MAX_CACHE_ENTRIES);

  localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
};

const readCachedTranslation = (cacheKey: string): NoteTranslationStoredResponse | undefined => {
  return readTranslationCache()[cacheKey]?.response;
};

const saveCachedTranslation = (cacheKey: string, response: NoteTranslationStoredResponse) => {
  const cache = readTranslationCache();

  cache[cacheKey] = {
    createdAt: Date.now(),
    response,
  };

  writeTranslationCache(cache);
};

const parseTranslationResponse = (
  content: NostrEventContent | undefined,
  targetLanguage: string,
  protectedEntities: ProtectedEntity[],
): NoteTranslationStoredResponse => {
  if (!content?.content) {
    throw new Error('empty_translation_response');
  }

  let payload: Record<string, any> | string = content.content;

  try {
    payload = JSON.parse(content.content);
  } catch {
    payload = content.content;
  }

  if (typeof payload === 'string') {
    return {
      translatedText: restoreProtectedEntities(payload, protectedEntities),
      targetLanguage,
    };
  }

  if (payload.error) {
    throw new Error(`${payload.error}`);
  }

  const translatedText = payload.translated_text ||
    payload.translatedText ||
    payload.translation ||
    payload.text ||
    '';

  if (!translatedText || typeof translatedText !== 'string') {
    throw new Error('empty_translation_text');
  }

  return {
    translatedText: restoreProtectedEntities(translatedText, protectedEntities),
    detectedSourceLanguage: payload.detected_source_language ||
      payload.detectedSourceLanguage ||
      payload.source_language ||
      payload.sourceLanguage,
    targetLanguage: payload.target_language ||
      payload.targetLanguage ||
      targetLanguage,
    provider: payload.provider,
    cached: payload.cached,
  };
};

const requestTranslation = (
  payload: NoteTranslationRequestPayload,
  protectedEntities: ProtectedEntity[],
): Promise<NoteTranslationStoredResponse> => {
  const subId = `translate_note_${APP_ID}_${uuidv4()}`;

  return new Promise((resolve, reject) => {
    let done = false;

    const cleanup = (unsub: () => void, timeout: number) => {
      done = true;
      window.clearTimeout(timeout);
      unsub();
    };

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (done) return;

        try {
          const response = parseTranslationResponse(
            content,
            payload.target_language,
            protectedEntities,
          );

          cleanup(unsub, timeout);
          resolve(response);
        } catch (e) {
          cleanup(unsub, timeout);
          reject(e);
        }
      },
      onNotice: (_, reason) => {
        if (done) return;

        cleanup(unsub, timeout);
        reject(new Error(reason || 'translation_unavailable'));
      },
    });

    const timeout = window.setTimeout(() => {
      if (done) return;

      cleanup(unsub, timeout);
      reject(new Error('translation_timeout'));
    }, TRANSLATION_TIMEOUT);

    sendMessage(JSON.stringify([
      'REQ',
      subId,
      {
        cache: [
          'translate_note',
          payload,
        ],
      },
    ]));
  });
};

export const translateNote = async (
  note: PrimalNote,
  targetLanguage: string,
): Promise<NoteTranslationResponse> => {
  const prepared = await prepareNoteForTranslation(note);

  if (!prepared.hasTranslatableText) {
    throw new Error('no_translatable_text');
  }

  const normalizedTargetLanguage = normalizeTranslationLanguage(targetLanguage);
  const cacheKey = getTranslationCacheKey(prepared.contentHash, normalizedTargetLanguage);
  const cachedResponse = readCachedTranslation(cacheKey);

  if (cachedResponse) {
    return {
      ...cachedResponse,
      cacheKey,
      contentHash: prepared.contentHash,
      cached: true,
    };
  }

  if (pendingRequests[cacheKey]) {
    return pendingRequests[cacheKey];
  }

  const payload: NoteTranslationRequestPayload = {
    event_id: note.id,
    content_hash: prepared.contentHash,
    text: prepared.text,
    target_language: normalizedTargetLanguage,
    protected_entities: prepared.protectedEntities,
  };

  pendingRequests[cacheKey] = requestTranslation(payload, prepared.protectedEntities)
    .then((response) => {
      saveCachedTranslation(cacheKey, response);

      return {
        ...response,
        cacheKey,
        contentHash: prepared.contentHash,
      };
    })
    .finally(() => {
      delete pendingRequests[cacheKey];
    });

  return pendingRequests[cacheKey];
};

export const canTranslateNote = (note: PrimalNote) => {
  const protectedContent = protectNoteContent(note.content || '');
  const textWithoutProtectedEntities = getTextWithoutProtectedEntities(protectedContent.text);

  return hasTranslatableText(textWithoutProtectedEntities);
};
