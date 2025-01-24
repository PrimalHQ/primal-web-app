import { Component, Match, Show, Switch, createSignal } from 'solid-js';
import styles from './NWCItem.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import { useSettingsContext } from '../../contexts/SettingsContext';
import PageTitle from '../../components/PageTitle/PageTitle';

import logo from "../../assets/icons/logo.svg";
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { WalletStatus } from '../../pages/Settings/NostrWalletConnect';

const NWCItem: Component<{
  logo: string,
  name: string,
  desc: string,
  status: WalletStatus | 'none',
  onConnect: () => void,
  onRemove?: () => void,
  onDisconnect?: () => void,
}> = (props) => {

  return (
    <div class={styles.nwcWallet} data-status={props.status}>
        <img src={props.logo} class={styles.logo} />
        <div class={styles.walletInfos}>
          <div class={styles.walletInfo}>
            <div class={styles.walletName}>
              {props.name}
            </div>
            <div class={styles.walletDesc}>
              {props.desc}
            </div>
          </div>

          <div class={styles.walletRemove}>
            <Switch>
              <Match when={props.onRemove && props.status !== 'connected'}>
                <ButtonLink onClick={() => props.onRemove && props.onRemove()}>
                  remove
                </ButtonLink>
              </Match>
              <Match when={props.onDisconnect && props.status === 'connected'}>
                <ButtonLink onClick={() => props.onDisconnect && props.onDisconnect()}>
                  disconnect
                </ButtonLink>
              </Match>
            </Switch>
          </div>
        </div>
        <div class={styles.walletAction}>
          <Switch fallback={
            <div></div>
          }>
            <Match when={props.status === 'connected'}>
              <div class={styles.walletActive}>
                <div class={styles.checkCircleIcon}></div>
                <div>Active</div>
              </div>
            </Match>
            <Match when={props.status === 'active' || props.status === 'none'}>
              <ButtonPrimary onClick={props.onConnect}>
                Connect
              </ButtonPrimary>
            </Match>
          </Switch>
        </div>
      </div>
  )
}

export default NWCItem;
