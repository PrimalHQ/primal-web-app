import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import { nip19 } from 'nostr-tools';
import { Component, createMemo, JSXElement, Show } from 'solid-js';
import { useMediaContext } from '../../contexts/MediaContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date } from '../../lib/dates';
import { trimVerification } from '../../lib/profile';
import { nip05Verification, userName } from '../../stores/profile';
import { note as t } from '../../translations';
import { PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import ParsedNote from '../ParsedNote/ParsedNote';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './EmbeddedNote.module.scss';

const EmbeddedNote: Component<{ note: PrimalNote, mentionedUsers?: Record<string, PrimalUser>, includeEmbeds?: boolean}> = (props) => {

  const threadContext = useThreadContext();
  const intl = useIntl();

  const noteId = () => nip19.noteEncode(props.note.post.id);

  const navToThread = () => {
    threadContext?.actions.setPrimaryNote(props.note);
  };

  const verification = createMemo(() => {
    return trimVerification(props.note.user?.nip05);
  });

  const wrapper = (children: JSXElement) => {
    if (props.includeEmbeds) {
      return (
        <div
          class={styles.mentionedNote}
          data-event={props.note.post.id}
          data-event-bech32={noteId()}
        >
          {children}
        </div>
      );
    }

    return (
      <A
        href={`/e/${noteId()}`}
        class={styles.mentionedNote}
        onClick={() => navToThread()}
        data-event={props.note.post.id}
        data-event-bech32={noteId()}
      >
        {children}
      </A>
    );
  };

  return wrapper(
    <>
      <div class={styles.mentionedNoteHeader}>
        <Avatar
          user={props.note.user}
          size="xxs"
        />
        <span class={styles.postInfo}>
          <span class={styles.userInfo}>
            <Show
              when={props.note.user.nip05}
              fallback={
                <span class={styles.userName}>
                  {userName(props.note.user)}
                </span>
              }
            >
              <span class={styles.userName}>
                {verification()[0]}
              </span>
              <VerificationCheck user={props.note.user} />
              <span
                class={styles.verifiedBy}
                title={props.note.user.nip05}
              >
                {nip05Verification(props.note.user)}
              </span>
            </Show>
          </span>

          <span
            class={styles.time}
            title={date(props.note.post.created_at || 0).date.toLocaleString()}
          >
            {date(props.note.post.created_at || 0).label}
          </span>
        </span>
      </div>
      <div class={styles.noteContent}>
        <ParsedNote note={props.note} noLinks="links" />
      </div>
    </>
  );
}

export default EmbeddedNote;
