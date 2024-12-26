import { useIntl } from '@cookbook/solid-intl';
import { A, useLocation, useNavigate } from '@solidjs/router';
import { Component, For, Match, Show, Switch } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import { navBar as t, actions as tActions, placeholders as tPlaceholders } from '../../translations';
import NavLink from '../NavLink/NavLink';

import styles from './NavPhone.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { useMediaContext } from '../../contexts/MediaContext';
import { ConfirmInfo, useAppContext } from '../../contexts/AppContext';
import { useDMContext } from '../../contexts/DMContext';
import { DropdownMenu } from '@kobalte/core/dropdown-menu';

const NavPhone: Component< { id?: string } > = (props) => {
  const account = useAccountContext();
  const notifications = useNotificationsContext();
  const dms = useDMContext();
  const intl = useIntl();
  const loc = useLocation();
  const media = useMediaContext();
  const app = useAppContext();
  const navigate = useNavigate();

  const links = [
    {
      type: 'link',
      to: '/home',
      label: intl.formatMessage(t.home),
      icon: 'homeIcon',
    },
    {
      type: 'link',
      to: '/reads',
      label: intl.formatMessage(t.reads),
      icon: 'readsIcon',
    },
    {
      type: 'link',
      to: '/explore',
      label: intl.formatMessage(t.explore),
      icon: 'exploreIcon',
    },
    {
      type: 'link',
      to: '/downloads',
      label: intl.formatMessage(t.downloads),
      icon: 'downloadIcon',
      bubble: () => notifications?.downloadsCount || 0,
    },
    {
      type: 'link',
      to: '/premium',
      label: intl.formatMessage(t.premium),
      icon: 'premiumIcon',
      hiddenOnSmallScreens: true,
      bubble: () => account?.premiumReminder ? 1 : 0,
    },
    {
      type: 'menu',
      links: [
        // {
        //   type: 'link',
        //   to: '/dms',
        //   label: intl.formatMessage(t.messages),
        //   icon: 'messagesIcon',
        //   bubble: () => dms?.dmCount || 0,
        // },
        {
          type: 'link',
          to: '/bookmarks',
          label: intl.formatMessage(t.bookmarks),
          icon: 'bookmarkIcon',
        },
        {
          type: 'link',
          to: '/notifications',
          label: intl.formatMessage(t.notifications),
          icon: 'notificationsIcon',
          bubble: () => notifications?.notificationCount || 0,
          hiddenOnSmallScreens: true,
        },
        {
          type: 'link',
          to: '/settings',
          label: intl.formatMessage(t.settings),
          icon: 'settingsIcon',
          hiddenOnSmallScreens: true,
          bubble: () => account?.sec ? 1 : 0,
        },
      ]
    },
  ];

  const isBigScreen = () => (media?.windowSize.w || 0) > 1300;

  const noReadsConfirm: ConfirmInfo = {
    title: "Coming Soon",
    description: "Primal does not have article creation capabilities yet. We recommend Highlighter to content creators. Would you like to try it?",
    confirmLabel: "Yes, go to Highlighter",
    abortLabel: "No Thanks",
    onConfirm: () => {
      window.open('https://highlighter.com', '_blank')?.focus();
    },
    onAbort: () => {
      app?.actions.closeConfirmModal();
    },
  };

  return (
    <div id={props.id} class={styles.navMenu}>
      <nav class={styles.sideNav}>
        <For each={links}>
          {(link) => (
            <Switch>
              <Match when={link.type === 'link'}>
                <NavLink
                  to={link.to}
                  label={link.label}
                  icon={link.icon}
                  bubble={link.bubble}
                  isPhone={true}
                />
              </Match>
              <Match when={link.type === 'menu'}>
                <DropdownMenu>
                  <DropdownMenu.Trigger class={styles.subMenuTrigger}>
                    <div class={styles.subMenuIcon}></div>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content class={styles.subMenuContent}>
                      <For each={link.links}>
                        {sublink => (
                          <DropdownMenu.Item
                            onSelect={() => navigate(sublink.to)}
                            class={styles.subMenuItem}
                          >
                            <div class={styles[sublink.icon]}></div>
                            {sublink.label}
                          </DropdownMenu.Item>
                        )}
                      </For>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu>
              </Match>
            </Switch>
          )}
        </For>
      </nav>
    </div>
  )
}

export default hookForDev(NavPhone);
