import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './HomeHeader.module.scss';
import miljan from '../../assets/icons/miljan.jpg';
import PostButton from '../PostButton/PostButton';
import FeedSelect from '../FeedSelect/FeedSelect';
import { useFeedContext } from '../../contexts/FeedContext';
import SmallCallToAction from '../SmallCallToAction/SmallCallToAction';

const HomeHeader: Component = () => {

  const context = useFeedContext();

  let lastScrollTop = document.body.scrollTop || document.documentElement.scrollTop;

  const onScroll = () => {
    const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    const smallHeader = document.getElementById('small_header');
    const border = document.getElementById('small_bottom_border');

    context?.actions?.updatedFeedScroll(scrollTop);

    const isScrollingDown = scrollTop > lastScrollTop;
    lastScrollTop = scrollTop;

    if (scrollTop < 117) {
      border.style.display = 'none';
      smallHeader?.classList.remove(styles.hiddenSelector);
      smallHeader?.classList.remove(styles.fixedSelector);
      return;
    }

    if (lastScrollTop < 117) {
      smallHeader?.classList.add(styles.instaHide);
      return;
    }

    border.style.display = 'flex';
    smallHeader?.classList.remove(styles.instaHide);

    if (!isScrollingDown) {
      smallHeader?.classList.add(styles.fixedSelector);
      smallHeader?.classList.remove(styles.hiddenSelector);
      return;
    }

    smallHeader?.classList.add(styles.hiddenSelector);
  }

  const onShowNewNoteinput = () => {
    context?.actions.showNewNoteForm();
  };

  onMount(() => {
    window.addEventListener('scroll', onScroll);
  });

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
  });

  const activeUser = () => context?.data.activeUser;

  return (
    <div class={styles.fullHeader}>
      <Show
        when={activeUser()}
        fallback={<div class={styles.welcomeMessage}>Welcome to nostr!</div>}
      >
        <button class={styles.callToAction} onClick={onShowNewNoteinput}>
          <Avatar
            src={activeUser()?.picture}
            size="lg"
          />

          <div class={styles.border}>
            <div class={styles.input}>
              say something on nostr...
            </div>
          </div>
        </button>
      </Show>

      <div id="small_header" class={styles.smallHeader}>
        <div class={styles.smallHeaderMain}>
          <Show
            when={activeUser()}
            fallback={
              <div class={styles.smallLeft}>
                <div class={styles.welcomeMessageSmall}>
                  Welcome to nostr!
                </div>
              </div>}
          >
            <div class={styles.smallLeft}>
              <SmallCallToAction activeUser={activeUser()} />
            </div>
          </Show>
          <div class={styles.smallRight}>
            <FeedSelect />
          </div>
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
