export type SanitizedContent = {
  content: string;
  placeholders: string[];
};

const PLACEHOLDER_RE = /__PRIMAL_PROTECTED_(\d+)__/g;

/**
 * Tokens that must not be sent to a translation provider (Nostr refs, URLs,
 * hashtags, @mentions, emoji shortcodes, lightning invoices/offers, LNURLs,
 * cashu, bc1).
 */
const PROTECTED_TOKEN_RE =
  /nostr:(?:npub|nprofile|note|nevent|naddr|nrelay)1[023456789acdefghjklmnpqrstuvwxyz]+|(?:npub|nprofile|note|nevent|naddr|nrelay)1[023456789acdefghjklmnpqrstuvwxyz]+|lightning:(?:lnbc|lno|lni|lnurl)[0-9a-z]+|lnbc[0-9a-z]+|lno1[0-9a-z]+|lni1[0-9a-z]+|lnurl1[0-9a-z]+|cashu[A-Za-z0-9][A-Za-z0-9+/=_-]+|bc1[0-9a-z]+|https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|#[\p{L}\p{N}_-]+|@[\p{L}\p{N}_.-]+|:[A-Za-z0-9_+-]+:/giu;

/** Minimum length (after trim) before offering Translate on a note. */
export const MIN_TRANSLATE_LENGTH = 12;

// Providers sometimes mangle underscores / spacing in placeholders.
const MANGLED_PLACEHOLDER_RE =
  /[_*]{0,2}PRIMAL[_*\s-]?PROTECTED[_*\s-]?(\d+)[_*]{0,2}/gi;

export const sanitizeForTranslation = (content: string): SanitizedContent => {
  const placeholders: string[] = [];
  const sanitized = content.replace(PROTECTED_TOKEN_RE, (token) => {
    const index = placeholders.push(token) - 1;
    return `__PRIMAL_PROTECTED_${index}__`;
  });
  return { content: sanitized, placeholders };
};

export const restoreTranslationContent = (
  content: string,
  placeholders: string[],
): string => {
  let out = content.replace(PLACEHOLDER_RE, (_match, index) => {
    const i = Number(index);
    return Number.isInteger(i) && placeholders[i] !== undefined
      ? placeholders[i]
      : _match;
  });
  // Second pass for lightly mangled placeholders (e.g. dropped underscores).
  out = out.replace(MANGLED_PLACEHOLDER_RE, (match, index) => {
    const i = Number(index);
    return Number.isInteger(i) && placeholders[i] !== undefined
      ? placeholders[i]
      : match;
  });
  return out;
};

/**
 * Hide Translate on tiny notes, notes with no letters, or notes that are only
 * protected tokens (npubs, invoices, URLs, etc.) after sanitization.
 */
export const shouldOfferTranslation = (content: string): boolean => {
  const trimmed = (content || '').trim();
  if (trimmed.length < MIN_TRANSLATE_LENGTH) return false;
  if (!/[\p{L}]/u.test(trimmed)) return false;
  // Require real prose after stripping Nostr/Lightning/URL tokens.
  const { content: sanitized } = sanitizeForTranslation(trimmed);
  const prose = sanitized.replace(/__PRIMAL_PROTECTED_\d+__/g, ' ').trim();
  return prose.length >= 4 && /[\p{L}]/u.test(prose);
};
