import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js';
import { PrimalNote } from '../../../types/primal';

import styles from './NoteHeader.module.scss';
import { date } from '../../../lib/dates';
import { trimVerification } from '../../../lib/profile';
import { truncateNpub } from '../../../stores/profile';
import { useIntl } from '@cookbook/solid-intl';
import { useToastContext } from '../../Toaster/Toaster';

const NoteHeader: Component<{ note: PrimalNote}> = (props) => {

  const intl = useIntl();
  const toaster = useToastContext();

  const [showContext, setContext] = createSignal(false);

  const authorName = () => {
    return props.note.user?.displayName ||
      props.note.user?.name ||
      truncateNpub(props.note.user.npub);
  };

  const verification = createMemo(() => {
    return trimVerification(props.note.user?.nip05);
  });

  const openContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setContext(true);
  };

  const copyNoteLink = (e: MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(`nostr:${props.note.post.noteId}`);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage({
      id: 'note.contextMenu.copyFeedback',
      defaultMessage: 'Note\'s nostr link copied',
      description: 'Confirmation message that the note\'s link has been copied',
    }));
  };

  const onClickOutside = (e: MouseEvent) => {
    if (
      !document?.getElementById(`note_context_${props.note.post.id}`)?.contains(e.target as Node)
    ) {
      setContext(false);
    }
  }

  createEffect(() => {
    if (showContext()) {
      document.addEventListener('click', onClickOutside);
    }
    else {
      document.removeEventListener('click', onClickOutside);
    }
  });

  return (
    <div class={styles.header}>
      <span class={styles.postInfo}>
        <span class={styles.userInfo}>
          <Show
            when={props.note.user?.nip05}
            fallback={
              <span class={styles.userName}>
                {authorName()}
              </span>
            }
          >
            <span class={styles.userName}>
              {verification()[0]}
            </span>
            <span class={styles.verifiedIcon} />
            <span
              class={styles.verifiedBy}
              title={props.note.user?.nip05}
            >
              {verification()[1]}
            </span>
          </Show>
        </span>
        <span
          class={styles.time}
          title={date(props.note.post?.created_at).date.toLocaleString()}
        >
          {date(props.note.post?.created_at).label}
        </span>
      </span>
      <div class={styles.contextMenu}>
        <button onClick={openContextMenu} class={styles.contextIcon}></button>
        <Show when={showContext()}>
          <div
            id={`note_context_${props.note.post.id}`}
            class={styles.contextMenuOptions}
          >
            <button
              onClick={copyNoteLink}
              class={styles.contextOption}
            >
              {intl.formatMessage({
                id: 'note.contextMenu.copyLink',
                defaultMessage: 'Copy note link',
                description: 'Label for the copy note link context menu item',
              })}
            </button>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default NoteHeader;
