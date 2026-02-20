import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';

import { login as tLogin } from '../../translations';

import styles from './LoginModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { nip19, nip46, SimplePool } from '../../lib/nTools';
import { storeSec } from '../../lib/localStore';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import { accountStore, doAfterLogin, loginUsingExtension, loginUsingLocalNsec, loginUsingNpub, setLoginType, setPublicKey, setSec, showCreateAccount, showLogin } from '../../stores/accountStore';
import { Tabs } from '@kobalte/core/tabs';

import { useToastContext } from '../Toaster/Toaster';
import QrCode from '../QrCode/QrCode';
import { appSigner, generateAppKeys, generateClientConnectionUrl, getAppSK, storeBunker } from '../../lib/PrimalNip46';
import { logWarning } from '../../lib/logger';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { encryptWithPin, setCurrentPin } from '../../lib/PrimalNostr';

import ssDark from '../../assets/images/signer_screenshot_dark.png';
import ssLight from '../../assets/images/signer_screenshot_light.png';
import { useAppContext } from '../../contexts/AppContext';
import ButtonLink from '../Buttons/ButtonLink';

export const BUNKER_RESPONSE_TIMEOUT = 8_000;

const GetStartedModal: Component<{
  id?: string,
  open?: boolean,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();
  const toaster = useToastContext();
  const settings = useSettingsContext();
  const app = useAppContext();

  const [clientUrl, setClientUrl] = createSignal('');

  const [copying, setCopying] = createSignal(false);

  let bunkerInput: HTMLInputElement | undefined;


  const onAbort = () => {
    props.onAbort && props.onAbort();
  }

  let pool: SimplePool | undefined;
  let signer: nip46.BunkerSigner | undefined;

  createEffect(() => {
    if (!props.open) {
      signer = undefined;
    }
  });

  createEffect(() => {
    if (!props.open) return;

    setupSigner();
    setTimeout(() => {
      bunkerInput?.focus();
    }, 100);
  });

  const setupSigner = async () => {
    try {
      generateAppKeys();
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
    } catch (reason) {
      logWarning('Failed to setup signer: ', reason)
    }
  }

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onAbort && props.onAbort()}
      title={
        <div class={styles.gstitle}>
          {intl.formatMessage(tLogin.title)}
        </div>
      }
      triggerClass={styles.hidden}
      noPadding={true}
    >
      <div id={props.id} class={styles.gsModal}>
        <div class={styles.getStartedDialog}>
          <div class={`${styles.img} ${['sunset', 'midnight'].includes(settings?.theme || '') ? styles.ssDark : styles.ssLight}`}></div>
          <div class={styles.simpleDesc}>
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
                  Select “Remote Login” from the side menu
                </div>
              </div>

              <div class={styles.loginListItem}>
                <div class={styles.number}>3</div>
                <div class={styles.itemLabel}>
                  Scan the code below:
                </div>
              </div>
            </div>

            <div class={styles.qrCode}
              onClick={() => {
                navigator.clipboard.writeText(clientUrl());
                toaster?.sendSuccess('Copied nostr connect uri')
              }}
            >
              <Show when={clientUrl().length > 0}>
                <div class={styles.actualQr}>
                  <QrCode
                    data={clientUrl()}
                    width={200}
                    height={200}
                    ecl="H"
                  />
                </div>
              </Show>
            </div>

            <div class={styles.footer}>
              <div class={styles.newToPrimal}>
                <div>New to Primal?</div>
                <button onClick={() => {
                props.onAbort && props.onAbort();
                showCreateAccount();
              }}>Create account</button>
              </div>

              <button onClick={() => {
                props.onAbort && props.onAbort();
                showLogin();
              }}>Advanced login options</button>
            </div>
          </div>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(GetStartedModal);
