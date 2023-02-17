import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './HomeHeader.module.scss';
import miljan from '../../assets/icons/miljan.jpg';
import PostButton from '../PostButton/PostButton';
import FeedSelect from '../FeedSelect/FeedSelect';
import { useFeedContext } from '../../contexts/FeedContext';

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

  onMount(() => {
    window.addEventListener('scroll', onScroll);
  });

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
  });

  const activeUserPicture = () => context?.data.activeUser?.picture;

  return (
    <div class={styles.fullHeader}>
      <Show
        when={context?.data.publicKey}
        fallback={<div class={styles.welcomeMessage}>Welcome to nostr!</div>}
      >
        <div class={styles.callToAction}>
          <Avatar
            src={activeUserPicture()}
            size="lg"
            verified="naravno"
          />

          <div class={styles.border}>
            <input type="text" placeholder="post something to nostr..." />
          </div>
        </div>
      </Show>

      <div id="small_header" class={styles.feedSelector}>
        <FeedSelect />
      </div>
    </div>
  );
}

export default HomeHeader;
