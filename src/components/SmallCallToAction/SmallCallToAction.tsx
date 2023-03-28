import { Component } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallCallToAction.module.scss';
import { useAccountContext } from '../../contexts/AccountContext';
import { PrimalUser } from '../../types/primal';

const SmallCallToAction: Component<{ activeUser: PrimalUser | undefined }> = (params) => {

  const account = useAccountContext();

  const showNewNoteForm = () => {
    account?.actions?.showNewNoteForm();
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
