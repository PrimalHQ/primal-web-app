import { useIntl } from '@cookbook/solid-intl';
import { useLocation } from '@solidjs/router';
import { Component, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useMessagesContext } from '../../contexts/MessagesContext';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import { navBar as t } from '../../translations';
import NavLink from '../NavLink/NavLink';
import FloatingNewPostButton from '../FloatingNewPostButton/FloatingNewPostButton';

import styles from './NavMenu.module.scss';

const NavMenu: Component = () => {
  const account = useAccountContext();
  const notifications = useNotificationsContext();
  const messages = useMessagesContext();
  const intl = useIntl();
  const loc = useLocation();

  const links = [
    {
      to: '/home',
      label: intl.formatMessage(t.home),
      icon: 'homeIcon',
    },
    {
      to: '/explore',
      label: intl.formatMessage(t.explore),
      icon: 'exploreIcon',
    },
    {
      to: '/messages',
      label: intl.formatMessage(t.messages),
      icon: 'messagesIcon',
      bubble: () => messages?.messageCount || 0,
    },
    {
      to: '/notifications',
      label: intl.formatMessage(t.notifications),
      icon: 'notificationsIcon',
      bubble: () => notifications?.notificationCount || 0,
    },
    {
      to: '/downloads',
      label: intl.formatMessage(t.downloads),
      icon: 'downloadIcon',
    },
    {
      to: '/settings',
      label: intl.formatMessage(t.settings),
      icon: 'settingsIcon',
    },
    {
      to: '/help',
      label: intl.formatMessage(t.help),
      icon: 'helpIcon',
    },
  ];

  return (
    <div class={styles.navMenu}>
      <nav class={styles.sideNav}>
        <For each={links}>
          {({ to, label, icon, bubble }) => {
            return <NavLink to={to} label={label} icon={icon} bubble={bubble}/>
          }
          }
        </For>
      </nav>
      <Show when={account?.hasPublicKey() && !loc.pathname.startsWith('/messages/')}>
        <div class={styles.callToAction}>
          <FloatingNewPostButton />
        </div>
      </Show>
    </div>
  )
}

export default NavMenu;
