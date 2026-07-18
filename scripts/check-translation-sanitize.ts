import { restoreTranslationContent, sanitizeForTranslation } from '../src/lib/translationSanitizer.ts';

const original = 'Hi nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq visit https://example.com/a #nostr :party_parrot:';
const sanitized = sanitizeForTranslation(original);
const restored = restoreTranslationContent(sanitized.content, sanitized.placeholders);

if (restored !== original || /nostr:|https?:\/\/|#nostr|:party_parrot:/.test(sanitized.content)) {
  throw new Error('Translation sanitization round-trip failed');
}

console.log('translation sanitize round-trip: PASS');
