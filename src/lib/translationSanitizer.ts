export type ShieldedContent = {
  prefix: string;
  shieldedText: string;
  tokens: string[];
};

const TRAILING_PUNCT_RE = /[.,;:!?"'…]+$/;

const PROTECTED_TOKEN_RE = new RegExp(
  [
    // Fenced code blocks
    '```[\\s\\S]*?```',
    // Inline code spans
    '`[^`\\r\\n]+`',
    // HTTP(S) URLs
    'https?:\\/\\/[^\\s<>]+',
    // Unified Bitcoin / Lightning URIs
    '(?:bitcoin|lightning):[^\\s<>]+',
    // Nostr URIs & bare Bech32 Nostr identifiers
    '(?:nostr:)?(?:npub|nprofile|note|nevent|naddr|nrelay)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{20,}',
    // Lightning BOLT11 (with optional amount/multiplier), BOLT12 offers, and LNURLs
    '(?:(?:lnbc|lntb|lnbcrt)(?:\\d+[munp]?)?|lno|lnurl)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{20,}',
    // Cashu ecash tokens
    'cashu[AB][A-Za-z0-9_\\-+=]{20,}',
    // Bitcoin Bech32 / Bech32m addresses
    '\\bbc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{25,87}\\b',
    // Legacy NIP-08 tag mentions (#[0])
    '#\\[\\d+\\]',
    // Email / NIP-05 identifiers
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
    // Custom emoji shortcodes (:shortcode:)
    ':[A-Za-z0-9_+-]{2,}:',
    // @mentions
    '(?<![\\p{L}\\p{N}_])@[A-Za-z0-9._-]+',
    // Unicode hashtags (excluding pure numeric tags like #123)
    '(?<![\\p{L}\\p{N}_])#(?![0-9]+(?![\\p{L}\\p{N}_]))[\\p{L}\\p{N}_-]+',
  ].join('|'),
  'giu',
);

const UNICODE_LETTER_RE = /\p{L}/gu;

const countChar = (value: string, target: string): number => {
  let count = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === target) count += 1;
  }
  return count;
};

/**
 * Strips trailing sentence punctuation and unbalanced closing brackets from
 * URL-like tokens while keeping balanced parentheses (e.g. Wikipedia URLs).
 */
const splitTrailingPunctuation = (token: string): { core: string; suffix: string } => {
  if (!/^(?:https?:\/\/|bitcoin:|lightning:)/i.test(token)) {
    return { core: token, suffix: '' };
  }

  let core = token;
  let suffix = '';

  while (core.length > 0) {
    const punctMatch = core.match(TRAILING_PUNCT_RE);
    if (punctMatch) {
      suffix = punctMatch[0] + suffix;
      core = core.slice(0, core.length - punctMatch[0].length);
      continue;
    }

    const last = core[core.length - 1];
    if (last === ')' && countChar(core, ')') > countChar(core, '(')) {
      suffix = last + suffix;
      core = core.slice(0, -1);
      continue;
    }
    if (last === ']' && countChar(core, ']') > countChar(core, '[')) {
      suffix = last + suffix;
      core = core.slice(0, -1);
      continue;
    }
    if (last === '}' && countChar(core, '}') > countChar(core, '{')) {
      suffix = last + suffix;
      core = core.slice(0, -1);
      continue;
    }
    break;
  }

  return { core, suffix };
};

/**
 * Picks a deterministic alphanumeric prefix that does not occur anywhere in the
 * source text even after removing punctuation/whitespace and case-folding.
 * Ending the prefix with 'X' prevents numeric ambiguity with the token index.
 */
const chooseSafePrefix = (source: string): string => {
  const normalized = source.toLowerCase().replace(/[^a-z0-9]/g, '');
  let counter = 0;
  while (true) {
    const candidate = `PRIMALTOK${counter}X`;
    if (!normalized.includes(candidate.toLowerCase())) {
      return candidate;
    }
    counter += 1;
  }
};

export const shieldNoteContent = (content: string): ShieldedContent => {
  const prefix = chooseSafePrefix(content);
  const tokens: string[] = [];

  const shieldedText = content.replace(PROTECTED_TOKEN_RE, (fullMatch) => {
    const { core, suffix } = splitTrailingPunctuation(fullMatch);
    if (!core) return fullMatch;

    const index = tokens.push(core) - 1;
    return `[[${prefix}_${index}]]${suffix}`;
  });

  return { prefix, shieldedText, tokens };
};

/**
 * Restores shielded tokens in a single regex pass so restored values are never
 * re-scanned. Tolerates common MT whitespace/casing/bracket transformations
 * around the source-absent prefix while leaving out-of-bounds indices intact.
 */
