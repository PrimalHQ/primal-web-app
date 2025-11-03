import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';

import { login as tLogin, actions as tActions } from '../../translations';

import styles from './LoginModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import CreatePinModal from '../CreatePinModal/CreatePinModal';
import { nip19, nip46, SimplePool } from '../../lib/nTools';
import { storeSec } from '../../lib/localStore';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import { accountStore, doAfterLogin, loginUsingExtension, loginUsingLocalNsec, loginUsingNpub, setLoginType, setPublicKey, setSec } from '../../stores/accountStore';
import { Tabs } from '@kobalte/core/tabs';

import { useToastContext } from '../Toaster/Toaster';
import QrCode from '../QrCode/QrCode';
import { useAppContext } from '../../contexts/AppContext';
import { appSigner, generateClientConnectionUrl, getAppSK, setAppSigner, storeBunker } from '../../lib/PrimalNip46';
import { logWarning } from '../../lib/logger';

const LoginModal: Component<{
  id?: string,
  open?: boolean,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();
  const toaster = useToastContext();
  const app = useAppContext();

  const [step, setStep] = createSignal<'login' | 'pin' | 'none'>('login')
  const [enteredKey, setEnteredKey] = createSignal('');
  const [enteredNpub, setEnteredNpub] = createSignal('');
  const [showBunkerInput, setShowBunkerInput] = createSignal(false);

  const [clientUrl, setClientUrl] = createSignal('');

  const [activeTab, setActiveTab] = createSignal('extension');
  const [copying, setCopying] = createSignal(false);

  let nsecInput: HTMLInputElement | undefined;
  let npubInput: HTMLInputElement | undefined;
  let bunkerInput: HTMLInputElement | undefined;

  const onLogin = () => {
    const sec = enteredKey();

    if (!isValidNsec()) {
      toaster?.sendWarning('Invalid nsec. Make sure you entered a valid nsec that starts with "nsec1...')
      return;
    }

    setSec(sec);
    setStep(() => 'pin');
    props.onAbort && props.onAbort();
  };

  const onStoreSec = (sec: string | undefined) => {
    storeSec(sec);
    loginUsingLocalNsec();
    onAbort();
  }

  const onAbort = () => {
    setStep(() => 'login');
    setEnteredKey('');
    props.onAbort && props.onAbort();
  }

  const isValidNsec: () => boolean = () => {
    const key = enteredKey();

    if (key.length === 0) {
      return false;
    }

    if (key.startsWith('nsec')) {
      try {
        const decoded = nip19.decode(key);

        return decoded.type === 'nsec' && decoded.data ? true : false;
      } catch(e) {
        return false;
      }
    }

    return false;
  };

  const isValidNpub: () => boolean = () => {
    const key = enteredNpub();

    if (key.length === 0) {
      return false;
    }

    if (key.startsWith('npub')) {
      try {
        const decoded = nip19.decode(key);

        return decoded.type === 'npub' && decoded.data ? true : false;
      } catch(e) {
        return false;
      }
    }

    return false;
  };

  let pool: SimplePool | undefined;
  let signer: nip46.BunkerSigner | undefined;

  createEffect(() => {
    if (!props.open) {
      signer = undefined;
    }
  });

  createEffect(() => {
    if (!props.open) return;

    if (activeTab() === 'nsec') {
      setTimeout(() => {
        nsecInput?.focus();
      }, 100);
    }

    if (activeTab() === 'npub') {
      setTimeout(() => {
        npubInput?.focus();
      }, 100);
    }

    if (activeTab() === 'simple') {
      setupSigner();
      setTimeout(() => {
        bunkerInput?.focus();
      }, 100);
    }
  });

  const setupSigner = async () => {
    const cUrl = generateClientConnectionUrl();

    if (cUrl.length === 0) return;

    setClientUrl(cUrl);

    const sec = getAppSK();

    if (!sec) return;

    if (!signer) {
      pool = new SimplePool();
      signer = await nip46.BunkerSigner.fromURI(sec, cUrl, { pool });
    }

    storeBunker(signer);
    const pk = await signer.getPublicKey();

    setLoginType('nip46');
    setPublicKey(pk);
    doAfterLogin(pk);

    props.onAbort && props.onAbort();
  }

  const onBunkerLogin = async () => {
    const bunkerUrl = bunkerInput?.value || '';
    const sec = getAppSK();

    try {
      if (!sec) {
        throw new Error('no-app-sec');
      }

      if (!bunkerUrl) {
        throw new Error('no-buker-url');
      };

      const bunkerPointer = await nip46.parseBunkerInput(bunkerUrl);

      if (!bunkerPointer) {
        throw new Error('no-buker-pointer');
      }

      const pool = new SimplePool();

      const signer = nip46.BunkerSigner.fromBunker(sec, bunkerPointer, { pool });

      signer.connect();

      storeBunker(signer);

      if (!appSigner) {
        throw new Error('no-app-signer');
      }

      const pubkey = await appSigner.getPublicKey();

      setLoginType('nip46');
      setPublicKey(pubkey);
      doAfterLogin(pubkey);

      props.onAbort && props.onAbort();
    } catch (e) {
      logWarning('FAILED TO LOGIN: ', e)
      setLoginType('none');
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Enter' && isValidNsec()) {
      if (activeTab() === 'nsec') {
        onLogin();
      }

      if (activeTab() === 'simple') {
        onBunkerLogin();
      }
    }
  };

  return (
    <Switch>
      <Match when={step() === 'login'}>
        <AdvancedSearchDialog
          open={props.open}
          setOpen={(isOpen: boolean) => !isOpen && props.onAbort && props.onAbort()}
          title={
            <div class={styles.title}>
              {intl.formatMessage(tLogin.title)}
            </div>
          }
          triggerClass={styles.hidden}
          noPadding={true}
          topAlignedHeader={true}
        >
          <div id={props.id} class={styles.modal}>
            <Tabs value={activeTab()} onChange={setActiveTab}>
              <Tabs.List class={styles.profileTabs}>
                <Tabs.Trigger class={styles.profileTab} value="extension">
                  {intl.formatMessage(tLogin.tabs.extension)}
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.profileTab} value="simple">
                  {intl.formatMessage(tLogin.tabs.simple)}
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.profileTab} value="nsec">
                  {intl.formatMessage(tLogin.tabs.nsec)}
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.profileTab} value="npub">
                  {intl.formatMessage(tLogin.tabs.npub)}
                </Tabs.Trigger>
                <Tabs.Indicator class={styles.profileTabIndicator} />
              </Tabs.List>


              <div class={styles.tabContent}>
                <Tabs.Content value="simple" >
                  <div class={styles.extensionLogin}>
                    <div class={styles.qrCode}>
                      <Show when={clientUrl().length > 0}>
                        <div class={styles.actualQr}>
                          <QrCode
                            data={clientUrl()}
                            width={234}
                            height={234}
                          />
                        </div>
                        <button
                          class={styles.copyNostrConnect}
                          onClick={() => {
                            navigator.clipboard.writeText(clientUrl());
                            setCopying(true);
                            setTimeout(() => setCopying(false), 2_000);
                          }}
                        >
                          <div class={styles.content}>{clientUrl()}</div>
                          <div class={styles.copyIcon}></div>
                        </button>
                      </Show>
                    </div>
                    <div class={styles.bunkerDesc}>
                      <div class={styles.loginExplain}>
                        Login by scanning the QR code or pasting the connect string into your bunker.
                      </div>
                      <button
                        class={styles.bunkerShow}
                        onClick={() => {
                          setShowBunkerInput(f => !f);
                        }}
                      >
                        Or, enter Bunker URL manually
                      </button>
                      <Show when={showBunkerInput()}>
                        <div class={styles.bunkerInput}>
                          <input
                            ref={bunkerInput}
                            class={styles.input}
                            type="text"
                            onKeyUp={onKeyUp}
                            onInput={(e) => setEnteredNpub(e.target.value)}
                            placeholder='bunker://...'
                            // validationState={enteredKey().length === 0 || isValidNsec() ? 'valid' : 'invalid'}
                            // errorMessage={intl.formatMessage(tLogin.invalidNsec)}
                            // inputClass={styles.nsecInput}
                          />
                          <ButtonPrimary onClick={() => onBunkerLogin()}>Login</ButtonPrimary>
                        </div>
                      </Show>
                    </div>
                    {/* <div class={styles.simpleDesc}>
                      <div class={styles.loginExplain}>
                        The simplest way to login:
                      </div>
                      <div class={styles.loginList}>
                        <div class={styles.loginListItem}>
                          <div class={styles.number}>1</div>
                          <div class={styles.itemLabel}>
                            Open your Primal mobile app
                          </div>
                        </div>

                        <div class={styles.loginListItem}>
                          <div class={styles.number}>2</div>
                          <div class={styles.itemLabel}>
                            Select “Scan Code” from the side menu
                          </div>
                        </div>
                      </div>

                      <button class={styles.copyButton}>
                        <div class={styles.copyIcon}></div>
                        <div>Copy Login URL</div>
                      </button>
                    </div> */}
                  </div>
                </Tabs.Content>
                <Tabs.Content value="extension" >
                  <div class={styles.extensionLogin}>
                    <div class={styles.extensionIcon} />
                    <div class={styles.extensionDesc}>
                      <div class={styles.description}>
                        <span>Login using a browser extension like </span>
                        <a href="https://nostrapps.com/nos2x" target='_blank'>nos2x</a> or <a href="https://getalby.com/nostr" target='_blank'>Alby</a>
                      </div>
                      <ButtonPrimary onClick={() => {
                        loginUsingExtension();
                        props.onAbort && props.onAbort();
                      }}>
                        Login Now
                      </ButtonPrimary>
                    </div>
                  </div>
                </Tabs.Content>
                <Tabs.Content value="nsec" >
                  <div class={styles.nsecLogin}>
                    <div class={styles.nsecIcon} />
                    <div class={styles.nsecDesc}>
                      <div class={styles.description}>
                        Enter your Nostr private key (nsec):
                      </div>
                      <input
                        ref={nsecInput}
                        class={styles.input}
                        type="password"
                        onKeyUp={onKeyUp}
                        onInput={(e) => setEnteredKey(e.target.value)}
                        placeholder='nsec1...'
                        // validationState={enteredKey().length === 0 || isValidNsec() ? 'valid' : 'invalid'}
                        // errorMessage={intl.formatMessage(tLogin.invalidNsec)}
                        // inputClass={styles.nsecInput}
                      />
                      <div class={styles.nsecWarning}>
                        <span class={styles.bold}>Warning: </span>
                        <span>
                          This is a dangerous login method. Never enter your nsec in an untrusted application. Use an alternative login method if possible.
                        </span>
                      </div>

                      <ButtonPrimary onClick={() => {
                        onLogin();
                      }}>
                        Login
                      </ButtonPrimary>
                    </div>
                  </div>
                </Tabs.Content>
                <Tabs.Content value="npub" >
                  <div class={styles.nsecLogin}>
                    <div class={styles.nsecIcon} />
                    <div class={styles.nsecDesc}>
                      <div class={styles.description}>
                        Enter your Nostr public key (npub):
                      </div>
                      <input
                        ref={npubInput}
                        class={styles.input}
                        type="password"
                        onKeyUp={onKeyUp}
                        onInput={(e) => setEnteredNpub(e.target.value)}
                        placeholder='npub1...'
                        // validationState={enteredKey().length === 0 || isValidNsec() ? 'valid' : 'invalid'}
                        // errorMessage={intl.formatMessage(tLogin.invalidNsec)}
                        // inputClass={styles.nsecInput}
                      />
                      <div class={styles.npubWarning}>
                        <span class={styles.bold}>Be Aware: </span>
                        <span>
                          Logging in with your npub will allow you to browse nostr in read mode only.
                        </span>
                      </div>

                      <ButtonPrimary onClick={() => {
                        if (isValidNpub()) {
                          loginUsingNpub(enteredNpub());
                          props.onAbort && props.onAbort();
                        }
                        else {
                          toaster?.sendWarning('Invalid npub. Make sure you entered a vaild npub that starts with "npub1..."')
                        }
                      }}>
                        Login
                      </ButtonPrimary>
                    </div>
                  </div>
                </Tabs.Content>
              </div>
            </Tabs>
          </div>
        </AdvancedSearchDialog>
      </Match>

      <Match when={step() === 'pin'}>
        <CreatePinModal
          open={step() === 'pin'}
          onAbort={() => {
            onStoreSec(accountStore.sec);
          }}
          valueToEncrypt={enteredKey()}
          onPinApplied={onStoreSec}
        />
      </Match>
    </Switch>
  );
}

export default hookForDev(LoginModal);
