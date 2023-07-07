import { Component } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallCallToAction.module.scss';
import { useAccountContext } from '../../contexts/AccountContext';
import { PrimalUser } from '../../types/primal';
import { placeholders } from '../../translations';
import { useIntl } from '@cookbook/solid-intl';

const SmallCallToAction: Component<{ activeUser: PrimalUser | undefined }> = (params) => {

  const account = useAccountContext();
  const intl = useIntl();

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
          {intl.formatMessage(placeholders.noteCallToAction)}
        </div>
      </div>
    </button>
  );
}

export default SmallCallToAction;
