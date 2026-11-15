/**
 * Entity protection for note translation.
 *
 * Note content contains tokens that a translation provider must never see,
 * because it would mangle them beyond recognition: Nostr identifiers and
 * references, URLs, hashtags, mentions, Lightning invoices/offers, Cashu
 * tokens and Bitcoin addresses. Before content is sent to a provider, every
 * such token is replaced with a numbered placeholder; after translation the
 * placeholders are swapped back for the original tokens, verbatim.
 *
 * See: https://github.com/PrimalHQ/primal-web-app/issues/133
 */

export type MaskedContent = {
  /** Content with every protected token replaced by a placeholder. */
  text: string,
  /** Original tokens, in placeholder order. */
  tokens: string[],
};

/**
 * Matches every token type that must survive translation intact.
 * Alternation order matters: longer / more specific forms come first so
 * that, e.g., a `nostr:npub...` URI is masked as one token instead of
 * being partially matched by the bare-bech32 alternative.
 * (The bech32 character set is `qpzry9x8gf2tvdw0s3jn54khce6mua7l`.)
 */
export const PROTECTED_TOKEN_RE =
  /nostr:(?:npub|nprofile|note|nevent|naddr|nrelay)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+|(?:npub|nprofile|note|nevent|naddr|nrelay)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+|#\[\d+\]|https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|lightning:[^\s<>"']+|lnbc[0-9a-z]+|lno1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+|lni1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+|lnurl1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+|cashu[AB][A-Za-z0-9+/=_-]{16,}|bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{20,}|#[\p{L}\p{N}_]+|@[\p{L}\p{N}_][\p{L}\p{N}_.-]*|:[a-zA-Z0-9_+-]+:/giu;

export const PLACEHOLDER_RE = /__PROTECTED_(\d+)__/g;

// Providers sometimes drop or re-space the underscores around a
// placeholder; this second-chance pattern catches those light manglings.
const MANGLED_PLACEHOLDER_RE = /[_*]{0,2}PROTECTED[_*\s-]?(\d+)[_*]{0,2}/gi;

export const placeholderFor = (index: number) => `__PROTECTED_${index}__`;

/** Replace every protected token in `content` with a numbered placeholder. */
export const maskProtectedTokens = (content: string): MaskedContent => {
  const tokens: string[] = [];

  const text = (content || '').replace(PROTECTED_TOKEN_RE, (token) => {
    const index = tokens.push(token) - 1;
    return placeholderFor(index);
  });

  return { text, tokens };
};

/** Swap placeholders in a translated text back to the original tokens. */
export const restoreProtectedTokens = (content: string, tokens: string[]): string => {
  const lookup = (index: string, fallback: string) => {
    const i = parseInt(index, 10);
    return Number.isInteger(i) && tokens[i] !== undefined ? tokens[i] : fallback;
  };

  return (content || '')
    .replace(PLACEHOLDER_RE, (match, index) => lookup(index, match))
    .replace(MANGLED_PLACEHOLDER_RE, (match, index) => lookup(index, match));
};

/** The translatable prose of a note: content minus protected tokens. */
export const extractProse = (content: string): string => {
  const { text } = maskProtectedTokens(content || '');
  return text.replace(PLACEHOLDER_RE, ' ').replace(/\s+/g, ' ').trim();
};

/** Minimum trimmed length before a note is worth offering translation for. */
export const MIN_TRANSLATABLE_LENGTH = 10;

/** Minimum prose (after masking) before a note is worth translating. */
export const MIN_PROSE_LENGTH = 4;

/**
 * Should the "Translate" action be offered for this note at all?
 * Hides the action on tiny notes, notes without letters, and notes made
 * only of protected tokens (a bare npub, a URL, an invoice, ...).
 * Language-based gating (note already in the user's language) happens in
 * the component, using `detectLanguage` from `./languageDetect`.
 */
export const shouldOfferTranslation = (content: string): boolean => {
  const trimmed = (content || '').trim();

  if (trimmed.length < MIN_TRANSLATABLE_LENGTH) return false;
  if (!/\p{L}/u.test(trimmed)) return false;

  const prose = extractProse(trimmed);
  return prose.length >= MIN_PROSE_LENGTH && /\p{L}/u.test(prose);
};
