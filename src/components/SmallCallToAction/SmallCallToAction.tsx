import { Component } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallCallToAction.module.scss';
import { useAccountContext } from '../../contexts/AccountContext';
import { PrimalUser } from '../../types/primal';
import { placeholders } from '../../translations';
import { useIntl } from '@cookbook/solid-intl';
import { hookForDev } from '../../lib/devTools';

const SmallCallToAction: Component<{ activeUser: PrimalUser | undefined, id?: string }> = (props) => {

  const account = useAccountContext();
  const intl = useIntl();

  const showNewNoteForm = () => {
    account?.actions?.showNewNoteForm();
  };

  return (
    <button id={props.id} class={styles.callToAction} onClick={showNewNoteForm}>
      <Avatar
        user={props.activeUser}
        size="vs"
      />

      <div class={styles.input}>
        {intl.formatMessage(placeholders.noteCallToAction)}
      </div>
    </button>
  );
}

export default hookForDev(SmallCallToAction);
