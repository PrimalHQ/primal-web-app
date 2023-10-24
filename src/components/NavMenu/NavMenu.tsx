import { useIntl } from '@cookbook/solid-intl';
import { useLocation } from '@solidjs/router';
import { Component, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useMessagesContext } from '../../contexts/MessagesContext';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import { navBar as t, actions as tActions, placeholders as tPlaceholders } from '../../translations';
import NavLink from '../NavLink/NavLink';
import FloatingNewPostButton from '../FloatingNewPostButton/FloatingNewPostButton';

import styles from './NavMenu.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { useMediaContext } from '../../contexts/MediaContext';

const NavMenu: Component< { id?: string } > = (props) => {
  const account = useAccountContext();
  const notifications = useNotificationsContext();
  const messages = useMessagesContext();
  const intl = useIntl();
  const loc = useLocation();
  const media = useMediaContext();

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
      bubble: () => account?.sec ? 1 : 0,
    },
    {
      to: '/help',
      label: intl.formatMessage(t.help),
      icon: 'helpIcon',
      hiddenOnSmallScreens: true,
    },
  ];

  const isBigScreen = () => (media?.windowSize.w || 0) > 1300;

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
          <Show
            when={isBigScreen()}
            fallback={
              <ButtonPrimary
                id={props.id}
                onClick={account?.actions?.showNewNoteForm}
              >
                <div class={styles.postIcon}></div>
              </ButtonPrimary>
            }
          >
            <ButtonPrimary
              id={props.id}
              onClick={account?.actions?.showNewNoteForm}
            >
              {intl.formatMessage(tActions.newNote)}
            </ButtonPrimary>
          </Show>
        </div>
      </Show>

      <Show when={account?.isKeyLookupDone && !account?.hasPublicKey() && isBigScreen()}>
        <div class={styles.callToAction}>
          <div class={styles.message}>
            {intl.formatMessage(tPlaceholders.welcomeMessage)}
          </div>
          <ButtonPrimary onClick={account?.actions.showGetStarted}>
            {intl.formatMessage(tActions.getStarted)}
          </ButtonPrimary>
        </div>
      </Show>
    </div>
  )
}

export default hookForDev(NavMenu);
