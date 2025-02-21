import { Component, JSXElement, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallNote.module.scss';
import { A } from '@solidjs/router';
import { PrimalNote } from '../../types/primal';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date } from '../../lib/dates';
import { authorName } from '../../stores/profile';
import { note as t } from '../../translations';
import { useIntl } from '@cookbook/solid-intl';
import { hookForDev } from '../../lib/devTools';
import ParsedNote from '../ParsedNote/ParsedNote';
import { useAppContext } from '../../contexts/AppContext';
import { nip19 } from 'nostr-tools';


const SmallNote: Component<{ note: PrimalNote, children?: JSXElement, id?: string }> = (props) => {

  const threadContext = useThreadContext();
  const intl = useIntl();
  const app = useAppContext();

  const navToThread = (note: PrimalNote) => {
    threadContext?.actions.setPrimaryNote(note);
  };

  const nameOfAuthor = () => {
    return authorName(props.note.user || { pubkey: props.note.post.pubkey });
  };

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

        if (tag[0] === 'e' && props.note.mentionedNotes && props.note.mentionedNotes[tag[1]]) {
          const embeded = (<span>
          {intl.formatMessage(
            t.mentionIndication,
            {
              name: authorName(props.note.user),
            },
          )}
        </span>);

          // @ts-ignore
          parsed = parsed.replace(`#[${r}]`, embeded.outerHTML);
        }

        if (tag[0] === 'p' && props.note.mentionedUsers && props.note.mentionedUsers[tag[1]]) {
          const user = props.note.mentionedUsers[tag[1]];

          const link =  (<span>@{authorName(user)}</span>);

          // @ts-ignore
          parsed = parsed.replace(`#[${r}]`, link.outerHTML);
        }
      }
    }

    return parsed;

  };


  const noteLinkId = () => {
    try {
      return `/e/${props.note.noteIdShort}`;
    } catch(e) {
      return '/404';
    }
  };

  return (
    <div id={props.id} class={styles.smallNote} data-note-id={props.note.post.noteId}>
      <A href={app?.actions.profileLink(props.note.user.npub) || ''} class={styles.avatar}>
        <Avatar user={props.note.user} size="xxs" />
      </A>
      <A
        href={noteLinkId()}
        class={styles.content}
        onClick={() => navToThread(props.note)}
      >
        <div class={styles.header}>
          <div class={styles.name} title={nameOfAuthor()}>
            {nameOfAuthor()}
          </div>
          <div class={styles.time}>
            <Show
              when={props.children}
              fallback={date(props.note.post?.created_at).label}
            >
              {props.children}
            </Show>
          </div>
        </div>
        <div class={styles.message}>
          <div>
            <ParsedNote
              note={props.note}
              noLinks="text"
              ignoreMedia={true}
              ignoreLinebreaks={true}
              shorten={true}
              veryShort={true}
            />
          </div>
        </div>
      </A>
    </div>
  );
}

export default hookForDev(SmallNote);
