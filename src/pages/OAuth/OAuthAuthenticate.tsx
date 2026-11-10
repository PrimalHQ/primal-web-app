import { Component, createSignal, For, JSXElement, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { MessageDescriptor } from '@cookbook/solid-intl';

import {
  approveConsent,
  AthosError,
  buildNip98Unsigned,
  checkConsent,
  ConsentInfo,
  loginWithApple,
  loginWithGoogleCode,
  loginWithNostr,
  nostrChallenge,
  OAuthParams,
  readOAuthParams,
} from '../../lib/athos';
import { isPasskeySupported, PassportAccount, PassportError, unlockPassport, wipeAccounts } from '../../lib/passport';
import {
  APPLE_CLIENT_ID,
  appleIdToken,
  GOOGLE_CLIENT_ID,
  googleAuthCode,
  preloadProviders,
  ProviderCancelled,
} from '../../lib/oauthProviders';
import {
  finalizeEvent,
  generatePrivateKey,
  getPublicKey,
  nip19,
  nip46,
  NostrEventTemplate,
  NostrVerifiedEvent,
  SimplePool,
  verifyEvent,
} from '../../lib/nTools';
import { NostrWindow } from '../../types/primal';
import { oauth as t } from '../../translations';
import QrCode from '../../components/QrCode/QrCode';

import passkeyIcon from '../../assets/icons/oauth/passkey.svg';
import nostrIcon from '../../assets/icons/oauth/nostr.svg';
import googleIcon from '../../assets/icons/oauth/google.png';
import appleIcon from '../../assets/icons/oauth/apple.png';
import extensionIcon from '../../assets/icons/oauth/extension.svg';
import remoteSignerIcon from '../../assets/icons/oauth/remote.svg';
import keyIcon from '../../assets/icons/oauth/nostr_key.svg';

import styles from './OAuthAuthenticate.module.scss';

type View =
  | 'loading'
  | 'error'
  | 'signIn'
  | 'nostr'
  | 'remoteSigner'
  | 'nsec'
  | 'accountPicker'
  | 'consent'
  | 'redirecting';

type SignedInAs =
  | { kind: 'nostr', npub: string }
  | { kind: 'google' }
  | { kind: 'apple' };

type Signer = (template: NostrEventTemplate) => Promise<NostrVerifiedEvent>;

const REMOTE_SIGNER_RELAYS = ['wss://nrs.primal.net'];
const BUNKER_CONNECT_TIMEOUT = 15_000;
const REMOTE_SIGN_TIMEOUT = 60_000;
const EXTENSION_SIGN_TIMEOUT = 120_000;

class SignerTimeout extends Error {}
class InvalidKey extends Error {}

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SignerTimeout()), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (reason) => { clearTimeout(timer); reject(reason); },
    );
  });

const shortNpub = (npub: string) => `${npub.slice(0, 12)}…${npub.slice(-6)}`;

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), b => b.toString(16).padStart(2, '0')).join('');

