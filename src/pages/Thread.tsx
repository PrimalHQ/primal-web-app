import { Component, createEffect, createResource, createSignal, For, Index, Match, on, onCleanup, onMount, Show, Switch, useContext } from 'solid-js';
import Note from '../components/Note/Note';
import styles from './Thread.module.scss';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import { useParams } from '@solidjs/router';
import { getThread } from '../lib/feed';
import { convertToNotes, sortByRecency } from '../stores/note';
import { FeedPage, Kind, NostrEOSE, NostrEvent, NostrNoteContent, NostrStatsContent, NostrUserContent, PrimalNote, PrimalUser } from '../types/primal';
import { isConnected, socket } from '../sockets';
import { createStore } from 'solid-js/store';
import NotePrimary from '../components/Note/NotePrimary/NotePrimary';
import PeopleList from '../components/PeopleList/PeopleList';
import PageNav from '../components/PageNav/PageNav';
import ReplyToNote from '../components/ReplyToNote/ReplyToNote';

import Loader from '../components/Loader/Loader';
import { noteEncode } from 'nostr-tools/nip19';
import { likedNotes } from '../lib/notes';
import { hasPublicKey } from '../stores/profile';


const Thread: Component = () => {
  const params = useParams();

  const postId = () => {
    if (params.postId.startsWith('note')) {
      return params.postId;
    }

    return noteEncode(params.postId);
  };

  const context = useFeedContext();

  const [mounted, setMounted] = createSignal(false);

  const [parentNotes, setParentNotes] = createStore<PrimalNote[]>([]);
  const [replies, setReplies] = createStore<PrimalNote[]>([]);
  const [primaryNote, setPrimaryNote] = createSignal<PrimalNote>();

  const [isFetching, setIsFetching] = createSignal(false);

  const [page, setPage] = createStore<FeedPage>({
    users: {},
    messages: [],
    postStats: {},
  });

  const proccessPost = (post: NostrNoteContent) => {
    setPage('messages', (msgs) => [ ...msgs, post]);
  };

  const proccessUser = (user: NostrUserContent) => {
    setPage('users', (users ) => ({ ...users, [user.pubkey]: user}))
  };

  const proccessStat = (stat: NostrStatsContent) => {
    const content = JSON.parse(stat.content);
    setPage('postStats', (stats) => ({ ...stats, [content.event_id]: content }))
  };

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    webSocket.removeEventListener('message', onMessage);
    webSocket.removeEventListener('close', onSocketClose);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subkey, content] = message;

    if (subkey !== `thread_${postId()}_${APP_ID}`) {
      return;
    }

    if (type === 'EOSE') {
      const newPosts = sortByRecency(convertToNotes(page), true);

      setPage({ users: {}, messages: [], postStats: {}});

      context?.actions?.setThreadedNotes(newPosts);

      setIsFetching(false);

      return;
    }

    if (type === 'EVENT') {
      if (content.kind === Kind.Metadata) {
        proccessUser(content);
      }
      if (content.kind === Kind.Text) {
        proccessPost(content);
      }
      if (content.kind === Kind.Repost) {
        proccessPost(content);
      }
      if (content.kind === Kind.NoteStats) {
        proccessStat(content);
      }
    }
  };

  createEffect(() => {
    context?.data.threadedNotes.forEach((note) => {

      if (primaryNote() === undefined && note.post.noteId === postId()) {
        setPrimaryNote(() => ({ ...note }));
        return;
      }

      if (note.post.noteId === primaryNote()?.post.noteId) {
        return;
      }

      if (note.post.created_at < (primaryNote()?.post.created_at || 0)) {
        setParentNotes((parents) => [...parents, {...note}]);
        return;
      }

      if (note.post.created_at > (primaryNote()?.post.created_at || 0)) {
        setReplies((replies) => [...replies, {...note}]);
        return;
      }
    });
  });

  const posts = () => [ primaryNote(), ...parentNotes, ...replies];

  const people = () => posts().reduce((acc: PrimalUser[], p: PrimalNote | undefined) => {
    if (!p) {
      return acc;
    }

    const user = p.user;
    if (user && acc.find(u => u && user.pubkey === u.pubkey)) {
      return acc;
    }

    return [...acc, user];
  }, []);

  createEffect(() => {
    if (postId() && postId() !== primaryNote()?.post.noteId) {
      let note = context?.data.posts.find(p => p.post.noteId === postId());

      if (!note) {
        note = context?.data.trendingNotes.notes.find(p => p.post.noteId === postId());
      }

      if (!note) {
        note = context?.data.exploredNotes.find(p => p.post.noteId === postId());
      }

      if (!note) {
        note = parentNotes.find(p => p.post.noteId === postId());
      }

      if (!note) {
        note = replies.find(p => p.post.noteId === postId());
      }

      if (note) {
        setPrimaryNote(note);
      }
    }
    else {
      setReplies(() => []);
      setParentNotes(() => []);
    }
  });

  onMount(() => {
    // Temporary fix for Portal rendering on initial load.
    setMounted(true);
  });

  onCleanup(() => {
    socket()?.removeEventListener('message', onMessage);
  });

	createEffect(() => {
    if (isConnected()) {
      socket()?.addEventListener('message', onMessage);
      socket()?.addEventListener('close', onSocketClose);
      if (postId()) {
        context?.actions?.clearThreadedNotes();
        setIsFetching(true);
        getThread(postId(), `thread_${postId()}_${APP_ID}`);

      }
		}
	});

  return (
    <div>
      <Switch>
        <Match when={mounted()}>
          <Portal
            mount={document.getElementById("branding_holder") as Node}
          >
            <PageNav />
          </Portal>

          <Portal
            mount={document.getElementById("right_sidebar") as Node}
          >
            <PeopleList people={people()} />
          </Portal>
        </Match>
      </Switch>

      <Show
        when={!isFetching()}
      >
        <For each={parentNotes}>
          {note =>
            <div class={styles.threadList}>
              <Note
                note={note}
              />
            </div>
          }
        </For>
      </Show>

      <Show when={primaryNote()}>
        <div id="primary_note" class={styles.threadList}>
          <NotePrimary
            note={primaryNote() as PrimalNote}
          />
          <Show when={hasPublicKey()}>
            <ReplyToNote note={primaryNote() as PrimalNote} />
          </Show>
        </div>
      </Show>

      <div class={styles.repliesHolder}>
        <Show
          when={!isFetching()}
          fallback={<div class={styles.noContent}><Loader /></div>}
        >
          <For each={replies}>
            {note =>
              <div class={styles.threadList}>
                <Note
                  note={note}
                />
              </div>
            }
          </For>
        </Show>
      </div>
    </div>
  )
}

export default Thread;
