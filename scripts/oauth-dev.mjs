#!/usr/bin/env node
/*
 * Local playground for the /oauth/authenticate page.
 *
 *   npm run dev:oauth
 *
 * Starts a mock of the Athos auth API on :3999 and the Vite dev server on :3000
 * pointed at it, then prints one link per scenario. Nothing here ships: the page
 * only reads PRIMAL_ATHOS_URL / PRIMAL_OAUTH_MOCK_PROVIDERS, which this script sets.
 *
 * Scenarios are picked with the OAuth params themselves, so every link is a
 * normal authorization request:
 *   client_id  -> what the consent check answers (see CLIENTS below)
 *   state      -> how the later calls behave (see STATES below)
 *
 * Nostr logins are verified for real (kind, u/method/challenge tags, signature,
 * single-use challenge), so a signer that produces a bad event fails here too.
 * Passkey, Google and Apple are faked in the browser (src/lib/oauthMocks.ts)
 * because their real ceremonies need registered credentials.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import { verifyEvent } from 'nostr-tools/pure';

const MOCK_PORT = Number(process.env.MOCK_PORT || 3999);
const WEB_PORT = Number(process.env.WEB_PORT || 3000);
const MOCK_URL = `http://localhost:${MOCK_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const NOSTR_AUTH_URL = `${MOCK_URL}/v1/auth/nostr`;
const CALLBACK = `${MOCK_URL}/callback`;

/* client_id -> consent check answer */
const CLIENTS = {
  chatgpt: { name: 'ChatGPT', resourceName: 'Tsunami', note: 'happy path' },
  claude: { name: 'Claude', resourceName: 'Tsunami', note: 'another client' },
  long: {
    name: 'A Remarkably Long Connected Application Name',
    resourceName: 'Tsunami Research Archive Of Everything',
    note: 'long names: wrapping/layout',
  },
  unverified: { status: 400, error: 'unverified_client', note: '400 unverified_client' },
  redirect: { redirect: true, note: 'check answers action:redirect (bad resource)' },
  ratelimit: { status: 429, error: 'rate_limited', note: '429 on the check (has retry)' },
  down: { status: 500, note: '500 on the check (has retry)' },
};

/* state -> behaviour of logins and approve */
const STATES = {
  ok: 'everything succeeds',
  slow: 'every call takes 2.5s (spinners)',
  'login-fail': 'every login answers 401',
  'login-429': 'every login answers 429',
  'approve-401': 'approve answers 401 (session expired -> back to sign in)',
  'approve-error': 'approve answers a redirect carrying error=invalid_target',
  multi: 'mock passkey unlocks a passport with 3 accounts (picker)',
  'no-passport': 'mock passkey cannot unlock a passport',
  'no-account': 'mock passport holds no Nostr account',
  'popup-closed': 'mock Google/Apple popup is closed by the user (no error shown)',
  'no-phone-passkeys': 'browser cannot use phone passkeys (Firefox on Linux notice)',
};

const challenges = new Set();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

const log = (...args) => console.log('\x1b[36m[athos-mock]\x1b[0m', ...args);

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve) => {
  let data = '';
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => resolve(data));
});

const callbackUrl = (params) => `${CALLBACK}?${new URLSearchParams(params).toString()}`;

/** The consent answer for a set of OAuth params, as Athos would give it. */
const consentFor = (p) => {
  if (!p.client_id || !p.redirect_uri) return [400, { error: 'missing_client' }];

  const client = CLIENTS[p.client_id] || CLIENTS.chatgpt;
  if (client.status) return [client.status, client.error ? { error: client.error } : undefined];
  if (client.redirect) {
    return [200, { action: 'redirect', redirectUrl: callbackUrl({ error: 'invalid_target', state: p.state || '' }) }];
  }

  return [200, {
    action: 'consent',
    clientId: p.client_id,
    clientName: client.name,
    resource: p.resource || '',
    resourceName: client.resourceName,
    returnHost: (() => { try { return new URL(p.redirect_uri).host; } catch { return p.redirect_uri; } })(),
    denyUrl: callbackUrl({ error: 'access_denied', state: p.state || '' }),
  }];
};

/** Mirrors Athos' NIP-98 checks closely enough to catch a malformed event. */
const checkNip98 = (header) => {
  if (!header?.startsWith('Nostr ')) return 'missing "Nostr" authorization';
  const payload = header.slice(6);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload) || payload.length % 4 !== 0) return 'payload is not padded standard base64';

  let event;
  try { event = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')); } catch { return 'payload is not JSON'; }

  const tag = (name) => event.tags?.find((t) => t[0] === name)?.[1];
  if (event.kind !== 27235) return `kind is ${event.kind}, expected 27235`;
  if (event.content !== '') return 'content is not empty';
  if (tag('u') !== NOSTR_AUTH_URL) return `u tag is ${tag('u')}, expected ${NOSTR_AUTH_URL}`;
  if (tag('method') !== 'POST') return 'method tag is not POST';
  if (Math.abs(event.created_at - Date.now() / 1000) > 60) return 'created_at outside ±60s';
  if (!/^[0-9a-f]+$/.test(event.id + event.pubkey + event.sig)) return 'hex fields are not lowercase';
  if (!verifyEvent(event)) return 'bad signature';
  if (!challenges.delete(tag('challenge'))) return 'unknown or reused challenge';
  return null;
};

