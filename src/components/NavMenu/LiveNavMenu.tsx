import { useIntl } from '@cookbook/solid-intl';
import { Component, For } from 'solid-js';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import { navBar as t } from '../../translations';
import NavLink from '../NavLink/NavLink';

import styles from './NavMenu.module.scss';
import { hookForDev } from '../../lib/devTools';
import { useDMContext } from '../../contexts/DMContext';
import { accountStore } from '../../stores/accountStore';

const NavMenu: Component< { id?: string } > = (props) => {
  const notifications = useNotificationsContext();
  const dms = useDMContext();
  const intl = useIntl();

  const links = [
    {
      to: '/home',
      label: intl.formatMessage(t.home),
      icon: 'homeIcon',
    },
    {
      to: '/reads',
      label: intl.formatMessage(t.reads),
      icon: 'readsIcon',
    },
    {
      to: '/explore',
      label: intl.formatMessage(t.explore),
      icon: 'exploreIcon',
    },
    {
      to: '/dms',
      label: intl.formatMessage(t.messages),
      icon: 'messagesIcon',
      bubble: () => dms?.dmCount || 0,
    },
    {
      to: '/bookmarks',
      label: intl.formatMessage(t.bookmarks),
      icon: 'bookmarkIcon',
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
      to: '/premium',
      label: intl.formatMessage(t.premium),
      icon: 'premiumIcon',
      hiddenOnSmallScreens: true,
      bubble: () => accountStore.premiumReminder ? 1 : 0,
    },
    {
      to: '/settings',
      label: intl.formatMessage(t.settings),
      icon: 'settingsIcon',
      hiddenOnSmallScreens: true,
      bubble: () => accountStore.sec ? 1 : 0,
    },
  ];

  return (
    <div id={props.id} class={styles.navMenu}>
      <nav class={styles.liveNav}>
        <For each={links}>
          {({ to, label, icon, bubble, hiddenOnSmallScreens }) => {
            return <NavLink
              to={to}
              icon={icon}
              bubble={bubble}
              hiddenOnSmallScreens={hiddenOnSmallScreens}
            />
          }
          }
        </For>
      </nav>
    </div>
  )
}

export default hookForDev(NavMenu);
