import { A, Navigate } from '@solidjs/router';
import { useNavigate, useRouter } from '@solidjs/router/dist/routing';
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show, Switch, Match } from 'solid-js';
import { createStore } from 'solid-js/store';
import { date } from '../../lib/dates';
import { convertToPosts } from '../../lib/feed';
import { parseNote } from '../../lib/posts';
import { trimVerification } from '../../lib/profile';
import { socket } from '../../sockets';
import { TrendingNotesStore } from '../../stores/trending';
import { FeedPage, NostrEOSE, NostrEvent, NostrUserContent, PrimalNote } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './ParsedNote.module.scss';

const tokenRegex = /(\#\[[\d]\])/;

const ParsedNote: Component<{ note: PrimalNote, ignoreMentionedNotes?: boolean}> = (props) => {

  const [content, setContent] = createSignal<string>('');

  const [references, setReferences] = createStore<Record<string, NostrUserContent | PrimalNote>>({});

  const [printableContent, setPrintableContent] = createStore<any[]>([]);

  const [mentionedNotes, setMentionedNotes] = createStore<Record<string, FeedPage>>({});

  createEffect(() => {
    const newContent = parseNote(props.note, props.ignoreMentionedNotes);
    setContent(newContent);
    setPrintableContent(() => newContent.split(/(\#\[[\d]\])/));
  });


  const onError = (error: Event) => {
    console.log("error: ", error);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, userContent] = message;


    if (type !== 'EOSE' && subId.startsWith('mentioned_user')) {
      const [_, postId, ref] = subId.split('_|_');

      if (postId !== props.note.post.noteId) {
        return;
      }

      const user = JSON.parse(userContent?.content || '') as NostrUserContent;

      setReferences(refs => ({...refs, [ref]: user}));

      return;
    }

    if (!props.ignoreMentionedNotes && subId.startsWith('mentioned_post')) {
      const [_, postId, ref, mentionId] = subId.split('_|_');

      if (postId !== props.note.post.noteId) {
        return;
      }

      if (type === 'EOSE') {

        const mentions = mentionedNotes[ref];

        if (mentions) {
          const newPosts = convertToPosts(mentions);

          const mentionedNote = newPosts.find(note => note.post.noteId === mentionId);

          if (mentionedNote) {
            setReferences(refs => ({...refs, [ref]: mentionedNote}));          }
        }

        return;
      }

      if (type === 'EVENT') {
        if (mentionedNotes[ref] === undefined) {
          setMentionedNotes((notes) => ({ ...notes, [ref]: { messages: [], users: {}, postStats: {}}}));
        }

        if (userContent.kind === 0) {
          setMentionedNotes(`${ref}`, 'users', users => ({ ... users, [userContent.pubkey]: userContent}));
        }
        if (userContent.kind === 1) {
          setMentionedNotes(`${ref}`, 'messages',  (msgs) => [ ...msgs, userContent]);
        }
        if (userContent.kind === 10000100) {
          const stat = JSON.parse(userContent.content);
          setMentionedNotes(`${ref}`, 'postStats', (stats) => ({ ...stats, [stat.event_id]: stat }));
        }
      }
      return;
    }

  };


  onMount(() => {
    socket()?.addEventListener('error', onError);
    socket()?.addEventListener('message', onMessage);
  });

  onCleanup(() => {
    socket()?.removeEventListener('error', onError);
    socket()?.removeEventListener('message', onMessage);
  });

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
        if (reference) {
          if (reference.name) {
            return (
              <span class={styles.mentionedUser}>
                @{reference.name}
              </span>
            );
          }

          if (reference.post) {
            return (
              <A
                href={`/thread/${reference.post.noteId}`}
                class={styles.mentionedNote}
              >
                <div class={styles.mentionedNoteHeader}>
                  <Avatar
                    src={reference.user.picture}
                    size="xxs"
                  />
                  <span class={styles.postInfo}>
                    <span class={styles.userInfo}>
                      <span class={styles.userName}>
                        {reference.user.name}
                      </span>
                      <Show when={reference.user.nip05} >
                        <span class={styles.verifiedIcon} />
                        <span
                          class={styles.verifiedBy}
                          title={reference.user.nip05}
                        >
                          {trimVerification(reference.user.nip05)}
                        </span>
                      </Show>
                    </span>

                    <span
                      class={styles.time}
                      title={date(reference.post.created_at).date.toLocaleString()}
                    >
                      {date(reference.post.created_at).label}
                    </span>
                  </span>
                </div>
                <ParsedNote
                  note={reference}
                  ignoreMentionedNotes={true}
                />
              </A>
            );
          }
        }
      }
    }

    return <span>{token}</span>
  }

  return (
    <div>
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
  )
};

export default ParsedNote;
