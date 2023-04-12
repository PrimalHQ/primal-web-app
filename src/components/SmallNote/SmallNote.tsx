import { Component, createEffect, For, JSXElement, onCleanup, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './SmallNote.module.scss';
import { A } from '@solidjs/router';
import { FeedPage, NostrEOSE, NostrEvent, NostrUserContent, PrimalNote, PrimalUser, UserReference } from '../../types/primal';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date } from '../../lib/dates';
import { truncateNpub } from '../../stores/profile';
import { createStore } from 'solid-js/store';
import { hexToNpub } from '../../lib/keys';
import { parseSmallNote } from '../../lib/notes';
import { socket } from '../../sockets';
import { convertToNotes } from '../../stores/note';
import { Kind } from '../../constants';
import { useIntl } from '@cookbook/solid-intl';

const tokenRegex = /(\#\[[\d]+\])/;

const SmallNote: Component<{ note: PrimalNote, children?: JSXElement }> = (props) => {

  const threadContext = useThreadContext();
  const intl = useIntl();

  const navToThread = (note: PrimalNote) => {
    threadContext?.actions.setPrimaryNote(note);
  };

  const authorName = () => {
    return props.note.user?.displayName ||
      props.note.user?.name ||
      truncateNpub(props.note.user.npub);
  }
  const userName = (user: PrimalUser) => {
    return user.displayName ||
      user.name ||
      truncateNpub(user.npub);
  }

  const [references, setReferences] = createStore<Record<string, UserReference | PrimalNote>>({});
  const [printableContent, setPrintableContent] = createStore<any[]>([]);
  const [mentionedNotes, setMentionedNotes] = createStore<Record<string, FeedPage>>({});

  createEffect(() => {
    const newContent = parseSmallNote(props.note);
    setPrintableContent(() => newContent.split(tokenRegex));
  });

  createEffect(() => {
    socket()?.addEventListener('message', onMessage);
    socket()?.addEventListener('close', onSocketClose);
  });

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    webSocket.removeEventListener('message', onMessage);
    webSocket.removeEventListener('close', onSocketClose);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, userContent] = message;


    if (type !== 'EOSE' && subId.startsWith('mentioned_user')) {
      const [_, postId, ref] = subId.split('_|_');

      if (postId !== props.note.post.noteId) {
        return;
      }

      const user = JSON.parse(userContent?.content || '{}') as NostrUserContent;

      const u: UserReference = {
        ...userContent,
        ...user,
        npub: hexToNpub(userContent.pubkey),
       }

      setReferences(refs => ({...refs, [ref]: u}));

      return;
    }

    if (subId.startsWith('mentioned_post')) {
      const [_, postId, ref, mentionId] = subId.split('_|_');

      if (postId !== props.note.post.noteId) {
        return;
      }

      if (type === 'EOSE') {

        const mentions = mentionedNotes[ref];

        if (mentions) {
          const newPosts = convertToNotes(mentions);

          const mentionedNote = newPosts.find(note => note.post.noteId === mentionId);

          if (mentionedNote) {
            setReferences(refs => ({...refs, [ref]: mentionedNote}));
          }
        }

        return;
      }

      if (type === 'EVENT') {
        if (mentionedNotes[ref] === undefined) {
          setMentionedNotes((notes) => ({ ...notes, [ref]: { messages: [], users: {}, postStats: {}}}));
        }

        if (userContent.kind === Kind.Metadata) {
          setMentionedNotes(`${ref}`, 'users', users => ({ ... users, [userContent.pubkey]: userContent}));
        }
        if (userContent.kind === Kind.Text) {
          setMentionedNotes(`${ref}`, 'messages',  (msgs) => [ ...msgs, userContent]);
        }
        if (userContent.kind === Kind.NoteStats) {
          const stat = JSON.parse(userContent.content);
          setMentionedNotes(`${ref}`, 'postStats', (stats) => ({ ...stats, [stat.event_id]: stat }));
        }
      }
      return;
    }

  };

  onCleanup(() => {
    socket()?.removeEventListener('message', onMessage);
  });

  const isUserReference = (reference: any): reference is UserReference => {
    return reference.npub !== undefined;
  }
  const isNoteReference = (reference: any): reference is PrimalNote => {
    return reference.post !== undefined;
  }

  const referenceName = (reference: UserReference) => {
    return truncateNpub(
      reference.name ||
      reference.display_name ||
      reference.displayName ||
      reference.npub || '');
  };

  const referenceInfo = (token: string) => {
    const regex = /\#\[([0-9]*)\]/g;

    let refs = [];
    let match;

    while((match = regex.exec(token)) !== null) {
      refs.push(match[1]);
    }

    if (refs.length > 0) {
      for(let i =0; i < refs.length; i++) {
        let r = refs[i];
        const reference = references[r];

        if (reference ===  undefined) {
          return <span>{token}</span>
        }

        if (isUserReference(reference)) {
          return (
            <span>
              @{referenceName(reference)}
            </span>
          );
        }

        if (isNoteReference(reference)) {
          return <span>
            {intl.formatMessage({
              id: 'mentionedSmallNote',
              defaultMessage: '\[post by {name}\]',
              description: 'Label indicating that a note has been metioned in the small note display'
            }, {
              name: userName(reference.user),
            })}
          </span>;
        }
      }
    }

  }

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
            <div class={styles.name} title={authorName()}>
              {authorName()}
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
            <For each={printableContent}>
              {c =>
                <Show
                  when={tokenRegex.test(c)}
                  fallback={<span innerHTML={c}></span>}
                >
                  {referenceInfo(c)}
                </Show>
              }
            </For>
          </div>
        </A>
      </div>
    </div>
  );
}

export default SmallNote;