/** nsec1… or 64 hex chars. */
const parseSecretKey = (value: string): Uint8Array => {
  const input = value.trim();
  try {
    if (input.startsWith('nsec')) {
      const decoded = nip19.decode(input);
      if (decoded.type === 'nsec') return decoded.data as Uint8Array;
    } else if (/^[0-9a-fA-F]{64}$/.test(input)) {
      return Uint8Array.from(input.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    }
  } catch {
    // fall through: never echo the decoder's message, it quotes the secret
  }
  throw new InvalidKey();
};

const localKeySigner = (secretKey: Uint8Array): Signer =>
  async (template) => finalizeEvent(template, secretKey);

const waitForExtension = async () => {
  const win = window as NostrWindow;
  for (let i = 0; i < 5 && !win.nostr; i++) {
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return win.nostr;
};

const Icon: Component<{ src: string, mask?: boolean }> = (props) => (
  <Show
    when={props.mask}
    fallback={<img class={styles.icon} src={props.src} alt="" aria-hidden="true" />}
  >
    <span
      class={styles.maskIcon}
      aria-hidden="true"
      style={{
        '-webkit-mask-image': `url("${props.src}")`,
        'mask-image': `url("${props.src}")`,
      }}
    />
  </Show>
);

const OAuthAuthenticate: Component = () => {
  const intl = useIntl();

  const params: OAuthParams = readOAuthParams();

  const [view, setView] = createSignal<View>('loading');
  const [consent, setConsent] = createSignal<ConsentInfo>();
  const [fatalError, setFatalError] = createSignal<MessageDescriptor>();
  const [canRetry, setCanRetry] = createSignal(false);
  const [error, setError] = createSignal<string>();
  const [busy, setBusy] = createSignal<string>();
  const [accessToken, setAccessToken] = createSignal<string>();
  const [signedInAs, setSignedInAs] = createSignal<SignedInAs>();
  const [passportAccounts, setPassportAccounts] = createSignal<{ passportId: string, accounts: PassportAccount[] }>();
  const [connectUrl, setConnectUrl] = createSignal('');

  let nsecInput: HTMLInputElement | undefined;
  let bunkerInput: HTMLInputElement | undefined;

  // Remote signer session, torn down whenever the user leaves that screen.
  let remoteAbort: AbortController | undefined;
  let remotePool: SimplePool | undefined;
  let remoteSigner: nip46.BunkerSigner | undefined;

  const closeRemoteSigner = () => {
    remoteAbort?.abort();
    remoteAbort = undefined;
    const signer = remoteSigner;
    const pool = remotePool;
    remoteSigner = undefined;
    remotePool = undefined;
    const destroyPool = () => { try { pool?.destroy(); } catch { /* already closed */ } };
    if (signer) signer.close().catch(() => {}).finally(destroyPool);
    else destroyPool();
  };

  const go = (next: View) => {
    if (view() === 'remoteSigner' && next !== 'remoteSigner') closeRemoteSigner();
    if (view() === 'accountPicker' && next !== 'accountPicker') {
      const unlocked = passportAccounts();
      unlocked && wipeAccounts(unlocked.accounts);
      setPassportAccounts(undefined);
    }
    setError(undefined);
    setView(next);
  };

  /* ---- consent check ---- */

  const loadConsent = async () => {
    setView('loading');
    setFatalError(undefined);
    setCanRetry(false);

    try {
      const result = await checkConsent(params);

      if (result.action === 'redirect') {
        setView('redirecting');
        window.location.replace(result.redirectUrl);
        return;
      }

      if (result.action !== 'consent') throw new Error('unexpected_action');

      setConsent(result);
      setView('signIn');
    } catch (e) {
      if (e instanceof AthosError && e.code === 'missing_client') {
        setFatalError(t.errors.missingClient);
      } else if (e instanceof AthosError && e.code === 'unverified_client') {
        setFatalError(t.errors.unverifiedClient);
      } else if (e instanceof AthosError && e.status === 429) {
        setFatalError(t.errors.rateLimited);
        setCanRetry(true);
      } else {
        setFatalError(t.errors.unreachable);
        setCanRetry(true);
      }
      setView('error');
    }
  };

  onMount(() => {
    const root = document.querySelector('#root');
    const previousStyle = root?.getAttribute('style');
    root?.setAttribute('style', 'background-color: black');

    const previousTitle = document.title;
    document.title = intl.formatMessage(t.pageTitle);

    onCleanup(() => {
      if (previousStyle) root?.setAttribute('style', previousStyle);
      else root?.removeAttribute('style');
      document.title = previousTitle;
    });

    // A page that can be framed can be clicked through from underneath.
    if (window.top !== window.self) {
      setFatalError(t.errors.framed);
      setView('error');
      return;
    }

    preloadProviders();
    loadConsent();
  });

  onCleanup(() => {
    closeRemoteSigner();
    const unlocked = passportAccounts();
    unlocked && wipeAccounts(unlocked.accounts);
  });

  /* ---- sign-in plumbing ---- */

  const messageFor = (e: unknown): string | undefined => {
    if (e instanceof ProviderCancelled) return undefined;
    if (e instanceof DOMException && e.name === 'NotAllowedError') return undefined; // passkey dialog dismissed
    if (e instanceof PassportError) {
      return intl.formatMessage(e.code === 'no_nostr_account' ? t.errors.noNostrAccount : t.errors.cannotUnlock);
    }
    if (e instanceof InvalidKey) return intl.formatMessage(t.errors.invalidKey);
    if (e instanceof SignerTimeout) return intl.formatMessage(t.errors.signerTimeout);
    if (e instanceof AthosError && e.status === 429) return intl.formatMessage(t.errors.rateLimited);
    if (e instanceof Error && e.message === 'provider_unavailable') return intl.formatMessage(t.errors.providerUnavailable);
    return intl.formatMessage(t.errors.generic);
  };

  /** Runs one sign-in ceremony with a busy indicator on the button that started it. */
  const run = async (key: string, ceremony: () => Promise<void>) => {
    if (busy()) return;
    setBusy(key);
    setError(undefined);
    try {
      await ceremony();
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(undefined);
    }
  };

  const signedIn = (token: string, who: SignedInAs) => {
    setAccessToken(token);
    setSignedInAs(who);
    go('consent');
  };

  /** Challenge -> NIP-98 event -> signer -> POST /v1/auth/nostr. A fresh challenge every attempt. */
  const signInWithNostr = async (sign: Signer, passportId?: string) => {
    const challenge = await nostrChallenge();
    const event = await sign(buildNip98Unsigned(challenge));
    if (!verifyEvent(event)) throw new Error('bad_signature');
    const tokens = await loginWithNostr(event, passportId);
    signedIn(tokens.accessToken, { kind: 'nostr', npub: nip19.npubEncode(event.pubkey) });
  };

  /* ---- ceremonies ---- */

  const onPasskey = () => run('passkey', async () => {
    if (!isPasskeySupported()) throw new Error('passkey_unsupported');

    const unlocked = await unlockPassport();

    if (unlocked.accounts.length === 1) {
      const [account] = unlocked.accounts;
      try {
        await signInWithNostr(localKeySigner(account.secretKey), unlocked.passportId);
      } finally {
        wipeAccounts(unlocked.accounts);
      }
      return;
    }

    setPassportAccounts(unlocked);
    go('accountPicker');
  });

  const onPickAccount = (account: PassportAccount) => run(`account-${account.pubkey}`, async () => {
    const unlocked = passportAccounts();
    if (!unlocked) return;
    await signInWithNostr(localKeySigner(account.secretKey), unlocked.passportId);
  });

  const onGoogle = () => run('google', async () => {
    const code = await googleAuthCode();
    const tokens = await loginWithGoogleCode(code);
    signedIn(tokens.accessToken, { kind: 'google' });
  });

  const onApple = () => run('apple', async () => {
    const idToken = await appleIdToken();
    const tokens = await loginWithApple(idToken);
    signedIn(tokens.accessToken, { kind: 'apple' });
  });

  const onExtension = () => run('extension', async () => {
    const nostr = await waitForExtension();
    if (!nostr) {
      setError(intl.formatMessage(t.errors.noExtension));
      return;
    }
    await signInWithNostr(async (template) => {
      const signed = await withTimeout(nostr.signEvent(template), EXTENSION_SIGN_TIMEOUT);
      return signed as NostrVerifiedEvent;
    });
  });

  const onNsec = () => run('nsec', async () => {
    const field = nsecInput;
    if (!field) return;
    const secretKey = parseSecretKey(field.value);
    // Cleared once it parses, so a page left on the consent step isn't holding it.
    field.value = '';
    try {
      await signInWithNostr(localKeySigner(secretKey));
    } finally {
      secretKey.fill(0);
    }
  });

  const remoteSign = (signer: nip46.BunkerSigner): Signer =>
    (template) => withTimeout(signer.signEvent(template), REMOTE_SIGN_TIMEOUT);

  /** Shows a nostrconnect:// QR and waits for a signer app to scan it. */
  const startRemoteSigner = async () => {
    closeRemoteSigner();

    const secretKey = generatePrivateKey();
    const uri = nip46.createNostrConnectURI({
      clientPubkey: getPublicKey(secretKey),
      relays: REMOTE_SIGNER_RELAYS,
      secret: randomHex(16),
      name: 'Primal',
      url: window.location.origin,
    });
    setConnectUrl(uri);

    const abort = new AbortController();
    const pool = new SimplePool();
    remoteAbort = abort;
    remotePool = pool;

    try {
      const signer = await nip46.BunkerSigner.fromURI(secretKey, uri, { pool }, abort.signal);
      if (abort.signal.aborted) {
        signer.close().catch(() => {});
        return;
      }
      remoteSigner = signer;
      await run('remote', () => signInWithNostr(remoteSign(signer)));
    } catch {
      // Aborted when leaving the screen, or timed out: nothing to tell the user.
    }
  };

  const onRemoteSigner = () => {
    go('remoteSigner');
    startRemoteSigner();
  };

  const onBunker = () => run('bunker', async () => {
    const value = bunkerInput?.value.trim() || '';
    const pointer = value ? await nip46.parseBunkerInput(value) : null;
    if (!pointer) {
      setError(intl.formatMessage(t.errors.invalidBunker));
      return;
    }

    // Replace the QR session with the bunker session.
    closeRemoteSigner();
    const pool = new SimplePool();
    const signer = nip46.BunkerSigner.fromBunker(generatePrivateKey(), pointer, { pool });
    remotePool = pool;
    remoteSigner = signer;

    await withTimeout(signer.connect(), BUNKER_CONNECT_TIMEOUT);
    await signInWithNostr(remoteSign(signer));
  });

  const copyConnectUrl = () => {
    navigator.clipboard?.writeText(connectUrl()).catch(() => {});
  };

  /* ---- consent ---- */

  const onApprove = () => run('approve', async () => {
    const token = accessToken();
    if (!token) {
      go('signIn');
      return;
    }
    try {
      const redirectUrl = await approveConsent(token, params);
      setView('redirecting');
      window.location.replace(redirectUrl);
    } catch (e) {
      if (e instanceof AthosError && e.status === 401) {
        setAccessToken(undefined);
        setSignedInAs(undefined);
        go('signIn');
        setError(intl.formatMessage(t.errors.sessionExpired));
        return;
      }
      if (e instanceof AthosError && (e.code === 'missing_client' || e.code === 'unverified_client')) {
        setFatalError(e.code === 'missing_client' ? t.errors.missingClient : t.errors.unverifiedClient);
        setView('error');
        return;
      }
      throw e;
    }
  });

  const onDeny = () => {
    const info = consent();
    if (!info) return;
    setView('redirecting');
    window.location.replace(info.denyUrl);
  };

  /* ---- rendering ---- */

  /** "{client} wants to access {resource} as you." with both names in bold. */
  const wantsAccess = () => {
    const info = consent();
    if (!info) return null;
    const C = '\u0000C\u0000';
    const R = '\u0000R\u0000';
    const text = intl.formatMessage(t.wantsAccess, { client: C, resource: R });
    return text.split('\u0000').map(part => {
      if (part === 'C') return <strong>{info.clientName}</strong>;
      if (part === 'R') return <strong>{info.resourceName}</strong>;
      return part;
    });
  };

  const OptionButton: Component<{
    id: string,
    icon: string,
    mask?: boolean,
    label: string,
    onClick: () => void,
  }> = (props) => (
    <button
      type="button"
      class={styles.option}
      disabled={!!busy()}
      aria-busy={busy() === props.id}
      onClick={props.onClick}
    >
      <Show when={busy() === props.id} fallback={<Icon src={props.icon} mask={props.mask} />}>
        <span class={styles.spinner} aria-hidden="true" />
      </Show>
      <span>{props.label}</span>
    </button>
  );

  const ErrorText = () => (
    <Show when={error()}>
      <div class={styles.error} role="alert">{error()}</div>
    </Show>
  );

  const BackLink: Component<{ to: View }> = (props) => (
    <button type="button" class={styles.link} disabled={!!busy() && busy() !== 'remote'} onClick={() => go(props.to)}>
      {intl.formatMessage(t.back)}
    </button>
  );

  const Card: Component<{ title: string, children: JSXElement }> = (props) => (
    <div class={styles.card}>
      <h1 class={styles.title}>{props.title}</h1>
      {props.children}
    </div>
  );

  return (
    <main class={styles.page}>
      <Switch>
        <Match when={view() === 'loading' || view() === 'redirecting'}>
          <div class={styles.card}>
            <div class={styles.centered}>
              <span class={styles.spinnerLarge} aria-hidden="true" />
              <Show when={view() === 'redirecting'}>
                <span class={styles.muted}>{intl.formatMessage(t.redirecting)}</span>
              </Show>
            </div>
          </div>
        </Match>

        <Match when={view() === 'error'}>
          <Card title={intl.formatMessage(t.errorTitle)}>
            <p class={styles.text}>{fatalError() && intl.formatMessage(fatalError()!)}</p>
            <Show when={canRetry()}>
              <div class={styles.options}>
                <button type="button" class={styles.option} onClick={loadConsent}>
                  {intl.formatMessage(t.retry)}
                </button>
              </div>
            </Show>
          </Card>
        </Match>

        <Match when={view() === 'signIn'}>
          <Card title={intl.formatMessage(t.connectTitle)}>
            <p class={styles.text}>{wantsAccess()}</p>
            <p class={styles.muted}>{intl.formatMessage(t.signInToContinue)}</p>
            <div class={styles.options}>
              <OptionButton id="passkey" icon={passkeyIcon} mask label={intl.formatMessage(t.continueWithPasskey)} onClick={onPasskey} />
              <Show when={GOOGLE_CLIENT_ID}>
                <OptionButton id="google" icon={googleIcon} label={intl.formatMessage(t.continueWithGoogle)} onClick={onGoogle} />
              </Show>
              <Show when={APPLE_CLIENT_ID}>
                <OptionButton id="apple" icon={appleIcon} label={intl.formatMessage(t.continueWithApple)} onClick={onApple} />
              </Show>
              <OptionButton id="nostr" icon={nostrIcon} mask label={intl.formatMessage(t.continueWithNostr)} onClick={() => go('nostr')} />
            </div>
            <ErrorText />
            <div class={styles.footer}>
              <button type="button" class={styles.link} disabled={!!busy()} onClick={onDeny}>
                {intl.formatMessage(t.cancel)}
              </button>
            </div>
          </Card>
        </Match>

        <Match when={view() === 'nostr'}>
          <Card title={intl.formatMessage(t.continueWithNostr)}>
            <p class={styles.muted}>{intl.formatMessage(t.chooseNostrMethod)}</p>
            <div class={styles.options}>
              <OptionButton id="extension" icon={extensionIcon} mask label={intl.formatMessage(t.useExtension)} onClick={onExtension} />
              <OptionButton id="remoteSigner" icon={remoteSignerIcon} mask label={intl.formatMessage(t.useRemoteSigner)} onClick={onRemoteSigner} />
              <OptionButton id="nsecView" icon={keyIcon} mask label={intl.formatMessage(t.useNostrKey)} onClick={() => go('nsec')} />
            </div>
            <ErrorText />
            <div class={styles.footer}>
              <BackLink to="signIn" />
            </div>
          </Card>
        </Match>

        <Match when={view() === 'remoteSigner'}>
          <Card title={intl.formatMessage(t.remoteSignerTitle)}>
            <p class={styles.muted}>{intl.formatMessage(t.remoteSignerScan)}</p>
            <div class={styles.qr}>
              <Show when={connectUrl()}>
                <QrCode data={connectUrl()} width={200} height={200} ecl="H" />
              </Show>
              <Show when={busy() === 'remote'}>
                <div class={styles.qrOverlay}><span class={styles.spinnerLarge} aria-hidden="true" /></div>
              </Show>
            </div>
            <button type="button" class={styles.link} onClick={copyConnectUrl}>
              {intl.formatMessage(t.copyConnectionUrl)}
            </button>
            <form class={styles.inputRow} onSubmit={(e) => { e.preventDefault(); onBunker(); }}>
              <input
                ref={bunkerInput}
                class={styles.input}
                type="text"
                autocomplete="off"
                spellcheck={false}
                placeholder={intl.formatMessage(t.bunkerPlaceholder)}
              />
              <button type="submit" class={styles.primary} disabled={!!busy()}>
                <Show when={busy() === 'bunker'} fallback={intl.formatMessage(t.connect)}>
                  <span class={styles.spinner} aria-hidden="true" />
                </Show>
              </button>
            </form>
            <ErrorText />
            <div class={styles.footer}>
              <BackLink to="nostr" />
            </div>
          </Card>
        </Match>

        <Match when={view() === 'nsec'}>
          <Card title={intl.formatMessage(t.nostrKeyTitle)}>
            <p class={styles.muted}>{intl.formatMessage(t.nostrKeyPrompt)}</p>
            <form class={styles.form} onSubmit={(e) => { e.preventDefault(); onNsec(); }}>
              <input
                ref={nsecInput}
                class={styles.input}
                type="password"
                autocomplete="off"
                spellcheck={false}
                placeholder={intl.formatMessage(t.nostrKeyPlaceholder)}
              />
              <button type="submit" class={styles.primaryWide} disabled={!!busy()}>
                <Show when={busy() === 'nsec'} fallback={intl.formatMessage(t.continue)}>
                  <span class={styles.spinner} aria-hidden="true" />
                </Show>
              </button>
            </form>
            <ErrorText />
            <div class={styles.footer}>
              <BackLink to="nostr" />
            </div>
          </Card>
        </Match>

        <Match when={view() === 'accountPicker'}>
          <Card title={intl.formatMessage(t.chooseAccountTitle)}>
            <p class={styles.muted}>{intl.formatMessage(t.chooseAccountPrompt)}</p>
            <div class={styles.options}>
              <For each={passportAccounts()?.accounts || []}>
                {(account) => (
                  <OptionButton
                    id={`account-${account.pubkey}`}
                    icon={nostrIcon}
                    mask
                    label={account.label || shortNpub(account.npub)}
                    onClick={() => onPickAccount(account)}
                  />
                )}
              </For>
            </div>
            <ErrorText />
            <div class={styles.footer}>
              <BackLink to="signIn" />
            </div>
          </Card>
        </Match>

        <Match when={view() === 'consent'}>
          <Card title={intl.formatMessage(t.authorizeTitle, { client: consent()?.clientName || '' })}>
            <p class={styles.text}>{wantsAccess()}</p>

            <div class={styles.identity}>
              <Switch>
                <Match when={signedInAs()?.kind === 'nostr'}>
                  <Icon src={nostrIcon} mask />
                  <span>
                    {intl.formatMessage(t.signedInAs)}{' '}
                    <strong title={(signedInAs() as { npub: string }).npub}>
                      {shortNpub((signedInAs() as { npub: string }).npub)}
                    </strong>
                  </span>
                </Match>
                <Match when={signedInAs()?.kind === 'google'}>
                  <Icon src={googleIcon} />
                  <span>{intl.formatMessage(t.signedInWithGoogle)}</span>
                </Match>
                <Match when={signedInAs()?.kind === 'apple'}>
                  <Icon src={appleIcon} />
                  <span>{intl.formatMessage(t.signedInWithApple)}</span>
                </Match>
              </Switch>
            </div>

            <p class={styles.muted}>
              {intl.formatMessage(t.returnTo, { host: consent()?.returnHost || '' })}
            </p>

            <div class={styles.options}>
              <button type="button" class={styles.primaryWide} disabled={!!busy()} onClick={onApprove}>
                <Show when={busy() === 'approve'} fallback={intl.formatMessage(t.approve)}>
                  <span class={styles.spinner} aria-hidden="true" />
                </Show>
              </button>
              <button type="button" class={styles.option} disabled={!!busy()} onClick={onDeny}>
                {intl.formatMessage(t.deny)}
              </button>
            </div>
            <ErrorText />
          </Card>
        </Match>
      </Switch>
    </main>
  );
};

export default OAuthAuthenticate;
