import { Component, createEffect, createMemo, createSignal, Match, Show, Switch } from 'solid-js';
import { PrimalNote } from '../../../types/primal';

import styles from './NoteHeader.module.scss';
import { date } from '../../../lib/dates';
import { trimVerification } from '../../../lib/profile';
import { truncateNpub } from '../../../stores/profile';
import { useIntl } from '@cookbook/solid-intl';
import { useToastContext } from '../../Toaster/Toaster';
import VerificationCheck from '../../VerificationCheck/VerificationCheck';

const NoteHeader: Component<{ note: PrimalNote}> = (props) => {

  const intl = useIntl();
  const toaster = useToastContext();

  const [showContext, setContext] = createSignal(false);

  const authorName = () => {
    return props.note.user?.displayName ||
      props.note.user?.name ||
      truncateNpub(props.note.user.npub);
  };

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
      <div class={styles.postInfo}>
        <div class={styles.userInfo}>

          <span class={styles.userName}>
            {authorName()}
          </span>

          <VerificationCheck user={props.note.user} />

          <span
            class={styles.time}
            title={date(props.note.post?.created_at).date.toLocaleString()}
          >
            {date(props.note.post?.created_at).label}
          </span>
        </div>

        <Show
          when={props.note.user?.nip05}
        >
          <span
            class={styles.verification}
            title={props.note.user?.nip05}
          >
            {props.note.user?.nip05}
          </span>
        </Show>
      </div>
      <div class={styles.contextMenu}>
        <button
          class={styles.contextButton}
          onClick={openContextMenu}
        >
          <div class={styles.contextIcon} ></div>
        </button>
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