export const restoreNoteContent = (
  translated: string,
  shielded: ShieldedContent,
): string => {
  if (shielded.tokens.length === 0) {
    return translated;
  }

  const spacedPrefix = shielded.prefix.split('').join('\\s*');
  const restoreRegex = new RegExp(
    `\\[\\s*\\[\\s*${spacedPrefix}\\s*[_:\\-\\s]?\\s*(\\d+)\\s*\\]\\s*\\]` +
    `|\\[\\s*${spacedPrefix}\\s*[_:\\-\\s]?\\s*(\\d+)\\s*\\]` +
    `|${spacedPrefix}\\s*[_:\\-\\s]?\\s*(\\d+)\\b`,
    'gi',
  );

  return translated.replace(restoreRegex, (match, g1, g2, g3) => {
    const index = Number(g1 ?? g2 ?? g3);
    if (!Number.isInteger(index) || index < 0 || index >= shielded.tokens.length) {
      return match;
    }
    return shielded.tokens[index];
  });
};

/**
 * Returns true only when the note contains meaningful translatable prose
 * (at least 3 Unicode letters remaining after shielding Nostr/Web/Bitcoin tokens).
 */
export const shouldOfferTranslation = (content?: string): boolean => {
  if (!content) return false;
  const trimmed = content.trim();
  if (trimmed.length < 3) return false;

  const shielded = shieldNoteContent(trimmed);
  const placeholderRegex = new RegExp(`\\[\\[${shielded.prefix}_\\d+\\]\\]`, 'g');
  const proseOnly = shielded.shieldedText.replace(placeholderRegex, ' ');
  const letters = proseOnly.match(UNICODE_LETTER_RE);

  return (letters?.length ?? 0) >= 3;
};

export const normalizeLanguageTag = (lang?: string): string => {
  if (!lang) return 'en';
  const cleaned = lang.trim().replace(/_/g, '-');
  if (!cleaned) return 'en';

  const parts = cleaned.split('-').filter(Boolean);
  if (parts.length === 0) return 'en';

  const primary = parts[0].toLowerCase();
  if (parts.length === 1) return primary;

  const second = parts[1];
  // Script subtag (e.g. zh-Hans, zh-Hant)
  if (second.length === 4) {
    return `${primary}-${second[0].toUpperCase()}${second.slice(1).toLowerCase()}`;
  }
  // Region subtag (e.g. pt-BR, zh-CN, en-US)
  if (second.length === 2 || /^\d{3}$/.test(second)) {
    return `${primary}-${second.toUpperCase()}`;
  }

  return primary;
};

export const toLibreTranslateLanguage = (lang: string): string => {
  const normalized = normalizeLanguageTag(lang);
  if (normalized === 'zh-Hans' || normalized === 'zh-CN' || normalized === 'zh-SG') {
    return 'zh-Hans';
  }
  if (normalized === 'zh-Hant' || normalized === 'zh-TW' || normalized === 'zh-HK') {
    return 'zh-Hant';
  }
  if (normalized === 'pt-BR') {
    return 'pt';
  }
  return normalized.split('-')[0].toLowerCase();
};

export const toGoogleTranslateLanguage = (lang: string): string => {
  const normalized = normalizeLanguageTag(lang);
  if (normalized === 'zh-Hans' || normalized === 'zh-CN' || normalized === 'zh-SG') {
    return 'zh-CN';
  }
  if (normalized === 'zh-Hant' || normalized === 'zh-TW' || normalized === 'zh-HK') {
    return 'zh-TW';
  }
  return normalized.split('-')[0].toLowerCase();
};

const canonicalComparableLanguage = (lang?: string): string | undefined => {
  if (!lang) return undefined;
  const normalized = normalizeLanguageTag(lang);
  if (normalized === 'zh-Hans' || normalized === 'zh-CN' || normalized === 'zh-SG') {
    return 'zh-Hans';
  }
  if (normalized === 'zh-Hant' || normalized === 'zh-TW' || normalized === 'zh-HK') {
    return 'zh-Hant';
  }
  return normalized.split('-')[0].toLowerCase();
};

export const isSameLanguage = (source?: string, target?: string): boolean => {
  const src = canonicalComparableLanguage(source);
  const tgt = canonicalComparableLanguage(target);
  if (!src || !tgt) return false;
  return src === tgt;
};

export const formatLanguageName = (code: string, displayLocale = 'en'): string => {
  const normalized = normalizeLanguageTag(code);
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      const displayNames = new Intl.DisplayNames([displayLocale], { type: 'language' });
      const label = displayNames.of(normalized);
      if (label) return label;
    }
  } catch {
    // Fallback to normalized language code below
  }
  return normalized;
};
