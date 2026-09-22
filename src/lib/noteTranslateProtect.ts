/**
 * Shield Nostr/payment/link tokens so a translator cannot rewrite them.
 * Placeholders are restored even when a provider inserts spaces or changes case.
 */

export type ShieldedNote = {
  payload: string;
  slots: string[];
};

const SLOT = (i: number, namespace = 'NTX') =>
  namespace === 'NTX'
    ? `⟦NTX${String(i).padStart(3, '0')}⟧`
    : `⟦${namespace}:${String(i).padStart(3, '0')}⟧`;
const SLOT_FIND = /⟦\s*NTX\s*(\d{1,3})\s*⟧|\[\s*NTX\s*(\d{1,3})\s*\]|\bNTX\s*(\d{1,3})\b/gi;
const SLOT_STRIP = /⟦NTX\d{3}⟧/g;

const PATTERNS: RegExp[] = [
  /```[\s\S]*?```/g,
  /`[^`]+`/g,
  /https?:\/\/[^\s<>()]+/gi,
  /www\.[^\s<>()]+/gi,
  /lightning:[^\s<>()]+/gi,
  /bitcoin:[^\s<>()]+/gi,
  /nostr:[a-z0-9]+1[ac-hj-np-z02-9]{6,}/gi,
  /\b(?:npub|nsec|nprofile|nevent|naddr|note|nrelay)1[ac-hj-np-z02-9]{6,}\b/gi,
  /\bln(bc|tb|bcrt)[0-9a-z]+/gi,
  /\blnurl1[ac-hj-np-z02-9]+/gi,
  /\blno1[ac-hj-np-z02-9]+/gi,
  /\blni1[ac-hj-np-z02-9]+/gi,
  /\bcashu[AB][A-Za-z0-9_-]+=*/g,
  /\b(?:bc1|tb1|bcrt1)[ac-hj-np-z02-9]{8,}\b/gi,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /:[a-zA-Z0-9_+-]+:/g,
  /#([\p{L}\p{N}_-]+)/gu,
  /@([a-zA-Z0-9_.]{1,64})/g,
];

const LETTER = /\p{L}/u;
const MIN_LETTERS = 8;

export const shieldNoteText = (source: string, namespace = 'NTX'): ShieldedNote => {
  let payload = source || '';
  const slots: string[] = [];
  const safeNamespace = /^[A-Z0-9]+$/.test(namespace) ? namespace : 'NTX';

  for (const pattern of PATTERNS) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    payload = payload.replace(re, (match) => {
      if (safeNamespace === 'NTX' && match.includes('⟦NTX')) return match;
      const id = slots.length;
      slots.push(match);
      return SLOT(id, safeNamespace);
    });
  }

  return { payload, slots };
};

export const restoreNoteText = (translated: string, slots: string[]): string => {
  if (!translated) return '';

  const replaceOnce = (input: string) => input.replace(SLOT_FIND, (full, a, b, c) => {
    const raw = a ?? b ?? c;
    const index = Number.parseInt(raw, 10);
    if (!Number.isFinite(index) || index < 0 || index >= slots.length) {
      return full;
    }
    return slots[index];
  });

  let out = translated;
  for (let i = 0; i < 4; i += 1) {
    const next = replaceOnce(out);
    if (next === out) break;
    out = next;
  }
  return out;
};

export const letterCount = (text: string): number => {
  let n = 0;
  for (const ch of text) {
    if (LETTER.test(ch)) n += 1;
  }
  return n;
};

const proseOf = (source: string): string => {
  return shieldNoteText(source).payload.replace(SLOT_STRIP, ' ');
};

export const hasTranslatableProse = (source: string): boolean => {
  return letterCount(proseOf(source)) >= MIN_LETTERS;
};

export const guessScriptLanguage = (source: string): string | undefined => {
  const payload = proseOf(source);
  if (/[\u3040-\u30ff]/.test(payload)) return 'ja';
  if (/[\uac00-\ud7af]/.test(payload)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(payload)) return 'zh';
  if (/[\u0600-\u06ff]/.test(payload)) return 'ar';
  if (/[\u0590-\u05ff]/.test(payload)) return 'he';
  if (/[\u0400-\u04ff]/.test(payload)) return 'ru';
  if (/[\u0900-\u097f]/.test(payload)) return 'hi';
  if (/[\u0e00-\u0e7f]/.test(payload)) return 'th';
  return undefined;
};

export const languageBase = (tag: string): string => {
  return (tag || '').trim().toLowerCase().split(/[-_]/)[0] || '';
};

export const shouldOfferTranslate = (source: string, targetLanguage: string): boolean => {
  if (!hasTranslatableProse(source)) return false;
  const guessed = guessScriptLanguage(source);
  if (!guessed) return true;
  return guessed !== languageBase(targetLanguage);
};

const BLOCKED_DEFAULT_HOSTS = new Set([
  'libretranslate.com',
  'www.libretranslate.com',
  'translate.googleapis.com',
  'translate.google.com',
  'translation.googleapis.com',
]);

export const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const normalizeOwnedLibreTranslateUrl = (raw: string): string | { error: string } => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { error: 'missing_url' };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { error: 'invalid_url' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'invalid_url' };
  }

  const path = parsed.pathname.replace(/\/+$/, '');
  if (!path || path === '') {
    parsed.pathname = '/translate';
  } else if (!/\/translate$/i.test(path)) {
    parsed.pathname = `${path}/translate`;
  } else {
    parsed.pathname = path;
  }

  return parsed.toString();
};

export const isBlockedImplicitHost = (raw: string): boolean => {
  try {
    return BLOCKED_DEFAULT_HOSTS.has(new URL(raw).hostname.toLowerCase());
  } catch {
    return false;
  }
};
