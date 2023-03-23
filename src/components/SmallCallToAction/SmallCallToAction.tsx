import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallCallToAction.module.scss';
import miljan from '../../assets/icons/miljan.jpg';
import PostButton from '../PostButton/PostButton';
import FeedSelect from '../FeedSelect/FeedSelect';
import { useFeedContext } from '../../contexts/FeedContext';
import { PrimalUser } from '../../types/primal';

const SmallCallToAction: Component<{ activeUser: PrimalUser | undefined }> = (params) => {

  const context = useFeedContext();

  const showNewNoteForm = () => {
    context?.actions?.showNewNoteForm();
  };

  return (
    <button class={styles.callToAction} onClick={showNewNoteForm}>
      <Avatar
        src={params.activeUser?.picture}
        size="xs"
      />

      <div class={styles.border}>
        <div class={styles.input}>
          say something on nostr...
        </div>
      </div>
    </button>
  );
}

export default SmallCallToAction;
