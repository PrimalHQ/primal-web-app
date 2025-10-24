import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Match, Switch } from 'solid-js';

import { login as tLogin, actions as tActions } from '../../translations';

import styles from './LoginModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import CreatePinModal from '../CreatePinModal/CreatePinModal';
import TextInput from '../TextInput/TextInput';
import { nip19 } from '../../lib/nTools';
import { storeSec } from '../../lib/localStore';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import { accountStore, loginUsingExtension, loginUsingLocalNsec, loginUsingNpub, setSec } from '../../stores/accountStore';
import { Tabs } from '@kobalte/core/tabs';

import extensionIcon from '../../assets/images/extension.svg';
import nsecIcon from '../../assets/images/nsec.svg';
import { useToastContext } from '../Toaster/Toaster';

const LoginModal: Component<{
  id?: string,
  open?: boolean,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();
  const toaster = useToastContext();

  const [step, setStep] = createSignal<'login' | 'pin' | 'none'>('login')
  const [enteredKey, setEnteredKey] = createSignal('');
  const [enteredNpub, setEnteredNpub] = createSignal('');


  const [activeTab, setActiveTab] = createSignal('simple');

  let nsecInput: HTMLInputElement | undefined;

  let npubInput: HTMLInputElement | undefined;

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

  createEffect(() => {
    if (props.open && step() === 'login') {
      nsecInput?.focus();
    }
  });

  createEffect(() => {
    if (activeTab() === 'nsec') {
      setTimeout(() => {
        nsecInput?.focus();
      }, 100)
    }

    if (activeTab() === 'npub') {
      setTimeout(() => {
        npubInput?.focus();
      }, 100)
    }
  });

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Enter' && isValidNsec()) {
      onLogin();
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
        >
          <div id={props.id} class={styles.modal}>
            <Tabs value={activeTab()} onChange={setActiveTab}>
              <Tabs.List class={styles.profileTabs}>
                <Tabs.Trigger class={styles.profileTab} value="simple">
                  {intl.formatMessage(tLogin.tabs.simple)}
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.profileTab} value="extension">
                  {intl.formatMessage(tLogin.tabs.extension)}
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
                  <div class={styles.simpleLogin}></div>
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
                        Login
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
