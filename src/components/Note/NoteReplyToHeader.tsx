import { A } from '@solidjs/router';
import { Component, createMemo, createSignal, Show } from 'solid-js';
import { PrimalNote, PrimalRepost, PrimalUser } from '../../types/primal';
import ParsedNote from '../ParsedNote/ParsedNote';
import NoteFooter from './NoteFooter/NoteFooter';
import NoteHeader from './NoteHeader/NoteHeader';

import styles from './Note.module.scss';
import { useThreadContext } from '../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { authorName, nip05Verification, truncateNpub, userName } from '../../stores/profile';
import { note as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import MentionedUserLink from './MentionedUserLink/MentionedUserLink';

const NoteReplyHeader: Component<{
  note: PrimalNote,
  id?: string,
}> = (props) => {
  const intl = useIntl();

  const rootAuthor = createMemo(() => {
    const replyTo = props.note.replyTo;
    const mentions = props.note.mentionedNotes;

    if (replyTo && mentions && mentions[replyTo]) {
      return mentions[replyTo].user;
    }
  });

  return (
    <Show when={props.note.replyTo}>
      <span class={styles.replyingTo}>
        <span class={styles.label}>
          {intl.formatMessage(t.reply)}
        </span>&nbsp;
        <MentionedUserLink user={rootAuthor()} />
      </span>
    </Show>
  )
}

export default hookForDev(NoteReplyHeader);
