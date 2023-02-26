import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallCallToAction.module.scss';
import miljan from '../../assets/icons/miljan.jpg';
import PostButton from '../PostButton/PostButton';
import FeedSelect from '../FeedSelect/FeedSelect';
import { useFeedContext } from '../../contexts/FeedContext';
import { PrimalUser } from '../../types/primal';

const SmallCallToAction: Component<{ activeUser: PrimalUser }> = (params) => {

  return (
    <div class={styles.callToAction}>
      <Avatar
        src={params.activeUser?.picture}
        size="xs"
      />

      <div class={styles.border}>
        <div class={styles.input}>
          say something on nostr...
        </div>
      </div>
    </div>
  );
}

export default SmallCallToAction;
