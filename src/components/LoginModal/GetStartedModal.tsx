import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Show, } from 'solid-js';

import { login as tLogin } from '../../translations';

import styles from './LoginModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import { SimplePool } from '../../lib/nTools';
import * as nip46 from '../../lib/nip46/nip46';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import { doAfterLogin, setLoginType, setPublicKey, showCreateAccount, showLogin } from '../../stores/accountStore';

import { useToastContext } from '../Toaster/Toaster';
import QrCode from '../QrCode/QrCode';
import { generateAppKeys, generateClientConnectionUrl, getAppSK, storeBunker } from '../../lib/PrimalNip46';
import { logWarning } from '../../lib/logger';
import { useSettingsContext } from '../../contexts/SettingsContext';

import { addNWC, connectToNWCWallet } from '../../pages/Settings/NostrWalletConnect';
import { primalRemoteWalletLabel } from '../../constants';

export const BUNKER_RESPONSE_TIMEOUT = 8_000;

const GetStartedModal: Component<{
  id?: string,
  open?: boolean,
  onAbort?: () => void,
}> = (props) => {

  const intl = useIntl();
  const toaster = useToastContext();
  const settings = useSettingsContext();

  const [clientUrl, setClientUrl] = createSignal('');

  let bunkerInput: HTMLInputElement | undefined;


  const onAbort = () => {
    props.onAbort && props.onAbort();
  }

  let pool: SimplePool | undefined;
  let signer: nip46.BunkerSigner | undefined;

  let nwc: string | undefined;

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
      await generateAppKeys();
      const cUrl = generateClientConnectionUrl();

      if (cUrl.length === 0) return;

      setClientUrl(cUrl);

      const sec = await getAppSK();

      if (!sec) return;

      if (!signer) {
        pool = new SimplePool();
        signer = await nip46.BunkerSigner.fromURI(sec, cUrl, { pool, setNWC: (n) => nwc= n, });
      }

      storeBunker(signer);
      const pk = await signer.getPublicKey();

      setLoginType('nip46');
      setPublicKey(pk);
      doAfterLogin(pk);

      if (nwc) {
        addNWC(primalRemoteWalletLabel, nwc);
        connectToNWCWallet(primalRemoteWalletLabel, nwc);
      }

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
