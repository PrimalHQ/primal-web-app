import { Component, onCleanup, onMount, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './HomeHeader.module.scss';
import FeedSelect from '../FeedSelect/FeedSelect';
import { useAccountContext } from '../../contexts/AccountContext';
import SmallCallToAction from '../SmallCallToAction/SmallCallToAction';
import { useHomeContext } from '../../contexts/HomeContext';
import { useIntl } from '@cookbook/solid-intl';

const HomeHeader: Component = () => {

  const account = useAccountContext();
  const home = useHomeContext();
  const intl = useIntl();

  let lastScrollTop = document.body.scrollTop || document.documentElement.scrollTop;

  const onScroll = () => {
    const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    const smallHeader = document.getElementById('small_header');
    const border = document.getElementById('small_bottom_border');

    home?.actions.updateScrollTop(scrollTop);

    const isScrollingDown = scrollTop > lastScrollTop;
    lastScrollTop = scrollTop;

    if (scrollTop < 117) {
      if (border) {
        border.style.display = 'none';
      }
      smallHeader?.classList.remove(styles.hiddenSelector);
      smallHeader?.classList.remove(styles.fixedSelector);
      return;
    }

    if (lastScrollTop < 117) {
      smallHeader?.classList.add(styles.instaHide);
      return;
    }

    if (border) {
      border.style.display = 'flex';
    }

    smallHeader?.classList.remove(styles.instaHide);

    if (!isScrollingDown) {
      smallHeader?.classList.add(styles.fixedSelector);
      smallHeader?.classList.remove(styles.hiddenSelector);
      return;
    }

    smallHeader?.classList.add(styles.hiddenSelector);
  }

  const onShowNewNoteinput = () => {
    account?.actions?.showNewNoteForm();
  };

  onMount(() => {
    window.addEventListener('scroll', onScroll);
  });

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
  });

  const activeUser = () => account?.activeUser;

  return (
    <div class={styles.fullHeader}>
      <Show
        when={account?.hasPublicKey()}
        fallback={<div class={styles.welcomeMessage}>
          {intl.formatMessage({
            id: 'placeholders.guestUserGreeting',
            defaultMessage: 'Welcome to nostr!',
            description: 'Header placeholder for guest user',
          })}
        </div>}
      >
        <button class={styles.callToAction} onClick={onShowNewNoteinput}>
          <Avatar
            src={activeUser()?.picture}
            size="lg"
          />

          <div class={styles.border}>
            <div class={styles.input}>
              {intl.formatMessage({
                id: 'placeholders.callToAction.note',
                defaultMessage: 'say something on nostr...',
                description: 'Placeholder for new note call-to-action',
              })}
            </div>
          </div>
        </button>
      </Show>

      <div id="small_header" class={styles.smallHeader}>
        <div class={styles.smallHeaderMain}>
          <Show
            when={account?.hasPublicKey()}
            fallback={
              <div class={styles.smallLeft}>
                <div class={styles.welcomeMessageSmall}>
                  {intl.formatMessage({
                    id: 'placeholders.welcomeMessage',
                    defaultMessage: 'Welcome to nostr!',
                    description: 'Default welcome message',
                  })}
                </div>
              </div>}
          >
            <div class={styles.smallLeft}>
              <SmallCallToAction activeUser={activeUser()} />
            </div>
          </Show>
          <Show when={home?.selectedFeed}>
            <div class={styles.smallRight}>
              <FeedSelect />
            </div>
          </Show>
        </div>
        <div
          id="small_bottom_border"
          class={styles.smallHeaderBottomBorder}
        >
          <div class={styles.leftCorner}></div>
          <div class={styles.rightCorner}></div>
        </div>
      </div>
    </div>
  );
}

export default HomeHeader;
