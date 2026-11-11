/*
 * Passkey -> Athos passport -> Nostr key. A port of the ceremony in athos-backend
 * auth/feature/src/main/resources/oauth-assets/page.js (see guides/passport-guide.md).
 *
 * The constants below are frozen for parity with the mobile clients: changing any
 * of them re-keys every passkey.
 */

import { getPublicKey, nip19 } from './nTools';
import { passportChallenge, passportRead } from './athos';

export const PASSKEY_RP_ID: string =
  (import.meta.env.PRIMAL_PASSKEY_RP_ID as string | undefined) || 'primal.net';

const PRF_SALT = new Uint8Array(Array.from({ length: 32 }, (_, i) => i + 1));
const PRF_BYTES = 32;
const KEK_SALT = 'athos-kek-v1';
const KEK_INFO = 'aes-256-gcm';
const KEK_BITS = 256;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const COMPARTMENT = 'identity';
const ENVELOPE_VERSION = 1;
const NOSTR_KEY_TYPE = 'nostr-key';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Errors whose message is safe and useful to show the user. */
export class PassportError extends Error {
  code: 'cannot_unlock' | 'no_nostr_account';

  constructor(code: 'cannot_unlock' | 'no_nostr_account') {
    super(code);
    this.code = code;
  }
}

export type PassportAccount = {
  secretKey: Uint8Array,
  pubkey: string,
  npub: string,
  label: string,
};

export type UnlockedPassport = {
  passportId: string,
  accounts: PassportAccount[],
};

export const isPasskeySupported = () =>
  typeof window !== 'undefined' &&
  !!window.PublicKeyCredential &&
  !!navigator.credentials?.get;

/**
 * Whether the browser can use a passkey that lives on another device (the phone
 * QR / "hybrid" sheet). Firefox on Linux can't: it only offers USB security keys.
 *
 * Asks `PublicKeyCredential.getClientCapabilities()` (WebAuthn L3) when the browser
 * has it; otherwise falls back to recognising desktop Firefox on Linux, the one
 * common browser known to lack it. Unknown means yes, so nobody is blocked by a
 * wrong guess.
 */
export const supportsPhonePasskeys = async (): Promise<boolean> => {
  const PKC = window.PublicKeyCredential as unknown as {
    getClientCapabilities?: () => Promise<Record<string, boolean | undefined>>,
  };

  try {
    const capabilities = await PKC?.getClientCapabilities?.();
    if (capabilities && typeof capabilities.hybridTransport === 'boolean') {
      return capabilities.hybridTransport;
    }
  } catch {
    // fall through to the user-agent check
  }

  const ua = navigator.userAgent;
  const linuxFirefox = /Firefox\//.test(ua) && /Linux/.test(ua) && !/Android/.test(ua);
  return !linuxFirefox;
};

/* ---- encoding ---- */

const b64urlToBytes = (value: string) => {
  const standard = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (standard.length % 4)) % 4);
  const binary = atob(standard + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const bytesToB64url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/* ---- assertion ---- */

/*
 * WebAuthn hints (Chrome 128+, ignored elsewhere): prefer a passkey on this device,
 * then a phone via the browser's QR (hybrid) sheet. Without them Chrome may open on
 * "insert/touch your security key" when the device has no platform passkey.
 */
const DISCOVERABLE_HINTS = ['client-device', 'hybrid'];

type PinnedCredential = { id: ArrayBuffer, transports: AuthenticatorTransport[], hints: string[] };

/**
 * How to reach the credential that just answered, for the PRF replay. An
 * allowCredentials entry with no transports makes Chrome fall back to the USB
 * security-key prompt, so a phone that answered over hybrid must be named as such.
 */
const pinnedFrom = (assertion: PublicKeyCredential): PinnedCredential => {
  const crossPlatform = assertion.authenticatorAttachment === 'cross-platform';
  return {
    id: assertion.rawId,
    transports: crossPlatform ? ['hybrid', 'usb', 'nfc', 'ble'] : ['internal', 'hybrid'],
    hints: crossPlatform ? ['hybrid', 'security-key'] : DISCOVERABLE_HINTS,
  };
};

const assert = async (challenge: string, pinned?: PinnedCredential) => {
  const publicKey = {
    challenge: b64urlToBytes(challenge),
    // Spelled out: the browser default is this page's host, and a passkey bound to
    // the registrable domain never matches a subdomain it was not asked for.
    rpId: PASSKEY_RP_ID,
    timeout: 120_000,
    userVerification: 'required' as const,
    // Omitted when unpinned: that is what asks for the discoverable sheet, which is
    // also where the browser offers its phone/QR option.
    ...(pinned
      ? { allowCredentials: [{ type: 'public-key' as const, id: pinned.id, transports: pinned.transports }] }
      : {}),
    hints: pinned ? pinned.hints : DISCOVERABLE_HINTS,
    extensions: { prf: { eval: { first: PRF_SALT } } } as AuthenticationExtensionsClientInputs,
  };

  // `hints` is newer than this lib.dom; the cast keeps it in the request.
  const credential = await navigator.credentials.get({ publicKey: publicKey as PublicKeyCredentialRequestOptions });

  if (!credential) throw new Error('no_credential');
  return credential as PublicKeyCredential;
};

const prfFirst = (assertion: PublicKeyCredential): ArrayBuffer | undefined =>
  // @ts-ignore prf is not in every lib.dom version
  assertion.getClientExtensionResults().prf?.results?.first;

/**
 * Some authenticators answer PRF only on a second get(). The replay is scoped to the
 * credential that just answered; its challenge is never posted and simply expires.
 */
const prfOf = async (assertion: PublicKeyCredential) => {
  let first = prfFirst(assertion);

  if (!first) {
    const retried = await assert(await passportChallenge(), pinnedFrom(assertion));
    first = prfFirst(retried);
  }

  const prf = first ? new Uint8Array(first) : new Uint8Array(0);
  if (prf.length !== PRF_BYTES) throw new PassportError('cannot_unlock');
  return prf;
};

/* ---- key chain ---- */

const deriveKek = async (prf: Uint8Array) => {
  const base = await crypto.subtle.importKey('raw', prf, 'HKDF', false, ['deriveBits']);
  const kek = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode(KEK_SALT), info: encoder.encode(KEK_INFO) },
    base,
    KEK_BITS,
  );
  return new Uint8Array(kek);
};

