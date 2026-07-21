export type SanitizedContent = {
  content: string;
  placeholders: string[];
};

const PLACEHOLDER_RE = /__PRIMAL_PROTECTED_(\d+)__/g;

/**
 * Tokens that must not be sent to a translation provider (Nostr refs, URLs,
 * hashtags, emoji shortcodes, lightning invoices).
 */
const PROTECTED_TOKEN_RE =
  /nostr:(?:npub|nprofile|note|nevent|naddr)1[023456789acdefghjklmnpqrstuvwxyz]+|(?:npub|nprofile|note|nevent|naddr)1[023456789acdefghjklmnpqrstuvwxyz]+|lnbc[0-9a-z]+|https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|#[\p{L}\p{N}_-]+|:[A-Za-z0-9_+-]+:/giu;

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
): string =>
  content.replace(PLACEHOLDER_RE, (_match, index) => {
    const i = Number(index);
    return Number.isInteger(i) && placeholders[i] !== undefined
      ? placeholders[i]
      : _match;
  });
