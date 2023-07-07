import { Component, onCleanup, onMount, Show } from 'solid-js';

import styles from './HomeHeaderPhone.module.scss';
import FeedSelect from '../FeedSelect/FeedSelect';
import Branding from '../Branding/Branding';
import { useHomeContext } from '../../contexts/HomeContext';

const HomeHeaderPhone: Component = () => {

  const home = useHomeContext();

  let lastScrollTop = document.body.scrollTop || document.documentElement.scrollTop;

  const onScroll = () => {
    const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    const smallHeader = document.getElementById('phone_header');
    const border = document.getElementById('small_bottom_border');

    home?.actions?.updateScrollTop(scrollTop);

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
        <Show when={home?.selectedFeed}>
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
