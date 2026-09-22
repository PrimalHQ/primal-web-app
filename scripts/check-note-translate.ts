import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  restoreNoteTextForTranslation,
  shieldNoteTextForTranslation,
} from '../src/lib/noteTranslateSlots.ts';
import {
  guessScriptLanguage,
  hasTranslatableProse,
  languageBase,
  letterCount,
  normalizeOwnedLibreTranslateUrl,
  restoreNoteText,
  shieldNoteText,
  shouldOfferTranslate,
} from '../src/lib/noteTranslateProtect.ts';

type Case = { name: string; ok: boolean; detail?: string };

const cases: Case[] = [];

const check = (name: string, ok: boolean, detail?: string) => {
  cases.push({ name, ok, detail });
  if (!ok) {
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`ok    ${name}`);
  }
};

const fixtures = [
  'https://primal.net/e/note1abc',
  'nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhsdf6d',
  'npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhsdf6d',
  'nevent1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhsdf6d',
  'naddr1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhsdf6d',
  'nprofile1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhsdf6d',
  'note1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhsdf6d',
  'nrelay1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhsdf6d',
  'lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3wpe82tsq2pshqgrfdekjmg9mnwskxujzzda6kdd4cxzuy4lz223cxqztrdwpwp5j7nk',
  'lntb1u1p0exampleinvoicepayloadxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxu7nhw35xqun2w0p0kctv9t9z4rjwpxz0shwum',
  'lno1qsgqzq9p4qg2qsgqzq9p4qg2qsgqzq9p4qg2qsgqzq9p4qg2qsgqz',
  'lightning:lnbc1something',
  'cashuAeyJ0b2tlbiI6ImFiYyJ9',
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4?amount=0.01',
  'alice@getalby.com',
  '#nostr',
  '@alice',
  ':wave:',
  '```\nconst x = 1;\n```',
  '`inline code`',
];

const sample = `Hola mundo ${fixtures.join(' ')} y más texto para traducir.`;
const shielded = shieldNoteText(sample);

check('shields every fixture token', fixtures.every((token) => !shielded.payload.includes(token)));
check('payload still has prose', /Hola mundo/.test(shielded.payload) && /más texto/.test(shielded.payload));
check('restore returns original tokens', restoreNoteText(shielded.payload, shielded.slots) === sample);

const mangled = shielded.payload
  .replaceAll('⟦', '[ ')
  .replaceAll('⟧', ' ]')
  .replace(/NTX/g, 'ntx');
check('restores lightly mangled placeholders', restoreNoteText(mangled, shielded.slots) === sample);

const collisionSource = 'Please compare https://example.com/NTX001 with https://example.org/b';
const collisionShield = shieldNoteTextForTranslation(collisionSource);
check(
  'translation namespace is absent from source',
  !collisionSource.toUpperCase().includes(collisionShield.namespace),
);
check(
  'URL containing NTX001 round-trips unchanged',
  restoreNoteTextForTranslation(
    collisionShield.payload,
    collisionShield.slots,
    collisionShield.namespace,
  ) === collisionSource,
);

const literalMarkerSource = 'This prose literally says NTX000 and links https://example.com/a';
const literalMarkerShield = shieldNoteTextForTranslation(literalMarkerSource);
check(
  'literal NTX000 prose is not treated as a generated placeholder',
  restoreNoteTextForTranslation(
    literalMarkerShield.payload,
    literalMarkerShield.slots,
    literalMarkerShield.namespace,
  ) === literalMarkerSource,
);

for (const marker of ['⟦NTX000⟧', 'P R I M A L N T X 0 : 000']) {
  const source = `Please compare ${marker} with https://example.org/b`;
  const shield = shieldNoteTextForTranslation(source);
  check(
    `literal marker round-trips unchanged: ${marker}`,
    restoreNoteTextForTranslation(
      shield.payload,
      shield.slots,
      shield.namespace,
    ) === source,
  );
}

check('token-only notes are not offered', !hasTranslatableProse(fixtures.join(' ')));
check('short notes are not offered', !hasTranslatableProse('ok'));
check('prose notes are offered', hasTranslatableProse('This note has enough letters to translate.'));
check('letterCount counts unicode letters', letterCount('año') === 3);

check('Japanese script guesses ja', guessScriptLanguage('これは日本語の投稿です') === 'ja');
check('Korean script guesses ko', guessScriptLanguage('이것은 한국어 게시물입니다') === 'ko');
check('Arabic script guesses ar', guessScriptLanguage('هذه مشاركة باللغة العربية') === 'ar');
check('hides Translate when script matches target', !shouldOfferTranslate('これは日本語の投稿です', 'ja'));
check('shows Translate when script differs', shouldOfferTranslate('これは日本語の投稿です', 'en'));
check('languageBase strips region', languageBase('pt-BR') === 'pt');

const base = normalizeOwnedLibreTranslateUrl('https://translate.example.com');
const full = normalizeOwnedLibreTranslateUrl('https://translate.example.com/translate');
const nested = normalizeOwnedLibreTranslateUrl('https://translate.example.com/api/translate');
check('normalizes a bare host to /translate', base === 'https://translate.example.com/translate');
check('does not double /translate', full === 'https://translate.example.com/translate');
check('keeps an existing /translate path', nested === 'https://translate.example.com/api/translate');
check(
  'rejects an empty URL',
  typeof normalizeOwnedLibreTranslateUrl('') !== 'string' &&
  (normalizeOwnedLibreTranslateUrl('') as { error: string }).error === 'missing_url',
);
check(
  'rejects javascript: URLs',
  typeof normalizeOwnedLibreTranslateUrl('javascript:alert(1)') !== 'string',
);

const settingsSrc = readFileSync(resolve('src/lib/noteTranslateSettings.ts'), 'utf8');
const translateSrc = readFileSync(resolve('src/lib/noteTranslate.ts'), 'utf8');
const defaults = settingsSrc.match(/export const emptyNoteTranslatePrefs[\s\S]+?\}\);/)?.[0] || '';

check('default provider is on-device', /provider:\s*'on_device'/.test(defaults));
check("default LibreTranslate URL is empty", /libreTranslateUrl:\s*''/.test(defaults));
check(
  'settings defaults never mention a public billed host',
  !defaults.includes('libretranslate.com') &&
  !defaults.includes('translate.googleapis.com') &&
  !defaults.includes('translate.google.com'),
);
check(
  'settings module does not hardcode a public LibreTranslate host',
  !settingsSrc.includes('libretranslate.com'),
);
check(
  'translator never falls back to translate.google.com',
  !translateSrc.includes('translate.google.com') &&
  !translateSrc.includes('translate.googleapis.com/translate_a'),
);
check(
  'Google path uses official Cloud Translation v2 only',
  translateSrc.includes('translation.googleapis.com/language/translate/v2'),
);
check(
  'LibreTranslate requests require a user URL (no implicit host)',
  translateSrc.includes('normalizeOwnedLibreTranslateUrl(prefs.libreTranslateUrl)'),
);

const failed = cases.filter((item) => !item.ok);
console.log(`\n${cases.length - failed.length}/${cases.length} checks passed`);
if (failed.length) {
  process.exit(1);
}
