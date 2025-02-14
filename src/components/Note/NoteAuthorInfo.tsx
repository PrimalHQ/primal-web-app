import { Component, Show } from 'solid-js';
import { PrimalUser } from '../../types/primal';

import styles from './Note.module.scss';
import { useThreadContext } from '../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { authorName, nip05Verification } from '../../stores/profile';
import { hookForDev } from '../../lib/devTools';
import { date } from '../../lib/dates';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

const NoteAuthorInfo: Component<{
  author: PrimalUser,
  time: number,
  id?: string,
}> = (props) => {

  const threadContext = useThreadContext();
  const intl = useIntl();

  return (
    <div class={styles.authorInfo}>

      <span class={styles.userName}>
        {authorName(props.author)}
      </span>

      <VerificationCheck user={props.author} fallback={
        <div class={styles.verificationFailed}></div>
      } />

      <Show
        when={props.author.nip05}
      >
        <span
          class={styles.verification}
          title={props.author.nip05}
        >
          {nip05Verification(props.author)}
        </span>
      </Show>

      <span
        class={styles.time}
        title={date(props.time).date.toLocaleString()}
      >
        <div class={styles.ellipsisIcon}></div>
        {date(props.time).label}
      </span>
    </div>
  )
}

export default hookForDev(NoteAuthorInfo);