const tokens = () => ({ accessToken: `mock-${randomHex(8)}`, refreshToken: randomHex(16), expiresIn: 900 });

/*
 * The state of the most recent consent check. Cross-origin fetches only send the
 * page's origin as Referer, so the login calls can't carry it themselves; this is a
 * single-user dev tool, so "the last page opened" is good enough.
 */
let currentState = 'ok';

const loginOutcome = (state) => {
  if (state === 'login-fail') return [401, { error: 'unauthorized' }];
  if (state === 'login-429') return [429, { error: 'rate_limited' }];
  return null;
};

const callbackPage = (url) => {
  const rows = [...url.searchParams].map(([k, v]) => `<tr><td>${k}</td><td><code>${v.replace(/</g, '&lt;')}</code></td></tr>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>Mock client callback</title>
<body style="background:#111;color:#eee;font:16px system-ui;padding:40px">
<h2>Mock client callback</h2><p>This is where the connected app would receive the browser.</p>
<table style="border-collapse:collapse" cellpadding="6">${rows}</table>
<p style="color:#999">Use the scenario links printed in the terminal to start again.</p></body>`;
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return send(res, 204);

  const url = new URL(req.url, MOCK_URL);
  if (req.method === 'GET' && url.pathname === '/v1/oauth/consent') {
    currentState = url.searchParams.get('state') || 'ok';
  }
  const state = currentState;
  if (state === 'slow' && url.pathname !== '/callback') await sleep(2500);

  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /callback') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(callbackPage(url));
  }

  if (route === 'GET /v1/oauth/consent') {
    const [status, body] = consentFor(Object.fromEntries(url.searchParams));
    log('check', url.searchParams.get('client_id'), '->', status, body?.action || body?.error || '');
    return send(res, status, body);
  }

  if (route === 'POST /v1/oauth/consent') {
    const auth = req.headers.authorization || '';
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'invalid_body', message: 'not JSON' }); }
    if (!auth.startsWith('Bearer mock-') || state === 'approve-401') {
      log('approve -> 401');
      return send(res, 401, { error: 'unauthorized' });
    }
    const [status, check] = consentFor(body);
    if (status !== 200) return send(res, status, check);
    log('approve', JSON.stringify(body));
    const redirectUrl = state === 'approve-error'
      ? callbackUrl({ error: 'invalid_target', state: body.state || '', iss: MOCK_URL })
      : callbackUrl({ code: randomHex(12), state: body.state || '', iss: MOCK_URL });
    return send(res, 200, { redirectUrl });
  }

  if (route === 'GET /v1/auth/nostr/challenge') {
    const challenge = randomHex(16);
    challenges.add(challenge);
    setTimeout(() => challenges.delete(challenge), 120_000);
    return send(res, 200, { challenge });
  }

  if (route === 'POST /v1/auth/nostr') {
    const outcome = loginOutcome(state);
    if (outcome) return send(res, ...outcome);
    const problem = checkNip98(req.headers.authorization);
    const raw = await readBody(req);
    if (problem) {
      log('nostr login REJECTED:', problem);
      return send(res, 401, { error: 'unauthorized' });
    }
    log('nostr login ok', raw ? `body=${raw}` : '');
    return send(res, 200, tokens());
  }

  if (route === 'POST /v1/auth/google/code' || route === 'POST /v1/auth/apple') {
    const outcome = loginOutcome(state);
    if (outcome) return send(res, ...outcome);
    log(url.pathname, 'ok');
    return send(res, 200, tokens());
  }

  log('404', route);
  send(res, 404, { error: 'not_found' });
});

server.listen(MOCK_PORT, () => {
  const base = `${WEB_URL}/oauth/authenticate`;
  const link = (client, state = 'ok') => `${base}?${new URLSearchParams({
    response_type: 'code',
    client_id: client,
    redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect',
    state,
    code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGEcMtJh9Q',
    code_challenge_method: 'S256',
    resource: 'https://news.primal.net/mcp',
  })}`;

  console.log(`\nAthos mock on ${MOCK_URL}\n`);
  console.log('Consent check scenarios (client_id):');
  for (const [id, c] of Object.entries(CLIENTS)) console.log(`  ${c.note.padEnd(46)} ${link(id)}`);
  console.log(`  ${'400 missing_client'.padEnd(46)} ${base}`);
  console.log('\nSign-in / approve scenarios (state, with client chatgpt):');
  for (const [s, note] of Object.entries(STATES)) console.log(`  ${note.padEnd(46)} ${link('chatgpt', s)}`);
  console.log('\nTip: Nostr key login accepts any nsec/64-hex; a test key is', randomHex(32), '\n');

  const vite = spawn('npx', ['vite', '--port', String(WEB_PORT), '--strictPort'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PRIMAL_ATHOS_URL: MOCK_URL,
      PRIMAL_GOOGLE_CLIENT_ID: 'mock-google-client',
      PRIMAL_APPLE_CLIENT_ID: 'mock-apple-client',
      PRIMAL_OAUTH_MOCK_PROVIDERS: 'true',
    },
  });

  const stop = () => { vite.kill(); server.close(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  vite.on('exit', (code) => { server.close(); process.exit(code ?? 0); });
});