/** AES-256-GCM, no AAD, `IV(12) ‖ ct ‖ tag`, unpadded base64url. */
const aesGcmOpen = async (keyBytes: Uint8Array, box: string) => {
  const bytes = b64urlToBytes(box);
  if (bytes.length < IV_BYTES + TAG_BYTES) throw new Error('ciphertext shorter than its framing');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.subarray(0, IV_BYTES) },
    key,
    bytes.subarray(IV_BYTES),
  );
  return new Uint8Array(plaintext);
};

/** One synced passkey can yield different PRF output per device: try each wrap. */
const unwrapDek = async (kek: Uint8Array, wrappedKeys: { wrappedDek: string }[]) => {
  for (const wrap of wrappedKeys) {
    try {
      return await aesGcmOpen(kek, wrap.wrappedDek);
    } catch {
      // next wrap
    }
  }
  throw new PassportError('cannot_unlock');
};

const nostrAccounts = (envelope: any): PassportAccount[] => {
  if (envelope?.v !== ENVELOPE_VERSION || envelope?.compartment !== COMPARTMENT) {
    throw new Error('the decrypted blob is not an identity envelope');
  }

  const entries: any[] = Array.isArray(envelope.entries) ? envelope.entries : [];
  const accounts: PassportAccount[] = [];

  for (const entry of entries) {
    if (!entry || entry.type !== NOSTR_KEY_TYPE) continue;
    const nsec = entry.data?.nsec;
    if (typeof nsec !== 'string') continue;

    try {
      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') continue;
      const secretKey = decoded.data as Uint8Array;
      const pubkey = getPublicKey(secretKey);
      accounts.push({
        secretKey,
        pubkey,
        npub: nip19.npubEncode(pubkey),
        label: typeof entry.label === 'string' ? entry.label : '',
      });
    } catch {
      // A secret that will not decode cannot sign, so it is never offered.
    }
  }

  return accounts;
};

/**
 * Runs the passkey ceremony and opens the passport's identity compartment.
 * Every failed assertion spends its challenge, so each call fetches a fresh one.
 */
export const unlockPassport = async (): Promise<UnlockedPassport> => {
  const assertion = await assert(await passportChallenge());
  const prf = await prfOf(assertion);
  const response = assertion.response as AuthenticatorAssertionResponse;

  const read = await passportRead({
    credentialId: assertion.id,
    clientDataJSON: bytesToB64url(new Uint8Array(response.clientDataJSON)),
    authenticatorData: bytesToB64url(new Uint8Array(response.authenticatorData)),
    signature: bytesToB64url(new Uint8Array(response.signature)),
  });

  const identity = read.compartments.find(c => c.compartment === COMPARTMENT);
  if (!identity) throw new PassportError('cannot_unlock');
  if (!identity.blob) throw new PassportError('no_nostr_account');

  const kek = await deriveKek(prf);
  prf.fill(0);
  const dek = await unwrapDek(kek, identity.wrappedKeys);
  kek.fill(0);

  let envelope: any;
  try {
    envelope = JSON.parse(decoder.decode(await aesGcmOpen(dek, identity.blob)));
  } catch {
    throw new Error('the identity blob did not decrypt to an envelope');
  } finally {
    dek.fill(0);
  }

  const accounts = nostrAccounts(envelope);
  if (accounts.length === 0) throw new PassportError('no_nostr_account');

  return { passportId: read.passportId, accounts };
};

export const wipeAccounts = (accounts: PassportAccount[]) => {
  accounts.forEach(a => a.secretKey.fill(0));
};
