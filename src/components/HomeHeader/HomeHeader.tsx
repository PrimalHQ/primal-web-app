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

    context?.actions?.updatedFeedScroll(scrollTop);

    const isScrollingDown = scrollTop > lastScrollTop;
    lastScrollTop = scrollTop;

    if (scrollTop < 117) {
      smallHeader?.classList.remove(styles.hiddenSelector);
      smallHeader?.classList.remove(styles.fixedSelector);
      return;
    }

    if (lastScrollTop < 117) {
      smallHeader?.classList.add(styles.instaHide);
      return;
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
        when={context?.data.publicKey}
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
        <div class={styles.smallLeft}>
          <SmallCallToAction activeUser={activeUser()} />
        </div>
        <div class={styles.smallRight}>
          <FeedSelect />
        </div>
      </div>
    </div>
  );
}

export default HomeHeader;
