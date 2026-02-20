import { Component } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallCallToAction.module.scss';
import { PrimalUser } from '../../types/primal';
import { placeholders } from '../../translations';
import { useIntl } from '@cookbook/solid-intl';
import { hookForDev } from '../../lib/devTools';
import { showNewNoteForm } from '../../stores/accountStore';

const SmallCallToAction: Component<{ activeUser: PrimalUser | undefined, id?: string }> = (props) => {
  const intl = useIntl();

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
