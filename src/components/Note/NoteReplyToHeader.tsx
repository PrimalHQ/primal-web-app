import { Component, createMemo, Show } from 'solid-js';
import { PrimalNote } from '../../types/primal';


import styles from './Note.module.scss';
import { useIntl } from '@cookbook/solid-intl';
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
