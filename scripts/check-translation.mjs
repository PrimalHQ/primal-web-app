/**
 * Behavioral checks for note translation (issue #133).
 *
 * Exercises the PROTECTED_TOKEN_RE shipped in
 * `src/lib/translationSanitizer.ts` (extracted from source, so the checks
 * cannot drift away from the implementation) and verifies mask/restore
 * round-trips for every protected token class, plus the structural
 * requirements of the translation service and UI wiring.
 *
 * Run: npm run check:translation
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const sanitizerPath = join(root, 'src/lib/translationSanitizer.ts');
const translationPath = join(root, 'src/lib/translation.ts');
const detectPath = join(root, 'src/lib/languageDetect.ts');
const componentPath = join(root, 'src/components/NoteTranslate/NoteTranslate.tsx');
const settingsPath = join(root, 'src/pages/Settings/Translation.tsx');

for (const p of [sanitizerPath, translationPath, detectPath, componentPath, settingsPath]) {
  assert.ok(existsSync(p), `${p} must exist`);
}

const sanitizerSrc = readFileSync(sanitizerPath, 'utf8');
const translationSrc = readFileSync(translationPath, 'utf8');
const componentSrc = readFileSync(componentPath, 'utf8');

// --- Structural expectations -------------------------------------------------
assert.match(sanitizerSrc, /export const maskProtectedTokens/);
assert.match(sanitizerSrc, /export const restoreProtectedTokens/);
assert.match(sanitizerSrc, /export const shouldOfferTranslation/);
assert.match(translationSrc, /export const translateNoteContent/);
assert.match(translationSrc, /export const normalizeTranslationEndpoint/);
assert.match(translationSrc, /export const createLibreTranslateProvider/);
assert.match(translationSrc, /AbortSignal/);
assert.match(translationSrc, /CACHE_MAX_ENTRIES/);
assert.match(componentSrc, /translateNoteContent/);
assert.match(componentSrc, /showOriginal/);
assert.doesNotMatch(translationSrc, /translate\.googleapis\.com|googleapis\.com\/language/);
assert.doesNotMatch(translationSrc, /translate\.google\.com\/translate_a/);

// --- Extract and exercise the shipped regex ----------------------------------
const reMatch = sanitizerSrc.match(/export const PROTECTED_TOKEN_RE =\s*(\/[\s\S]*?\/[a-z]*);/);
assert.ok(reMatch, 'PROTECTED_TOKEN_RE extractable from source');
const PROTECTED_TOKEN_RE = eval(reMatch[1]);

const PLACEHOLDER_RE = /__PROTECTED_(\d+)__/g;
const MANGLED_PLACEHOLDER_RE = /[_*]{0,2}PROTECTED[_*\s-]?(\d+)[_*]{0,2}/gi;

function mask(content) {
  const tokens = [];
  const text = content.replace(PROTECTED_TOKEN_RE, (token) => {
    const index = tokens.push(token) - 1;
    return `__PROTECTED_${index}__`;
  });
  return { text, tokens };
}

function restore(content, tokens) {
  const lookup = (index, fallback) => {
    const i = parseInt(index, 10);
    return Number.isInteger(i) && tokens[i] !== undefined ? tokens[i] : fallback;
  };
  return content
    .replace(PLACEHOLDER_RE, (m, i) => lookup(i, m))
    .replace(MANGLED_PLACEHOLDER_RE, (m, i) => lookup(i, m));
}

// --- Round-trip cases ----------------------------------------------------------
const NPUB = 'npub1sg6plzptd64u62a878hep2kev37swjh3tw00gjsfl8f237lmu63q0uf63m';
const NEVENT = 'nevent1qqs2sa3zk20qm3we9xxv0jvldxxdd7c8k8dq7dh4h0285gpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgspwaehxw309ahx7um5wghx6unpdenh2tcp0qq';
const INVOICE = 'lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfpg9scrgwpug34xsejvtdghgqn0h9ynqp4sp5kgerxe5c3vdxsuazqvf5dvhgzr5y54rfzl2zk2ks8tgcpyzf5cqzqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
const CASHU = 'cashuAeyJ0b2tlbiI6W3sicHJvb2ZzIjpbeyJhbW91bnQiOjEsImlkIjoiMDA5YTFmMjkzMjM4YzRkYSIsInNlY3JldCI6IngifV0sIm1pbnQiOiJodHRwczovL21pbnQifV19';
const BC1 = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const cases = [
  `Hello nostr:${NPUB} how are you?`,
  `Read this ${NEVENT} later #nostr #bitcoin`,
  `Check https://example.com/some/path?x=1 and www.example.org too`,
  `Ping @alice and @bob.smith about it`,
  `See #[0] for details, and #[12] too`,
  `Zap me ${INVOICE} please`,
  `Token: ${CASHU} end`,
  `Send to ${BC1} thanks`,
  `Feeling great :fire: today`,
  `Multi #tag_one and #tag2 with nostr:${NPUB} plus ${INVOICE}`,
];

for (const original of cases) {
  const { text, tokens } = mask(original);
  // Nothing protected may leak into the masked text.
  for (const token of tokens) {
    assert.ok(!text.includes(token), `token leaked into masked text: ${token.slice(0, 24)}...`);
  }
  // Identity "translation" must restore the original exactly.
  assert.equal(restore(text, tokens), original, `round-trip failed for: ${original.slice(0, 40)}...`);
}

// Simulated provider output: words changed, placeholders intact.
{
  const original = `Hello nostr:${NPUB} see https://example.com #nostr`;
  const { text, tokens } = mask(original);
  const fakeTranslated = text.replace('Hello', 'Hola').replace('see', 'mira');
  assert.equal(
    restore(fakeTranslated, tokens),
    `Hola nostr:${NPUB} mira https://example.com #nostr`,
  );
}

// Simulated provider mangling: underscores around a placeholder dropped.
{
  const original = `Hello nostr:${NPUB} world`;
  const { tokens } = mask(original);
  const mangled = 'Hola PROTECTED 0 mundo';
  assert.equal(restore(mangled, tokens), `Hola nostr:${NPUB} mundo`);
}

// Token-only content yields no prose (the UI hides Translate for these).
{
  const { text } = mask(`nostr:${NPUB}`);
  const prose = text.replace(PLACEHOLDER_RE, ' ').trim();
  assert.equal(prose, '');
}

console.log('check-translation: all checks passed');
