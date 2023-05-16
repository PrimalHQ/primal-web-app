import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import { nip19 } from 'nostr-tools';
import { Component, createMemo, JSXElement, Show } from 'solid-js';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date } from '../../lib/dates';
import { hexToNpub } from '../../lib/keys';
import { parseNote2 } from '../../lib/notes';
import { trimVerification } from '../../lib/profile';
import { truncateNpub, userName } from '../../stores/profile';
import { NostrNoteContent, NostrPostStats, PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import ParsedNote, { parseNoteLinks, parseNpubLinks } from '../ParsedNote/ParsedNote';

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

  const parsedContent = (text: string) => {
    const regex = /\#\[([0-9]*)\]/g;
    let parsed = text;

    let refs = [];
    let match;

    while((match = regex.exec(text)) !== null) {
      refs.push(match[1]);
    }

    if (refs.length > 0) {
      for(let i =0; i < refs.length; i++) {
        let r = parseInt(refs[i]);

        const tag = props.note.post.tags[r];
        if (
          tag[0] === 'e' &&
          props.note.mentionedNotes &&
          props.note.mentionedNotes[tag[1]]
        ) {
          const embeded = (
            <span>
              {intl.formatMessage({
                id: 'mentionedSmallNote',
                defaultMessage: '\[post by {name}\]',
                description: 'Label indicating that a note has been metioned in the small note display'
              }, {
                name: userName(props.note.user),
              })}
            </span>
          );

          // @ts-ignore
          parsed = parsed.replace(`#[${r}]`, embeded.outerHTML);
        }

        if (tag[0] === 'p' && props.mentionedUsers && props.mentionedUsers[tag[1]]) {
          const user = props.mentionedUsers[tag[1]];

          const link =  (
            <span class='linkish'>
              @{userName(user)}
            </span>
          );


          // @ts-ignore
          parsed = parsed.replace(`#[${r}]`, link.outerHTML);
        }
      }
    }

    return parsed;

  };

  const highlightHashtags = (text: string) => {
    const regex = /(?:\s|^)#[^\s!@#$%^&*(),.?":{}|<>]+/ig;

    return text.replace(regex, (token) => {
      const embeded = (
        <span class="linkish">{token}</span>
      );

      // @ts-ignore
      return embeded.outerHTML;
    });
  }

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
        href={`/thread/${noteId()}`}
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
          src={props.note.user.picture}
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
              <span class={styles.verifiedIcon} />
              <span
                class={styles.verifiedBy}
                title={props.note.user.nip05}
              >
                {verification()[1]}
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
      <div innerHTML={
        parseNoteLinks(
          parseNpubLinks(
            parsedContent(
              highlightHashtags(
                parseNote2(props.note.post.content)
              ),
            ),
            props.note,
            true,
          ),
          props.note,
          !props.includeEmbeds,
        )
      }>
      </div>
    </>
  );
}

export default EmbeddedNote;
