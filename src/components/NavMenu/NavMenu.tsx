import { useIntl } from '@cookbook/solid-intl';
import { useLocation, useNavigate } from '@solidjs/router';
import { Component, For, Match, Show, Switch } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import { navBar as t, actions as tActions, placeholders as tPlaceholders } from '../../translations';
import NavLink from '../NavLink/NavLink';

import styles from './NavMenu.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { useMediaContext } from '../../contexts/MediaContext';
import { ConfirmInfo, useAppContext } from '../../contexts/AppContext';
import { useDMContext } from '../../contexts/DMContext';

const NavMenu: Component< { id?: string } > = (props) => {
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
      bubble: () => account?.premiumReminder ? 1 : 0,
    },
    {
      to: '/settings',
      label: intl.formatMessage(t.settings),
      icon: 'settingsIcon',
      hiddenOnSmallScreens: true,
      bubble: () => account?.sec ? 1 : 0,
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
      <Show when={account?.hasPublicKey() && !loc.pathname.startsWith('/messages') && !loc.pathname.startsWith('/premium')}>
        <div class={styles.callToAction}>
          <Switch
            fallback={
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
            }
          >
            <Match when={loc.pathname.startsWith('/reads') || loc.pathname.startsWith('/e/naddr') || loc.pathname.startsWith('/a/naddr')}>
              <Show
                when={isBigScreen()}
                fallback={
                  <ButtonPrimary
                    id={props.id}
                    onClick={() => {
                      // app?.actions.openConfirmModal(noReadsConfirm);
                      navigate('/reads/edit');
                    }}
                  >
                    <div class={styles.postIcon}></div>
                  </ButtonPrimary>
                }
              >
                <ButtonPrimary
                  id={props.id}
                  onClick={() => {
                    // app?.actions.openConfirmModal(noReadsConfirm);
                    navigate('/reads/edit');
                  }}
                >
                  {intl.formatMessage(tActions.newArticle)}
                </ButtonPrimary>
              </Show>
            </Match>
          </Switch>
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
