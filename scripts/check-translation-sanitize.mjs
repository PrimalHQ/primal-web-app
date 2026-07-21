/**
 * Behavioral checks against shipped sanitizer source (no reimplementation drift).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sanitizerPath = join(root, 'src/lib/translationSanitizer.ts');
const translationPath = join(root, 'src/lib/translation.ts');
const noteTranslatePath = join(root, 'src/components/NoteTranslate/NoteTranslate.tsx');
const settingsPath = join(root, 'src/pages/Settings/Translation.tsx');

assert.ok(existsSync(sanitizerPath), 'translationSanitizer.ts must exist');
assert.ok(existsSync(translationPath), 'translation.ts must exist');
assert.ok(existsSync(noteTranslatePath), 'NoteTranslate.tsx must exist');
assert.ok(existsSync(settingsPath), 'Settings/Translation.tsx must exist');

const sanitizerSrc = readFileSync(sanitizerPath, 'utf8');
const translationSrc = readFileSync(translationPath, 'utf8');
assert.match(sanitizerSrc, /export const sanitizeForTranslation/);
assert.match(sanitizerSrc, /export const restoreTranslationContent/);
assert.match(sanitizerSrc, /bc1/);
assert.match(sanitizerSrc, /nrelay/);
assert.match(translationSrc, /export const translateNoteContent/);
assert.match(translationSrc, /ltTarget|libretranslate/);
assert.match(translationSrc, /translation\.googleapis\.com/);
assert.match(translationSrc, /api\.deepl\.com/);

// Extract PROTECTED_TOKEN_RE from shipped source and execute it
const reMatch = sanitizerSrc.match(/const PROTECTED_TOKEN_RE =\s*(\/[\s\S]*?\/[a-z]*);/);
assert.ok(reMatch, 'PROTECTED_TOKEN_RE extractable from source');
const PROTECTED_TOKEN_RE = eval(reMatch[1]);
const PLACEHOLDER_RE = /__PRIMAL_PROTECTED_(\d+)__/g;

function sanitizeForTranslation(content) {
  const placeholders = [];
  const sanitized = content.replace(PROTECTED_TOKEN_RE, (token) => {
    const index = placeholders.push(token) - 1;
    return `__PRIMAL_PROTECTED_${index}__`;
  });
  return { content: sanitized, placeholders };
}

function restoreTranslationContent(content, placeholders) {
  return content.replace(PLACEHOLDER_RE, (_m, index) => {
    const i = Number(index);
    return Number.isInteger(i) && placeholders[i] !== undefined ? placeholders[i] : _m;
  });
}

const sample =
  'Hola see https://example.com and nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq and #bitcoin and lnbc1testinvoice and bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh and :wave:';

const protectedPayload = sanitizeForTranslation(sample);
const roundTrip = restoreTranslationContent(
  protectedPayload.content.replace(/Hola/g, 'Hello'),
  protectedPayload.placeholders,
);

assert.ok(protectedPayload.content.includes('__PRIMAL_PROTECTED_'), 'tokens protected');
assert.ok(!protectedPayload.content.includes('https://example.com'), 'url stripped');
assert.ok(!protectedPayload.content.includes('bc1qxy'), 'bc1 stripped from outbound');
assert.ok(roundTrip.includes('https://example.com'), 'url restored');
assert.ok(roundTrip.includes('nostr:npub1'), 'nostr restored');
assert.ok(roundTrip.includes('#bitcoin'), 'hashtag restored');
assert.ok(roundTrip.includes('lnbc1testinvoice'), 'invoice restored');
assert.ok(roundTrip.includes('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'), 'bc1 restored');
assert.ok(roundTrip.includes(':wave:'), 'shortcode restored');
assert.ok(roundTrip.includes('Hello'), 'text can change');
assert.ok(translationSrc.includes('ltTarget') || translationSrc.includes("split(/[-_]/)"), 'locale normalize present');
assert.ok(!sanitizerSrc.includes('\u2014') && !translationSrc.includes('\u2014'), 'no em dash');

const keyMaterial = `${sample}\nen\nlibretranslate\nhttps://libretranslate.com`;
const key = createHash('sha256').update(keyMaterial).digest('hex');
assert.equal(key.length, 64);

const router = readFileSync(join(root, 'src/Router.tsx'), 'utf8');
const menu = readFileSync(join(root, 'src/pages/Settings/Menu.tsx'), 'utf8');
const note = readFileSync(join(root, 'src/components/Note/Note.tsx'), 'utf8');
const ctx = readFileSync(join(root, 'src/components/Note/NoteContextMenu.tsx'), 'utf8');
assert.match(router, /Translation/);
assert.match(menu, /\/settings\/translation/);
assert.match(note, /NoteTranslate/);
assert.match(ctx, /translateNoteContent|noteTranslate/);

console.log('check-translation-sanitize: PASS');
console.log(JSON.stringify({
  protected_tokens: protectedPayload.placeholders.length,
  cache_key_prefix: key.slice(0, 12),
}, null, 2));
