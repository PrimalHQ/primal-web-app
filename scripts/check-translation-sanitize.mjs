import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const rel of [
  'src/lib/translationSanitizer.ts',
  'src/lib/translation.ts',
  'src/components/NoteTranslate/NoteTranslate.tsx',
  'src/pages/Settings/Translation.tsx',
]) {
  assert.ok(existsSync(join(root, rel)), `${rel} must exist`);
}

const sanitizerSrc = readFileSync(join(root, 'src/lib/translationSanitizer.ts'), 'utf8');
const translationSrc = readFileSync(join(root, 'src/lib/translation.ts'), 'utf8');
assert.match(sanitizerSrc, /export const sanitizeForTranslation/);
assert.match(sanitizerSrc, /export const restoreTranslationContent/);
assert.match(sanitizerSrc, /bc1/);
assert.match(sanitizerSrc, /lno1/);
assert.match(sanitizerSrc, /cashu/);
assert.match(sanitizerSrc, /shouldOfferTranslation/);
assert.match(translationSrc, /export const translateNoteContent/);
assert.match(translationSrc, /normalizeLibreTranslateBaseUrl/);
assert.match(translationSrc, /AbortController/);
assert.match(translationSrc, /translation\.googleapis\.com/);
assert.match(translationSrc, /api\.deepl\.com/);

const reMatch = sanitizerSrc.match(/const PROTECTED_TOKEN_RE =\s*(\/[\s\S]*?\/[a-z]*);/);
assert.ok(reMatch, 'PROTECTED_TOKEN_RE extractable');
const PROTECTED_TOKEN_RE = eval(reMatch[1]);

function sanitizeForTranslation(content) {
  const placeholders = [];
  const sanitized = content.replace(PROTECTED_TOKEN_RE, (token) => {
    const index = placeholders.push(token) - 1;
    return `__PRIMAL_TX_${index}__`;
  });
  return { content: sanitized, placeholders };
}
function restoreTranslationContent(content, placeholders) {
  return content.replace(/__PRIMAL_TX_(\d+)__/g, (_m, index) => {
    const i = Number(index);
    return Number.isInteger(i) && placeholders[i] !== undefined ? placeholders[i] : _m;
  });
}

const sample =
  'Hola see https://example.com and @alice and nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq and #bitcoin and lnbc1testinvoice and lno1offerxyz and cashuAabc123 and bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const protectedPayload = sanitizeForTranslation(sample);
assert.ok(!protectedPayload.content.includes('https://example.com'));
assert.ok(protectedPayload.placeholders.some((p) => p.includes('https://example.com')));
const roundTrip = restoreTranslationContent(
  protectedPayload.content.replace(/Hola/g, 'Hello'),
  protectedPayload.placeholders,
);
assert.match(roundTrip, /https:\/\/example\.com/);
assert.match(roundTrip, /#bitcoin/);
assert.match(roundTrip, /@alice/);
console.log('check:translation OK');
