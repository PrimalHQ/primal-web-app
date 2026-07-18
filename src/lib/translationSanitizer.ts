export type SanitizedContent = { content: string, placeholders: string[] };

const placeholderPattern = /__PRIMAL_PROTECTED_(\d+)__/g;
const protectedTokenPattern = /nostr:(?:npub|nprofile|note|nevent|naddr)1[023456789acdefghjklmnpqrstuvwxyz]+|https?:\/\/[^\s]+|www\.[^\s]+|#[\p{L}\p{N}_-]+|:[A-Za-z0-9_+-]+:/giu;

/** Replaces tokens that must never leave the client before provider requests. */
export const sanitizeForTranslation = (content: string): SanitizedContent => {
  const placeholders: string[] = [];
  const sanitized = content.replace(protectedTokenPattern, (token) => {
    const index = placeholders.push(token) - 1;
    return `__PRIMAL_PROTECTED_${index}__`;
  });
  return { content: sanitized, placeholders };
};

export const restoreTranslationContent = (content: string, placeholders: string[]) =>
  content.replace(placeholderPattern, (match, index) => placeholders[Number(index)] || match);
