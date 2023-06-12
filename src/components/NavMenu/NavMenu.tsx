import { useIntl } from '@cookbook/solid-intl';
import { useLocation } from '@solidjs/router';
import { Component, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useMessagesContext } from '../../contexts/MessagesContext';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import NavLink from '../NavLink/NavLink';
import ThemeToggle from '../ThemeToggle/ThemeToggle';

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
      label: intl.formatMessage({
        id: 'navbar.home',
        defaultMessage: 'Home',
        description: 'Label for the nav bar item link to Home page',
      }),
      icon: 'homeIcon',
    },
    {
      to: '/explore',
      label: intl.formatMessage({
        id: 'navbar.explore',
        defaultMessage: 'Explore',
        description: 'Label for the nav bar item link to Explore page',
      }),
      icon: 'exploreIcon',
    },
    {
      to: '/messages',
      label: intl.formatMessage({
        id: 'navbar.messages',
        defaultMessage: 'Messages',
        description: 'Label for the nav bar item link to Messages page',
      }),
      icon: 'messagesIcon',
      bubble: () => messages?.messageCount || 0,
    },
    {
      to: '/notifications',
      label: intl.formatMessage({
        id: 'navbar.notifications',
        defaultMessage: 'Notifications',
        description: 'Label for the nav bar item link to Notifications page',
      }),
      icon: 'notificationsIcon',
      bubble: () => notifications?.notificationCount || 0,
    },
    {
      to: '/downloads',
      label: intl.formatMessage({
        id: 'navbar.downloads',
        defaultMessage: 'Downloads',
        description: 'Label for the nav bar item link to Downloads page',
      }),
      icon: 'downloadIcon',
    },
    {
      to: '/settings',
      label: intl.formatMessage({
        id: 'navbar.settings',
        defaultMessage: 'Settings',
        description: 'Label for the nav bar item link to Settings page',
      }),
      icon: 'settingsIcon',
    },
    {
      to: '/help',
      label: intl.formatMessage({
        id: 'navbar.help',
        defaultMessage: 'Help',
        description: 'Label for the nav bar item link to Help page',
      }),
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
          <ThemeToggle />
        </div>
      </Show>
    </div>
  )
}

export default NavMenu;
