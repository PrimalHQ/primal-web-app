import { Component, For, createEffect, createSignal, onMount } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';

import logo from "../../assets/icons/logo.svg";
import nwc from "../../assets/icons/nwc.svg";
import NWCItem from '../../components/NWCItem/NWCItem';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import { TextField } from '@kobalte/core/text-field';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import { logInfo } from '../../lib/logger';
import { useAccountContext } from '../../contexts/AccountContext';
import { checkPrimalWalletActive, connectPrimalWalletActive, decodeNWCUri, sendNWCInfoEvent } from '../../lib/wallet';
import { createStore } from 'solid-js/store';
import { encrypt, decrypt } from '../../lib/nostrAPI';
import { loadNWC, loadNWCActive, saveNWC, saveNWCActive } from '../../lib/localStore';
import { updatePage } from '../../services/StoreService';
import { setNWCSettings } from '../../lib/settings';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';

export type WalletStatus = 'inactive' | 'active' | 'connected';

const NostrWalletConnect: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();

  const [openNewWallet, setOpenNewWallet] = createSignal(false);
  const [newNWC, setNewNWC] = createSignal('');
  const [newNWCLabel, setNewNWCLabel] = createSignal('');

  const [walletStatus, setWalletStatus] = createStore<Record<string, WalletStatus>>({
    'primal': 'inactive',
  });

  createEffect(() => {
    if (!account?.publicKey) return;

    const nwcs = loadNWC(account.publicKey);
    account.actions.updateNWCList(nwcs);

    const active = loadNWCActive(account.publicKey);
    if (active && active.length > 0) {
      applyActiveWallet(active);
    }
  });

  createEffect(() => {
    if (account?.publicKey) {
      checkActiveWallet(account.publicKey);
    }
  })

  const applyActiveWallet = (wallet: string[]) => {
    if (!account?.publicKey) return;

    const pubkey = account.publicKey;

    const [walletName, enc] = wallet;

    const active = loadNWCActive(pubkey);

    if (active && active.length > 0 && active[0] !== walletName) {
      setWalletStatus(active[0], 'active');
    }

    setWalletStatus(walletName, () => 'connected');
  }

  const checkActiveWallet = (pubkey: string) => {
      const walletSocket = new WebSocket('wss://wallet.primal.net/v1');

      walletSocket.addEventListener('open', async () => {
        logInfo('WALLET SOCKET OPENED');
        const isActive = await checkPrimalWalletActive(pubkey, walletSocket);

        if (walletStatus['primal'] === 'connected') {
          return;
        }

        if (isActive) {
          setWalletStatus('primal', () => 'active');
        } else {
          setWalletStatus('primal', () => 'inactive')
        }

      });
      walletSocket.addEventListener('close', () => {
        logInfo('WALLET SOCKET CLOSED');
      });
  }

  const connectToPrimalWallet = () => {
    if (!account?.publicKey) return;

    const walletSocket = new WebSocket('wss://wallet.primal.net/v1');

    walletSocket.addEventListener('open', async () => {
      logInfo('WALLET SOCKET OPENED');
      const uri = await connectPrimalWalletActive('Primal Web App', walletSocket);

      if (uri.length === 0) {
        return;
      }

      connectToNWCWallet('primal', uri);
    });
    walletSocket.addEventListener('close', () => {
      logInfo('WALLET SOCKET CLOSED');
    });
  };

  const connectToNWCWallet = async (walletName: string, url: string) => {
    if (!account?.publicKey) return;

    const pubkey = account.publicKey;

    let uri = `${url}`;

    if (!uri.startsWith('nostr+walletconnect')) {
      try {
        uri = await decrypt(pubkey, uri);
      } catch (e) {
        uri = '';
      }
    }

    uri = encodeURIComponent(uri);

    const enc = await encrypt(pubkey, uri);

    const active = loadNWCActive(pubkey);

    if (active && active.length > 0 && active[0] !== walletName) {
      setWalletStatus(active[0], 'active');
    }

    saveNWCActive(pubkey, walletName, enc);
    account.actions.setActiveNWC([walletName, enc]);

    setWalletStatus(walletName, () => 'connected');

    const uriConfig = decodeNWCUri(uri);

    sendNWCInfoEvent(uriConfig);

    updateNWCSettings();
  };

  const addNWC = async (walletName: string, url: string) => {
    if (!account?.publicKey) return;
    const index = account.nwcList.findIndex(n => n[0] === walletName);

    let uri = encodeURIComponent(url);

    const enc = await encrypt(account.publicKey, uri);

    if (index > -1) {
      account.actions.insertIntoNWCList([walletName, enc], index);

      saveNWC(account.publicKey, account.nwcList);
      updateNWCSettings();
      return;
    }

    account.actions.insertIntoNWCList([walletName, enc]);
    saveNWC(account.publicKey, account.nwcList);
    updateNWCSettings();
  };

  const removeNWC = (walletName: string) => {
    if (!account?.publicKey) return;

    account.actions.updateNWCList(account.nwcList.filter(l => l[0] !== walletName));

    account.actions.setActiveNWC([]);

    saveNWC(account.publicKey, account.nwcList);
    saveNWCActive(account.publicKey);

    updateNWCSettings();
  };

  const disconnectNWC = (walletName: string) => {
    if (!account?.publicKey) return;

    setWalletStatus(walletName, () => 'active')

    account.actions.setActiveNWC([]);
    saveNWCActive(account.publicKey);

    updateNWCSettings();
  };

  const clearNewNWC = () => {
    setNewNWC(() => '');
    setNewNWCLabel(() => '');
  };

  const updateNWCSettings = () => {
    const subId = `update_nwc_settings_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEose: () => { unsub(); }
    })

    setNWCSettings(subId, {
      nwcList: account?.nwcList || [],
      nwcActive: account?.activeNWC || [],
    });
  }

  const primalWalletDesc = () => {
    switch (walletStatus['primal']) {
      case 'connected':
        return "Your Primal Wallet is connected";
      case 'active':
        return "Your Primal Wallet is ready to be connected";
      default:
        return "Your Primal Wallet is not yet active";
    }
  }

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.nwcSettings.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.nwcSettings.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.moderationDescription}>
          To enable zapping from the Primal web app, connect a wallet:
        </div>
      </div>

      <div class={styles.settingsContentFullBorderless}>
        <div class={styles.walletList}>
          <NWCItem
            logo={logo}
            name="Primal"
            desc={primalWalletDesc()}
            status={walletStatus['primal']}
            onConnect={() => connectToPrimalWallet()}
            onDisconnect={() => disconnectNWC('primal')}
          />
          <For each={account?.nwcList}>
            {([name, uri]) => (
              <NWCItem
                logo={nwc}
                name={name}
                desc={'Nostr Wallet Connect'}
                status={walletStatus[name] || 'active'}
                onConnect={() => connectToNWCWallet(name, uri)}
                onRemove={() => removeNWC(name)}
                onDisconnect={() => disconnectNWC(name)}
              />
            )}
          </For>
          <NWCItem
              logo={nwc}
              name="Nostr Wallet Connect"
              desc="Connect an external wallet that supports NWC"
              status="none"
              onConnect={() => setOpenNewWallet(true)}
            />
        </div>
      </div>

      <AdvancedSearchDialog
        open={openNewWallet()}
        setOpen={(open: boolean) => {
          setOpenNewWallet(open);
        }}
        triggerClass="hidden"
        title={
          <div>
            Enter Nostr Wallet Connect String:
          </div>
        }

      >
        <div class={styles.nwcInputs}>
          <TextField
            class={styles.nwcInput}
            value={newNWCLabel()}
            onChange={(text) => setNewNWCLabel(text)}
          >
            <TextField.Input placeholder="wallet name" />
          </TextField>
          <TextField
            class={styles.nwcTextArea}
            value={newNWC()}
            onChange={(text) => setNewNWC(text)}
          >
            <TextField.TextArea
              autoResize
              autofocus
              placeholder='nostr+walletconnect://[pubkey]?relay=[relay]&secret=[secret]'
            />
          </TextField>
        </div>
        <div class={styles.nwcInputActions}>
          <ButtonSecondary
            onClick={() => {
              clearNewNWC();
              setOpenNewWallet(false);
            }}
          >
            Cancel
          </ButtonSecondary>
          <ButtonPrimary
            onClick={() => {
              connectToNWCWallet(newNWCLabel(), newNWC());
              addNWC(newNWCLabel(), newNWC());
              clearNewNWC();
              setOpenNewWallet(false);
            }}
            disabled={newNWC().length === 0}
          >
            Connect
          </ButtonPrimary>
        </div>
      </AdvancedSearchDialog>
    </div>
  )
}

export default NostrWalletConnect;
