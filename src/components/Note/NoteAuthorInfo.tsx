import { A } from '@solidjs/router';
import { Component, createSignal, Show } from 'solid-js';
import { PrimalNote, PrimalUser } from '../../types/primal';
import ParsedNote from '../ParsedNote/ParsedNote';
import NoteFooter from './NoteFooter/NoteFooter';
import NoteHeader from './NoteHeader/NoteHeader';

import styles from './Note.module.scss';
import { useThreadContext } from '../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { authorName, nip05Verification, truncateNpub } from '../../stores/profile';
import { note as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import NoteReplyHeader from './NoteHeader/NoteReplyHeader';
import Avatar from '../Avatar/Avatar';
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

      <VerificationCheck user={props.author} />

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
