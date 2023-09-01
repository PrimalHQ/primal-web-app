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
import { hookForDev } from '../../lib/devTools';

const NavMenu: Component< { id?: string } > = (props) => {
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
      hiddenOnSmallScreens: true,
    },
    {
      to: '/downloads',
      label: intl.formatMessage(t.downloads),
      icon: 'downloadIcon',
      bubble: () => notifications?.downloadsCount || 0,
    },
    {
      to: '/settings',
      label: intl.formatMessage(t.settings),
      icon: 'settingsIcon',
      hiddenOnSmallScreens: true,
    },
    {
      to: '/help',
      label: intl.formatMessage(t.help),
      icon: 'helpIcon',
      hiddenOnSmallScreens: true,
    },
  ];

  return (
    <div id={props.id} class={styles.navMenu}>
      <nav class={styles.sideNav}>
        <For each={links}>
          {({ to, label, icon, bubble, hiddenOnSmallScreens }) => {
            return <NavLink
              to={to}
              label={label}
              icon={icon}
              bubble={bubble}
              hiddenOnSmallScreens={hiddenOnSmallScreens}
            />
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

export default hookForDev(NavMenu);
