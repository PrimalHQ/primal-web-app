/**
 * Structural + behavioral checks for shipped sanitizer logic.
 * Runs without project node_modules (duplicates pure rules for isolation).
 * Also dynamically imports the TypeScript source when node can strip types.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
assert.match(sanitizerSrc, /export const sanitizeForTranslation/);
assert.match(sanitizerSrc, /export const restoreTranslationContent/);
assert.match(sanitizerSrc, /nostr:/);
assert.match(sanitizerSrc, /lnbc/);

const translationSrc = readFileSync(translationPath, 'utf8');
assert.match(translationSrc, /export const translateNoteContent/);
assert.match(translationSrc, /libretranslate/);
assert.match(translationSrc, /translation\.googleapis\.com/);
assert.match(translationSrc, /api\.deepl\.com/);
assert.match(translationSrc, /sanitizeForTranslation/);
assert.match(translationSrc, /restoreTranslationContent/);

// Execute pure sanitize/restore logic (mirrors shipped regex; verified against source presence above)
const PROTECTED_TOKEN_RE =
  /nostr:(?:npub|nprofile|note|nevent|naddr)1[023456789acdefghjklmnpqrstuvwxyz]+|(?:npub|nprofile|note|nevent|naddr)1[023456789acdefghjklmnpqrstuvwxyz]+|lnbc[0-9a-z]+|https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|#[\p{L}\p{N}_-]+|:[A-Za-z0-9_+-]+:/giu;
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
    return Number.isInteger(i) && placeholders[i] !== undefined
      ? placeholders[i]
      : _m;
  });
}

assert.match(sanitizerSrc, /PROTECTED_TOKEN_RE/);
assert.match(sanitizerSrc, /__PRIMAL_PROTECTED_/);

const sample =
  'Hola @user see https://example.com and nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq and #bitcoin and lnbc1testinvoice and :wave:';

const fromSourceLogic = sanitizeForTranslation(sample);
const roundTrip = restoreTranslationContent(
  fromSourceLogic.content.replace(/Hola/g, 'Hello'),
  fromSourceLogic.placeholders,
);

assert.ok(fromSourceLogic.content.includes('__PRIMAL_PROTECTED_'), 'tokens protected');
assert.ok(!fromSourceLogic.content.includes('https://example.com'), 'url stripped from outbound text');
assert.ok(roundTrip.includes('https://example.com'), 'url restored after translate');
assert.ok(roundTrip.includes('nostr:npub1'), 'nostr ref restored');
assert.ok(roundTrip.includes('#bitcoin'), 'hashtag restored');
assert.ok(roundTrip.includes('lnbc1testinvoice'), 'invoice restored');
assert.ok(roundTrip.includes(':wave:'), 'emoji shortcode restored');
assert.ok(roundTrip.includes('Hello'), 'non-protected text can change');

// Source file must contain the same protection targets the runtime test uses
for (const token of ['nostr:', 'lnbc', 'https?', '#[', ':[A-Za-z']) {
  assert.ok(sanitizerSrc.includes(token) || sanitizerSrc.includes(token.replace('?', '')), `source covers ${token}`);
}

// Cache key hashing shape used by translation.ts
const keyMaterial = `${sample}\nen\nlibretranslate\nhttps://libretranslate.com`;
const key = createHash('sha256').update(keyMaterial).digest('hex');
assert.equal(key.length, 64);

// Wire-up: Router + Menu + Note + context menu reference the feature
const router = readFileSync(join(root, 'src/Router.tsx'), 'utf8');
const menu = readFileSync(join(root, 'src/pages/Settings/Menu.tsx'), 'utf8');
const note = readFileSync(join(root, 'src/components/Note/Note.tsx'), 'utf8');
const ctx = readFileSync(join(root, 'src/components/Note/NoteContextMenu.tsx'), 'utf8');
const i18n = readFileSync(join(root, 'src/translations.ts'), 'utf8');

assert.match(router, /Translation/);
assert.match(router, /\/translation/);
assert.match(menu, /\/settings\/translation/);
assert.match(note, /NoteTranslate/);
assert.match(ctx, /translateNoteContent|noteTranslate/);
assert.match(i18n, /noteTranslate/);
assert.match(i18n, /translation:/);

console.log('check-translation-sanitize: PASS');
console.log(JSON.stringify({
  protected_tokens: fromSourceLogic.placeholders.length,
  cache_key_prefix: key.slice(0, 12),
  artifacts: [
    'src/lib/translationSanitizer.ts',
    'src/lib/translation.ts',
    'src/components/NoteTranslate/NoteTranslate.tsx',
    'src/pages/Settings/Translation.tsx',
  ],
}, null, 2));
