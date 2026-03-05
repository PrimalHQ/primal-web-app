import { nip19 } from './nTools';
import { urlRegexG } from '../constants';

const bech32Chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const nip19Prefixes = ['nevent1', 'npub1', 'nprofile1', 'naddr1', 'note1'];

const nip19InUrlRegex = new RegExp(
  `\\b(${nip19Prefixes.join('|')})([${bech32Chars}]+)`, 'i'
);

/** Extract a valid NIP-19 bech32 identifier from a URL string. Returns null if none found. */
function extractBech32FromUrl(url: string): string | null {
  const match = url.match(nip19InUrlRegex);
  if (!match) return null;

  const candidate = match[1] + match[2];

  try {
    nip19.decode(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/** Returns true if text contains any HTTP(S) URL with a NIP-19 bech32 identifier. */
export function checkForNostrWebLinks(text: string): boolean {
  const urlMatches = text.match(urlRegexG);
  if (!urlMatches) return false;

  for (const url of urlMatches) {
    if (extractBech32FromUrl(url) !== null) {
      return true;
    }
  }

  return false;
}

/**
 * Replaces HTTP(S) URLs containing NIP-19 bech32 identifiers with nostr:{bech32}.
 * Validates each with nip19.decode(). Skips nsec1.
 */
export function convertNostrWebLinksToNative(content: string): string {
  const matches: { index: number; length: number; replacement: string }[] = [];

  let match: RegExpExecArray | null;
  const regex = new RegExp(urlRegexG.source, urlRegexG.flags);

  while ((match = regex.exec(content)) !== null) {
    const url = match[0];

    // Skip nostr: scheme URLs
    if (/^nostr:/i.test(url)) continue;

    // Skip URLs containing nsec1
    if (/nsec1/i.test(url)) continue;

    const bech32 = extractBech32FromUrl(url);
    if (bech32) {
      // Preserve trailing punctuation that urlRegexG absorbed from surrounding text
      const punctMatch = url.match(/[.,;!?)]+$/);
      const suffix = punctMatch ? punctMatch[0] : '';

      matches.push({
        index: match.index,
        length: url.length,
        replacement: `nostr:${bech32}${suffix}`,
      });
    }
  }

  // Process replacements back-to-front to preserve string indices
  let result = content;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    result = result.slice(0, m.index) + m.replacement + result.slice(m.index + m.length);
  }

  return result;
}
