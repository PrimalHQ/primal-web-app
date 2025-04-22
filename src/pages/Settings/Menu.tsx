import { Component, Show } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t, actions as tActions } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A, useNavigate } from '@solidjs/router';
import { useAccountContext } from '../../contexts/AccountContext';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';

const Menu: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();
  const navigate = useNavigate();

  const version = import.meta.env.PRIMAL_VERSION;

  return (
    <div>
      <PageCaption title={intl.formatMessage(t.title)} />

      <div class={styles.subpageLinks}>
        <Show when={account?.sec != undefined}>
          <A href="/settings/account">
            <div class={styles.caption}>
              {intl.formatMessage(t.account.title)}
              <div class={styles.bubble}>
                <div>{1}</div>
              </div>
            </div>
            <div class={styles.chevron}></div>
          </A>
        </Show>

        <A href="/settings/appearance">
          {intl.formatMessage(t.appearance.title)}
          <div class={styles.chevron}></div>
        </A>

        <A href="/settings/home_feeds">
          {intl.formatMessage(t.homeFeeds.title)}
          <div class={styles.chevron}></div>
        </A>

        <A href="/settings/reads_feeds">
          {intl.formatMessage(t.readsFeeds.title)}
          <div class={styles.chevron}></div>
        </A>

        <Show when={account?.hasPublicKey()}>
          <A href="/settings/blossom">
            {intl.formatMessage(t.blossom)}
            <div class={styles.chevron}></div>
          </A>
        </Show>

        <Show when={account?.hasPublicKey()}>
          <A href="/settings/muted">
            {intl.formatMessage(t.muted.title)}
            <div class={styles.chevron}></div>
          </A>
          <A href="/settings/filters">
            {intl.formatMessage(t.moderation.title)}
            <div class={styles.chevron}></div>
          </A>
          <A href="/settings/nwc">
            {intl.formatMessage(t.nwcSettings.title)}
            <div class={styles.chevron}></div>
          </A>
          <A href="/settings/notifications">
            {intl.formatMessage(t.notifications.title)}
            <div class={styles.chevron}></div>
          </A>
        </Show>

        <A href="/settings/devtools">
          {intl.formatMessage(t.devTools)}
          <div class={styles.chevron}></div>
        </A>

        <A href="/settings/network">
          {intl.formatMessage(t.network.title)}
          <div class={styles.chevron}></div>
        </A>

        <Show when={account?.hasPublicKey()}>
          <A href="/settings/zaps">
            {intl.formatMessage(t.zaps)}
            <div class={styles.chevron}></div>
          </A>
        </Show>
      </div>

      <Show when={account?.sec}>
        <div class={styles.webVersion}>
          <ButtonPrimary onClick={() => {
            account?.actions.logout();
            navigate('/home');
          }}>
            {intl.formatMessage(tActions.logout)}
          </ButtonPrimary>
        </div>
      </Show>

      <div class={styles.webVersion}>
        <div class={styles.title}>version</div>
        <div class={styles.value}>{version}</div>
      </div>
    </div>
  )
}

export default Menu;
