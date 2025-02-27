import { Component, onCleanup, onMount, Show } from 'solid-js';

import styles from './HomeHeaderPhone.module.scss';
import FeedSelect from '../FeedSelect/FeedSelect';
import Branding from '../Branding/Branding';
import { useHomeContext } from '../../contexts/HomeContext';
import { hookForDev } from '../../lib/devTools';

const HomeHeaderPhone: Component< { id?: string } > = (props) => {

  const home = useHomeContext();

  let lastScrollTop = document.body.scrollTop || document.documentElement.scrollTop;
  let smallHeader: HTMLDivElement | undefined;
  let border: HTMLDivElement | undefined;

  const onScroll = () => {
    const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;

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
    <div id={props.id} class={styles.readsHeaderPhone} ref={smallHeader}>
      <div class={styles.phoneHeader}>
        <Show when={home?.selectedFeed}>
          <FeedSelect isPhone={true} big={true} />
        </Show>
      </div>
    </div>
  );
}

export default hookForDev(HomeHeaderPhone);
