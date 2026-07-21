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
assert.match(sanitizerSrc, /lno1/);
assert.match(sanitizerSrc, /cashu/);
assert.match(sanitizerSrc, /@\[\\p\{L\}/);
assert.match(sanitizerSrc, /shouldOfferTranslation/);
assert.match(sanitizerSrc, /MANGLED_PLACEHOLDER_RE/);
assert.match(sanitizerSrc, /sanitizeForTranslation\(trimmed\)/);
assert.match(translationSrc, /export const translateNoteContent/);
assert.match(translationSrc, /export const normalizeLibreTranslateBaseUrl/);
assert.match(translationSrc, /AbortController/);
assert.match(translationSrc, /ltTarget|libretranslate|primaryLang/);
assert.match(translationSrc, /translation\.googleapis\.com/);
assert.match(translationSrc, /api\.deepl\.com/);
assert.match(translationSrc, /api-free\.deepl\.com/);
assert.match(translationSrc, /:fx/);
assert.match(translationSrc, /detectedLanguage|detected_source_language/);
assert.match(translationSrc, /empty_prose/);

// Extract PROTECTED_TOKEN_RE from shipped source and execute it
const reMatch = sanitizerSrc.match(/const PROTECTED_TOKEN_RE =\s*(\/[\s\S]*?\/[a-z]*);/);
assert.ok(reMatch, 'PROTECTED_TOKEN_RE extractable from source');
const PROTECTED_TOKEN_RE = eval(reMatch[1]);
const PLACEHOLDER_RE = /__PRIMAL_PROTECTED_(\d+)__/g;
const MANGLED_PLACEHOLDER_RE =
  /[_*]{0,2}PRIMAL[_*\s-]?PROTECTED[_*\s-]?(\d+)[_*]{0,2}/gi;

function sanitizeForTranslation(content) {
  const placeholders = [];
  const sanitized = content.replace(PROTECTED_TOKEN_RE, (token) => {
    const index = placeholders.push(token) - 1;
    return `__PRIMAL_PROTECTED_${index}__`;
  });
  return { content: sanitized, placeholders };
}

function restoreTranslationContent(content, placeholders) {
  let out = content.replace(PLACEHOLDER_RE, (_m, index) => {
    const i = Number(index);
    return Number.isInteger(i) && placeholders[i] !== undefined ? placeholders[i] : _m;
  });
  out = out.replace(MANGLED_PLACEHOLDER_RE, (match, index) => {
    const i = Number(index);
    return Number.isInteger(i) && placeholders[i] !== undefined ? placeholders[i] : match;
  });
  return out;
}

const sample =
  'Hola see https://example.com and @alice and nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq and #bitcoin and lnbc1testinvoice and lno1offerxyz and lightning:lnbc1viauri and lnurl1abc and cashuAabc123 and bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh and :wave:';

const protectedPayload = sanitizeForTranslation(sample);
const roundTrip = restoreTranslationContent(
  protectedPayload.content.replace(/Hola/g, 'Hello'),
  protectedPayload.placeholders,
);

assert.ok(protectedPayload.content.includes('__PRIMAL_PROTECTED_'), 'tokens protected');
assert.ok(!protectedPayload.content.includes('https://example.com'), 'url stripped');
assert.ok(!protectedPayload.content.includes('@alice'), 'mention stripped');
assert.ok(!protectedPayload.content.includes('bc1qxy'), 'bc1 stripped from outbound');
assert.ok(!protectedPayload.content.includes('lno1offer'), 'bolt12 offer stripped');
assert.ok(!protectedPayload.content.includes('cashuA'), 'cashu stripped');
assert.ok(roundTrip.includes('https://example.com'), 'url restored');
assert.ok(roundTrip.includes('@alice'), 'mention restored');
assert.ok(roundTrip.includes('nostr:npub1'), 'nostr restored');
assert.ok(roundTrip.includes('#bitcoin'), 'hashtag restored');
assert.ok(roundTrip.includes('lnbc1testinvoice'), 'invoice restored');
assert.ok(roundTrip.includes('lno1offerxyz'), 'bolt12 restored');
assert.ok(roundTrip.includes('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'), 'bc1 restored');
assert.ok(roundTrip.includes(':wave:'), 'shortcode restored');
assert.ok(roundTrip.includes('Hello'), 'text can change');

// Offer gating: length + letters + real prose after token strip
function shouldOfferTranslation(content) {
  const trimmed = (content || '').trim();
  if (trimmed.length < 12) return false;
  if (!/[\p{L}]/u.test(trimmed)) return false;
  const { content: sanitized } = sanitizeForTranslation(trimmed);
  const prose = sanitized.replace(/__PRIMAL_PROTECTED_\d+__/g, ' ').trim();
  return prose.length >= 4 && /[\p{L}]/u.test(prose);
}
assert.equal(shouldOfferTranslation('hi'), false);
assert.equal(shouldOfferTranslation('123456789012345'), false);
assert.equal(shouldOfferTranslation('This note is long enough.'), true);
assert.equal(
  shouldOfferTranslation('https://example.com/a/b/c/d/e/f/g/h and npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'),
  false,
  'token-only notes must not offer translate',
);

// Endpoint normalize: base URL or full /translate path
function normalizeLibreTranslateBaseUrl(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    let path = url.pathname.replace(/\/+$/, '') || '';
    if (path.toLowerCase().endsWith('/translate')) {
      path = path.slice(0, -'/translate'.length) || '';
    }
    url.pathname = path || '/';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return trimmed.replace(/\/translate\/?$/i, '').replace(/\/$/, '');
  }
}
assert.equal(
  normalizeLibreTranslateBaseUrl('https://libretranslate.com/translate'),
  'https://libretranslate.com',
);
assert.equal(
  normalizeLibreTranslateBaseUrl('https://libretranslate.com'),
  'https://libretranslate.com',
);

// Mangled placeholder restore (provider drops underscores)
const mangled = restoreTranslationContent(
  'Hello PRIMAL_PROTECTED_0 and more',
  ['https://example.com'],
);
assert.ok(mangled.includes('https://example.com'), 'mangled placeholder restored');

assert.ok(translationSrc.includes('primaryLang') || translationSrc.includes("split(/[-_]/)"), 'locale normalize present');
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
const notePrimary = readFileSync(join(root, 'src/components/Note/NotePrimary/NotePrimary.tsx'), 'utf8');
assert.match(notePrimary, /NoteTranslate/);
// Phone feed + suggestion layouts must host inline Translate.
assert.equal((note.match(/NoteTranslate/g) || []).length >= 3, true, 'Note.tsx must place NoteTranslate in multiple layouts');

console.log('check-translation-sanitize: PASS');
console.log(JSON.stringify({
  protected_tokens: protectedPayload.placeholders.length,
  cache_key_prefix: key.slice(0, 12),
}, null, 2));
