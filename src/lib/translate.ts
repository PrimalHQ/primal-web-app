import { sendMessage, subsTo } from "../sockets";
import { NostrEventContent } from "../types/primal";

const nostrEntityPattern = /nostr:(?:npub|note|nprofile|nevent|naddr)1[\w\d]{38,}/g;
const tagRefPattern = /#\[\d+\]/g;
const urlPattern = /https?:\/\/\S+/g;
const mentionPattern = /@\w+(?:\.\w+)*/g;

function contentHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

const translationCache = new Map<string, string>();

function cacheKey(text: string, lang: string): string {
  return `${contentHash(text)}:${lang}`;
}

export function sanitizeForTranslation(text: string): string {
  if (!text) return '';

  return text
    .replace(nostrEntityPattern, '')
    .replace(tagRefPattern, '')
    .replace(urlPattern, '')
    .replace(mentionPattern, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function subscribeTranslation(
  noteId: string,
  targetLang: string,
  onTranslation: (text: string) => void,
  onEmpty?: () => void,
  timeoutMs = 0,
): () => void {
  const subId = `tr_1051_${Math.random().toString(36).slice(2, 10)}`;
  let done = false;

  const close = () => {
    sendMessage(JSON.stringify(["CLOSE", subId]));
  };

  const shutdown = () => {
    done = true;
    close();
    unsub();
  };

  const unsub = subsTo(subId, {
    onEvent: (_, content: NostrEventContent) => {
      if (done || content.kind !== 1051) return;

      const langTag = content.tags?.find((t: string[]) => t[0] === 'l');

      if (langTag?.[1] === targetLang && content.content) {
        clearTimeout(timer);
        shutdown();
        onTranslation(content.content);
      }
    },
    onEose: () => {
      if (!done) {
        clearTimeout(timer);
        shutdown();
        onEmpty?.();
      }
    },
  });

  const timer = timeoutMs > 0
    ? setTimeout(() => {
        if (!done) {
          shutdown();
          onEmpty?.();
        }
      }, timeoutMs)
    : 0;

  sendMessage(JSON.stringify([
    "REQ", subId,
    { kinds: [1051], "#e": [noteId], limit: 1 },
  ]));

  return () => {
    if (!done) {
      shutdown();
    }
  };
}

export function prefetchTranslation(
  noteId: string,
  content: string,
  lang: string,
): () => void {
  const sanitized = sanitizeForTranslation(content);
  if (!sanitized) return () => {};

  const key = cacheKey(sanitized, lang);

  return subscribeTranslation(noteId, lang, (text) => {
    translationCache.set(key, text);
  });
}

export function fetchTranslation(
  text: string,
  targetLanguage: string,
  noteId?: string,
): Promise<string | null> {
  const sanitized = sanitizeForTranslation(text);

  if (!sanitized) return Promise.resolve(null);

  const key = cacheKey(sanitized, targetLanguage);

  const cached = translationCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve) => {
    if (noteId) {
      subscribeTranslation(
        noteId, targetLanguage,
        (translation) => {
          translationCache.set(key, translation);
          resolve(translation);
        },
        () => fetchViaCache(sanitized, targetLanguage, noteId, key, resolve),
        8_000,
      );
    } else {
      fetchViaCache(sanitized, targetLanguage, noteId, key, resolve);
    }
  });
}

function fetchViaCache(
  sanitized: string,
  targetLanguage: string,
  noteId: string | undefined,
  key: string,
  resolve: (val: string | null) => void,
) {
  const subId = `translate_${Math.random().toString(36).slice(2, 10)}`;

  const timeout = setTimeout(() => {
    resolve(null);
  }, 10_000);

  const unsub = subsTo(subId, {
    onEvent: (_, content: any) => {
      clearTimeout(timeout);
      unsub();

      const translation = content?.translation || null;
      if (translation) {
        translationCache.set(key, translation);
      }

      resolve(translation);
    },
    onEose: () => {
      clearTimeout(timeout);
      unsub();
      resolve(null);
    },
  });

  const payload: Record<string, any> = {
    text: sanitized,
    target: targetLanguage,
  };

  if (noteId) {
    payload.noteId = noteId;
  }

  sendMessage(JSON.stringify([
    "REQ", subId,
    { cache: ["translate", payload] },
  ]));
}
