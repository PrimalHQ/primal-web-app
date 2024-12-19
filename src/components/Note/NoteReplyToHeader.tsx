import { Component, createMemo, Show } from 'solid-js';
import { PrimalNote, PrimalUser } from '../../types/primal';


import styles from './Note.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { note as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import MentionedUserLink from './MentionedUserLink/MentionedUserLink';
import { hexToNpub } from '../../lib/keys';
import { nip19 } from 'nostr-tools';

const NoteReplyHeader: Component<{
  note: PrimalNote,
  id?: string,
  defaultParentAuthor?: PrimalUser,
}> = (props) => {
  const intl = useIntl();

  const rootAuthor = createMemo(() => {
    const replyTo = props.note.replyTo;
    const mentions = props.note.mentionedNotes;
    const mentionedReads = props.note.mentionedArticles;


    if (replyTo && mentions && mentions[replyTo]) {
      return mentions[replyTo].user || props.defaultParentAuthor;
    }

    if (replyTo && mentionedReads) {
      const [kind, pubkey, identifier] = replyTo.split(':');

      try {
        const naddr = nip19.naddrEncode({
          kind: parseInt(kind),
          pubkey,
          identifier
        })

        return mentionedReads[naddr] ? mentionedReads[naddr].user : props.defaultParentAuthor;
      } catch {
        return props.defaultParentAuthor;
      }
    }

    return props.defaultParentAuthor;

  });

  return (
    <Show when={props.note.replyTo}>
      <span class={styles.replyingTo}>
        <span class={styles.label}>
          {intl.formatMessage(t.reply)}
        </span>&nbsp;
        <MentionedUserLink
          user={rootAuthor()}
          npub={hexToNpub(props.note.replyTo)}
        />
      </span>
    </Show>
  )
}

export default hookForDev(NoteReplyHeader);
