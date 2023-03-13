import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './HomeHeaderPhone.module.scss';
import miljan from '../../assets/icons/miljan.jpg';
import PostButton from '../PostButton/PostButton';
import FeedSelect from '../FeedSelect/FeedSelect';
import { useFeedContext } from '../../contexts/FeedContext';
import SmallCallToAction from '../SmallCallToAction/SmallCallToAction';
import Branding from '../Branding/Branding';

const HomeHeaderPhone: Component = () => {

  const context = useFeedContext();

  let lastScrollTop = document.body.scrollTop || document.documentElement.scrollTop;

  const onScroll = () => {
    const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    const smallHeader = document.getElementById('phone_header');
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

  onMount(() => {
    window.addEventListener('scroll', onScroll);
  });

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
  });

  return (
    <div id="phone_header" class={styles.fullHeader}>
      <div class={styles.phoneHeader}>
        <div class={styles.logo}>
          <Branding small={true} />
        </div>
        <Show when={context?.data.selectedFeed}>
          <FeedSelect isPhone={true} />
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
  );
}

export default HomeHeaderPhone;
