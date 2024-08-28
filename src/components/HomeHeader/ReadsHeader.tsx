import { Component, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './HomeHeader.module.scss';
import FeedSelect from '../FeedSelect/FeedSelect';
import { useAccountContext } from '../../contexts/AccountContext';
import SmallCallToAction from '../SmallCallToAction/SmallCallToAction';
import { useHomeContext } from '../../contexts/HomeContext';
import { useIntl } from '@cookbook/solid-intl';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { placeholders as t, actions as tActions, feedNewPosts } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import CreateAccountModal from '../CreateAccountModal/CreateAccountModal';
import LoginModal from '../LoginModal/LoginModal';
import { userName } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import ReedSelect from '../FeedSelect/ReedSelect';
import { useReadsContext } from '../../contexts/ReadsContext';
import { ToggleButton } from '@kobalte/core/toggle-button';
import { isDev } from '../../utils';

const ReadsHeader: Component< {
  id?: string,
  hasNewPosts: () => boolean,
  loadNewContent: () => void,
  newPostCount: () => number,
  newPostAuthors: PrimalUser[],
  onToggle: (pressed: boolean) => void,
  isPressed: boolean,

} > = (props) => {

  const reads = useReadsContext();
  const account = useAccountContext();
  const intl = useIntl();

  let lastScrollTop = document.body.scrollTop || document.documentElement.scrollTop;

  const onScroll = () => {
    const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    // const smallHeader = document.getElementById('small_header');
    const border = document.getElementById('small_bottom_border');

    reads?.actions.updateScrollTop(scrollTop);

    const isScrollingDown = scrollTop > lastScrollTop;
    lastScrollTop = scrollTop;

    if (scrollTop < 2) {
      if (border) {
        border.style.display = 'none';
      }
      return;
    }

    if (lastScrollTop < 2) {
      return;
    }

    if (border) {
      border.style.display = 'flex';
    }

    if (!isScrollingDown) {
      return;
    }

  }

  onMount(() => {
    window.addEventListener('scroll', onScroll);
  });

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
  });

  return (
    <div id={props.id} class={styles.readsHeader}>
      <div class={`${styles.bigFeedSelect} ${styles.readsFeed}`}>
        <ReedSelect big={true} />

        <Show
          when={props.hasNewPosts()}
        >
          <button
            class={styles.newContentItem}
            onClick={props.loadNewContent}
          >
            <div class={styles.counter}>
              {intl.formatMessage(
                feedNewPosts,
                {
                  number: props.newPostCount() >= 99 ? 99 : props.newPostCount(),
                },
              )}
            </div>
          </button>
        </Show>
      </div>

      <Show when={isDev()}>
        <ToggleButton
          class={styles.toggleAnimation}
          pressed={props.isPressed} onChange={props.onToggle}
        >
          {state => (
            <Show when={state.pressed()} fallback={<div>still</div>}>
              <div>anim</div>
            </Show>
          )}
        </ToggleButton>
      </Show>

      <Show
        when={props.hasNewPosts() && !account?.showNewNoteForm && !((reads?.scrollTop || 0) < 85)}
      >
        <div class={styles.newArticleContentNotification}>
          <button
            onClick={props.loadNewContent}
          >
            <div class={styles.avatars}>
              <For each={props.newPostAuthors}>
                {(user) => (
                  <div
                    class={styles.avatar}
                    title={userName(user)}
                  >
                    <Avatar user={user} size="xss" />
                  </div>
                )}
              </For>
            </div>
            <div class={styles.counter}>
              {intl.formatMessage(
                feedNewPosts,
                {
                  number: props.newPostCount(),
                },
              )}
            </div>
          </button>
        </div>
      </Show>
    </div>
  );
}

export default hookForDev(ReadsHeader);