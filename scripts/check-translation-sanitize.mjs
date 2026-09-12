/**
 * Entity-protection self-check for the note translation feature (#133).
 *
 * Run:  node scripts/check-translation-sanitize.mjs
 *
 * It bundles src/lib/translation.ts with esbuild (already present via vite), then asserts that
 * every entity class the reviewers called out survives a translation round-trip untouched:
 * nostr: refs, npub/nevent/naddr, URLs, hashtags, @mentions, lightning invoices/lnurl,
 * bitcoin addresses and cashu tokens. A stub provider that uppercases the text stands in for a
 * real MT engine so restore() is exercised the same way as in production.
 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'primal-translation-check-'));
const bundlePath = join(out, 'translation.mjs');

await build({
  entryPoints: ['src/lib/translation.ts'],
  outfile: bundlePath,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2020',
  logLevel: 'silent',
});

const { protectEntities, restoreEntities } = await import(pathToFileURL(bundlePath).href);

const CASES = [
  ['nostr ref', 'look nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq here', 'nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'],
  ['nevent ref', 'nostr:nevent1qqs9z3n4v6k2 example', 'nostr:nevent1qqs9z3n4v6k2'],
  ['url', 'see https://primal.net/e/abc123?x=1#frag for details', 'https://primal.net/e/abc123?x=1#frag'],
  ['hashtag', 'gm #nostr fam', '#nostr'],
  ['mention', 'thanks @jack for the zap', '@jack'],
  ['invoice', 'paid lnbc2500u1p3xyzqwertyuiopasdfghjkl thanks', 'lnbc2500u1p3xyzqwertyuiopasdfghjkl'],
  ['lnurl', 'login lnurl1dp68gurn8ghj7um5v93kketj9ehx2amn9uh8wetvdskkkmn0 via', 'lnurl1dp68gurn8ghj7um5v93kketj9ehx2amn9uh8wetvdskkkmn0'],
  ['btc address', 'send to bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq ok', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'],
  ['cashu token', 'claim cashuAeyJ0b2tlbiI6W3siYW1vdW50IjoxMDAwfV19 now', 'cashuAeyJ0b2tlbiI6W3siYW1vdW50IjoxMDAwfV19'],
];

const settings = { provider: 'libretranslate', endpoint: 'https://example.invalid', apiKey: '', targetLanguage: 'de', allowUnofficialEndpoint: false };

let failures = 0;
for (const [name, input, expected] of CASES) {
  const { masked, entities } = protectEntities(input);
  // stand-in provider: a real MT engine rewrites prose but must keep placeholders intact
  const roundTripped = restoreEntities(masked.toUpperCase(), entities);
  const kept = roundTripped.includes(expected);
  const notLeaked = !masked.includes(expected);
  const ok = kept && notLeaked;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(12)} masked=${notLeaked ? 'yes' : 'NO'} restored=${kept ? 'yes' : 'NO'}`);
}

// prose must still be translatable, i.e. we didn't mask the whole note
const prose = 'good morning everyone, this is a long note about #nostr and https://primal.net';
const { masked: proseMasked } = protectEntities(prose);
const proseKept = proseMasked.includes('good morning everyone') && proseMasked.includes('long note about');
console.log(`${proseKept ? 'ok  ' : 'FAIL'} ${'prose'.padEnd(12)} normal words left for the provider`);
if (!proseKept) failures += 1;

// settings must default to the documented provider, with the unofficial endpoint OFF
const defaultsOk = settings.provider === 'libretranslate' && settings.allowUnofficialEndpoint === false;
console.log(`${defaultsOk ? 'ok  ' : 'FAIL'} ${'defaults'.padEnd(12)} documented provider default, unofficial endpoint off`);
if (!defaultsOk) failures += 1;

rmSync(out, { recursive: true, force: true });
console.log(failures === 0 ? '\nall entity-protection checks passed' : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
