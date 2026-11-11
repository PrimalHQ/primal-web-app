/*
 * Dev-only stand-ins for the sign-in ceremonies that need real credentials
 * (passkey, Google, Apple). Loaded only when PRIMAL_OAUTH_MOCK_PROVIDERS is
 * "true", which `npm run dev:oauth` (scripts/oauth-dev.mjs) sets; production
 * builds never import this file.
 *
 * Behaviour follows the page's `state` query param, the same knob the mock
 * server uses: multi | no-passport | no-account | popup-closed | no-phone-passkeys.
 */

import { generatePrivateKey, getPublicKey, nip19 } from './nTools';
import { PassportError, UnlockedPassport } from './passport';
import { ProviderCancelled } from './oauthProviders';

export const OAUTH_MOCK_PROVIDERS =
  import.meta.env.DEV && import.meta.env.PRIMAL_OAUTH_MOCK_PROVIDERS === 'true';

const scenario = () => new URLSearchParams(window.location.search).get('state') || 'ok';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const account = (label: string) => {
  const secretKey = generatePrivateKey();
  const pubkey = getPublicKey(secretKey);
  return { secretKey, pubkey, npub: nip19.npubEncode(pubkey), label };
};

export const mockUnlockPassport = async (): Promise<UnlockedPassport> => {
  await sleep(900); // the OS passkey sheet
  const s = scenario();
  if (s === 'no-passport') throw new PassportError('cannot_unlock');
  if (s === 'no-account') throw new PassportError('no_nostr_account');

  const accounts = s === 'multi'
    ? [account('Personal'), account('Work'), account('')]
    : [account('Personal')];

  return { passportId: crypto.randomUUID(), accounts };
};

/** state=no-phone-passkeys acts like Firefox on Linux. */
export const mockSupportsPhonePasskeys = async () => scenario() !== 'no-phone-passkeys';

const popup = async () => {
  await sleep(900);
  if (scenario() === 'popup-closed') throw new ProviderCancelled();
};

export const mockGoogleAuthCode = async () => {
  await popup();
  return 'mock-google-code';
};

export const mockAppleIdToken = async () => {
  await popup();
  return 'mock.apple.id-token';
};
