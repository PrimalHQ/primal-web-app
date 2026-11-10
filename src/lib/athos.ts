/*
 * Client for the Athos auth server (account.primal.net): the OAuth consent API
 * (guides/auth-guide.md §15) and the login endpoints the consent page needs (§5).
 *
 * Never log the URLs or tokens handled here: the approve redirect carries a live
 * authorization code.
 */

import { NostrEventTemplate, NostrVerifiedEvent } from './nTools';

export const ATHOS_URL: string =
  (import.meta.env.PRIMAL_ATHOS_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://account.primal.net';

export const NOSTR_AUTH_PATH = '/v1/auth/nostr';
const NOSTR_CHALLENGE_PATH = '/v1/auth/nostr/challenge';
const CONSENT_PATH = '/v1/oauth/consent';

export const OAUTH_PARAMS = [
  'response_type',
  'client_id',
  'redirect_uri',
  'state',
  'code_challenge',
  'code_challenge_method',
  'resource',
] as const;

export type OAuthParam = typeof OAUTH_PARAMS[number];
export type OAuthParams = Partial<Record<OAuthParam, string>>;

export type ConsentInfo = {
  action: 'consent',
  clientId: string,
  clientName: string,
  resource: string,
  resourceName: string,
  returnHost: string,
  denyUrl: string,
};

export type ConsentCheck = ConsentInfo | { action: 'redirect', redirectUrl: string };

export type LoginTokens = {
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
};

export class AthosError extends Error {
  status: number;
  code?: string;

  constructor(status: number, code?: string) {
    super(code || `athos_${status}`);
    this.status = status;
    this.code = code;
  }
}

/**
 * The seven OAuth params as the query string carried them. A param that appears
 * more than once is read at its first value (URLSearchParams.get), and an absent
 * one stays absent.
 */
export const readOAuthParams = (search: string = window.location.search): OAuthParams => {
  const query = new URLSearchParams(search);
  const params: OAuthParams = {};

  for (const name of OAUTH_PARAMS) {
    const value = query.get(name);
    if (value !== null) params[name] = value;
  }

  return params;
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${ATHOS_URL}${path}`, {
    ...init,
    credentials: 'omit',
    cache: 'no-store',
  });

  let body: any = undefined;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    throw new AthosError(response.status, typeof body?.error === 'string' ? body.error : undefined);
  }

  return body as T;
};

const postJson = <T>(path: string, body: unknown, headers: Record<string, string> = {}) =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

/* ---- consent ---- */

export const checkConsent = (params: OAuthParams) => {
  const query = new URLSearchParams();
  for (const name of OAUTH_PARAMS) {
    const value = params[name];
    if (value !== undefined) query.append(name, value);
  }
  return request<ConsentCheck>(`${CONSENT_PATH}?${query.toString()}`);
};

export const approveConsent = async (accessToken: string, params: OAuthParams) => {
  const result = await postJson<{ redirectUrl: string }>(
    CONSENT_PATH,
    params,
    { Authorization: `Bearer ${accessToken}` },
  );
  return result.redirectUrl;
};

/* ---- login ---- */

export const nostrChallenge = async () =>
  (await request<{ challenge: string }>(NOSTR_CHALLENGE_PATH)).challenge;

/** The NIP-98 login event: kind 27235, empty content, u/method/challenge tags. */
export const buildNip98Unsigned = (challenge: string): NostrEventTemplate => ({
  kind: 27235,
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ['u', `${ATHOS_URL}${NOSTR_AUTH_PATH}`],
    ['method', 'POST'],
    ['challenge', challenge],
  ],
  content: '',
});

/** Standard base64, padded: the server rejects base64url and unpadded payloads. */
const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const loginWithNostr = (event: NostrVerifiedEvent, passportId?: string) => {
  const signed = {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig,
  };

  return request<LoginTokens>(NOSTR_AUTH_PATH, {
    method: 'POST',
    headers: {
      'Authorization': `Nostr ${toBase64(JSON.stringify(signed))}`,
      ...(passportId ? { 'Content-Type': 'application/json' } : {}),
    },
    body: passportId ? JSON.stringify({ passportId }) : undefined,
  });
};

export const loginWithGoogleCode = (code: string) =>
  postJson<LoginTokens>('/v1/auth/google/code', { code });

export const loginWithApple = (idToken: string) =>
  postJson<LoginTokens>('/v1/auth/apple', { idToken });

/* ---- passport (passkey) ---- */

export type PassportReadResponse = {
  passportId: string,
  compartments: {
    compartment: string,
    blob?: string | null,
    version?: number,
    wrappedKeys: { wrappedDek: string }[],
  }[],
};

export const passportChallenge = async () =>
  (await request<{ challenge: string }>('/v1/passports/challenge')).challenge;

export const passportRead = (payload: {
  credentialId: string,
  clientDataJSON: string,
  authenticatorData: string,
  signature: string,
}) => postJson<PassportReadResponse>('/v1/passports/read', payload);
