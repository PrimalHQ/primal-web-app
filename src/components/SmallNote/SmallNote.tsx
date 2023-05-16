import { Component, JSXElement, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallNote.module.scss';
import { A } from '@solidjs/router';
import { PrimalNote } from '../../types/primal';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date } from '../../lib/dates';
import { authorName } from '../../stores/profile';
import { useIntl } from '@cookbook/solid-intl';


const SmallNote: Component<{ note: PrimalNote, children?: JSXElement }> = (props) => {

  const threadContext = useThreadContext();
  const intl = useIntl();

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
          {intl.formatMessage({
            id: 'mentionedSmallNote',
            defaultMessage: '\[post by {name}\]',
            description: 'Label indicating that a note has been metioned in the small note display'
          }, {
            name: authorName(props.note.user),
          })}
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

  return (
    <div>
      <div class={styles.smallNote}>
        <A href={`/profile/${props.note.user.npub}`} class={styles.avatar}>
          <Avatar src={props.note.user?.picture} size="xxs" />
        </A>
        <A
          href={`/thread/${props.note.post.noteId}`}
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
            <div innerHTML={parsedContent(props.note.post.content)}>
            </div>
          </div>
        </A>
      </div>
    </div>
  );
}

export default SmallNote;
