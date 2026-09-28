/** Protect Nostr/Bitcoin entities so translators cannot rewrite them. */

const PROTECTED_TOKEN_RE =
  /https?:\/\/[^\s<>"']+|nostr:[a-z0-9]+1[ac-hj-np-z02-9]+|lightning:[^\s<>"']+|lnbc[0-9a-z]+|lnurl1[ac-hj-np-z02-9]+|lno1[ac-hj-np-z02-9]+|cashu[A-Za-z0-9]+|bc1[ac-hj-np-z02-9]{20,}|npub1[ac-hj-np-z02-9]+|note1[ac-hj-np-z02-9]+|nevent1[ac-hj-np-z02-9]+|nprofile1[ac-hj-np-z02-9]+|naddr1[ac-hj-np-z02-9]+|nrelay1[ac-hj-np-z02-9]+|#[\p{L}\p{N}_-]+|@[\p{L}\p{N}_.-]+/giu;

const PLACEHOLDER_RE = /__PRIMAL_TX_(\d+)__/g;
const MANGLED_PLACEHOLDER_RE = /[_*]{0,2}PRIMAL[_*\s-]?TX[_*\s-]?(\d+)[_*]{0,2}/gi;

export type SanitizedPayload = {
  content: string;
  placeholders: string[];
};

export const sanitizeForTranslation = (raw: string): SanitizedPayload => {
  const placeholders: string[] = [];
  const content = raw.replace(PROTECTED_TOKEN_RE, (token) => {
    const index = placeholders.push(token) - 1;
    return `__PRIMAL_TX_${index}__`;
  });
  return { content, placeholders };
};

export const restoreTranslationContent = (
  translated: string,
  placeholders: string[],
): string => {
  let out = translated.replace(PLACEHOLDER_RE, (_m, index) => {
    const i = Number(index);
    return Number.isInteger(i) && placeholders[i] !== undefined ? placeholders[i] : _m;
  });
  out = out.replace(MANGLED_PLACEHOLDER_RE, (match, index) => {
    const i = Number(index);
    return Number.isInteger(i) && placeholders[i] !== undefined ? placeholders[i] : match;
  });
  return out;
};

/** Heuristic: offer translate when text looks non-English / long enough. */
export const shouldOfferTranslation = (content: string): boolean => {
  const trimmed = content.trim();
  if (trimmed.length < 12) return false;
  const letters = trimmed.replace(/[^\p{L}]/gu, '');
  if (letters.length < 8) return false;
  // Always offer for substantial notes; user may still want EN→other.
  return true;
};
